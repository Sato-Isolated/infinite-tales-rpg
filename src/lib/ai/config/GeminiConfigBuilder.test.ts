import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GeminiConfigBuilder, ModelCapabilities } from './GeminiConfigBuilder';
import { HarmCategory, HarmBlockThreshold } from '@google/genai';
import type { SafetySetting } from '@google/genai';

// Mock console.error for safety settings error handling
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => { });

describe('GeminiConfigBuilder', () => {
  let builder: GeminiConfigBuilder;

  beforeEach(() => {
    vi.clearAllMocks();
    builder = GeminiConfigBuilder.create();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('static factory method', () => {
    it('should create new instance via static create method', () => {
      const instance = GeminiConfigBuilder.create();
      expect(instance).toBeInstanceOf(GeminiConfigBuilder);
      expect(instance).not.toBe(builder);
    });

    it('should create independent instances', () => {
      const instance1 = GeminiConfigBuilder.create();
      const instance2 = GeminiConfigBuilder.create();

      instance1.withTemperature(0.5);
      instance2.withTemperature(1.0);

      expect(instance1.build().temperature).toBe(0.5);
      expect(instance2.build().temperature).toBe(1.0);
    });
  });

  describe('withTemperature', () => {
    it('should set temperature correctly within bounds', () => {
      const config = builder.withTemperature(0.8).build();
      expect(config.temperature).toBe(0.8);
    });

    it('should handle zero temperature explicitly', () => {
      const config = builder.withTemperature(0).build();
      expect(config.temperature).toBe(0);
    });

    it('should clamp temperature to minimum value', () => {
      const config = builder.withTemperature(-0.5).build();
      expect(config.temperature).toBe(0);
    });

    it('should clamp temperature to default maximum value', () => {
      const config = builder.withTemperature(3.0).build();
      expect(config.temperature).toBe(2);
    });

    it('should respect custom maximum value', () => {
      const config = builder.withTemperature(1.5, 1.0).build();
      expect(config.temperature).toBe(1.0);
    });

    it('should handle custom maximum that allows higher values', () => {
      const config = builder.withTemperature(2.5, 3.0).build();
      expect(config.temperature).toBe(2.5);
    });

    it('should return builder instance for chaining', () => {
      const result = builder.withTemperature(0.5);
      expect(result).toBe(builder);
    });
  });

  describe('withJsonResponse', () => {
    it('should configure JSON response without schema', () => {
      const config = builder.withJsonResponse().build();
      expect(config.responseMimeType).toBe('application/json');
      expect(config.responseSchema).toBeUndefined();
    });

    it('should configure JSON response with schema', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        }
      };

      const config = builder.withJsonResponse(schema).build();
      expect(config.responseMimeType).toBe('application/json');
      expect(config.responseSchema).toEqual(schema);
    });

    it('should handle complex schema objects', () => {
      const complexSchema = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              profile: { type: 'object' },
              preferences: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      };

      const config = builder.withJsonResponse(complexSchema).build();
      expect(config.responseSchema).toEqual(complexSchema);
    });

    it('should return builder instance for chaining', () => {
      const result = builder.withJsonResponse();
      expect(result).toBe(builder);
    });
  });

  describe('withThinking', () => {
    it('should configure thinking with numeric budget', () => {
      const config = builder.withThinking(1024, true).build();
      expect(config.thinkingConfig).toEqual({
        includeThoughts: true,
        thinkingBudget: 1024
      });
    });

    it('should configure thinking with string budget presets', () => {
      const testCases = [
        { preset: 'FAST' as const, expected: 256 },
        { preset: 'NORMAL' as const, expected: 512 },
        { preset: 'DEEP' as const, expected: 1024 },
        { preset: 'COMPLEX' as const, expected: 2048 },
        { preset: 'UNLIMITED' as const, expected: -1 },
        { preset: 'DISABLED' as const, expected: 0 }
      ];

      testCases.forEach(({ preset, expected }) => {
        const config = GeminiConfigBuilder.create().withThinking(preset).build();
        expect(config.thinkingConfig?.thinkingBudget).toBe(expected);
      });
    });

    it('should default includeThoughts to true', () => {
      const config = builder.withThinking(512).build();
      expect(config.thinkingConfig?.includeThoughts).toBe(true);
    });

    it('should respect includeThoughts parameter', () => {
      const config = builder.withThinking(512, false).build();
      expect(config.thinkingConfig?.includeThoughts).toBe(false);
    });

    it('should handle undefined budget', () => {
      const config = builder.withThinking(undefined, true).build();
      expect(config.thinkingConfig).toEqual({
        includeThoughts: true,
        thinkingBudget: undefined
      });
    });

    it('should return builder instance for chaining', () => {
      const result = builder.withThinking(1024);
      expect(result).toBe(builder);
    });
  });

  describe('withSafety', () => {
    describe('string-based safety levels', () => {
      it('should configure permissive safety settings', () => {
        const config = builder.withSafety('permissive').build();
        const settings = config.safetySettings!;

        expect(settings).toHaveLength(5);
        settings.forEach(setting => {
          expect(setting.threshold).toBe(HarmBlockThreshold.BLOCK_NONE);
        });
      });

      it('should configure strict safety settings', () => {
        const config = builder.withSafety('strict').build();
        const settings = config.safetySettings!;

        expect(settings).toHaveLength(5);
        settings.forEach(setting => {
          expect(setting.threshold).toBe(HarmBlockThreshold.BLOCK_LOW_AND_ABOVE);
        });
      });

      it('should configure balanced safety settings', () => {
        const config = builder.withSafety('balanced').build();
        const settings = config.safetySettings!;

        expect(settings).toHaveLength(5);

        // Verify specific balanced settings
        const harassmentSetting = settings.find(s => s.category === HarmCategory.HARM_CATEGORY_HARASSMENT);
        expect(harassmentSetting?.threshold).toBe(HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE);

        const hateSpeechSetting = settings.find(s => s.category === HarmCategory.HARM_CATEGORY_HATE_SPEECH);
        expect(hateSpeechSetting?.threshold).toBe(HarmBlockThreshold.BLOCK_LOW_AND_ABOVE);
      });

      it('should default to balanced for unknown safety level', () => {
        const config = builder.withSafety('unknown' as any).build();
        const settings = config.safetySettings!;

        expect(settings).toHaveLength(5);
        // Should behave like balanced
        const harassmentSetting = settings.find(s => s.category === HarmCategory.HARM_CATEGORY_HARASSMENT);
        expect(harassmentSetting?.threshold).toBe(HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE);
      });
    });

    describe('array-based safety settings', () => {
      it('should accept custom SafetySetting array', () => {
        const customSettings: SafetySetting[] = [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
          }
        ]; const config = builder.withSafety(customSettings).build();
        expect(config.safetySettings).toEqual(customSettings);
      });

      it('should handle empty SafetySetting array', () => {
        const config = builder.withSafety([]).build();
        expect(config.safetySettings).toEqual([]);
      });
    });

    describe('error handling', () => {
      it('should throw error for invalid safety settings type', () => {
        expect(() => {
          builder.withSafety(123 as any);
        }).toThrow('Invalid safety settings provided: number. Must be \'strict\', \'balanced\', \'permissive\', or SafetySetting array.');
      });

      it('should throw error for null safety settings', () => {
        expect(() => {
          builder.withSafety(null as any);
        }).toThrow('Invalid safety settings provided: object. Must be \'strict\', \'balanced\', \'permissive\', or SafetySetting array.');
      });

      it('should throw error for object safety settings', () => {
        expect(() => {
          builder.withSafety({} as any);
        }).toThrow('Invalid safety settings provided: object. Must be \'strict\', \'balanced\', \'permissive\', or SafetySetting array.');
      });
    });

    it('should return builder instance for chaining', () => {
      const result = builder.withSafety('balanced');
      expect(result).toBe(builder);
    });
  });

  describe('withSystemInstruction', () => {
    it('should configure system instruction with string', () => {
      const instruction = 'You are a helpful assistant';
      const config = builder.withSystemInstruction(instruction).build();

      expect(config.systemInstruction).toEqual({
        role: 'systemInstruction',
        parts: [{ text: instruction }]
      });
    });

    it('should configure system instruction with string array', () => {
      const instructions = ['You are helpful', 'Be concise', 'Use examples'];
      const config = builder.withSystemInstruction(instructions).build();

      expect(config.systemInstruction).toEqual({
        role: 'systemInstruction',
        parts: [
          { text: 'You are helpful' },
          { text: 'Be concise' },
          { text: 'Use examples' }
        ]
      });
    });

    it('should handle empty string array', () => {
      const config = builder.withSystemInstruction([]).build();

      expect(config.systemInstruction).toEqual({
        role: 'systemInstruction',
        parts: []
      });
    });

    it('should handle empty string', () => {
      const config = builder.withSystemInstruction('').build();

      expect(config.systemInstruction).toEqual({
        role: 'systemInstruction',
        parts: [{ text: '' }]
      });
    });

    it('should return builder instance for chaining', () => {
      const result = builder.withSystemInstruction('test');
      expect(result).toBe(builder);
    });
  });

  describe('build', () => {
    it('should return copy of configuration', () => {
      const config1 = builder.withTemperature(0.5).build();
      const config2 = builder.build();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2);
    });

    it('should preserve all configured options', () => {
      const schema = { type: 'object' };
      const customSafety: SafetySetting[] = [{
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
      }];

      const config = builder
        .withTemperature(0.7)
        .withJsonResponse(schema)
        .withThinking(1024, false)
        .withSafety(customSafety)
        .withSystemInstruction('Test instruction')
        .build();

      expect(config.temperature).toBe(0.7);
      expect(config.responseMimeType).toBe('application/json');
      expect(config.responseSchema).toEqual(schema);
      expect(config.thinkingConfig).toEqual({
        includeThoughts: false,
        thinkingBudget: 1024
      });
      expect(config.safetySettings).toEqual(customSafety);
      expect(config.systemInstruction).toEqual({
        role: 'systemInstruction',
        parts: [{ text: 'Test instruction' }]
      });
    });
  });

  describe('reset', () => {
    it('should clear all configuration', () => {
      builder
        .withTemperature(0.8)
        .withJsonResponse()
        .withThinking(512)
        .reset();

      const config = builder.build();
      expect(config).toEqual({});
    });

    it('should return builder instance for chaining', () => {
      const result = builder.reset();
      expect(result).toBe(builder);
    });

    it('should allow reconfiguration after reset', () => {
      builder.withTemperature(0.5).reset().withTemperature(1.0);
      const config = builder.build();

      expect(config.temperature).toBe(1.0);
    });
  });

  describe('method chaining', () => {
    it('should support complete method chaining', () => {
      const config = GeminiConfigBuilder
        .create()
        .withTemperature(0.8)
        .withJsonResponse({ type: 'object' })
        .withThinking('DEEP', true)
        .withSafety('balanced')
        .withSystemInstruction('You are an RPG narrator')
        .build();

      expect(config.temperature).toBe(0.8);
      expect(config.responseMimeType).toBe('application/json');
      expect(config.thinkingConfig?.thinkingBudget).toBe(1024);
      expect(config.safetySettings).toHaveLength(5);
      expect((config.systemInstruction as any)?.parts).toHaveLength(1);
    });

    it('should allow partial chaining', () => {
      const config = builder
        .withTemperature(0.3)
        .withSafety('strict')
        .build();

      expect(config.temperature).toBe(0.3);
      expect(config.safetySettings).toHaveLength(5);
      expect(config.responseMimeType).toBeUndefined();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle multiple safety configuration calls', () => {
      const config = builder
        .withSafety('permissive')
        .withSafety('strict')
        .build();

      // Should use the last configuration
      const settings = config.safetySettings!;
      settings.forEach(setting => {
        expect(setting.threshold).toBe(HarmBlockThreshold.BLOCK_LOW_AND_ABOVE);
      });
    });

    it('should handle multiple temperature calls', () => {
      const config = builder
        .withTemperature(0.1)
        .withTemperature(0.9)
        .build();

      expect(config.temperature).toBe(0.9);
    });

    it('should handle extreme temperature values', () => {
      const config1 = builder.withTemperature(-100).build();
      expect(config1.temperature).toBe(0);

      const config2 = GeminiConfigBuilder.create().withTemperature(100).build();
      expect(config2.temperature).toBe(2);
    });

    it('should handle very large thinking budgets', () => {
      const config = builder.withThinking(999999).build();
      expect(config.thinkingConfig?.thinkingBudget).toBe(999999);
    });

    it('should handle negative thinking budgets', () => {
      const config = builder.withThinking(-1).build();
      expect(config.thinkingConfig?.thinkingBudget).toBe(-1);
    });
  });
});

