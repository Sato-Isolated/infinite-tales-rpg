/**
 * Centralized configuration builder for Gemini API
 * Consolidates configuration logic scattered across providers
 */

import type {
  GenerateContentConfig,
  SafetySetting,
  ThinkingConfig,
  HarmCategory,
  HarmBlockThreshold
} from '@google/genai';
import { HarmCategory as HC, HarmBlockThreshold as HBT } from '@google/genai';

/**
 * Default safety settings for RPG content generation
 * Allows creative content while maintaining safety
 */
export const DEFAULT_SAFETY_SETTINGS: SafetySetting[] = [
  {
    category: HC.HARM_CATEGORY_CIVIC_INTEGRITY,
    threshold: HBT.OFF
  },
  {
    category: HC.HARM_CATEGORY_HARASSMENT,
    threshold: HBT.OFF
  },
  {
    category: HC.HARM_CATEGORY_HATE_SPEECH,
    threshold: HBT.OFF
  },
  {
    category: HC.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HBT.OFF
  },
  {
    category: HC.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HBT.OFF
  }
];

/**
 * Safe safety settings for more restrictive content
 */
export const SAFE_SAFETY_SETTINGS: SafetySetting[] = [
  {
    category: HC.HARM_CATEGORY_CIVIC_INTEGRITY,
    threshold: HBT.OFF
  },
  {
    category: HC.HARM_CATEGORY_HARASSMENT,
    threshold: HBT.OFF
  },
  {
    category: HC.HARM_CATEGORY_HATE_SPEECH,
    threshold: HBT.OFF
  },
  {
    category: HC.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HBT.OFF
  },
  {
    category: HC.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HBT.OFF
  }
];

/**
 * Configuration presets for different scenarios
 */
export const CONFIG_PRESETS = {
  // For story generation with creative freedom
  CREATIVE_STORY: {
    temperature: 1.0,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 2048
  },

  // For action generation requiring consistency
  STRUCTURED_ACTIONS: {
    temperature: 0.7,
    topP: 0.9,
    topK: 30,
    maxOutputTokens: 1024
  },

  // For character stats requiring precision
  PRECISE_STATS: {
    temperature: 0.3,
    topP: 0.8,
    topK: 20,
    maxOutputTokens: 512
  },

  // For combat requiring balanced randomness
  COMBAT_BALANCED: {
    temperature: 0.8,
    topP: 0.9,
    topK: 35,
    maxOutputTokens: 1024
  }
} as const;

/**
 * Thinking budget presets for different complexity levels
 */
export const THINKING_BUDGETS = {
  FAST: 256,
  NORMAL: 512,
  DEEP: 1024,
  COMPLEX: 2048,
  UNLIMITED: -1,
  DISABLED: 0
} as const;

/**
 * Centralized configuration builder
 * Replaces scattered configuration logic throughout the codebase
 */
export class GeminiConfigBuilder {
  private config: GenerateContentConfig = {};

  static create(): GeminiConfigBuilder {
    return new GeminiConfigBuilder();
  }

  /**
   * Apply a configuration preset
   */
  withPreset(preset: keyof typeof CONFIG_PRESETS): this {
    const presetConfig = CONFIG_PRESETS[preset];
    Object.assign(this.config, presetConfig);
    return this;
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
  withThinking(budget?: number | keyof typeof THINKING_BUDGETS, includeThoughts: boolean = true): this {
    let actualBudget: number | undefined;

    if (typeof budget === 'string') {
      actualBudget = THINKING_BUDGETS[budget];
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
   * Configure safety settings with presets or custom settings
   */
  withSafety(settings: SafetySetting[] | 'default' | 'safe' = 'default'): this {
    if (typeof settings === 'string') {
      this.config.safetySettings = settings === 'safe' ? SAFE_SAFETY_SETTINGS : DEFAULT_SAFETY_SETTINGS;
    } else {
      this.config.safetySettings = settings;
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
        parts: instruction.map(text => ({ text }))
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
   * Configure output token limits
   */
  withOutputTokens(maxTokens: number): this {
    this.config.maxOutputTokens = maxTokens;
    return this;
  }

  /**
   * Configure creativity parameters
   */
  withCreativity(topP?: number, topK?: number): this {
    if (topP !== undefined) {
      this.config.topP = topP;
    }
    if (topK !== undefined) {
      this.config.topK = topK;
    }
    return this;
  }

  /**
   * Configure deterministic generation
   */
  withSeed(seed: number): this {
    this.config.seed = seed;
    return this;
  }

  /**
   * Configure stop sequences
   */
  withStopSequences(sequences: string[]): this {
    this.config.stopSequences = sequences;
    return this;
  }

  /**
   * Merge with existing configuration
   */
  mergeWith(otherConfig: Partial<GenerateContentConfig>): this {
    Object.assign(this.config, otherConfig);
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

  /**
   * Clone the current builder state
   */
  clone(): GeminiConfigBuilder {
    const cloned = new GeminiConfigBuilder();
    cloned.config = { ...this.config };
    return cloned;
  }
}

/**
 * Utility functions for common configuration scenarios
 */
export class ConfigUtils {
  /**
   * Create configuration for story generation
   */
  static forStoryGeneration(temperature: number = 1.0, thinkingBudget?: number): GenerateContentConfig {
    return GeminiConfigBuilder.create()
      .withPreset('CREATIVE_STORY')
      .withTemperature(temperature)
      .withThinking(thinkingBudget)
      .withSafety('default')
      .withJsonResponse()
      .build();
  }

  /**
   * Create configuration for action generation
   */
  static forActionGeneration(temperature: number = 0.7): GenerateContentConfig {
    return GeminiConfigBuilder.create()
      .withPreset('STRUCTURED_ACTIONS')
      .withTemperature(temperature)
      .withThinking('FAST')
      .withSafety('default')
      .withJsonResponse()
      .build();
  }

  /**
   * Create configuration for character stats
   */
  static forCharacterStats(temperature: number = 0.3): GenerateContentConfig {
    return GeminiConfigBuilder.create()
      .withPreset('PRECISE_STATS')
      .withTemperature(temperature)
      .withThinking('NORMAL')
      .withSafety('safe')
      .withJsonResponse()
      .build();
  }

  /**
   * Create configuration for combat resolution
   */
  static forCombat(temperature: number = 0.8): GenerateContentConfig {
    return GeminiConfigBuilder.create()
      .withPreset('COMBAT_BALANCED')
      .withTemperature(temperature)
      .withThinking('NORMAL')
      .withSafety('default')
      .withJsonResponse()
      .build();
  }

  /**
   * Create streaming configuration with progressive updates
   */
  static forStreaming(schema: object, thinkingBudget?: number): GenerateContentConfig {
    return GeminiConfigBuilder.create()
      .withJsonResponse(schema)
      .withThinking(thinkingBudget, true)
      .withSafety('default')
      .build();
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

  static getMaxTemperature(model: string): number {
    // Most Gemini models support temperature up to 2.0
    return 2.0;
  }

  static getDefaultTemperature(model: string): number {
    return 1.0;
  }

  static getMaxTokens(model: string): number {
    // Default max tokens for most models
    return 8192;
  }
}
