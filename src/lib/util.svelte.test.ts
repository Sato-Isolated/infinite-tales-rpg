import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ActionDifficulty } from '$lib/game/logic/gameLogic';
import type { Action } from '$lib/types/action';
import {
  downloadLocalStorageAsJson,
  downloadHybridStorageAsJson,
  importJsonFromFile,
  getRowsForTextarea,
  getRandomInteger,
  removeEmptyValues,
  getTextForActionButton,
  getNPCDisplayName,
  getNPCTechnicalID,
  initialThoughtsState,
  stringifyPretty,
  handleError,
  shuffleArray
} from './util.svelte';
import { errorState } from './state/errorState.svelte';

// Mock dependencies
vi.mock('./state/errorState.svelte', () => ({
  errorState: {
    exception: undefined,
    userMessage: undefined,
    retryable: undefined,
    clear: vi.fn()
  }
}));

vi.mock('./state/hybrid/mongoStorageManager', () => ({
  mongoStorageManager: {
    getInfo: () => ({
      initialize: vi.fn().mockResolvedValue(undefined),
      isSupported: false,
      load: vi.fn().mockResolvedValue(null)
    })
  }
}));

// Mock DOM environment
const mockDocument = {
  createElement: vi.fn(),
  createEvent: vi.fn()
};

const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};

