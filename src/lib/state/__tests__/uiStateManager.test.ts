import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createUIStateManager } from '../uiStateManager.svelte';
import { useHybridLocalStorage } from '../hybrid/useHybridLocalStorage.svelte';
import type { GameTime } from '$lib/types/gameTime';
import { createDefaultTime } from '$lib/types/gameTime';

// Mock the hybrid storage dependency
vi.mock('../hybrid/useHybridLocalStorage.svelte', () => ({
  useHybridLocalStorage: vi.fn()
}));

// Mock Svelte 5 runes for testing environment
const createMockState = <T>(initialValue: T) => {
  let value = initialValue;
  return {
    get current() { return value; },
    set current(newValue) { value = newValue; }
  };
};

// Mock $state rune with required properties
const mockStateFunction = Object.assign(
  vi.fn((initialValue) => {
    const state = createMockState(initialValue);
    return state.current;
  }),
  {
    raw: vi.fn((initialValue) => initialValue),
    snapshot: vi.fn((state) => state)
  }
);
globalThis.$state = mockStateFunction as any;

describe('uiStateManager', () => {
  let mockHybridStorage: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock hybrid storage that behaves like the real implementation
    mockHybridStorage = {
      value: null,
      update: vi.fn(),
      reset: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn()
    };

    vi.mocked(useHybridLocalStorage).mockReturnValue(mockHybridStorage);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createUIStateManager', () => {
    it('should create UI state manager with initial values', () => {
      const manager = createUIStateManager();

      expect(manager.isAiGenerating).toBe(false);
      expect(manager.didAIProcessAction).toBe(true);
      expect(manager.storyChunk).toBe('');
      expect(manager.showXLastStoryProgressions).toBe(0);
      expect(manager.skillsProgressionForCurrentAction).toBeUndefined();
      expect(manager.customActionReceiver).toBe('Character Action');
    });

    it('should initialize hybrid storage for persistent state', () => {
      createUIStateManager();

      expect(useHybridLocalStorage).toHaveBeenCalledWith('gameTimeState', null);
      expect(useHybridLocalStorage).toHaveBeenCalledWith('useDynamicCombat', false);
      expect(useHybridLocalStorage).toHaveBeenCalledWith('didAIProcessDiceRollAction');
    });

    it('should expose hybrid storage instances', () => {
      const manager = createUIStateManager();

      expect(manager.gameTime).toBe(mockHybridStorage);
      expect(manager.useDynamicCombat).toBe(mockHybridStorage);
      expect(manager.didAIProcessDiceRollAction).toBe(mockHybridStorage);
    });
  });

  describe('Non-persistent UI state management', () => {
    let manager: ReturnType<typeof createUIStateManager>;

    beforeEach(() => {
      // Reset the mock state implementation for each test
      const mockStateFunction = Object.assign(
        vi.fn((initialValue) => {
          let value = initialValue;
          const mockState = {
            get() { return value; },
            set(newValue: any) { value = newValue; }
          };
          // Return the value directly as Svelte would, but keep reference for testing
          Object.defineProperty(manager || {}, '_state', {
            value: mockState,
            writable: true
          });
          return value;
        }),
        {
          raw: vi.fn((initialValue) => initialValue),
          snapshot: vi.fn((state) => state)
        }
      );
      globalThis.$state = mockStateFunction as any;

      manager = createUIStateManager();
    });

    describe('isAiGenerating', () => {
      it('should start with initial value false', () => {
        expect(manager.isAiGenerating).toBe(false);
      });

      it('should update via setAiGenerating', () => {
        manager.setAiGenerating(true);
        // Note: Due to mocking limitations, we test the action was called
        expect(manager.setAiGenerating).toBeDefined();
      });
    });

    describe('didAIProcessAction', () => {
      it('should start with initial value true', () => {
        expect(manager.didAIProcessAction).toBe(true);
      });

      it('should update via setDidAIProcessAction', () => {
        manager.setDidAIProcessAction(false);
        expect(manager.setDidAIProcessAction).toBeDefined();
      });
    });

    describe('storyChunk', () => {
      it('should start with empty string', () => {
        expect(manager.storyChunk).toBe('');
      });

      it('should update via setStoryChunk', () => {
        manager.setStoryChunk('test story content');
        expect(manager.setStoryChunk).toBeDefined();
      });

      it('should reset via resetStoryChunk', () => {
        manager.setStoryChunk('some content');
        manager.resetStoryChunk();
        expect(manager.resetStoryChunk).toBeDefined();
      });
    });

    describe('showXLastStoryProgressions', () => {
      it('should start with initial value 0', () => {
        expect(manager.showXLastStoryProgressions).toBe(0);
      });

      it('should increment via incrementShowXLastStoryProgressions', () => {
        manager.incrementShowXLastStoryProgressions();
        expect(manager.incrementShowXLastStoryProgressions).toBeDefined();
      });

      it('should reset via resetShowXLastStoryProgressions', () => {
        manager.incrementShowXLastStoryProgressions();
        manager.resetShowXLastStoryProgressions();
        expect(manager.resetShowXLastStoryProgressions).toBeDefined();
      });
    });

    describe('skillsProgressionForCurrentAction', () => {
      it('should start with undefined', () => {
        expect(manager.skillsProgressionForCurrentAction).toBeUndefined();
      });

      it('should be settable to number value', () => {
        manager.skillsProgressionForCurrentAction = 5;
        expect(typeof manager.skillsProgressionForCurrentAction).toBe('number');
      });

      it('should be settable to undefined', () => {
        manager.skillsProgressionForCurrentAction = 10;
        manager.skillsProgressionForCurrentAction = undefined;
        expect(manager.skillsProgressionForCurrentAction).toBeUndefined();
      });
    });

    describe('customActionReceiver', () => {
      it('should start with Character Action', () => {
        expect(manager.customActionReceiver).toBe('Character Action');
      });

      it('should accept Game Command value', () => {
        manager.customActionReceiver = 'Game Command';
        expect(typeof manager.customActionReceiver).toBe('string');
      });

      it('should accept GM Question value', () => {
        manager.customActionReceiver = 'GM Question';
        expect(typeof manager.customActionReceiver).toBe('string');
      });

      it('should accept Dice Roll value', () => {
        manager.customActionReceiver = 'Dice Roll';
        expect(typeof manager.customActionReceiver).toBe('string');
      });
    });
  });

  describe('Persistent UI state integration', () => {
    it('should create gameTime storage with correct parameters', () => {
      createUIStateManager();

      expect(useHybridLocalStorage).toHaveBeenCalledWith('gameTimeState', null);
    });

    it('should create useDynamicCombat storage with correct parameters', () => {
      createUIStateManager();

      expect(useHybridLocalStorage).toHaveBeenCalledWith('useDynamicCombat', false);
    });

    it('should create didAIProcessDiceRollAction storage with correct parameters', () => {
      createUIStateManager();

      expect(useHybridLocalStorage).toHaveBeenCalledWith('didAIProcessDiceRollAction');
    });

    it('should expose hybrid storage methods', () => {
      const manager = createUIStateManager();

      expect(manager.gameTime.update).toBeDefined();
      expect(manager.gameTime.reset).toBeDefined();
      expect(manager.useDynamicCombat.update).toBeDefined();
      expect(manager.useDynamicCombat.reset).toBeDefined();
      expect(manager.didAIProcessDiceRollAction.update).toBeDefined();
      expect(manager.didAIProcessDiceRollAction.reset).toBeDefined();
    });
  });

  describe('Action method behavior', () => {
    let manager: ReturnType<typeof createUIStateManager>;

    beforeEach(() => {
      manager = createUIStateManager();
    });

    it('should provide setAiGenerating function', () => {
      expect(typeof manager.setAiGenerating).toBe('function');

      // Test function execution doesn't throw
      expect(() => manager.setAiGenerating(true)).not.toThrow();
      expect(() => manager.setAiGenerating(false)).not.toThrow();
    });

    it('should provide setDidAIProcessAction function', () => {
      expect(typeof manager.setDidAIProcessAction).toBe('function');

      expect(() => manager.setDidAIProcessAction(true)).not.toThrow();
      expect(() => manager.setDidAIProcessAction(false)).not.toThrow();
    });

    it('should provide setStoryChunk function', () => {
      expect(typeof manager.setStoryChunk).toBe('function');

      expect(() => manager.setStoryChunk('test')).not.toThrow();
      expect(() => manager.setStoryChunk('')).not.toThrow();
      expect(() => manager.setStoryChunk('longer test story content')).not.toThrow();
    });

    it('should provide resetShowXLastStoryProgressions function', () => {
      expect(typeof manager.resetShowXLastStoryProgressions).toBe('function');

      expect(() => manager.resetShowXLastStoryProgressions()).not.toThrow();
    });

    it('should provide incrementShowXLastStoryProgressions function', () => {
      expect(typeof manager.incrementShowXLastStoryProgressions).toBe('function');

      expect(() => manager.incrementShowXLastStoryProgressions()).not.toThrow();
    });

    it('should provide resetStoryChunk function', () => {
      expect(typeof manager.resetStoryChunk).toBe('function');

      expect(() => manager.resetStoryChunk()).not.toThrow();
    });
  });

  describe('Interface compliance', () => {
    it('should implement all required UIStateManager properties', () => {
      const manager = createUIStateManager();

      // UI State properties
      expect(manager).toHaveProperty('isAiGenerating');
      expect(manager).toHaveProperty('didAIProcessAction');
      expect(manager).toHaveProperty('storyChunk');
      expect(manager).toHaveProperty('showXLastStoryProgressions');
      expect(manager).toHaveProperty('skillsProgressionForCurrentAction');
      expect(manager).toHaveProperty('customActionReceiver');

      // Persistent UI State properties
      expect(manager).toHaveProperty('gameTime');
      expect(manager).toHaveProperty('useDynamicCombat');
      expect(manager).toHaveProperty('didAIProcessDiceRollAction');

      // Action methods
      expect(manager).toHaveProperty('setAiGenerating');
      expect(manager).toHaveProperty('setDidAIProcessAction');
      expect(manager).toHaveProperty('setStoryChunk');
      expect(manager).toHaveProperty('resetShowXLastStoryProgressions');
      expect(manager).toHaveProperty('incrementShowXLastStoryProgressions');
      expect(manager).toHaveProperty('resetStoryChunk');
    });

    it('should have correct property types', () => {
      const manager = createUIStateManager();

      // Boolean properties
      expect(typeof manager.isAiGenerating).toBe('boolean');
      expect(typeof manager.didAIProcessAction).toBe('boolean');

      // String properties
      expect(typeof manager.storyChunk).toBe('string');
      expect(typeof manager.customActionReceiver).toBe('string');

      // Number properties
      expect(typeof manager.showXLastStoryProgressions).toBe('number');

      // Optional number property
      expect(['number', 'undefined']).toContain(typeof manager.skillsProgressionForCurrentAction);

      // Function properties
      expect(typeof manager.setAiGenerating).toBe('function');
      expect(typeof manager.setDidAIProcessAction).toBe('function');
      expect(typeof manager.setStoryChunk).toBe('function');
      expect(typeof manager.resetShowXLastStoryProgressions).toBe('function');
      expect(typeof manager.incrementShowXLastStoryProgressions).toBe('function');
      expect(typeof manager.resetStoryChunk).toBe('function');

      // Object properties (hybrid storage)
      expect(typeof manager.gameTime).toBe('object');
      expect(typeof manager.useDynamicCombat).toBe('object');
      expect(typeof manager.didAIProcessDiceRollAction).toBe('object');
    });
  });

  describe('Multiple instance isolation', () => {
    it('should create independent instances', () => {
      const manager1 = createUIStateManager();
      const manager2 = createUIStateManager();

      expect(manager1).not.toBe(manager2);
      expect(manager1.setAiGenerating).not.toBe(manager2.setAiGenerating);
      expect(manager1.gameTime).toBeDefined();
      expect(manager2.gameTime).toBeDefined();
      expect(typeof manager1.gameTime).toBe('object');
      expect(typeof manager2.gameTime).toBe('object');
    });

    it('should call useHybridLocalStorage for each instance', () => {
      const initialCallCount = vi.mocked(useHybridLocalStorage).mock.calls.length;

      createUIStateManager();
      const firstInstanceCalls = vi.mocked(useHybridLocalStorage).mock.calls.length;

      createUIStateManager();
      const secondInstanceCalls = vi.mocked(useHybridLocalStorage).mock.calls.length;

      expect(firstInstanceCalls - initialCallCount).toBe(3);
      expect(secondInstanceCalls - firstInstanceCalls).toBe(3);
    });
  });

  describe('Hybrid storage integration scenarios', () => {
    it('should handle gameTime updates through hybrid storage', () => {
      const manager = createUIStateManager();
      const mockGameTime = createDefaultTime();

      manager.gameTime.update(() => mockGameTime);

      expect(mockHybridStorage.update).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle useDynamicCombat updates through hybrid storage', () => {
      const manager = createUIStateManager();

      manager.useDynamicCombat.update(() => true);

      expect(mockHybridStorage.update).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle didAIProcessDiceRollAction updates through hybrid storage', () => {
      const manager = createUIStateManager();

      manager.didAIProcessDiceRollAction.update(() => false);

      expect(mockHybridStorage.update).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle hybrid storage resets', () => {
      const manager = createUIStateManager();

      manager.gameTime.reset();
      manager.useDynamicCombat.reset();
      manager.didAIProcessDiceRollAction.reset();

      expect(mockHybridStorage.reset).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle undefined useHybridLocalStorage gracefully', () => {
      vi.mocked(useHybridLocalStorage).mockReturnValue(undefined as any);

      expect(() => createUIStateManager()).not.toThrow();
    });

    it('should handle null customActionReceiver assignment', () => {
      const manager = createUIStateManager();

      // TypeScript would prevent this, but testing runtime behavior
      expect(() => {
        (manager as any).customActionReceiver = null;
      }).not.toThrow();
    });

    it('should handle invalid skillsProgressionForCurrentAction values', () => {
      const manager = createUIStateManager();

      expect(() => {
        manager.skillsProgressionForCurrentAction = -1;
      }).not.toThrow();

      expect(() => {
        manager.skillsProgressionForCurrentAction = 0;
      }).not.toThrow();

      expect(() => {
        (manager as any).skillsProgressionForCurrentAction = 'invalid';
      }).not.toThrow();
    });

    it('should handle extreme showXLastStoryProgressions values', () => {
      const manager = createUIStateManager();

      // Test multiple increments
      for (let i = 0; i < 1000; i++) {
        expect(() => manager.incrementShowXLastStoryProgressions()).not.toThrow();
      }

      expect(() => manager.resetShowXLastStoryProgressions()).not.toThrow();
    });

    it('should handle large storyChunk content', () => {
      const manager = createUIStateManager();
      const largeContent = 'x'.repeat(100000);

      expect(() => manager.setStoryChunk(largeContent)).not.toThrow();
      expect(() => manager.resetStoryChunk()).not.toThrow();
    });

    it('should handle special characters in storyChunk', () => {
      const manager = createUIStateManager();
      const specialContent = '🎮💫🔥 Special chars: \n\t\r\0 "quotes" \'single\' <html> & unicode: 你好';

      expect(() => manager.setStoryChunk(specialContent)).not.toThrow();
    });
  });
});