describe('ModelCapabilities', () => {
  describe('supportsThinking', () => {
    it('should return true for thinking-enabled models', () => {
      expect(ModelCapabilities.supportsThinking('gemini-2.5-flash-preview-05-20')).toBe(true);
      expect(ModelCapabilities.supportsThinking('gemini-2.0-flash-thinking-exp-01-21')).toBe(true);
    });

    it('should return false for non-thinking models', () => {
      expect(ModelCapabilities.supportsThinking('gemini-2.0-flash')).toBe(false);
      expect(ModelCapabilities.supportsThinking('gemini-1.5-pro')).toBe(false);
      expect(ModelCapabilities.supportsThinking('unknown-model')).toBe(false);
    });

    it('should handle empty and invalid input', () => {
      expect(ModelCapabilities.supportsThinking('')).toBe(false);
      expect(ModelCapabilities.supportsThinking('   ')).toBe(false);
    });
  });

  describe('supportsStructuredOutput', () => {
    it('should return true for structured output models', () => {
      expect(ModelCapabilities.supportsStructuredOutput('gemini-2.5-flash-preview-05-20')).toBe(true);
      expect(ModelCapabilities.supportsStructuredOutput('gemini-2.0-flash-thinking-exp-01-21')).toBe(true);
      expect(ModelCapabilities.supportsStructuredOutput('gemini-2.0-flash')).toBe(true);
    });

    it('should return false for non-structured output models', () => {
      expect(ModelCapabilities.supportsStructuredOutput('gemini-1.5-pro')).toBe(false);
      expect(ModelCapabilities.supportsStructuredOutput('unknown-model')).toBe(false);
    });

    it('should handle empty and invalid input', () => {
      expect(ModelCapabilities.supportsStructuredOutput('')).toBe(false);
      expect(ModelCapabilities.supportsStructuredOutput('   ')).toBe(false);
    });
  });

  describe('supportsThinkingBudget', () => {
    it('should return true only for specific model', () => {
      expect(ModelCapabilities.supportsThinkingBudget('gemini-2.5-flash-preview-05-20')).toBe(true);
    });

    it('should return false for all other models', () => {
      expect(ModelCapabilities.supportsThinkingBudget('gemini-2.0-flash-thinking-exp-01-21')).toBe(false);
      expect(ModelCapabilities.supportsThinkingBudget('gemini-2.0-flash')).toBe(false);
      expect(ModelCapabilities.supportsThinkingBudget('unknown-model')).toBe(false);
    });

    it('should handle empty and invalid input', () => {
      expect(ModelCapabilities.supportsThinkingBudget('')).toBe(false);
      expect(ModelCapabilities.supportsThinkingBudget('   ')).toBe(false);
    });
  });

  describe('getMaxTemperature', () => {
    it('should return 2.0 for all models', () => {
      expect(ModelCapabilities.getMaxTemperature('gemini-2.5-flash-preview-05-20')).toBe(2.0);
      expect(ModelCapabilities.getMaxTemperature('gemini-2.0-flash')).toBe(2.0);
      expect(ModelCapabilities.getMaxTemperature('unknown-model')).toBe(2.0);
    });

    it('should handle empty input', () => {
      expect(ModelCapabilities.getMaxTemperature('')).toBe(2.0);
    });
  });

  describe('getDefaultTemperature', () => {
    it('should return 1.0 for all models', () => {
      expect(ModelCapabilities.getDefaultTemperature('gemini-2.5-flash-preview-05-20')).toBe(1.0);
      expect(ModelCapabilities.getDefaultTemperature('gemini-2.0-flash')).toBe(1.0);
      expect(ModelCapabilities.getDefaultTemperature('unknown-model')).toBe(1.0);
    });

    it('should handle empty input', () => {
      expect(ModelCapabilities.getDefaultTemperature('')).toBe(1.0);
    });
  });

  describe('getMaxTokens', () => {
    it('should return 8192 for all models', () => {
      expect(ModelCapabilities.getMaxTokens('gemini-2.5-flash-preview-05-20')).toBe(8192);
      expect(ModelCapabilities.getMaxTokens('gemini-2.0-flash')).toBe(8192);
      expect(ModelCapabilities.getMaxTokens('unknown-model')).toBe(8192);
    });

    it('should handle empty input', () => {
      expect(ModelCapabilities.getMaxTokens('')).toBe(8192);
    });
  });

  describe('model name consistency', () => {
    it('should have consistent model names across capabilities', () => {
      const thinkingModels = ['gemini-2.5-flash-preview-05-20', 'gemini-2.0-flash-thinking-exp-01-21'];
      const structuredModels = ['gemini-2.5-flash-preview-05-20', 'gemini-2.0-flash-thinking-exp-01-21', 'gemini-2.0-flash'];

      // All thinking models should support structured output
      thinkingModels.forEach(model => {
        expect(ModelCapabilities.supportsStructuredOutput(model)).toBe(true);
      });

      // Only one model supports thinking budget
      expect(ModelCapabilities.supportsThinkingBudget('gemini-2.5-flash-preview-05-20')).toBe(true);
    });
  });

  describe('case sensitivity', () => {
    it('should be case sensitive for model names', () => {
      expect(ModelCapabilities.supportsThinking('GEMINI-2.0-FLASH')).toBe(false);
      expect(ModelCapabilities.supportsThinking('Gemini-2.0-Flash')).toBe(false);
      expect(ModelCapabilities.supportsStructuredOutput('GEMINI-2.0-FLASH')).toBe(false);
    });
  });
});