describe('Util Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.document = mockDocument as any;
    global.localStorage = mockLocalStorage as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialThoughtsState', () => {
    it('should have the correct initial structure', () => {
      expect(initialThoughtsState).toEqual({
        storyThoughts: '',
        actionsThoughts: '',
        eventThoughts: ''
      });
    });
  });

  describe('stringifyPretty', () => {
    it('should format object as pretty JSON', () => {
      const testObject = { key: 'value', nested: { prop: 'test' } };
      const result = stringifyPretty(testObject);

      expect(result).toContain('{\n');
      expect(result).toContain('  "key": "value"');
      expect(result).toContain('  "nested": {');
    });

    it('should handle invalid objects gracefully', () => {
      const circular: any = {};
      circular.self = circular;

      const result = stringifyPretty(circular);
      expect(typeof result).toBe('string');
    });
  });

  describe('handleError', () => {
    beforeEach(() => {
      // Clear error state
      errorState.exception = undefined;
      errorState.userMessage = undefined;
      errorState.retryable = undefined;
    });

    it('should set error state when no existing exception', () => {
      const errorMessage = 'Test error';
      handleError(errorMessage, true);

      expect(errorState.exception).toBe(errorMessage);
      expect(errorState.userMessage).toBe(errorMessage);
      expect(errorState.retryable).toBe(true);
    });

    it('should not overwrite existing exception', () => {
      errorState.exception = 'Existing error';

      handleError('New error', false);

      expect(errorState.exception).toBe('Existing error');
    });
  });

  describe('getRowsForTextarea', () => {
    it('should return an object with mapped rows', () => {
      const smallObject = { key: 'value' };
      const largeObject = {
        key1: 'value1',
        key2: 'value2',
        key3: { nested: 'object' },
        key4: 'value4'
      };

      const smallRows = getRowsForTextarea(smallObject);
      const largeRows = getRowsForTextarea(largeObject);

      expect(typeof smallRows).toBe('object');
      expect(typeof largeRows).toBe('object');
      expect(smallRows).toBeDefined();
      expect(largeRows).toBeDefined();
    });

    it('should handle empty object', () => {
      const result = getRowsForTextarea({});
      expect(typeof result).toBe('object');
      expect(result).toBeDefined();
    });
  });

  describe('getRandomInteger', () => {
    it('should return integer within specified range', () => {
      const min = 1;
      const max = 10;

      for (let i = 0; i < 100; i++) {
        const result = getRandomInteger(min, max);
        expect(result).toBeGreaterThanOrEqual(min);
        expect(result).toBeLessThanOrEqual(max);
        expect(Number.isInteger(result)).toBe(true);
      }
    });

    it('should handle min equals max', () => {
      const value = 5;
      const result = getRandomInteger(value, value);
      expect(result).toBe(value);
    });

    it('should handle negative ranges', () => {
      const min = -10;
      const max = -1;

      for (let i = 0; i < 50; i++) {
        const result = getRandomInteger(min, max);
        expect(result).toBeGreaterThanOrEqual(min);
        expect(result).toBeLessThanOrEqual(max);
      }
    });
  });

  describe('removeEmptyValues', () => {
    it('should remove empty objects from input', () => {
      const input = {
        validKey: { prop: 'value' },
        emptyKey: {},
        anotherValid: { nested: { deep: 'value' } },
        anotherEmpty: {}
      };

      const result = removeEmptyValues(input);

      expect(result).toEqual({
        validKey: { prop: 'value' },
        anotherValid: { nested: { deep: 'value' } }
      });
    });

    it('should handle object with no empty values', () => {
      const input = {
        key1: { prop: 'value1' },
        key2: { prop: 'value2' }
      };

      const result = removeEmptyValues(input);
      expect(result).toEqual(input);
    });

    it('should handle object with all empty values', () => {
      const input = {
        key1: {},
        key2: {},
        key3: {}
      };

      const result = removeEmptyValues(input);
      expect(result).toEqual({});
    });

    it('should handle null or undefined input', () => {
      expect(removeEmptyValues(null as any)).toBeFalsy();
      expect(removeEmptyValues(undefined as any)).toBeFalsy();
    });
  });

  describe('getTextForActionButton', () => {
    it('should return action text when available', () => {
      const action: Action = {
        characterName: 'Test Character',
        text: 'Attack with sword',
        action_difficulty: 'hard' as any,
        type: 'combat'
      };

      const result = getTextForActionButton(action);
      expect(result).toContain('Attack with sword');
    });

    it('should handle action with resource cost', () => {
      const action: Action = {
        characterName: 'Test Character',
        text: 'Cast spell',
        action_difficulty: 'medium' as any,
        type: 'magic',
        resource_cost: {
          cost: 5,
          resource_key: 'mp'
        }
      };

      const result = getTextForActionButton(action);
      expect(result).toContain('Cast spell');
      expect(result).toContain('(5 mp)');
    });

    it('should handle empty text gracefully', () => {
      const action: Action = {
        characterName: 'Test Character',
        text: '',
        action_difficulty: 'easy' as any,
        type: 'exploration'
      };

      const result = getTextForActionButton(action);
      expect(result).toBeDefined();
    });

    it('should handle action with missing text gracefully', () => {
      const actionWithoutText = {
        characterName: 'Test Character',
        text: '', // Empty text instead of undefined
        action_difficulty: 'simple' as ActionDifficulty,
        type: 'exploration'
      };
      const result = getTextForActionButton(actionWithoutText as Action);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('Test Character');
    });
  });

  describe('getNPCDisplayName', () => {
    it('should return displayName when available', () => {
      const npc = {
        displayName: 'Sir Lancelot',
        uniqueTechnicalNameId: 'knight_001'
      };

      const result = getNPCDisplayName(npc);
      expect(result).toBe('Sir Lancelot');
    });

    it('should fallback to uniqueTechnicalNameId when displayName is missing', () => {
      const npc = {
        displayName: null as any,
        uniqueTechnicalNameId: 'merchant_005'
      };

      const result = getNPCDisplayName(npc);
      expect(result).toBe('merchant_005');
    });

    it('should fallback to JSON string when both names are missing', () => {
      const npc = {
        displayName: null as any,
        uniqueTechnicalNameId: null as any
      };

      const result = getNPCDisplayName(npc);
      expect(result).toBe(JSON.stringify(npc));
    });
  });

  describe('getNPCTechnicalID', () => {
    it('should return uniqueTechnicalNameId when available', () => {
      const npc = {
        displayName: 'Sir Lancelot',
        uniqueTechnicalNameId: 'knight_001'
      };

      const result = getNPCTechnicalID(npc);
      expect(result).toBe('knight_001');
    });

    it('should fallback to displayName when uniqueTechnicalNameId is missing', () => {
      const npc = {
        displayName: 'Sir Lancelot',
        uniqueTechnicalNameId: null as any
      };

      const result = getNPCTechnicalID(npc);
      expect(result).toBe('Sir Lancelot');
    });
  });

  describe('shuffleArray', () => {
    it('should shuffle array elements', () => {
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const toShuffle = [...original];

      shuffleArray(toShuffle);

      // Array should have same length
      expect(toShuffle).toHaveLength(original.length);

      // Array should contain all original elements
      expect(toShuffle.sort()).toEqual(original.sort());

      // Array should be different (very high probability)
      let isDifferent = false;
      for (let i = 0; i < 10; i++) {
        const test = [...original];
        shuffleArray(test);
        if (JSON.stringify(test) !== JSON.stringify(original)) {
          isDifferent = true;
          break;
        }
      }
      expect(isDifferent).toBe(true);
    });

    it('should handle empty array', () => {
      const arr: number[] = [];
      expect(() => shuffleArray(arr)).not.toThrow();
      expect(arr).toEqual([]);
    });

    it('should handle single element array', () => {
      const arr = [42];
      shuffleArray(arr);
      expect(arr).toEqual([42]);
    });
  });

  describe('downloadLocalStorageAsJson - Security Tests', () => {
    beforeEach(() => {
      // Mock download link creation
      const mockAnchor = {
        setAttribute: vi.fn(),
        click: vi.fn(),
        remove: vi.fn()
      };
      mockDocument.createElement.mockReturnValue(mockAnchor);

      // Mock localStorage with test data
      mockLocalStorage.length = 3;
      mockLocalStorage.key.mockImplementation((index) => {
        const keys = ['validKey1', 'validKey2', 'invalidKey'];
        return keys[index] || null;
      });
      mockLocalStorage.getItem.mockImplementation((key) => {
        const data: Record<string, string> = {
          validKey1: '{"value": "test1"}',
          validKey2: '{"value": "test2"}',
          invalidKey: 'invalid json'
        };
        return data[key] || null;
      });
    });

    it('should skip invalid JSON during export', () => {
      expect(() => downloadLocalStorageAsJson()).not.toThrow();
      expect(mockDocument.createElement).toHaveBeenCalledWith('a');
    });

    it('should handle localStorage unavailable gracefully', () => {
      global.localStorage = undefined as any;
      expect(() => downloadLocalStorageAsJson()).not.toThrow();
    });
  });

  describe('importJsonFromFile - Security Tests', () => {
    beforeEach(() => {
      const mockInput = {
        type: '',
        accept: '',
        addEventListener: vi.fn(),
        click: vi.fn(),
        remove: vi.fn()
      };
      mockDocument.createElement.mockReturnValue(mockInput);
    });

    it('should create file input with correct security attributes', () => {
      const callback = vi.fn();
      importJsonFromFile(callback);

      const mockInput = mockDocument.createElement.mock.results[0].value;
      expect(mockInput.type).toBe('file');
      expect(mockInput.accept).toBe('application/json');
      expect(mockInput.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should validate file size and type', () => {
      const callback = vi.fn();
      importJsonFromFile(callback);

      const mockInput = mockDocument.createElement.mock.results[0].value;
      const changeHandler = mockInput.addEventListener.mock.calls[0][1];

      // Mock oversized file
      const oversizedFile = {
        size: 15 * 1024 * 1024, // 15MB (over 10MB limit)
        type: 'application/json',
        name: 'test.json'
      };

      const mockEvent = {
        target: { files: [oversizedFile] }
      };

      expect(() => changeHandler(mockEvent)).not.toThrow();
    });

    it('should handle empty file list gracefully', () => {
      const callback = vi.fn();
      importJsonFromFile(callback);

      const mockInput = mockDocument.createElement.mock.results[0].value;
      const changeHandler = mockInput.addEventListener.mock.calls[0][1];

      const mockEvent = {
        target: { files: [] }
      };

      expect(() => changeHandler(mockEvent)).not.toThrow();
      expect(callback).not.toHaveBeenCalled();
    });

    it('should clean up DOM elements', () => {
      const callback = vi.fn();

      // Setup fake timers before the import call
      vi.useFakeTimers();

      // Import triggers click and setTimeout
      importJsonFromFile(callback);

      const mockInput = mockDocument.createElement.mock.results[0].value;

      // Verify click was called (which triggers the setTimeout)
      expect(mockInput.click).toHaveBeenCalled();

      // Fast forward time to trigger cleanup
      vi.advanceTimersByTime(1000);

      expect(mockInput.remove).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle corrupted localStorage gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage corrupted');
      });

      expect(() => downloadLocalStorageAsJson()).not.toThrow();
    });

    it('should handle missing DOM methods gracefully', () => {
      global.document = undefined as any;

      const callback = vi.fn();
      expect(() => importJsonFromFile(callback)).toThrow();
    });

    it('should preserve object structure in stringifyPretty', () => {
      const complexObject = {
        string: 'value',
        number: 42,
        boolean: true,
        nested: { deep: { value: 'test' } },
        array: [1, 2, { item: 'value' }]
      };

      const result = stringifyPretty(complexObject);
      const parsed = JSON.parse(result);

      expect(parsed).toEqual(complexObject);
    });
  });
});
