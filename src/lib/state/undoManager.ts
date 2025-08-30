/**
 * Undo Manager - Ring Buffer Based State Management System
 * 
 * This system uses a pure ring buffer approach with the following principles:
 * 1. Fixed capacity ring buffer (10 snapshots maximum)
 * 2. FIFO replacement policy - oldest snapshots are automatically removed
 * 3. No complex reconstruction - only direct snapshot restoration
 * 4. Atomic writes with temporary keys for data integrity
 * 5. Temporal coherence - restoring to a point removes future snapshots
 * 
 * Architecture:
 * - Ring buffer maintains chronological order
 * - Each snapshot captures complete game state
 * - Undo operations cut timeline to maintain consistency
 * - Bounded memory usage prevents storage bloat
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
 * UndoManager - Ring Buffer Based Undo System
 * 
 * Pure snapshot-based undo system using a fixed-size ring buffer.
 * No complex reconstruction, no dual strategies, just simple and reliable snapshots.
 */
export class UndoManager {
  private static readonly UNDO_STACK_KEY = 'undoStackState';
  private static readonly UNDO_STACK_TEMP_KEY = `${this.UNDO_STACK_KEY}_temp`;
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
   * Volatile UI states that should be cleaned after restoration
   */
  private static readonly VOLATILE_STATE_KEYS = [
    'chosenActionState',
    'additionalStoryInputState',
    'additionalActionInputState',
    'relatedActionHistoryState'
  ] as const;

  /**
   * Save a snapshot using ring buffer - when buffer is full, oldest snapshot is removed
   */
  static saveSnapshot(description?: string): boolean {
    try {
      const gameActionsState = this._getLocalStorageItem<GameActionState[]>('gameActionsState', []);
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

      // Load current ring buffer
      const undoStack = this._loadUndoStack();

      // Add new snapshot to ring buffer
      undoStack.push(snapshot);

      // Maintain ring buffer size (FIFO - remove oldest when full)
      while (undoStack.length > this.MAX_UNDO_STACK_SIZE) {
        undoStack.shift();
      }

      // Save atomically
      if (this._saveUndoStack(undoStack)) {
        console.log(`Saved snapshot for action ${currentActionId} (count=${undoStack.length}/${this.MAX_UNDO_STACK_SIZE})`);
        return true;
      } else {
        console.error('Failed to save undo stack atomically');
        return false;
      }
    } catch (error) {
      console.error('Failed to save undo snapshot:', error);
      return false;
    }
  }

  /**
   * Perform undo operation using only snapshots (no fallback strategies)
   * Implements temporal coherence - restoring cuts future timeline
   */
  static smartUndo(stepsBack: number = 1): boolean {
    if (stepsBack <= 0) {
      console.warn('Invalid stepsBack value:', stepsBack);
      return false;
    }

    try {
      const undoStack = this._loadUndoStack();

      // Need at least stepsBack + 1 snapshots to undo stepsBack steps
      if (undoStack.length <= stepsBack) {
        console.log(`Cannot undo ${stepsBack} step(s) - only ${undoStack.length} snapshot(s) available`);
        return false;
      }

      // Calculate target index (chronologically earlier)
      const targetIndex = undoStack.length - stepsBack - 1;
      const targetSnapshot = undoStack[targetIndex];

      console.log(`Undoing ${stepsBack} step(s) to action ${targetSnapshot.gameActionId} (${targetSnapshot.description})`);

      // Restore target snapshot
      this._restoreSnapshot(targetSnapshot);

      // Cut timeline - remove all snapshots after target (temporal coherence)
      const truncatedStack = undoStack.slice(0, targetIndex + 1);

      // Save truncated stack
      if (this._saveUndoStack(truncatedStack)) {
        console.log(`Timeline cut at action ${targetSnapshot.gameActionId} - removed ${undoStack.length - truncatedStack.length} future snapshots`);
        return true;
      } else {
        console.error('Failed to save truncated undo stack');
        return false;
      }
    } catch (error) {
      console.error('Error during smart undo:', error);
      return false;
    }
  }

  /**
   * Recover to a specific action ID using only snapshots
   * Implements temporal coherence - removes newer snapshots
   */
  static recoverToPoint(actionId: number): boolean {
    try {
      const undoStack = this._loadUndoStack();

      if (undoStack.length === 0) {
        console.log('No snapshots available for recovery');
        return false;
      }

      // Find the latest snapshot with actionId <= target (allows recovery to intermediate points)
      let targetIndex = -1;
      for (let i = undoStack.length - 1; i >= 0; i--) {
        if (undoStack[i].gameActionId <= actionId) {
          targetIndex = i;
          break;
        }
      }

      if (targetIndex === -1) {
        console.log(`No snapshot found for actionId ${actionId} or earlier`);
        return false;
      }

      const targetSnapshot = undoStack[targetIndex];
      console.log(`Recovering to action ${targetSnapshot.gameActionId} (${targetSnapshot.description})`);

      // Restore target snapshot
      this._restoreSnapshot(targetSnapshot);

      // Cut timeline - remove all snapshots after target
      const truncatedStack = undoStack.slice(0, targetIndex + 1);

      // Save truncated stack
      if (this._saveUndoStack(truncatedStack)) {
        console.log(`Recovery complete - removed ${undoStack.length - truncatedStack.length} future snapshots`);
        return true;
      } else {
        console.error('Failed to save truncated stack after recovery');
        return false;
      }
    } catch (error) {
      console.error('Error during recovery:', error);
      return false;
    }
  }

