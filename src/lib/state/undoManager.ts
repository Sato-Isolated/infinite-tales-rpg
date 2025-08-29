/**
 * Undo Manager - System for reverting game state without requiring pre-existing snapshots
 * 
 * This system can reconstruct game state from GameActionState history even if no snapshots exist.
 * It works by:
 * 1. Saving lightweight snapshots before each action (when possible)
 * 2. Reconstructing state from GameActionState history when snapshots aren't available
 * 3. Providing multi-level undo functionality
 * 4. Working directly with localStorage to avoid reactive state issues
 */

import type { GameActionState, InventoryState, PlayerCharactersGameState, PlayerCharactersIdToNamesMap } from '$lib/ai/agents/gameAgent';
import type { CharacterStats, NPCState } from '$lib/ai/agents/characterStatsAgent';
import type { CharacterDescription } from '$lib/ai/agents/characterAgent';
import type { Story } from '$lib/ai/agents/storyAgent';
import { initialStoryState } from '$lib/ai/agents/storyAgent';
import type { LLMMessage } from '$lib/ai/llm';
import type { RelatedStoryHistory } from '$lib/ai/agents/summaryAgent';
import { stringifyPretty } from '$lib/util.svelte';

export interface UndoSnapshot {
  timestamp: number;
  gameActionId: number;
  description: string;
  states: {
    [key: string]: any;
  };
}

export interface RecoveryPoint {
  id: number;
  description: string;
  timestamp?: number;
  isSnapshot: boolean;
  canRecover: boolean;
}

/**
 * UndoManager - Handles undo functionality with fallback reconstruction
 */
export class UndoManager {
  private static readonly UNDO_STACK_KEY = 'undoStackState';
  private static readonly MAX_UNDO_STACK_SIZE = 10;

  /**
   * State keys that need to be saved/restored for complete game state
   */
  private static readonly CORE_STATE_KEYS = [
    'gameActionsState',
    'characterState',
    'characterStatsState',
    'inventoryState',
    'npcState',
    'storyState',
    'historyMessagesState',
    'playerCharactersGameState',
    'playerCharactersIdToNamesMapState',
    'relatedStoryHistoryState',
    'relatedActionHistoryState',
    'customMemoriesState',
    'customGMNotesState',
    'chosenActionState',
    'additionalStoryInputState',
    'additionalActionInputState',
    'thoughtsState',
    'rollDifferenceHistoryState',
    'skillsProgressionState',
    'eventEvaluationState',
    'characterTransformState',
    'levelUpState',
    'campaignState',
    'currentChapterState',
    'gameTimeState',
    'isGameEnded'
  ] as const;

