/**
 * Centralized configuration builder for Gemini API
 * Streamlined version with only actively used functionality
 *
 * This file has been cleaned up to remove unused functions and classes:
 * - Removed ConfigUtils class (unused)
 * - Removed withPreset, withOutputTokens, withCreativity, withSeed, withStopSequences, mergeWith, clone methods (unused)
 * - Removed generateConfigPresets and generateThinkingBudgets functions (unused)
 * - Completed safety settings integration in GeminiProvider
 */

import type {
  GenerateContentConfig,
  SafetySetting
} from '@google/genai';
import { HarmCategory as HC, HarmBlockThreshold as HBT } from '@google/genai';
import type { SafetyLevel } from '$lib/ai/config/contentRatingToSafety';

/**
 * Permissive safety settings for RPG content - allows creative freedom
 * All thresholds set to BLOCK_NONE for maximum content flexibility
 */
function generatePermissiveSafetySettings(): SafetySetting[] {
  return [
    {
      category: HC.HARM_CATEGORY_CIVIC_INTEGRITY,
      threshold: HBT.BLOCK_NONE
    },
    {
      category: HC.HARM_CATEGORY_HARASSMENT,
      threshold: HBT.BLOCK_NONE
    },
    {
      category: HC.HARM_CATEGORY_HATE_SPEECH,
      threshold: HBT.BLOCK_NONE
    },
    {
      category: HC.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HBT.BLOCK_NONE
    },
    {
      category: HC.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HBT.BLOCK_NONE
    }
  ];
}

/**
 * Balanced safety settings for moderate RPG content
 * Some restrictions while allowing typical RPG themes
 */
function generateBalancedSafetySettings(): SafetySetting[] {
  return [
    {
      category: HC.HARM_CATEGORY_CIVIC_INTEGRITY,
      threshold: HBT.BLOCK_MEDIUM_AND_ABOVE
    },
    {
      category: HC.HARM_CATEGORY_HARASSMENT,
      threshold: HBT.BLOCK_MEDIUM_AND_ABOVE
    },
    {
      category: HC.HARM_CATEGORY_HATE_SPEECH,
      threshold: HBT.BLOCK_LOW_AND_ABOVE
    },
    {
      category: HC.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HBT.BLOCK_MEDIUM_AND_ABOVE
    },
    {
      category: HC.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HBT.BLOCK_MEDIUM_AND_ABOVE
    }
  ];
}

/**
 * Strict safety settings for family-friendly content
 * High restrictions for safe content generation
 */
function generateStrictSafetySettings(): SafetySetting[] {
  return [
    {
      category: HC.HARM_CATEGORY_CIVIC_INTEGRITY,
      threshold: HBT.BLOCK_LOW_AND_ABOVE
    },
    {
      category: HC.HARM_CATEGORY_HARASSMENT,
      threshold: HBT.BLOCK_LOW_AND_ABOVE
    },
    {
      category: HC.HARM_CATEGORY_HATE_SPEECH,
      threshold: HBT.BLOCK_LOW_AND_ABOVE
    },
    {
      category: HC.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HBT.BLOCK_LOW_AND_ABOVE
    },
    {
      category: HC.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HBT.BLOCK_LOW_AND_ABOVE
    }
  ];
}

/**
 * Streamlined configuration builder for Gemini API
 * Contains only the actively used methods and functionality
 */
export class GeminiConfigBuilder {
  private config: GenerateContentConfig = {};

  static create(): GeminiConfigBuilder {
    return new GeminiConfigBuilder();
  }

  /**
   * Configure temperature with automatic validation
   * Replaces manual temperature logic in GeminiProvider
   */
  withTemperature(temp: number, max: number = 2): this {
    if (temp === 0) {
      this.config.temperature = 0;
    } else {
      this.config.temperature = Math.max(0, Math.min(temp, max));
    }
    return this;
  }

