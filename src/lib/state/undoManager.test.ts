/**
 * Tests for the Undo System
 * 
 * This test file validates the core functionality of the undo system
 * including snapshot saving, restoration, and edge cases.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UndoManager } from '$lib/state/undoManager';
import { saveSnapshotBeforeAction, performUndo, canPerformUndo, getLastActionInfo } from '$lib/state/gameActionHelper';

// Mock localStorage for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }
  } as Storage;
})();

// Mock window and location for testing
const windowMock = {
  localStorage: localStorageMock,
  location: {
    reload: vi.fn()
  }
};

// Setup global mocks
global.localStorage = localStorageMock;
global.window = windowMock as any;

describe('UndoManager Core', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should save and restore snapshots correctly', () => {
    // Setup initial game state
    const initialGameState = [
      { id: 1, story: 'Initial story', currentPlotPoint: 'Start' }
    ];
    const initialCharacterState = { name: 'Test Hero', level: 1 };

    localStorage.setItem('gameActionsState', JSON.stringify(initialGameState));
    localStorage.setItem('characterState', JSON.stringify(initialCharacterState));

    // Save snapshot
    const success = UndoManager.saveSnapshot('Test snapshot');
    expect(success).toBe(true);

    // Modify state
    const modifiedGameState = [
      ...initialGameState,
      { id: 2, story: 'Second story', currentPlotPoint: 'Middle' }
    ];
    const modifiedCharacterState = { name: 'Test Hero', level: 2 };

    localStorage.setItem('gameActionsState', JSON.stringify(modifiedGameState));
    localStorage.setItem('characterState', JSON.stringify(modifiedCharacterState));

    // Verify state was modified
    expect(JSON.parse(localStorage.getItem('gameActionsState')!)).toHaveLength(2);
    expect(JSON.parse(localStorage.getItem('characterState')!).level).toBe(2);

    // Perform undo
    const undoSuccess = UndoManager.smartUndo();
    expect(undoSuccess).toBe(true);

    // Verify state was restored
    expect(JSON.parse(localStorage.getItem('gameActionsState')!)).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem('characterState')!).level).toBe(1);
  });

  it('should handle missing snapshots with reconstruction', () => {
    // Setup game actions without snapshots
    const gameActions = [
      { id: 1, story: 'First action', currentPlotPoint: 'Start' },
      { id: 2, story: 'Second action', currentPlotPoint: 'Middle' },
      { id: 3, story: 'Third action', currentPlotPoint: 'End' }
    ];

    localStorage.setItem('gameActionsState', JSON.stringify(gameActions));

    // Try undo without snapshots (should use reconstruction)
    const success = UndoManager.smartUndo();
    expect(success).toBe(true);

    // Should have removed the last action
    const remainingActions = JSON.parse(localStorage.getItem('gameActionsState')!);
    expect(remainingActions).toHaveLength(2);
    expect(remainingActions[1].id).toBe(2);
  });

  it('should limit snapshot stack size', () => {
    // Create more than 10 snapshots
    for (let i = 0; i < 15; i++) {
      localStorage.setItem('gameActionsState', JSON.stringify([{ id: i, story: `Story ${i}` }]));
      UndoManager.saveSnapshot(`Snapshot ${i}`);
    }

    // Check that only 10 snapshots are kept
    const undoStack = JSON.parse(localStorage.getItem('undoStackState') || '[]');
    expect(undoStack.length).toBeLessThanOrEqual(10);
  });
});

describe('Game Action Helper', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should save snapshot before action', () => {
    localStorage.setItem('gameActionsState', JSON.stringify([{ id: 1, story: 'Test' }]));

    saveSnapshotBeforeAction();

    const undoStack = JSON.parse(localStorage.getItem('undoStackState') || '[]');
    expect(undoStack.length).toBe(1);
  });

  it('should correctly detect undo availability', () => {
    // No actions - should not be able to undo
    expect(canPerformUndo()).toBe(false);

    // Single action - should not be able to undo
    localStorage.setItem('gameActionsState', JSON.stringify([{ id: 1, story: 'Test' }]));
    expect(canPerformUndo()).toBe(false);

    // Multiple actions - should be able to undo
    localStorage.setItem('gameActionsState', JSON.stringify([
      { id: 1, story: 'First' },
      { id: 2, story: 'Second' }
    ]));
    expect(canPerformUndo()).toBe(true);
  });

  it('should provide correct last action info', () => {
    // No actions
    let info = getLastActionInfo();
    expect(info.canUndo).toBe(false);
    expect(info.actionId).toBeNull();

    // With actions
    localStorage.setItem('gameActionsState', JSON.stringify([
      { id: 1, story: 'First' },
      { id: 2, story: 'Second' }
    ]));

    info = getLastActionInfo();
    expect(info.canUndo).toBe(true);
    expect(info.actionId).toBe(2);
  });
});

describe('Edge Cases', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should handle corrupted localStorage gracefully', () => {
    // Corrupted gameActionsState
    localStorage.setItem('gameActionsState', 'invalid json');

    const canUndo = canPerformUndo();
    expect(canUndo).toBe(false);

    const success = UndoManager.smartUndo();
    expect(success).toBe(false);
  });

  it('should handle empty game state', () => {
    // Empty game actions
    localStorage.setItem('gameActionsState', JSON.stringify([]));

    const success = UndoManager.smartUndo();
    expect(success).toBe(false);
  });

  it('should handle malformed snapshot data', () => {
    // Corrupted undo stack
    localStorage.setItem('undoStackState', 'invalid json');
    localStorage.setItem('gameActionsState', JSON.stringify([
      { id: 1, story: 'First' },
      { id: 2, story: 'Second' }
    ]));

    // Should fall back to reconstruction
    const success = UndoManager.smartUndo();
    expect(success).toBe(true);
  });
});

describe('Integration with Game Flow', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should preserve game state integrity across undo operations', () => {
    // Setup complex game state
    const character = { name: 'Hero', class: 'Warrior', level: 5 };
    const inventory = { items: [{ name: 'Sword', quantity: 1 }] };
    const gameActions = [
      { id: 1, story: 'Found sword', inventory_update: [{ item_name: 'Sword', change: 1 }] }
    ];

    localStorage.setItem('characterState', JSON.stringify(character));
    localStorage.setItem('inventoryState', JSON.stringify(inventory));
    localStorage.setItem('gameActionsState', JSON.stringify(gameActions));

    // Save snapshot
    UndoManager.saveSnapshot('Before battle');

    // Simulate battle outcome
    const updatedCharacter = { ...character, level: 6 };
    const updatedInventory = { items: [{ name: 'Sword', quantity: 1 }, { name: 'Shield', quantity: 1 }] };
    const updatedActions = [
      ...gameActions,
      { id: 2, story: 'Won battle', inventory_update: [{ item_name: 'Shield', change: 1 }] }
    ];

    localStorage.setItem('characterState', JSON.stringify(updatedCharacter));
    localStorage.setItem('inventoryState', JSON.stringify(updatedInventory));
    localStorage.setItem('gameActionsState', JSON.stringify(updatedActions));

    // Verify updated state
    expect(JSON.parse(localStorage.getItem('characterState')!).level).toBe(6);
    expect(JSON.parse(localStorage.getItem('inventoryState')!).items).toHaveLength(2);

    // Undo battle
    const success = UndoManager.smartUndo();
    expect(success).toBe(true);

    // Verify state was properly restored
    expect(JSON.parse(localStorage.getItem('characterState')!).level).toBe(5);
    expect(JSON.parse(localStorage.getItem('inventoryState')!).items).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem('gameActionsState')!)).toHaveLength(1);
  });
});