describe('integration scenarios', () => {
  describe('typical configuration flows', () => {
    it('should configure for JSON story generation', () => {
      const config = GeminiConfigBuilder
        .create()
        .withTemperature(0.8)
        .withJsonResponse({
          type: 'object',
          properties: {
            story: { type: 'string' },
            choices: { type: 'array', items: { type: 'string' } }
          }
        })
        .withSafety('balanced')
        .withSystemInstruction('You are an RPG storyteller')
        .build();

      expect(config.temperature).toBe(0.8);
      expect(config.responseMimeType).toBe('application/json');
      expect(config.responseSchema).toBeDefined();
      expect(config.safetySettings).toHaveLength(5);
      expect((config.systemInstruction as any)?.parts[0].text).toBe('You are an RPG storyteller');
    });

    it('should configure for thinking-enabled models', () => {
      const config = GeminiConfigBuilder
        .create()
        .withThinking('DEEP', true)
        .withTemperature(1.2)
        .withSafety('permissive')
        .build();

      expect(config.thinkingConfig).toEqual({
        includeThoughts: true,
        thinkingBudget: 1024
      });
      expect(config.temperature).toBe(1.2);
      expect(config.safetySettings!.every(s => s.threshold === HarmBlockThreshold.BLOCK_NONE)).toBe(true);
    });

    it('should configure for family-friendly content', () => {
      const config = GeminiConfigBuilder
        .create()
        .withTemperature(0.3)
        .withSafety('strict')
        .withSystemInstruction(['Be family-friendly', 'Avoid violence', 'Use positive themes'])
        .build();

      expect(config.temperature).toBe(0.3);
      expect(config.safetySettings!.every(s => s.threshold === HarmBlockThreshold.BLOCK_LOW_AND_ABOVE)).toBe(true);
      expect((config.systemInstruction as any)?.parts).toHaveLength(3);
    });
  });

  describe('builder reuse scenarios', () => {
    it('should support builder reuse with reset', () => {
      const builder = GeminiConfigBuilder.create();

      const config1 = builder
        .withTemperature(0.5)
        .withSafety('strict')
        .build();

      const config2 = builder
        .reset()
        .withTemperature(1.5)
        .withSafety('permissive')
        .build();

      expect(config1.temperature).toBe(0.5);
      expect(config2.temperature).toBe(1.5);
      expect(config1.safetySettings).not.toEqual(config2.safetySettings);
    });

    it('should handle configuration overwrites', () => {
      const config = GeminiConfigBuilder
        .create()
        .withTemperature(0.1)
        .withSafety('strict')
        .withTemperature(0.9)  // Overwrite temperature
        .withSafety('permissive')  // Overwrite safety
        .build();

      expect(config.temperature).toBe(0.9);
      expect(config.safetySettings!.every(s => s.threshold === HarmBlockThreshold.BLOCK_NONE)).toBe(true);
    });
  });

  describe('error recovery scenarios', () => {
    it('should handle partial configuration errors gracefully', () => {
      const builder = GeminiConfigBuilder.create();

      // Configure valid options
      builder.withTemperature(0.7).withJsonResponse();

      // Attempt invalid safety configuration
      expect(() => {
        builder.withSafety(null as any);
      }).toThrow();

      // Builder should still work for other options
      const config = builder.reset().withTemperature(0.5).build();
      expect(config.temperature).toBe(0.5);
    });
  });

  describe('ModelCapabilities integration', () => {
    it('should validate thinking configuration against model capabilities', () => {
      const models = [
        'gemini-2.5-flash-preview-05-20',
        'gemini-2.0-flash-thinking-exp-01-21',
        'gemini-2.0-flash'
      ];

      models.forEach(model => {
        const supportsThinking = ModelCapabilities.supportsThinking(model);
        const supportsStructured = ModelCapabilities.supportsStructuredOutput(model);
        const supportsBudget = ModelCapabilities.supportsThinkingBudget(model);

        // Verify logical consistency
        if (supportsThinking) {
          expect(supportsStructured).toBe(true);
        }

        if (supportsBudget) {
          expect(supportsThinking).toBe(true);
        }
      });
    });

    it('should respect model temperature limits', () => {
      const models = ['gemini-2.0-flash', 'gemini-2.5-flash-preview-05-20'];

      models.forEach(model => {
        const maxTemp = ModelCapabilities.getMaxTemperature(model);
        const config = GeminiConfigBuilder
          .create()
          .withTemperature(maxTemp + 1, maxTemp)
          .build();

        expect(config.temperature).toBe(maxTemp);
      });
    });
  });
});