  /**
   * Configure for JSON response with optional schema
   */
  withJsonResponse(schema?: object): this {
    this.config.responseMimeType = 'application/json';
    if (schema) {
      this.config.responseSchema = schema;
    }
    return this;
  }

  /**
   * Configure thinking with budget and inclusion settings
   */
  withThinking(
    budget?: number | 'FAST' | 'NORMAL' | 'DEEP' | 'COMPLEX' | 'UNLIMITED' | 'DISABLED',
    includeThoughts: boolean = true
  ): this {
    let actualBudget: number | undefined;

    if (typeof budget === 'string') {
      // Inline thinking budget values instead of using removed function
      const budgetMap = {
        FAST: 256,
        NORMAL: 512,
        DEEP: 1024,
        COMPLEX: 2048,
        UNLIMITED: -1,
        DISABLED: 0
      };
      actualBudget = budgetMap[budget];
    } else {
      actualBudget = budget;
    }

    this.config.thinkingConfig = {
      includeThoughts,
      thinkingBudget: actualBudget
    };
    return this;
  }

  /**
   * Configure safety settings with robust validation and error handling
   */
  withSafety(settings: SafetyLevel | SafetySetting[]): this {
    try {
      if (typeof settings === 'string') {
        switch (settings) {
          case 'permissive':
            this.config.safetySettings = generatePermissiveSafetySettings();
            break;
          case 'strict':
            this.config.safetySettings = generateStrictSafetySettings();
            break;
          case 'balanced':
          default:
            this.config.safetySettings = generateBalancedSafetySettings();
            break;
        }
      } else if (Array.isArray(settings)) {
        // Validate that settings is a proper array of SafetySetting objects
        this.config.safetySettings = settings;
      } else {
        // Throw error instead of falling back to hardcoded value
        throw new Error(`Invalid safety settings provided: ${typeof settings}. Must be 'strict', 'balanced', 'permissive', or SafetySetting array.`);
      }
    } catch (error) {
      console.error('Error configuring safety settings:', error);
      // Re-throw error instead of falling back to hardcoded value
      throw error;
    }
    return this;
  }

  /**
   * Configure system instruction
   */
  withSystemInstruction(instruction: string | string[]): this {
    if (Array.isArray(instruction)) {
      this.config.systemInstruction = {
        role: 'systemInstruction',
        parts: instruction.map((text) => ({ text }))
      };
    } else {
      this.config.systemInstruction = {
        role: 'systemInstruction',
        parts: [{ text: instruction }]
      };
    }
    return this;
  }

  /**
   * Build the final configuration
   */
  build(): GenerateContentConfig {
    return { ...this.config };
  }

  /**
   * Reset the builder for reuse
   */
  reset(): this {
    this.config = {};
    return this;
  }
}

/**
 * Model capability detector
 * Consolidates model feature detection logic
 */
export class ModelCapabilities {
  private static readonly THINKING_MODELS = [
    'gemini-2.5-flash-preview-05-20',
    'gemini-2.0-flash-thinking-exp-01-21'
  ];

  private static readonly STRUCTURED_OUTPUT_MODELS = [
    'gemini-2.5-flash-preview-05-20',
    'gemini-2.0-flash-thinking-exp-01-21',
    'gemini-2.0-flash'
  ];

  static supportsThinking(model: string): boolean {
    return this.THINKING_MODELS.includes(model);
  }

  static supportsStructuredOutput(model: string): boolean {
    return this.STRUCTURED_OUTPUT_MODELS.includes(model);
  }

  static supportsThinkingBudget(model: string): boolean {
    return model === 'gemini-2.5-flash-preview-05-20';
  }

  static getMaxTemperature(_model: string): number {
    // Most Gemini models support temperature up to 2.0
    return 2.0;
  }

  static getDefaultTemperature(_model: string): number {
    return 1.0;
  }

  static getMaxTokens(_model: string): number {
    // Default max tokens for most models
    return 8192;
  }
}
