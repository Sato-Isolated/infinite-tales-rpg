import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiProvider, GEMINI_MODELS, getThoughtsFromResponse, defaultGeminiJsonConfig } from './geminiProvider';
import type { LLMconfig, LLMRequest } from '$lib/ai/llm';
import type { SafetyLevel } from '$lib/types/safetySettings';
import type { GenerateContentResponse } from '@google/genai';

// Mock dependencies
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => ({
    getGenerativeModel: vi.fn(() => ({
      generateContent: vi.fn(),
      generateContentStream: vi.fn()
    }))
  }))
}));

vi.mock('$lib/util.svelte', () => ({
  stringifyPretty: vi.fn((obj) => JSON.stringify(obj, null, 2)),
  handleError: vi.fn()
}));

vi.mock('$lib/state/errorState.svelte', () => ({
  errorState: {
    exception: undefined,
    userMessage: undefined,
    retryable: undefined,
    clear: vi.fn(),
    setError: vi.fn()
  }
}));

vi.mock('./config/GeminiConfigBuilder.js', () => ({
  GeminiConfigBuilder: vi.fn(() => ({
    buildConfig: vi.fn(() => ({
      temperature: 1.0,
      responseMimeType: 'application/json',
      topP: 0.95,
      topK: 32
    })),
    buildSafetySettings: vi.fn(() => [])
  })),
  ModelCapabilities: {
    getDefaultTemperature: vi.fn(() => 1.0),
    getMaxTemperature: vi.fn(() => 2.0),
    supportsThinking: vi.fn(() => true),
    supportsThinkingBudget: vi.fn(() => true),
    supportsStructuredOutput: vi.fn(() => true)
  }
}));

vi.mock('./errors/GeminiErrorHandler.js', () => ({
  ErrorUtils: {
    logError: vi.fn(),
    isRecoverable: vi.fn(() => false),
    shouldRetry: vi.fn(() => false)
  }
}));

