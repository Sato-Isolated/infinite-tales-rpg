import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LLMProvider, defaultLLMConfig } from '../llmProvider';
import { GeminiProvider, GEMINI_MODELS, defaultGeminiJsonConfig } from '../geminiProvider';
import type { LLMconfig } from '../llm';
import type { SafetyLevel } from '$lib/types/safetySettings';

// Mock GeminiProvider
vi.mock('../geminiProvider', () => {
  const mockGeminiProvider = vi.fn().mockImplementation((config, safetyLevel, fallback) => {
    return {
      generateContent: vi.fn(),
      generateContentStream: vi.fn(),
      setSafetyLevel: vi.fn(),
      llmConfig: config, // Store the actual config that was passed
      fallbackLLM: fallback
    };
  });

  return {
    GeminiProvider: mockGeminiProvider,
    GEMINI_MODELS: {
      FLASH_THINKING_2_5: 'gemini-2.5-flash-preview-05-20',
      FLASH_THINKING_2_0: 'gemini-2.0-flash-thinking-exp-01-21',
      FLASH_2_0: 'gemini-2.0-flash'
    },
    defaultGeminiJsonConfig: {
      temperature: 1.0,
      responseMimeType: 'application/json',
      topP: 0.95,
      topK: 32
    }
  };
});

// Mock dependencies
vi.mock('$lib/types/safetySettings', () => ({}));

