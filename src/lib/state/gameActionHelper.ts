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
  try {
    // Check if we're in a browser environment
    if (typeof localStorage === 'undefined') {
      console.log('⚠️ localStorage not available (test environment)');
      return;
    }
    
    // Get current action count to create meaningful description
    const gameActions = JSON.parse(localStorage.getItem('gameActionsState') || '[]');
    const actionCount = gameActions.length;
    const nextActionId = actionCount > 0 ? gameActions[gameActions.length - 1].id + 1 : 1;
    
    const success = UndoManager.saveSnapshot(`Before Action ${nextActionId}`);
    
    if (success) {
      console.log(`✅ Snapshot saved before action ${nextActionId}`);
    } else {
      console.warn(`❌ Failed to save snapshot before action ${nextActionId}`);
    }
  } catch (error) {
    console.error('Error in saveSnapshotBeforeAction:', error);
  }
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
    const undoInfo = UndoManager.getUndoInfo();
    return undoInfo.canUndo;
  } catch {
    return false;
  }
}

/**
 * Get information about the last action that can be undone
 */
export function getLastActionInfo(): { actionId: number | null; canUndo: boolean } {
  try {
    const undoInfo = UndoManager.getUndoInfo();
    
    return {
      actionId: undoInfo.latestActionId || null,
      canUndo: undoInfo.canUndo
    };
  } catch {
    return { actionId: null, canUndo: false };
  }
}

/**
 * Validate undo system consistency and log any issues
 */
export function validateUndoConsistency(): boolean {
  try {
    // Check if we're in a browser environment
    if (typeof localStorage === 'undefined') {
      console.log('⚠️ localStorage not available (test environment) - skipping undo validation');
      return true; // Consider valid in test environment
    }
    
    const diagnostics = UndoManager.diagnoseUndoConsistency();
    
    if (diagnostics.issues.length > 0) {
      console.warn('🔍 Undo consistency issues detected:');
      diagnostics.issues.forEach(issue => console.warn(`  ⚠️ ${issue}`));
      
      if (diagnostics.recommendations.length > 0) {
        console.info('💡 Recommendations:');
        diagnostics.recommendations.forEach(rec => console.info(`  📝 ${rec}`));
      }
      
      return false;
    }
    
    console.log('✅ Undo system consistency check passed');
    return true;
  } catch (error) {
    console.error('❌ Error during undo consistency validation:', error);
    return false;
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
