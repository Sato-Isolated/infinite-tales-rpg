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

import type { GameActionState } from '$lib/types/gameState';
import type { InventoryState } from '$lib/types/inventory';
import type { PlayerCharactersGameState, PlayerCharactersIdToNamesMap } from '$lib/types/players';
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
  private static readonly MAX_UNDO_STACK_SIZE = 5; // Reduced from 15 to prevent storage quota issues

  /**
   * Critical state keys that are essential for undo functionality
   * Excludes large history states to prevent storage quota issues
   */
  private static readonly CRITICAL_STATE_KEYS = [
    'gameActionsState',
    'characterState',
    'characterStatsState',
    'inventoryState',
    'npcState',
    'storyState',
    'playerCharactersGameState',
    'playerCharactersIdToNamesMapState',
    'customMemoriesState',
    'customGMNotesState',
    'chosenActionState',
    'additionalStoryInputState',
    'additionalActionInputState',
    'skillsProgressionState',
    'eventEvaluationState',
    'characterTransformState',
    'levelUpState',
    'gameTimeState',
    'isGameEnded'
  ] as const;

  /**
   * Large state keys excluded from snapshots to prevent storage issues
   * These states can be reconstructed or are not critical for undo
   */
  private static readonly EXCLUDED_LARGE_STATES = [
    'historyMessagesState',      // Can be very large, not critical for undo
    'relatedStoryHistoryState',  // Large contextual data, can be reconstructed
    'relatedActionHistoryState', // Large contextual data, can be reconstructed  
    'thoughtsState',            // Large AI thoughts, not critical for undo
    'rollDifferenceHistoryState' // Historical data, not critical for undo
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

      // Enhanced logging to track snapshot timing
      const undoStack = this._loadUndoStack();
      const lastSnapshot = undoStack[undoStack.length - 1];

      // Prevent duplicate snapshots for the same action
      if (undoStack.length > 0 && undoStack[0].gameActionId === currentActionId) {
        console.log(`Skipping duplicate snapshot for action ${currentActionId}`);
        return true;
      }

      const snapshot: UndoSnapshot = {
        timestamp: Date.now(),
        gameActionId: currentActionId,
        description: description || `Action ${currentActionId}`,
        states: {}
      };

      // Capture current state for all critical keys (excluding large states to prevent quota issues)
      this.CRITICAL_STATE_KEYS.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            snapshot.states[key] = JSON.parse(value);
          } catch (e) {
            console.warn(`Failed to parse state ${key} for snapshot:`, e);
          }
        }
      });

      // Add new snapshot at the beginning (index 0 = most recent)
      undoStack.unshift(snapshot);

      // Maintain ring buffer size (remove oldest from the end)
      while (undoStack.length > this.MAX_UNDO_STACK_SIZE) {
        const removed = undoStack.pop();
        console.log(`Ring buffer full: removed oldest snapshot for action ${removed?.gameActionId}`);
      }

      // Save atomically
      if (this._saveUndoStack(undoStack)) {
        console.log(`Saved snapshot for action ${currentActionId} (count=${undoStack.length}/${this.MAX_UNDO_STACK_SIZE}) - ${description || 'Auto'}`);
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

      // Enhanced validation and logging
      if (undoStack.length === 0) {
        console.log('No snapshots available for undo');
        return false;
      }

      // Need at least stepsBack + 1 snapshots to undo stepsBack steps
      if (undoStack.length <= stepsBack) {
        console.log(`Cannot undo ${stepsBack} step(s) - only ${undoStack.length} snapshot(s) available`);

        // If we have any snapshots, offer to go to the oldest available
        if (undoStack.length > 0) {
          const oldestSnapshot = undoStack[0];
          console.log(`Alternative: Can restore to oldest available snapshot (action ${oldestSnapshot.gameActionId})`);

          // For better UX, restore to the oldest snapshot if user requested more steps than available
          return this.recoverToPoint(oldestSnapshot.gameActionId);
        }

        return false;
      }

      // Calculate target index (with index 0 = most recent)
      // To go back stepsBack steps, we want index stepsBack
      const targetIndex = stepsBack;

      // Make sure the target index exists
      if (targetIndex >= undoStack.length) {
        console.log(`Cannot undo ${stepsBack} step(s) - only ${undoStack.length} snapshot(s) available`);

        // If we have any snapshots, offer to go to the oldest available
        if (undoStack.length > 0) {
          const oldestSnapshot = undoStack[undoStack.length - 1];
          console.log(`Alternative: Can restore to oldest available snapshot (action ${oldestSnapshot.gameActionId})`);

          // For better UX, restore to the oldest snapshot if user requested more steps than available
          return this.recoverToPoint(oldestSnapshot.gameActionId);
        }

        return false;
      }

      const targetSnapshot = undoStack[targetIndex];

      // Enhanced logging for debugging
      const currentGameActions = this._getLocalStorageItem<GameActionState[]>('gameActionsState', []);
      const currentActionId = currentGameActions.length > 0 ? currentGameActions[currentGameActions.length - 1].id : 0;

      console.log(`Undo request: ${stepsBack} step(s) back from current action ${currentActionId}`);
      console.log(`Target snapshot: action ${targetSnapshot.gameActionId} (${targetSnapshot.description})`);
      console.log(`Available snapshots: ${undoStack.map(s => s.gameActionId).join(', ')}`);

      // Restore target snapshot
      this._restoreSnapshot(targetSnapshot);

      // Cut timeline - remove all snapshots before target (newer snapshots)
      // Since index 0 is most recent, we remove elements from 0 to targetIndex-1
      const truncatedStack = undoStack.slice(targetIndex);

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

      // Find the latest snapshot with actionId <= target
      // Since index 0 is most recent, we search from beginning
      let targetIndex = -1;
      for (let i = 0; i < undoStack.length; i++) {
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

      // Cut timeline - remove all snapshots before target (newer snapshots)
      const truncatedStack = undoStack.slice(targetIndex);

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
    const latestSnapshot = undoStack.length > 0 ? undoStack[0] : undefined; // Index 0 = most recent

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
      }));
    // No need to reverse since index 0 is already most recent
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
      // Check if localStorage is available
      if (typeof localStorage === 'undefined') {
        return [];
      }

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
   * Save undo stack atomically using temporary key with quota management
   */
  private static _saveUndoStack(stack: UndoSnapshot[]): boolean {
    try {
      // Check if localStorage is available
      if (typeof localStorage === 'undefined') {
        return false;
      }

      const data = JSON.stringify(stack);

      // Check storage size before writing
      this._checkAndCleanupStorage(data.length);

      // Write to temp key first (atomic preparation)
      localStorage.setItem(this.UNDO_STACK_TEMP_KEY, data);

      // Swap to real key (atomic commit)
      localStorage.setItem(this.UNDO_STACK_KEY, data);

      // Clean up temp key
      localStorage.removeItem(this.UNDO_STACK_TEMP_KEY);

      return true;
    } catch (error) {
      console.error('Failed to save undo stack atomically:', error);

      // Handle QuotaExceededError specifically
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('Storage quota exceeded, attempting cleanup and retry...');

        // Aggressive cleanup: reduce snapshots and retry
        const reducedStack = stack.slice(0, Math.max(1, Math.floor(stack.length / 2)));
        console.log(`Reduced stack from ${stack.length} to ${reducedStack.length} snapshots`);

        try {
          const reducedData = JSON.stringify(reducedStack);
          localStorage.setItem(this.UNDO_STACK_TEMP_KEY, reducedData);
          localStorage.setItem(this.UNDO_STACK_KEY, reducedData);
          localStorage.removeItem(this.UNDO_STACK_TEMP_KEY);

          console.log('✅ Successfully saved reduced snapshot stack after quota cleanup');
          return true;
        } catch (retryError) {
          console.error('❌ Failed to save even after aggressive cleanup:', retryError);
          // Clear all snapshots as last resort
          this._clearAllSnapshots();
          return false;
        }
      }

      // Try to clean up temp key even if save failed
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(this.UNDO_STACK_TEMP_KEY);
        }
      } catch (cleanupError) {
        console.error('Failed to clean up temp key:', cleanupError);
      }

      return false;
    }
  }

  /**
   * Check storage usage and cleanup if needed
   */
  private static _checkAndCleanupStorage(newDataSize: number): void {
    try {
      // Estimate current localStorage usage
      const currentUsage = this._estimateStorageUsage();
      const estimatedNewUsage = currentUsage + newDataSize;

      // localStorage quota is typically 5-10MB, we'll be conservative and cleanup at 3MB
      const STORAGE_WARNING_THRESHOLD = 3 * 1024 * 1024; // 3MB

      if (estimatedNewUsage > STORAGE_WARNING_THRESHOLD) {
        console.warn(`Storage usage approaching limits (${Math.round(estimatedNewUsage / 1024 / 1024)}MB), cleaning up old snapshots...`);

        // Load current stack and reduce it aggressively
        const currentStack = this._loadUndoStack();
        if (currentStack.length > 2) {
          const reducedStack = currentStack.slice(0, 2); // Keep only 2 most recent
          console.log(`Preemptively reduced snapshots from ${currentStack.length} to ${reducedStack.length}`);

          // Save reduced stack directly
          localStorage.setItem(this.UNDO_STACK_KEY, JSON.stringify(reducedStack));
        }
      }
    } catch (error) {
      console.warn('Failed to check storage usage:', error);
    }
  }

  /**
   * Estimate current localStorage usage
   */
  private static _estimateStorageUsage(): number {
    try {
      if (typeof localStorage === 'undefined') {
        return 0;
      }

      let totalSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          const value = localStorage.getItem(key) || '';
          totalSize += key.length + value.length;
        }
      }
      return totalSize * 2; // Characters are roughly 2 bytes in UTF-16
    } catch (error) {
      console.warn('Failed to estimate storage usage:', error);
      return 0;
    }
  }

  /**
   * Emergency cleanup: clear all snapshots
   */
  private static _clearAllSnapshots(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(this.UNDO_STACK_KEY);
        localStorage.removeItem(this.UNDO_STACK_TEMP_KEY);
        console.log('🧹 Cleared all undo snapshots due to storage issues');
      }
    } catch (error) {
      console.error('Failed to clear snapshots:', error);
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
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, JSON.stringify(value));
        }
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
    // Check if localStorage is available
    if (typeof localStorage === 'undefined') {
      return;
    }

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
      // Check if localStorage is available
      if (typeof localStorage === 'undefined') {
        return defaultValue;
      }

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

    this.CRITICAL_STATE_KEYS.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          currentState[key] = JSON.parse(value);
        } catch (e) {
          currentState[key] = value; // Keep as string if can't parse
        }
      }
    });

    const undoStack = this._loadUndoStack();
    const gameActions = this._getLocalStorageItem<GameActionState[]>('gameActionsState', []);

    return {
      timestamp: new Date().toISOString(),
      undoInfo: this.getUndoInfo(),
      recoveryPoints: this.getRecoveryPoints().slice(0, 5), // Last 5 points
      ringBufferState: undoStack.map(s => ({
        actionId: s.gameActionId,
        description: s.description,
        timestamp: s.timestamp
      })),
      gameActionsState: {
        count: gameActions.length,
        lastActionId: gameActions.length > 0 ? gameActions[gameActions.length - 1].id : null,
        actions: gameActions.slice(-3).map(a => ({ id: a.id, story: a.story?.substring(0, 50) + '...' }))
      },
      diagnostics: this.diagnoseUndoConsistency(),
      currentState
    };
  }

  /**
   * Diagnose potential undo consistency issues
   */
  static diagnoseUndoConsistency(): {
    issues: string[],
    snapshotGaps: number[],
    recommendations: string[]
  } {
    const undoStack = this._loadUndoStack();
    const gameActions = this._getLocalStorageItem<GameActionState[]>('gameActionsState', []);
    const issues: string[] = [];
    const snapshotGaps: number[] = [];
    const recommendations: string[] = [];

    if (undoStack.length === 0 && gameActions.length > 0) {
      issues.push('No snapshots available despite having game actions');
      recommendations.push('Ensure saveSnapshotBeforeAction() is called for every game action');
    }

    if (undoStack.length > 0 && gameActions.length > 0) {
      const latestSnapshot = undoStack[0]; // Index 0 = most recent
      const lastAction = gameActions[gameActions.length - 1];

      if (latestSnapshot.gameActionId < lastAction.id - 1) {
        const gap = lastAction.id - latestSnapshot.gameActionId;
        issues.push(`Snapshot gap detected: latest snapshot is for action ${latestSnapshot.gameActionId}, but current action is ${lastAction.id}`);
        snapshotGaps.push(gap);
        recommendations.push('Some actions may not be creating snapshots - check integration');
      }
    }

    // Check for very old snapshots that might indicate ring buffer issues
    if (undoStack.length >= this.MAX_UNDO_STACK_SIZE * 0.8) {
      issues.push(`Ring buffer is ${Math.round(undoStack.length / this.MAX_UNDO_STACK_SIZE * 100)}% full`);
      recommendations.push('Consider increasing MAX_UNDO_STACK_SIZE if users perform many actions');
    }

    return { issues, snapshotGaps, recommendations };
  }
}