  /**
   * Check if undo is possible
   */
  static canUndo(): boolean {
    const undoStack = this._loadUndoStack();
    return undoStack.length > 1; // Need at least 2 snapshots to undo 1 step
  }

  /**
   * Get undo availability info
   */
  static getUndoInfo(): { canUndo: boolean; snapshotsAvailable: number; latestActionId?: number } {
    const undoStack = this._loadUndoStack();
    const latestSnapshot = undoStack[undoStack.length - 1];

    return {
      canUndo: undoStack.length > 1,
      snapshotsAvailable: undoStack.length,
      latestActionId: latestSnapshot?.gameActionId
    };
  }

  /**
   * Get all available recovery points (snapshots only)
   */
  static getRecoveryPoints(): RecoveryPoint[] {
    const undoStack = this._loadUndoStack();
    
    return undoStack
      .map(snapshot => ({
        id: snapshot.gameActionId,
        description: `📸 ${snapshot.description}`,
        timestamp: snapshot.timestamp,
        isSnapshot: true,
        canRecover: true
      }))
      .reverse(); // Most recent first
  }

  /**
   * Clear all undo history
   */
  static clearUndoStack(): void {
    try {
      localStorage.removeItem(this.UNDO_STACK_KEY);
      localStorage.removeItem(this.UNDO_STACK_TEMP_KEY); // Clean up temp key too
      console.log('Undo stack cleared');
    } catch (error) {
      console.error('Error clearing undo stack:', error);
    }
  }

  /**
   * Private helper methods
   */

  /**
   * Load undo stack with corruption handling
   */
  private static _loadUndoStack(): UndoSnapshot[] {
    try {
      const stack = localStorage.getItem(this.UNDO_STACK_KEY);
      if (!stack) {
        return [];
      }

      const parsed = JSON.parse(stack);
      if (!Array.isArray(parsed)) {
        console.warn('Undo stack is not an array, starting fresh');
        return [];
      }

      // Validate snapshot structure
      const validated = parsed.filter(item => 
        item && 
        typeof item.timestamp === 'number' &&
        typeof item.gameActionId === 'number' &&
        typeof item.description === 'string' &&
        typeof item.states === 'object'
      );

      if (validated.length !== parsed.length) {
        console.warn(`Filtered ${parsed.length - validated.length} invalid snapshots`);
      }

      return validated;
    } catch (error) {
      console.warn('Failed to parse undo stack, starting fresh:', error);
      return [];
    }
  }

  /**
   * Save undo stack atomically using temporary key
   */
  private static _saveUndoStack(stack: UndoSnapshot[]): boolean {
    try {
      const data = JSON.stringify(stack);
      
      // Write to temp key first (atomic preparation)
      localStorage.setItem(this.UNDO_STACK_TEMP_KEY, data);
      
      // Swap to real key (atomic commit)
      localStorage.setItem(this.UNDO_STACK_KEY, data);
      
      // Clean up temp key
      localStorage.removeItem(this.UNDO_STACK_TEMP_KEY);
      
      return true;
    } catch (error) {
      console.error('Failed to save undo stack atomically:', error);
      
      // Try to clean up temp key even if save failed
      try {
        localStorage.removeItem(this.UNDO_STACK_TEMP_KEY);
      } catch (cleanupError) {
        console.error('Failed to clean up temp key:', cleanupError);
      }
      
      return false;
    }
  }

  /**
   * Restore snapshot states to localStorage
   */
  private static _restoreSnapshot(snapshot: UndoSnapshot): void {
    console.log(`Restoring snapshot from ${new Date(snapshot.timestamp).toLocaleString()}`);
    
    // Restore all captured states
    Object.entries(snapshot.states).forEach(([key, value]) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(`Failed to restore state ${key}:`, error);
      }
    });

    // Clean up volatile UI states that shouldn't persist after restoration
    this._cleanupVolatileStates();
  }

  /**
   * Clean up volatile UI states after restoration
   */
  private static _cleanupVolatileStates(): void {
    this.VOLATILE_STATE_KEYS.forEach(key => {
      try {
        // Reset to empty/default values rather than removing completely
        switch (key) {
          case 'chosenActionState':
            localStorage.setItem(key, JSON.stringify({ characterName: "", text: "", is_possible: true }));
            break;
          case 'additionalStoryInputState':
          case 'additionalActionInputState':
            localStorage.setItem(key, JSON.stringify(""));
            break;
          case 'relatedActionHistoryState':
            localStorage.setItem(key, JSON.stringify([]));
            break;
          default:
            localStorage.removeItem(key);
        }
      } catch (error) {
        console.warn(`Failed to clean volatile state ${key}:`, error);
      }
    });
  }

  /**
   * Safe localStorage item getter with fallback
   */
  private static _getLocalStorageItem<T>(key: string, defaultValue: T): T {
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
      ringBufferState: this._loadUndoStack().map(s => ({
        actionId: s.gameActionId,
        description: s.description,
        timestamp: s.timestamp
      })),
      currentState
    };
  }
}
