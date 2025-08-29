/**
 * Game Action Helper - Integrates UndoManager with game flow
 * 
 * This utility ensures that snapshots are saved before each game action,
 * providing automatic undo functionality without requiring manual snapshot management.
 */

import { UndoManager } from './undoManager';

/**
 * Save a snapshot before performing a game action
 * This should be called before any action that changes game state
 */
export function saveSnapshotBeforeAction(): void {
  UndoManager.saveSnapshot('Before game action');
  console.log('Snapshot saved before game action');
}

/**
 * Perform undo and refresh the page to reflect changes
 * Returns true if undo was successful, false otherwise
 */
export function performUndo(): boolean {
  try {
    const success = UndoManager.smartUndo();

    if (success) {
      console.log('Undo successful - refreshing page to reflect changes');
      // Refresh the page to ensure all components reflect the undone state
      window.location.reload();
      return true;
    } else {
      console.warn('Undo operation failed');
      return false;
    }
  } catch (error) {
    console.error('Error during undo operation:', error);
    return false;
  }
}

/**
 * Check if undo is available
 */
export function canPerformUndo(): boolean {
  try {
    const gameActionsRaw = localStorage.getItem('gameActionsState');
    if (!gameActionsRaw) return false;

    const gameActions = JSON.parse(gameActionsRaw);
    return Array.isArray(gameActions) && gameActions.length > 1;
  } catch {
    return false;
  }
}

/**
 * Get information about the last action that can be undone
 */
export function getLastActionInfo(): { actionId: number | null; canUndo: boolean } {
  try {
    const gameActionsRaw = localStorage.getItem('gameActionsState');
    if (!gameActionsRaw) {
      return { actionId: null, canUndo: false };
    }

    const gameActions = JSON.parse(gameActionsRaw);
    if (!Array.isArray(gameActions) || gameActions.length <= 1) {
      return { actionId: null, canUndo: false };
    }

    const lastAction = gameActions[gameActions.length - 1];
    return {
      actionId: lastAction?.id || null,
      canUndo: true
    };
  } catch {
    return { actionId: null, canUndo: false };
  }
}

/**
 * Wrapper function for game actions that automatically saves snapshots
 * Use this to wrap any function that performs game actions
 */
export function withUndo<T extends unknown[], R>(
  actionFunction: (...args: T) => R | Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    // Save snapshot before action
    saveSnapshotBeforeAction();

    // Perform the action
    const result = await actionFunction(...args);

    return result;
  };
}

/**
 * Decorator for action handlers that automatically saves snapshots
 * Example usage:
 * 
 * const handleGameAction = undoableAction(async (action: string) => {
 *   // Your game action logic here
 *   await performGameAction(action);
 * });
 */
export function undoableAction<T extends unknown[], R>(
  actionFunction: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return withUndo(actionFunction);
}