describe('LLMProvider', () => {
  let mockSafetyLevel: SafetyLevel;
  let mockGeminiProvider: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSafetyLevel = 'balanced';

    // Get reference to the mocked constructor
    mockGeminiProvider = vi.mocked(GeminiProvider);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('defaultLLMConfig', () => {
    it('should have correct default configuration', () => {
      expect(defaultLLMConfig).toEqual({
        provider: 'gemini',
        temperature: defaultGeminiJsonConfig.temperature,
        config: defaultGeminiJsonConfig,
        tryAutoFixJSONError: true
      });
    });

    it('should use gemini provider by default', () => {
      expect(defaultLLMConfig.provider).toBe('gemini');
    });

    it('should enable JSON error auto-fixing by default', () => {
      expect(defaultLLMConfig.tryAutoFixJSONError).toBe(true);
    });

    it('should use default temperature from GeminiConfig', () => {
      expect(defaultLLMConfig.temperature).toBe(1.0);
    });
  });

  describe('provideLLM', () => {
    it('should create GeminiProvider with default config', () => {
      const customConfig: LLMconfig = {
        apiKey: 'test-key'
      };

      const result = LLMProvider.provideLLM(customConfig, mockSafetyLevel);

      expect(mockGeminiProvider).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should merge custom config with defaults', () => {
      const customConfig: LLMconfig = {
        apiKey: 'test-key',
        temperature: 0.8,
        model: GEMINI_MODELS.FLASH_2_0
      };

      LLMProvider.provideLLM(customConfig, mockSafetyLevel);

      // Verify GeminiProvider was called with merged config
      // Primary provider is the second call [1], fallback provider is first call [0]
      const calledConfig = mockGeminiProvider.mock.calls[1][0];
      expect(calledConfig.apiKey).toBe('test-key');
      expect(calledConfig.temperature).toBe(0.8);
      expect(calledConfig.model).toBe(GEMINI_MODELS.FLASH_2_0);
      expect(calledConfig.provider).toBe('gemini');
      expect(calledConfig.tryAutoFixJSONError).toBe(true);
    });

    it('should create fallback provider with FLASH_THINKING_2_5 model', () => {
      const customConfig: LLMconfig = {
        apiKey: 'test-key',
        model: GEMINI_MODELS.FLASH_THINKING_2_0
      };

      LLMProvider.provideLLM(customConfig, mockSafetyLevel);

      // Should be called 2 times: primary + fallback
      expect(mockGeminiProvider).toHaveBeenCalledTimes(2);

      // Check fallback config uses FLASH_THINKING_2_5
      const fallbackConfig = mockGeminiProvider.mock.calls[0][0];
      expect(fallbackConfig.model).toBe(GEMINI_MODELS.FLASH_THINKING_2_5);
    });

    it('should pass safety level to all providers', () => {
      const customConfig: LLMconfig = {
        apiKey: 'test-key'
      };

      LLMProvider.provideLLM(customConfig, mockSafetyLevel);

      // Check that safety level is passed to all provider instances
      expect(mockGeminiProvider.mock.calls[0][1]).toBe(mockSafetyLevel);
      expect(mockGeminiProvider.mock.calls[1][1]).toBe(mockSafetyLevel);
    });

    it('should handle useFallback parameter correctly when false', () => {
      const customConfig: LLMconfig = {
        apiKey: 'test-key'
      };

      LLMProvider.provideLLM(customConfig, mockSafetyLevel, false);

      // Should create primary and first fallback only (no deep fallback)
      expect(mockGeminiProvider).toHaveBeenCalledTimes(2);

      // Third parameter (fallback LLM) of first fallback should be undefined
      const fallbackCall = mockGeminiProvider.mock.calls[0];
      expect(fallbackCall[2]).toBeUndefined();
    });

    it('should handle useFallback parameter correctly when true', () => {
      const customConfig: LLMconfig = {
        apiKey: 'test-key'
      };

      LLMProvider.provideLLM(customConfig, mockSafetyLevel, true);

      // Should create primary, first fallback, and second fallback
      expect(mockGeminiProvider).toHaveBeenCalledTimes(3);
    });

    it('should preserve all custom configuration properties', () => {
      const customConfig: LLMconfig = {
        apiKey: 'custom-key',
        temperature: 0.5,
        model: 'custom-model',
        provider: 'gemini',
        language: 'fr',
        systemInstruction: 'Custom instruction',
        tryAutoFixJSONError: false,
        returnFallbackProperty: true
      };

      LLMProvider.provideLLM(customConfig, mockSafetyLevel);

      const calledConfig = mockGeminiProvider.mock.calls[1][0];
      expect(calledConfig.apiKey).toBe('custom-key');
      expect(calledConfig.temperature).toBe(0.5);
      expect(calledConfig.model).toBe('custom-model');
      expect(calledConfig.language).toBe('fr');
      expect(calledConfig.systemInstruction).toBe('Custom instruction');
      expect(calledConfig.tryAutoFixJSONError).toBe(false);
      expect(calledConfig.returnFallbackProperty).toBe(true);
    });

    it('should handle empty config gracefully', () => {
      const emptyConfig: LLMconfig = {};

      const result = LLMProvider.provideLLM(emptyConfig, mockSafetyLevel);

      expect(result).toBeDefined();
      expect(mockGeminiProvider).toHaveBeenCalled();

      // Should use default config properties
      const calledConfig = mockGeminiProvider.mock.calls[0][0];
      expect(calledConfig.provider).toBe('gemini');
      expect(calledConfig.temperature).toBe(1.0);
      expect(calledConfig.tryAutoFixJSONError).toBe(true);
    });

    it('should handle different safety levels', () => {
      const customConfig: LLMconfig = {
        apiKey: 'test-key'
      };

      const testSafetyLevels: SafetyLevel[] = ['strict', 'balanced', 'permissive'];

      testSafetyLevels.forEach((safetyLevel, index) => {
        vi.clearAllMocks();

        LLMProvider.provideLLM(customConfig, safetyLevel);

        // Check that the correct safety level is passed
        expect(mockGeminiProvider.mock.calls[0][1]).toBe(safetyLevel);
        expect(mockGeminiProvider.mock.calls[1][1]).toBe(safetyLevel);
      });
    });
  });

  describe('Provider Chain Structure', () => {
    it('should create correct provider chain without deep fallback', () => {
      const customConfig: LLMconfig = {
        apiKey: 'test-key',
        model: 'primary-model'
      };

      LLMProvider.provideLLM(customConfig, mockSafetyLevel, false);

      // Primary provider
      const primaryCall = mockGeminiProvider.mock.calls[1];
      expect(primaryCall[0].model).toBe('primary-model');
      expect(primaryCall[2]).toBeDefined(); // Should have fallback

      // First fallback provider
      const fallbackCall = mockGeminiProvider.mock.calls[0];
      expect(fallbackCall[0].model).toBe(GEMINI_MODELS.FLASH_THINKING_2_5);
      expect(fallbackCall[2]).toBeUndefined(); // Should not have deep fallback
    });

    it('should create correct provider chain with deep fallback', () => {
      const customConfig: LLMconfig = {
        apiKey: 'test-key',
        model: 'primary-model'
      };

      LLMProvider.provideLLM(customConfig, mockSafetyLevel, true);

      expect(mockGeminiProvider).toHaveBeenCalledTimes(3);

      // Primary provider
      const primaryCall = mockGeminiProvider.mock.calls[2];
      expect(primaryCall[0].model).toBe('primary-model');

      // First fallback provider
      const firstFallbackCall = mockGeminiProvider.mock.calls[1];
      expect(firstFallbackCall[0].model).toBe(GEMINI_MODELS.FLASH_THINKING_2_5);
      expect(firstFallbackCall[2]).toBeDefined(); // Should have second fallback

      // Second fallback provider
      const secondFallbackCall = mockGeminiProvider.mock.calls[0];
      expect(secondFallbackCall[0].model).toBe(GEMINI_MODELS.FLASH_THINKING_2_5);
      expect(secondFallbackCall[2]).toBeUndefined(); // Terminal fallback
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined config', () => {
      // Test with null config (should still work with defaults)
      const result = LLMProvider.provideLLM(null as any, mockSafetyLevel);
      expect(result).toBeDefined();
    });

    it('should handle undefined safety level', () => {
      const customConfig: LLMconfig = {
        apiKey: 'test-key'
      };

      const result = LLMProvider.provideLLM(customConfig, undefined as any);
      expect(result).toBeDefined();
    });

    it('should handle config with undefined properties', () => {
      const customConfig: LLMconfig = {
        apiKey: undefined,
        temperature: undefined,
        model: undefined
      };

      const result = LLMProvider.provideLLM(customConfig, mockSafetyLevel);
      expect(result).toBeDefined();
    });
  });

  describe('Configuration Inheritance', () => {
    it('should not mutate the original config object', () => {
      const originalConfig: LLMconfig = {
        apiKey: 'test-key',
        temperature: 0.7
      };
      const originalConfigCopy = { ...originalConfig };

      LLMProvider.provideLLM(originalConfig, mockSafetyLevel);

      expect(originalConfig).toEqual(originalConfigCopy);
    });

    it('should properly override default values', () => {
      const customConfig: LLMconfig = {
        provider: 'gemini',
        temperature: 0.3,
        tryAutoFixJSONError: false
      };

      LLMProvider.provideLLM(customConfig, mockSafetyLevel);

      const calledConfig = mockGeminiProvider.mock.calls[0][0];
      expect(calledConfig.provider).toBe('gemini');
      expect(calledConfig.temperature).toBe(0.3);
      expect(calledConfig.tryAutoFixJSONError).toBe(false);
      // Default config property should still be present
      expect(calledConfig.config).toEqual(defaultGeminiJsonConfig);
    });
  });
});
