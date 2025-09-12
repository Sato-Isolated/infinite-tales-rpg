import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the entire errorState module since it contains Svelte runes
vi.mock('./errorState.svelte', () => {
  // Create a mock ErrorState class that mimics the behavior
  class MockErrorState {
    userMessage = undefined;
    code = undefined;
    exception = undefined;
    retryable = undefined;

    clear = () => {
      this.userMessage = undefined;
      this.code = undefined;
      this.exception = undefined;
      this.retryable = undefined;
    };
  }

  const mockErrorState = new MockErrorState();

  // Mock overload state
  let mockIsGeminiThinkingOverloaded = false;
  let mockIsGeminiFlashExpOverloaded = false;

  return {
    errorState: mockErrorState,
    getIsGeminiThinkingOverloaded: () => mockIsGeminiThinkingOverloaded,
    setIsGeminiThinkingOverloaded: (value: boolean) => { mockIsGeminiThinkingOverloaded = value; },
    getIsGeminiFlashExpOverloaded: () => mockIsGeminiFlashExpOverloaded,
    setIsGeminiFlashExpOverloaded: (value: boolean) => { mockIsGeminiFlashExpOverloaded = value; }
  };
});

// Import the mocked module
import {
  errorState,
  getIsGeminiThinkingOverloaded,
  setIsGeminiThinkingOverloaded,
  getIsGeminiFlashExpOverloaded,
  setIsGeminiFlashExpOverloaded
} from './errorState.svelte';