  /**
   * Save a snapshot of the current game state before an action
   */
  static saveSnapshot(description?: string): boolean {
    try {
      const gameActionsState = this.getLocalStorageItem<GameActionState[]>('gameActionsState', []);
      const currentActionId = gameActionsState.length > 0 ? gameActionsState[gameActionsState.length - 1].id : 0;

      const snapshot: UndoSnapshot = {
        timestamp: Date.now(),
        gameActionId: currentActionId,
        description: description || `Action ${currentActionId}`,
        states: {}
      };

      // Capture all relevant states
      this.CORE_STATE_KEYS.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            snapshot.states[key] = JSON.parse(value);
          } catch (e) {
            console.warn(`Failed to parse state ${key} for snapshot:`, e);
          }
        }
      });

      // Add to undo stack
      const undoStack = this.getUndoStack();
      undoStack.push(snapshot);

      // Keep only the last MAX_UNDO_STACK_SIZE snapshots
      if (undoStack.length > this.MAX_UNDO_STACK_SIZE) {
        undoStack.shift();
      }

      localStorage.setItem(this.UNDO_STACK_KEY, JSON.stringify(undoStack));
      console.log(`Undo snapshot saved for action ${currentActionId}`);
      return true;
    } catch (error) {
      console.error('Failed to save undo snapshot:', error);
      return false;
    }
  }

  /**
   * Reconstruct game state from a specific GameActionState
   */
  static reconstructStateFromGameAction(targetActionId: number): boolean {
    try {
      const gameActionsState = this.getLocalStorageItem<GameActionState[]>('gameActionsState', []);

      if (!gameActionsState || gameActionsState.length === 0) {
        console.error('No game actions found for reconstruction');
        return false;
      }

      // Find target action index
      const targetIndex = gameActionsState.findIndex(action => action.id === targetActionId);
      if (targetIndex === -1) {
        console.error(`Action with ID ${targetActionId} not found`);
        return false;
      }

      // Keep only actions up to and including the target
      const actionsToKeep = gameActionsState.slice(0, targetIndex + 1);
      const lastAction = actionsToKeep[actionsToKeep.length - 1];

      console.log(`Reconstructing state from action ${targetActionId}...`);

      // Reconstruct core states from the last action
      if (lastAction.story) {
        // Note: GameActionState.story is narrative text, not a Story object
        // We need to preserve the existing Story structure and just update narrative content
        const existingStoryRaw = localStorage.getItem('storyState');
        let existingStory: Story;

        if (existingStoryRaw) {
          try {
            existingStory = JSON.parse(existingStoryRaw);
          } catch {
            existingStory = initialStoryState;
          }
        } else {
          existingStory = initialStoryState;
        }

        // Since Story object doesn't have a direct 'story' field, we could update main_scenario
        // or add the narrative to a relevant field. For now, we'll preserve the structure.
        const updatedStory: Story = {
          ...existingStory,
          // The story content from GameActionState is narrative text
          // We might store it in main_scenario or create a custom handling
          main_scenario: lastAction.story // Store narrative in main_scenario for now
        };

        localStorage.setItem('storyState', JSON.stringify(updatedStory));
      }

      // Reconstruct character state if it exists in the action
      // Note: GameActionState doesn't directly contain character state, but we can preserve existing

      // Update game actions to only keep up to target
      localStorage.setItem('gameActionsState', JSON.stringify(actionsToKeep));

      // Reconstruct history messages - keep only those corresponding to the actions we're keeping
      const historyMessages = this.getLocalStorageItem<LLMMessage[]>('historyMessagesState', []);
      // Assume each action corresponds to 2 history messages (user + model)
      const messagesToKeep = historyMessages.slice(0, (targetIndex + 1) * 2);
      localStorage.setItem('historyMessagesState', JSON.stringify(messagesToKeep));

      // Clear action-related states that should reset
      localStorage.setItem('relatedActionHistoryState', JSON.stringify([]));
      localStorage.removeItem('chosenActionState');
      localStorage.removeItem('additionalStoryInputState');
      localStorage.removeItem('additionalActionInputState');

      // Note: characterStats, inventory, npc states are typically managed through 
      // applyGameActionState function, so we may need to rebuild them from scratch

      console.log(`Successfully reconstructed state from action ${targetActionId}`);
      return true;

    } catch (error) {
      console.error('Error reconstructing state:', error);
      return false;
    }
  }

  /**
   * Perform smart undo with multiple fallback strategies
   */
  static smartUndo(stepsBack: number = 1): boolean {
    console.log(`Attempting to undo ${stepsBack} step(s)...`);

    // Strategy 1: Use existing undo stack if available
    const undoStack = this.getUndoStack();
    if (undoStack.length >= stepsBack) {
      console.log('Using undo stack for recovery');
      for (let i = 0; i < stepsBack; i++) {
        const snapshot = undoStack.pop();
        if (snapshot) {
          this.restoreSnapshot(snapshot);
        }
      }
      localStorage.setItem(this.UNDO_STACK_KEY, JSON.stringify(undoStack));
      return true;
    }

    // Strategy 2: Reconstruct from game actions
    const gameActionsState = this.getLocalStorageItem<GameActionState[]>('gameActionsState', []);
    if (gameActionsState.length > stepsBack) {
      console.log('Using game action reconstruction for recovery');
      const targetAction = gameActionsState[gameActionsState.length - stepsBack - 1];
      return this.reconstructStateFromGameAction(targetAction.id);
    }

    // Strategy 3: Find the most recent valid state
    if (gameActionsState.length > 0) {
      console.log('Falling back to most recent complete state');
      // Go back to the first action (essentially restart from beginning)
      const firstAction = gameActionsState[0];
      return this.reconstructStateFromGameAction(firstAction.id);
    }

    console.error('No recovery method available');
    return false;
  }

  /**
   * Get all available recovery points (snapshots + game actions)
   */
  static getRecoveryPoints(): RecoveryPoint[] {
    const recoveryPoints: RecoveryPoint[] = [];

    // Add undo stack snapshots
    const undoStack = this.getUndoStack();
    undoStack.forEach((snapshot, index) => {
      recoveryPoints.push({
        id: snapshot.gameActionId,
        description: `📸 ${snapshot.description}`,
        timestamp: snapshot.timestamp,
        isSnapshot: true,
        canRecover: true
      });
    });

    // Add game action checkpoints
    const gameActionsState = this.getLocalStorageItem<GameActionState[]>('gameActionsState', []);
    gameActionsState.forEach((action) => {
      // Don't duplicate if already in snapshots
      if (!recoveryPoints.find(p => p.id === action.id && p.isSnapshot)) {
        recoveryPoints.push({
          id: action.id,
          description: `🎮 Action ${action.id}: ${action.story?.substring(0, 50) || 'Game action'}...`,
          isSnapshot: false,
          canRecover: true
        });
      }
    });

    // Sort by ID descending (most recent first)
    return recoveryPoints.sort((a, b) => b.id - a.id);
  }

  /**
   * Recover to a specific point by ID
   */
  static recoverToPoint(actionId: number): boolean {
    console.log(`Recovering to action ID ${actionId}...`);

    // First try to find in snapshots
    const undoStack = this.getUndoStack();
    const snapshot = undoStack.find(s => s.gameActionId === actionId);

    if (snapshot) {
      console.log('Recovering from snapshot');
      this.restoreSnapshot(snapshot);
      // Remove this snapshot and any newer ones from the stack
      const filteredStack = undoStack.filter(s => s.gameActionId < actionId);
      localStorage.setItem(this.UNDO_STACK_KEY, JSON.stringify(filteredStack));
      return true;
    }

    // Otherwise reconstruct from game actions
    return this.reconstructStateFromGameAction(actionId);
  }

  /**
   * Check if undo is possible
   */
  static canUndo(): boolean {
    const undoStack = this.getUndoStack();
    const gameActionsState = this.getLocalStorageItem<GameActionState[]>('gameActionsState', []);
    return undoStack.length > 0 || gameActionsState.length > 1;
  }

  /**
   * Get undo availability info
   */
  static getUndoInfo(): { canUndo: boolean; snapshotsAvailable: number; actionsAvailable: number } {
    const undoStack = this.getUndoStack();
    const gameActionsState = this.getLocalStorageItem<GameActionState[]>('gameActionsState', []);

    return {
      canUndo: undoStack.length > 0 || gameActionsState.length > 1,
      snapshotsAvailable: undoStack.length,
      actionsAvailable: gameActionsState.length
    };
  }

  /**
   * Clear all undo history
   */
  static clearUndoStack(): void {
    localStorage.removeItem(this.UNDO_STACK_KEY);
    console.log('Undo stack cleared');
  }

  /**
   * Private helper methods
   */
  private static restoreSnapshot(snapshot: UndoSnapshot): void {
    console.log(`Restoring snapshot from ${new Date(snapshot.timestamp).toLocaleString()}`);
    Object.entries(snapshot.states).forEach(([key, value]) => {
      localStorage.setItem(key, JSON.stringify(value));
    });
  }

  private static getUndoStack(): UndoSnapshot[] {
    try {
      const stack = localStorage.getItem(this.UNDO_STACK_KEY);
      return stack ? JSON.parse(stack) : [];
    } catch (error) {
      console.warn('Failed to parse undo stack, starting fresh:', error);
      return [];
    }
  }

  private static getLocalStorageItem<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Failed to parse localStorage item ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Debug method to export current state for inspection
   */
  static exportCurrentState(): object {
    const currentState: { [key: string]: any } = {};

    this.CORE_STATE_KEYS.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          currentState[key] = JSON.parse(value);
        } catch (e) {
          currentState[key] = value; // Keep as string if can't parse
        }
      }
    });

    return {
      timestamp: new Date().toISOString(),
      undoInfo: this.getUndoInfo(),
      recoveryPoints: this.getRecoveryPoints().slice(0, 5), // Last 5 points
      currentState
    };
  }
}