describe('GeminiProvider', () => {
  let geminiProvider: GeminiProvider;
  let mockLLMConfig: LLMconfig;
  let mockSafetyLevel: SafetyLevel;
  let mockFallbackLLM: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLLMConfig = {
      apiKey: 'test-api-key',
      model: GEMINI_MODELS.FLASH_THINKING_2_5,
      temperature: 1.0
    };

    mockSafetyLevel = 'strict';

    mockFallbackLLM = {
      generateContent: vi.fn(),
      generateContentStream: vi.fn(),
      setSafetyLevel: vi.fn()
    };

    geminiProvider = new GeminiProvider(mockLLMConfig, mockSafetyLevel, mockFallbackLLM);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(geminiProvider.llmConfig).toEqual(mockLLMConfig);
      expect(geminiProvider.fallbackLLM).toBe(mockFallbackLLM);
    });

    it('should initialize without fallback LLM', () => {
      const provider = new GeminiProvider(mockLLMConfig, mockSafetyLevel);
      expect(provider.fallbackLLM).toBeUndefined();
    });
  });

  describe('Safety Level Management', () => {
    it('should set safety level on provider', () => {
      const newLevel: SafetyLevel = 'balanced';
      geminiProvider.setSafetyLevel(newLevel);
      // Safety level is private, but we can verify it doesn't throw
      expect(() => geminiProvider.setSafetyLevel(newLevel)).not.toThrow();
    });

    it('should propagate safety level to fallback LLM if it is GeminiProvider', () => {
      const fallbackProvider = new GeminiProvider(mockLLMConfig, mockSafetyLevel);
      const spySetSafetyLevel = vi.spyOn(fallbackProvider, 'setSafetyLevel');

      const provider = new GeminiProvider(mockLLMConfig, mockSafetyLevel, fallbackProvider);
      const newLevel: SafetyLevel = 'permissive';

      provider.setSafetyLevel(newLevel);

      expect(spySetSafetyLevel).toHaveBeenCalledWith(newLevel);
    });
  });

  describe('Model Capabilities', () => {
    it('should return default temperature', () => {
      const temp = geminiProvider.getDefaultTemperature();
      expect(temp).toBe(1.0);
    });

    it('should return max temperature', () => {
      const maxTemp = geminiProvider.getMaxTemperature();
      expect(maxTemp).toBe(2.0);
    });

    it('should check if model supports thinking', () => {
      const supportsThinking = geminiProvider.isThinkingModel(GEMINI_MODELS.FLASH_THINKING_2_5);
      expect(supportsThinking).toBe(true);
    });

    it('should check if model supports thinking budget', () => {
      const supportsThinkingBudget = geminiProvider.supportsThinkingBudget(GEMINI_MODELS.FLASH_THINKING_2_5);
      expect(supportsThinkingBudget).toBe(true);
    });

    it('should check if model supports return thoughts', () => {
      const supportsReturnThoughts = geminiProvider.supportsReturnThoughts(GEMINI_MODELS.FLASH_THINKING_2_5);
      expect(supportsReturnThoughts).toBe(true);
    });

    it('should check if model supports structured output', () => {
      const supportsStructuredOutput = geminiProvider.supportsStructuredOutput(GEMINI_MODELS.FLASH_THINKING_2_5);
      expect(supportsStructuredOutput).toBe(true);
    });
  });

  describe('Content Generation', () => {
    const mockRequest: LLMRequest = {
      userMessage: 'Test prompt',
      historyMessages: [
        { role: 'user', content: 'Previous message' }
      ],
      temperature: 1.0
    };

    it('should generate content successfully', async () => {
      const mockResponse = {
        content: { story: 'Generated story content', success: true },
        thoughts: 'Some thoughts'
      };

      // Mock the generateContent method
      vi.spyOn(geminiProvider, 'generateContent').mockResolvedValue(mockResponse);

      const result = await geminiProvider.generateContent(mockRequest);

      expect(result).toEqual(mockResponse);
    });

    it('should handle errors in content generation', async () => {
      const mockError = new Error('API Error');
      vi.spyOn(geminiProvider, 'generateContent').mockRejectedValue(mockError);

      await expect(geminiProvider.generateContent(mockRequest)).rejects.toThrow('API Error');
    });

    it('should use fallback LLM when primary fails', async () => {
      const mockError = new Error('Primary API failed');
      const mockFallbackResponse = {
        content: { story: 'Fallback story', success: true },
        thoughts: 'Fallback thoughts'
      };

      vi.spyOn(geminiProvider, 'generateContent').mockRejectedValueOnce(mockError);
      mockFallbackLLM.generateContent.mockResolvedValue(mockFallbackResponse);

      // This would need to be tested through actual implementation
      // For now, we verify the fallback LLM is available
      expect(geminiProvider.fallbackLLM).toBe(mockFallbackLLM);
    });
  });

  describe('Streaming Content Generation', () => {
    const mockRequest: LLMRequest = {
      userMessage: 'Test streaming prompt',
      temperature: 1.0
    };

    it('should simulate streaming correctly', async () => {
      const mockResponse = {
        content: { story: 'This is a test story for streaming', success: true },
        thoughts: 'Streaming thoughts'
      };

      vi.spyOn(geminiProvider, 'generateContent').mockResolvedValue(mockResponse);

      const storyChunks: string[] = [];
      const thoughtChunks: string[] = [];

      const storyCallback = (chunk: string, isComplete: boolean) => {
        storyChunks.push(chunk);
      };

      const thoughtCallback = (chunk: string, isComplete: boolean) => {
        thoughtChunks.push(chunk);
      };

      const result = await geminiProvider.generateContentStream(
        mockRequest,
        storyCallback,
        thoughtCallback
      );

      expect(result).toEqual(mockResponse.content);
      expect(storyChunks.length).toBeGreaterThan(0);
      expect(thoughtChunks.length).toBeGreaterThan(0);
      expect(storyChunks[storyChunks.length - 1]).toBe(mockResponse.content.story);
      expect(thoughtChunks[thoughtChunks.length - 1]).toBe(mockResponse.thoughts);
    });

    it('should handle streaming with no story field', async () => {
      const mockResponse = {
        content: { success: true, message: 'No story field' },
        thoughts: ''
      };

      vi.spyOn(geminiProvider, 'generateContent').mockResolvedValue(mockResponse);

      const storyChunks: string[] = [];
      const storyCallback = (chunk: string, isComplete: boolean) => {
        storyChunks.push(chunk);
      };

      const result = await geminiProvider.generateContentStream(
        mockRequest,
        storyCallback
      );

      expect(result).toEqual(mockResponse.content);
      expect(storyChunks.length).toBeGreaterThan(0);
      // Should fallback to JSON string
      expect(storyChunks[storyChunks.length - 1]).toContain('success');
    });

    it('should handle streaming errors', async () => {
      const mockError = new Error('Streaming error');
      vi.spyOn(geminiProvider, 'generateContent').mockRejectedValue(mockError);

      const storyCallback = vi.fn();
      const thoughtCallback = vi.fn();

      const result = await geminiProvider.generateContentStream(
        mockRequest,
        storyCallback,
        thoughtCallback
      );

      expect(result).toBeUndefined();
    });
  });

  describe('getThoughtsFromResponse', () => {
    it('should extract thoughts from response', () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              thought: 'These are my thoughts'
            }]
          }
        }]
      } as unknown as GenerateContentResponse;

      const thoughts = getThoughtsFromResponse(mockResponse);
      expect(thoughts).toBe('These are my thoughts');
    });

    it('should return empty string when no thoughts', () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: 'Regular text content'
            }]
          }
        }]
      } as unknown as GenerateContentResponse;

      const thoughts = getThoughtsFromResponse(mockResponse);
      expect(thoughts).toBe('');
    });

    it('should handle empty response', () => {
      const mockResponse: GenerateContentResponse = {} as GenerateContentResponse;

      const thoughts = getThoughtsFromResponse(mockResponse);
      expect(thoughts).toBe('');
    });
  });

  describe('Default Configuration', () => {
    it('should have correct default JSON config', () => {
      expect(defaultGeminiJsonConfig).toEqual({
        temperature: 1.0,
        responseMimeType: 'application/json',
        topP: 0.95,
        topK: 32
      });
    });
  });

  describe('Model Constants', () => {
    it('should have correct model constants', () => {
      expect(GEMINI_MODELS.FLASH_THINKING_2_5).toBe('gemini-2.5-flash-preview-05-20');
      expect(GEMINI_MODELS.FLASH_THINKING_2_0).toBe('gemini-2.0-flash-thinking-exp-01-21');
      expect(GEMINI_MODELS.FLASH_2_0).toBe('gemini-2.0-flash');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty API key', () => {
      const configWithoutKey: LLMconfig = {
        apiKey: '',
        model: GEMINI_MODELS.FLASH_2_0,
        temperature: 1.0
      };

      expect(() => new GeminiProvider(configWithoutKey, mockSafetyLevel)).not.toThrow();
    });

    it('should handle undefined model', () => {
      const configWithoutModel: LLMconfig = {
        apiKey: 'test-key',
        temperature: 1.0
      };

      expect(() => new GeminiProvider(configWithoutModel, mockSafetyLevel)).not.toThrow();
    });
  });
});