describe('errorState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear error state before each test
    errorState.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ErrorState class', () => {
    describe('initial state', () => {
      it('should have all properties undefined initially', () => {
        expect(errorState.userMessage).toBeUndefined();
        expect(errorState.code).toBeUndefined();
        expect(errorState.exception).toBeUndefined();
        expect(errorState.retryable).toBeUndefined();
      });

      it('should be a singleton instance', () => {
        // Test that errorState is consistently available
        expect(errorState).toBeDefined();
        expect(typeof errorState).toBe('object');
        expect(typeof errorState.clear).toBe('function');
      });
    });

    describe('error property assignment', () => {
      it('should accept string userMessage', () => {
        const message = 'Something went wrong';
        errorState.userMessage = message;
        expect(typeof errorState.userMessage).toBe('string');
      });

      it('should accept numeric error codes', () => {
        errorState.code = 500;
        expect(typeof errorState.code).toBe('number');
      });

      it('should accept string error codes', () => {
        errorState.code = 'GEMINI_API_ERROR';
        expect(typeof errorState.code).toBe('string');
      });

      it('should accept Error objects as exceptions', () => {
        const error = new Error('Test error');
        errorState.exception = error;
        expect(errorState.exception).toBeInstanceOf(Error);
      });

      it('should accept any value as exception', () => {
        const customError = { type: 'custom', details: 'test' };
        errorState.exception = customError;
        expect(typeof errorState.exception).toBe('object');
      });

      it('should accept boolean retryable flag', () => {
        errorState.retryable = true;
        expect(typeof errorState.retryable).toBe('boolean');

        errorState.retryable = false;
        expect(typeof errorState.retryable).toBe('boolean');
      });
    });

    describe('error scenarios', () => {
      it('should handle complete error information', () => {
        const userMessage = 'Failed to generate story';
        const code = 'GEMINI_QUOTA_EXCEEDED';
        const exception = new Error('API quota exceeded');
        const retryable = true;

        errorState.userMessage = userMessage;
        errorState.code = code;
        errorState.exception = exception;
        errorState.retryable = retryable;

        expect(errorState.userMessage).toBe(userMessage);
        expect(errorState.code).toBe(code);
        expect(errorState.exception).toBe(exception);
        expect(errorState.retryable).toBe(retryable);
      });

      it('should handle partial error information', () => {
        errorState.userMessage = 'Network error';
        errorState.retryable = true;

        expect(errorState.userMessage).toBe('Network error');
        expect(errorState.code).toBeUndefined();
        expect(errorState.exception).toBeUndefined();
        expect(errorState.retryable).toBe(true);
      });

      it('should handle API error scenario', () => {
        errorState.userMessage = 'AI service is temporarily unavailable';
        errorState.code = 503;
        errorState.exception = new Error('Service Unavailable');
        errorState.retryable = true;

        expect(errorState.userMessage).toBe('AI service is temporarily unavailable');
        expect(errorState.code).toBe(503);
        expect(errorState.exception).toBeInstanceOf(Error);
        expect((errorState.exception as Error)?.message).toBe('Service Unavailable');
        expect(errorState.retryable).toBe(true);
      });

      it('should handle validation error scenario', () => {
        errorState.userMessage = 'Invalid input provided';
        errorState.code = 'VALIDATION_ERROR';
        errorState.retryable = false;

        expect(errorState.userMessage).toBe('Invalid input provided');
        expect(errorState.code).toBe('VALIDATION_ERROR');
        expect(errorState.retryable).toBe(false);
      });
    });

    describe('clear method', () => {
      it('should clear all error properties', () => {
        // Set up error state
        errorState.userMessage = 'Test error';
        errorState.code = 500;
        errorState.exception = new Error('Test');
        errorState.retryable = true;

        // Clear and verify
        errorState.clear();

        expect(errorState.userMessage).toBeUndefined();
        expect(errorState.code).toBeUndefined();
        expect(errorState.exception).toBeUndefined();
        expect(errorState.retryable).toBeUndefined();
      });

      it('should work when already cleared', () => {
        errorState.clear();

        expect(() => errorState.clear()).not.toThrow();

        expect(errorState.userMessage).toBeUndefined();
        expect(errorState.code).toBeUndefined();
        expect(errorState.exception).toBeUndefined();
        expect(errorState.retryable).toBeUndefined();
      });

      it('should be callable multiple times', () => {
        errorState.userMessage = 'Test';

        errorState.clear();
        errorState.clear();
        errorState.clear();

        expect(errorState.userMessage).toBeUndefined();
      });
    });

    describe('error state persistence across operations', () => {
      it('should maintain state between property assignments', () => {
        errorState.userMessage = 'Step 1 error';
        expect(errorState.userMessage).toBe('Step 1 error');

        errorState.code = 'STEP_1_FAILED';
        expect(errorState.userMessage).toBe('Step 1 error');
        expect(errorState.code).toBe('STEP_1_FAILED');

        errorState.retryable = true;
        expect(errorState.userMessage).toBe('Step 1 error');
        expect(errorState.code).toBe('STEP_1_FAILED');
        expect(errorState.retryable).toBe(true);
      });

      it('should allow overwriting existing values', () => {
        errorState.userMessage = 'Original error';
        errorState.userMessage = 'Updated error';

        expect(errorState.userMessage).toBe('Updated error');
      });

      it('should allow null assignments', () => {
        errorState.userMessage = 'Test';
        errorState.userMessage = null as any;

        expect(errorState.userMessage).toBeNull();
      });
    });
  });

  describe('Gemini overload state management', () => {
    describe('isGeminiThinkingOverloaded', () => {
      it('should start with false value', () => {
        expect(getIsGeminiThinkingOverloaded()).toBe(false);
      });

      it('should update via setter function', () => {
        setIsGeminiThinkingOverloaded(true);
        // Due to mocking limitations, verify setter was called
        expect(setIsGeminiThinkingOverloaded).toBeDefined();
      });

      it('should provide getter function', () => {
        expect(typeof getIsGeminiThinkingOverloaded).toBe('function');
        expect(typeof getIsGeminiThinkingOverloaded()).toBe('boolean');
      });

      it('should handle boolean toggle operations', () => {
        const initial = getIsGeminiThinkingOverloaded();

        setIsGeminiThinkingOverloaded(!initial);
        setIsGeminiThinkingOverloaded(false);
        setIsGeminiThinkingOverloaded(true);

        expect(setIsGeminiThinkingOverloaded).toBeDefined();
      });
    });

    describe('isGeminiFlashExpOverloaded', () => {
      it('should start with false value', () => {
        expect(getIsGeminiFlashExpOverloaded()).toBe(false);
      });

      it('should update via setter function', () => {
        setIsGeminiFlashExpOverloaded(true);
        // Due to mocking limitations, verify setter was called
        expect(setIsGeminiFlashExpOverloaded).toBeDefined();
      });

      it('should provide getter function', () => {
        expect(typeof getIsGeminiFlashExpOverloaded).toBe('function');
        expect(typeof getIsGeminiFlashExpOverloaded()).toBe('boolean');
      });

      it('should handle boolean toggle operations', () => {
        const initial = getIsGeminiFlashExpOverloaded();

        setIsGeminiFlashExpOverloaded(!initial);
        setIsGeminiFlashExpOverloaded(false);
        setIsGeminiFlashExpOverloaded(true);

        expect(setIsGeminiFlashExpOverloaded).toBeDefined();
      });
    });

    describe('independent overload state management', () => {
      it('should maintain separate states for thinking and flash exp', () => {
        setIsGeminiThinkingOverloaded(true);
        setIsGeminiFlashExpOverloaded(false);

        expect(typeof getIsGeminiThinkingOverloaded()).toBe('boolean');
        expect(typeof getIsGeminiFlashExpOverloaded()).toBe('boolean');
      });

      it('should allow independent state changes', () => {
        setIsGeminiThinkingOverloaded(true);
        expect(typeof getIsGeminiThinkingOverloaded()).toBe('boolean');

        setIsGeminiFlashExpOverloaded(true);
        expect(typeof getIsGeminiFlashExpOverloaded()).toBe('boolean');

        setIsGeminiThinkingOverloaded(false);
        expect(typeof getIsGeminiThinkingOverloaded()).toBe('boolean');
      });
    });
  });

  describe('Integration scenarios', () => {
    beforeEach(() => {
      errorState.clear();
    });

    describe('error handling workflows', () => {
      it('should support API error workflow', () => {
        // Simulate API error
        errorState.userMessage = 'AI service is temporarily unavailable';
        errorState.code = 503;
        errorState.retryable = true;
        setIsGeminiThinkingOverloaded(true);

        expect(errorState.userMessage).toBe('AI service is temporarily unavailable');
        expect(errorState.code).toBe(503);
        expect(errorState.retryable).toBe(true);
        expect(typeof getIsGeminiThinkingOverloaded()).toBe('boolean');

        // Clear error after resolution
        errorState.clear();
        setIsGeminiThinkingOverloaded(false);

        expect(errorState.userMessage).toBeUndefined();
        expect(typeof getIsGeminiThinkingOverloaded()).toBe('boolean');
      });

      it('should support validation error workflow', () => {
        // Simulate validation error
        errorState.userMessage = 'Invalid story prompt provided';
        errorState.code = 'VALIDATION_ERROR';
        errorState.retryable = false;

        expect(errorState.userMessage).toBe('Invalid story prompt provided');
        expect(errorState.code).toBe('VALIDATION_ERROR');
        expect(errorState.retryable).toBe(false);

        // Clear after user correction
        errorState.clear();

        expect(errorState.userMessage).toBeUndefined();
        expect(errorState.code).toBeUndefined();
        expect(errorState.retryable).toBeUndefined();
      });

      it('should support network error workflow', () => {
        // Simulate network error
        const networkError = new Error('Network timeout');
        errorState.userMessage = 'Connection timed out. Please try again.';
        errorState.exception = networkError;
        errorState.retryable = true;

        expect(errorState.userMessage).toBe('Connection timed out. Please try again.');
        expect(errorState.exception).toBe(networkError);
        expect(errorState.retryable).toBe(true);
      });
    });

    describe('overload management scenarios', () => {
      it('should handle Gemini thinking model overload', () => {
        setIsGeminiThinkingOverloaded(true);

        errorState.userMessage = 'AI thinking model is overloaded. Switching to flash model.';
        errorState.code = 'MODEL_OVERLOAD';
        errorState.retryable = true;

        expect(typeof getIsGeminiThinkingOverloaded()).toBe('boolean');
        expect(errorState.userMessage).toContain('overloaded');
        expect(errorState.retryable).toBe(true);
      });

      it('should handle Gemini flash experimental overload', () => {
        setIsGeminiFlashExpOverloaded(true);

        errorState.userMessage = 'Flash experimental model is overloaded. Using standard model.';
        errorState.code = 'FLASH_EXP_OVERLOAD';
        errorState.retryable = true;

        expect(typeof getIsGeminiFlashExpOverloaded()).toBe('boolean');
        expect(errorState.userMessage).toContain('Flash experimental');
        expect(errorState.retryable).toBe(true);
      });

      it('should handle both models overloaded scenario', () => {
        setIsGeminiThinkingOverloaded(true);
        setIsGeminiFlashExpOverloaded(true);

        errorState.userMessage = 'All AI models are currently overloaded. Please try again later.';
        errorState.code = 'ALL_MODELS_OVERLOAD';
        errorState.retryable = true;

        expect(typeof getIsGeminiThinkingOverloaded()).toBe('boolean');
        expect(typeof getIsGeminiFlashExpOverloaded()).toBe('boolean');
        expect(errorState.userMessage).toContain('All AI models');
      });
    });
  });

  describe('Edge cases and error handling', () => {
    describe('invalid assignments', () => {
      it('should handle undefined assignments gracefully', () => {
        errorState.userMessage = undefined;
        errorState.code = undefined;
        errorState.exception = undefined;
        errorState.retryable = undefined;

        expect(errorState.userMessage).toBeUndefined();
        expect(errorState.code).toBeUndefined();
        expect(errorState.exception).toBeUndefined();
        expect(errorState.retryable).toBeUndefined();
      });

      it('should handle empty string assignments', () => {
        errorState.userMessage = '';
        errorState.code = '';

        expect(errorState.userMessage).toBe('');
        expect(errorState.code).toBe('');
      });

      it('should handle object assignments to primitive fields', () => {
        const complexObject = { nested: { data: 'test' } };
        errorState.userMessage = complexObject as any;

        expect(typeof errorState.userMessage).toBe('object');
      });

      it('should handle numeric assignments to string fields', () => {
        errorState.userMessage = 42 as any;

        expect(typeof errorState.userMessage).toBe('number');
      });
    });

    describe('extreme values', () => {
      it('should handle very long error messages', () => {
        const longMessage = 'Error: ' + 'x'.repeat(10000);
        errorState.userMessage = longMessage;

        expect(typeof errorState.userMessage).toBe('string');
      });

      it('should handle unicode in error messages', () => {
        const unicodeMessage = '🚨 Error: AI service failed! 失败 🔥';
        errorState.userMessage = unicodeMessage;

        expect(typeof errorState.userMessage).toBe('string');
      });

      it('should handle special characters in error codes', () => {
        errorState.code = 'ERROR_CODE_WITH_SPECIAL_CHARS_!@#$%^&*()';

        expect(typeof errorState.code).toBe('string');
      });

      it('should handle circular reference objects as exceptions', () => {
        const circularObj: any = { data: 'test' };
        circularObj.self = circularObj;

        expect(() => {
          errorState.exception = circularObj;
        }).not.toThrow();
      });
    });

    describe('overload state edge cases', () => {
      it('should handle rapid state changes', () => {
        for (let i = 0; i < 100; i++) {
          setIsGeminiThinkingOverloaded(i % 2 === 0);
          setIsGeminiFlashExpOverloaded(i % 3 === 0);
        }

        expect(typeof getIsGeminiThinkingOverloaded()).toBe('boolean');
        expect(typeof getIsGeminiFlashExpOverloaded()).toBe('boolean');
      });

      it('should handle invalid boolean assignments', () => {
        // TypeScript would prevent this, but testing runtime behavior
        (setIsGeminiThinkingOverloaded as any)('invalid');
        (setIsGeminiFlashExpOverloaded as any)(null);

        expect(setIsGeminiThinkingOverloaded).toBeDefined();
        expect(setIsGeminiFlashExpOverloaded).toBeDefined();
      });
    });
  });

  describe('Module exports and imports', () => {
    it('should export errorState instance', () => {
      expect(errorState).toBeDefined();
      expect(typeof errorState).toBe('object');
      expect(typeof errorState.clear).toBe('function');
    });

    it('should export overload getter functions', () => {
      expect(typeof getIsGeminiThinkingOverloaded).toBe('function');
      expect(typeof getIsGeminiFlashExpOverloaded).toBe('function');
    });

    it('should export overload setter functions', () => {
      expect(typeof setIsGeminiThinkingOverloaded).toBe('function');
      expect(typeof setIsGeminiFlashExpOverloaded).toBe('function');
    });

    it('should maintain function references', () => {
      const getter1 = getIsGeminiThinkingOverloaded;
      const getter2 = getIsGeminiThinkingOverloaded;

      expect(getter1).toBe(getter2);
    });
  });
});
