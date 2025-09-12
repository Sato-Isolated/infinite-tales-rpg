import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  saveSnapshotBeforeAction,
  performUndo,
  canPerformUndo,
  getLastActionInfo,
  validateUndoConsistency,
  withUndo
} from '../gameActionHelper';
import { UndoManager } from '../undoManager';

// Mock UndoManager
vi.mock('../undoManager', () => {
  return {
    UndoManager: {
      saveSnapshot: vi.fn(),
      smartUndo: vi.fn(),
      getUndoInfo: vi.fn(),
      diagnoseUndoConsistency: vi.fn()
    }
  };
});

// Mock console methods to test logging
const mockConsole = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn()
};

// Mock window.location.reload
const mockReload = vi.fn();
Object.defineProperty(global, 'window', {
  value: {
    location: {
      reload: mockReload
    }
  },
  writable: true
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

describe('gameActionHelper', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset console mocks
    vi.spyOn(console, 'log').mockImplementation(mockConsole.log);
    vi.spyOn(console, 'warn').mockImplementation(mockConsole.warn);
    vi.spyOn(console, 'error').mockImplementation(mockConsole.error);
    vi.spyOn(console, 'info').mockImplementation(mockConsole.info);

    // Mock localStorage
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('saveSnapshotBeforeAction', () => {
    it('should save snapshot successfully with valid game actions', () => {
      // Arrange
      const gameActions = [
        { id: 1, action: 'test action 1' },
        { id: 2, action: 'test action 2' }
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(gameActions));
      vi.mocked(UndoManager.saveSnapshot).mockReturnValue(true);

      // Act
      saveSnapshotBeforeAction();

      // Assert
      expect(localStorageMock.getItem).toHaveBeenCalledWith('gameActionsState');
      expect(UndoManager.saveSnapshot).toHaveBeenCalledWith('Before Action 3');
      expect(mockConsole.log).toHaveBeenCalledWith('✅ Snapshot saved before action 3');
    });

    it('should handle empty game actions array', () => {
      // Arrange
      localStorageMock.getItem.mockReturnValue('[]');
      vi.mocked(UndoManager.saveSnapshot).mockReturnValue(true);

      // Act
      saveSnapshotBeforeAction();

      // Assert
      expect(UndoManager.saveSnapshot).toHaveBeenCalledWith('Before Action 1');
      expect(mockConsole.log).toHaveBeenCalledWith('✅ Snapshot saved before action 1');
    });

    it('should handle null localStorage value', () => {
      // Arrange
      localStorageMock.getItem.mockReturnValue(null);
      vi.mocked(UndoManager.saveSnapshot).mockReturnValue(true);

      // Act
      saveSnapshotBeforeAction();

      // Assert
      expect(UndoManager.saveSnapshot).toHaveBeenCalledWith('Before Action 1');
      expect(mockConsole.log).toHaveBeenCalledWith('✅ Snapshot saved before action 1');
    });

    it('should warn when snapshot save fails', () => {
      // Arrange
      localStorageMock.getItem.mockReturnValue('[]');
      vi.mocked(UndoManager.saveSnapshot).mockReturnValue(false);

      // Act
      saveSnapshotBeforeAction();

      // Assert
      expect(UndoManager.saveSnapshot).toHaveBeenCalledWith('Before Action 1');
      expect(mockConsole.warn).toHaveBeenCalledWith('❌ Failed to save snapshot before action 1');
    });

    it('should handle undefined localStorage gracefully (test environment)', () => {
      // Arrange
      Object.defineProperty(global, 'localStorage', {
        value: undefined,
        writable: true
      });

      // Act
      saveSnapshotBeforeAction();

      // Assert
      expect(mockConsole.log).toHaveBeenCalledWith('⚠️ localStorage not available (test environment)');
      expect(UndoManager.saveSnapshot).not.toHaveBeenCalled();
    });

    it('should handle JSON parsing errors gracefully', () => {
      // Arrange
      localStorageMock.getItem.mockReturnValue('invalid json');

      // Act
      saveSnapshotBeforeAction();

      // Assert
      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error in saveSnapshotBeforeAction:',
        expect.any(Error)
      );
    });

    it('should handle UndoManager errors gracefully', () => {
      // Arrange
      localStorageMock.getItem.mockReturnValue('[]');
      vi.mocked(UndoManager.saveSnapshot).mockImplementation(() => {
        throw new Error('UndoManager error');
      });

      // Act
      saveSnapshotBeforeAction();

      // Assert
      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error in saveSnapshotBeforeAction:',
        expect.any(Error)
      );
    });
  });

  describe('performUndo', () => {
    it('should perform undo successfully and reload page', () => {
      // Arrange
      vi.mocked(UndoManager.smartUndo).mockReturnValue(true);

      // Act
      const result = performUndo();

      // Assert
      expect(UndoManager.smartUndo).toHaveBeenCalled();
      expect(mockConsole.log).toHaveBeenCalledWith('Undo successful - refreshing page to reflect changes');
      expect(mockReload).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle undo failure gracefully', () => {
      // Arrange
      vi.mocked(UndoManager.smartUndo).mockReturnValue(false);

      // Act
      const result = performUndo();

      // Assert
      expect(UndoManager.smartUndo).toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalledWith('Undo operation failed');
      expect(mockReload).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should handle UndoManager errors gracefully', () => {
      // Arrange
      vi.mocked(UndoManager.smartUndo).mockImplementation(() => {
        throw new Error('Undo error');
      });

      // Act
      const result = performUndo();

      // Assert
      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error during undo operation:',
        expect.any(Error)
      );
      expect(result).toBe(false);
    });
  });

  describe('canPerformUndo', () => {
    it('should return true when undo is available', () => {
      // Arrange
      vi.mocked(UndoManager.getUndoInfo).mockReturnValue({
        canUndo: true,
        snapshotsAvailable: 3,
        latestActionId: 5
      });

      // Act
      const result = canPerformUndo();

      // Assert
      expect(UndoManager.getUndoInfo).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when undo is not available', () => {
      // Arrange
      vi.mocked(UndoManager.getUndoInfo).mockReturnValue({
        canUndo: false,
        snapshotsAvailable: 1,
        latestActionId: undefined
      });

      // Act
      const result = canPerformUndo();

      // Assert
      expect(UndoManager.getUndoInfo).toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should return false when UndoManager throws error', () => {
      // Arrange
      vi.mocked(UndoManager.getUndoInfo).mockImplementation(() => {
        throw new Error('getUndoInfo error');
      });

      // Act
      const result = canPerformUndo();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getLastActionInfo', () => {
    it('should return action info when available', () => {
      // Arrange
      vi.mocked(UndoManager.getUndoInfo).mockReturnValue({
        canUndo: true,
        snapshotsAvailable: 2,
        latestActionId: 10
      });

      // Act
      const result = getLastActionInfo();

      // Assert
      expect(UndoManager.getUndoInfo).toHaveBeenCalled();
      expect(result).toEqual({
        actionId: 10,
        canUndo: true
      });
    });

    it('should handle null latestActionId', () => {
      // Arrange
      vi.mocked(UndoManager.getUndoInfo).mockReturnValue({
        canUndo: false,
        snapshotsAvailable: 0,
        latestActionId: undefined
      });

      // Act
      const result = getLastActionInfo();

      // Assert
      expect(result).toEqual({
        actionId: null,
        canUndo: false
      });
    });

    it('should handle undefined latestActionId', () => {
      // Arrange
      vi.mocked(UndoManager.getUndoInfo).mockReturnValue({
        canUndo: true,
        snapshotsAvailable: 1,
        latestActionId: undefined
      });

      // Act
      const result = getLastActionInfo();

      // Assert
      expect(result).toEqual({
        actionId: null,
        canUndo: true
      });
    });

    it('should return default values when UndoManager throws error', () => {
      // Arrange
      vi.mocked(UndoManager.getUndoInfo).mockImplementation(() => {
        throw new Error('getUndoInfo error');
      });

      // Act
      const result = getLastActionInfo();

      // Assert
      expect(result).toEqual({
        actionId: null,
        canUndo: false
      });
    });
  });

  describe('validateUndoConsistency', () => {
    it('should return true when no consistency issues found', () => {
      // Arrange
      vi.mocked(UndoManager.diagnoseUndoConsistency).mockReturnValue({
        issues: [],
        snapshotGaps: [],
        recommendations: []
      });

      // Act
      const result = validateUndoConsistency();

      // Assert
      expect(UndoManager.diagnoseUndoConsistency).toHaveBeenCalled();
      expect(mockConsole.log).toHaveBeenCalledWith('✅ Undo system consistency check passed');
      expect(result).toBe(true);
    });

    it('should return false and log issues when consistency problems found', () => {
      // Arrange
      vi.mocked(UndoManager.diagnoseUndoConsistency).mockReturnValue({
        issues: ['Issue 1: Snapshot mismatch', 'Issue 2: Invalid state'],
        snapshotGaps: [1, 3],
        recommendations: ['Recommendation 1: Clear cache', 'Recommendation 2: Reset undo stack']
      });

      // Act
      const result = validateUndoConsistency();

      // Assert
      expect(UndoManager.diagnoseUndoConsistency).toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalledWith('🔍 Undo consistency issues detected:');
      expect(mockConsole.warn).toHaveBeenCalledWith('  ⚠️ Issue 1: Snapshot mismatch');
      expect(mockConsole.warn).toHaveBeenCalledWith('  ⚠️ Issue 2: Invalid state');
      expect(mockConsole.info).toHaveBeenCalledWith('💡 Recommendations:');
      expect(mockConsole.info).toHaveBeenCalledWith('  📝 Recommendation 1: Clear cache');
      expect(mockConsole.info).toHaveBeenCalledWith('  📝 Recommendation 2: Reset undo stack');
      expect(result).toBe(false);
    });

    it('should return false and log issues without recommendations', () => {
      // Arrange
      vi.mocked(UndoManager.diagnoseUndoConsistency).mockReturnValue({
        issues: ['Critical issue'],
        snapshotGaps: [2],
        recommendations: []
      });

      // Act
      const result = validateUndoConsistency();

      // Assert
      expect(mockConsole.warn).toHaveBeenCalledWith('🔍 Undo consistency issues detected:');
      expect(mockConsole.warn).toHaveBeenCalledWith('  ⚠️ Critical issue');
      expect(mockConsole.info).not.toHaveBeenCalledWith('💡 Recommendations:');
      expect(result).toBe(false);
    });

    it('should handle undefined localStorage gracefully', () => {
      // Arrange
      Object.defineProperty(global, 'localStorage', {
        value: undefined,
        writable: true
      });

      // Act
      const result = validateUndoConsistency();

      // Assert
      expect(mockConsole.log).toHaveBeenCalledWith(
        '⚠️ localStorage not available (test environment) - skipping undo validation'
      );
      expect(UndoManager.diagnoseUndoConsistency).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle UndoManager errors gracefully', () => {
      // Arrange
      vi.mocked(UndoManager.diagnoseUndoConsistency).mockImplementation(() => {
        throw new Error('Diagnosis error');
      });

      // Act
      const result = validateUndoConsistency();

      // Assert
      expect(mockConsole.error).toHaveBeenCalledWith(
        '❌ Error during undo consistency validation:',
        expect.any(Error)
      );
      expect(result).toBe(false);
    });
  });

  describe('withUndo', () => {
    it('should wrap sync function and save snapshot before execution', async () => {
      // Arrange
      localStorageMock.getItem.mockReturnValue('[]');
      vi.mocked(UndoManager.saveSnapshot).mockReturnValue(true);

      const mockAction = vi.fn().mockReturnValue('sync result');
      const wrappedAction = withUndo(mockAction);

      // Act
      const result = await wrappedAction('arg1', 'arg2');

      // Assert
      expect(UndoManager.saveSnapshot).toHaveBeenCalledWith('Before Action 1');
      expect(mockAction).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result).toBe('sync result');
    });

    it('should wrap async function and save snapshot before execution', async () => {
      // Arrange
      localStorageMock.getItem.mockReturnValue('[{"id": 5}]');
      vi.mocked(UndoManager.saveSnapshot).mockReturnValue(true);

      const mockAction = vi.fn().mockResolvedValue('async result');
      const wrappedAction = withUndo(mockAction);

      // Act
      const result = await wrappedAction('arg1', 42);

      // Assert
      expect(UndoManager.saveSnapshot).toHaveBeenCalledWith('Before Action 6');
      expect(mockAction).toHaveBeenCalledWith('arg1', 42);
      expect(result).toBe('async result');
    });

    it('should handle action function errors gracefully', async () => {
      // Arrange
      localStorageMock.getItem.mockReturnValue('[]');
      vi.mocked(UndoManager.saveSnapshot).mockReturnValue(true);

      const errorAction = vi.fn().mockRejectedValue(new Error('Action failed'));
      const wrappedAction = withUndo(errorAction);

      // Act & Assert
      await expect(wrappedAction()).rejects.toThrow('Action failed');
      expect(UndoManager.saveSnapshot).toHaveBeenCalledWith('Before Action 1');
      expect(errorAction).toHaveBeenCalled();
    });

    it('should continue with action even if snapshot save fails', async () => {
      // Arrange
      localStorageMock.getItem.mockReturnValue('[]');
      vi.mocked(UndoManager.saveSnapshot).mockReturnValue(false);

      const mockAction = vi.fn().mockReturnValue('result despite failed snapshot');
      const wrappedAction = withUndo(mockAction);

      // Act
      const result = await wrappedAction();

      // Assert
      expect(UndoManager.saveSnapshot).toHaveBeenCalledWith('Before Action 1');
      expect(mockConsole.warn).toHaveBeenCalledWith('❌ Failed to save snapshot before action 1');
      expect(mockAction).toHaveBeenCalled();
      expect(result).toBe('result despite failed snapshot');
    });

    it('should preserve function arguments correctly with multiple parameters', async () => {
      // Arrange
      localStorageMock.getItem.mockReturnValue('[]');
      vi.mocked(UndoManager.saveSnapshot).mockReturnValue(true);

      const mockAction = vi.fn().mockImplementation((a, b, c) => `${a}-${b}-${c}`);
      const wrappedAction = withUndo(mockAction);

      // Act
      const result = await wrappedAction('first', 123, { key: 'value' });

      // Assert
      expect(mockAction).toHaveBeenCalledWith('first', 123, { key: 'value' });
      expect(result).toBe('first-123-[object Object]');
    });

    it('should handle functions with no arguments', async () => {
      // Arrange
      localStorageMock.getItem.mockReturnValue('[]');
      vi.mocked(UndoManager.saveSnapshot).mockReturnValue(true);

      const mockAction = vi.fn().mockReturnValue('no args result');
      const wrappedAction = withUndo(mockAction);

      // Act
      const result = await wrappedAction();

      // Assert
      expect(UndoManager.saveSnapshot).toHaveBeenCalledWith('Before Action 1');
      expect(mockAction).toHaveBeenCalledWith();
      expect(result).toBe('no args result');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete workflow: check availability, save snapshot, perform action', async () => {
      // Arrange
      localStorageMock.getItem.mockReturnValue('[{"id": 3}]');
      vi.mocked(UndoManager.saveSnapshot).mockReturnValue(true);
      vi.mocked(UndoManager.getUndoInfo).mockReturnValue({
        canUndo: true,
        snapshotsAvailable: 2,
        latestActionId: 3
      });

      const gameAction = vi.fn().mockReturnValue('action completed');
      const wrappedAction = withUndo(gameAction);

      // Act
      const canUndo = canPerformUndo();
      const actionInfo = getLastActionInfo();
      const result = await wrappedAction('test data');

      // Assert
      expect(canUndo).toBe(true);
      expect(actionInfo).toEqual({ actionId: 3, canUndo: true });
      expect(UndoManager.saveSnapshot).toHaveBeenCalledWith('Before Action 4');
      expect(gameAction).toHaveBeenCalledWith('test data');
      expect(result).toBe('action completed');
    });

    it('should handle undo workflow after action completion', () => {
      // Arrange
      vi.mocked(UndoManager.getUndoInfo).mockReturnValue({
        canUndo: true,
        snapshotsAvailable: 3,
        latestActionId: 5
      });
      vi.mocked(UndoManager.smartUndo).mockReturnValue(true);
      vi.mocked(UndoManager.diagnoseUndoConsistency).mockReturnValue({
        issues: [],
        snapshotGaps: [],
        recommendations: []
      });

      // Act
      const canUndo = canPerformUndo();
      const isValid = validateUndoConsistency();
      const undoResult = performUndo();

      // Assert
      expect(canUndo).toBe(true);
      expect(isValid).toBe(true);
      expect(undoResult).toBe(true);
      expect(mockReload).toHaveBeenCalled();
    });
  });
});
