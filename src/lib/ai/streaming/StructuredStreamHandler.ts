/**
 * Structured streaming handler using @google/genai's native capabilities
 * Replaces the complex manual JSON parsing in jsonStreamHelper.ts
 */

import type { GenerateContentConfig, GenerateContentResponse } from '@google/genai';
import type { LLM, LLMRequest } from '../llm';

/**
 * Simplified streaming handler that leverages SDK's structured output
 * Eliminates the need for manual JSON parsing, markdown detection, and repair logic
 */
export class StructuredStreamHandler {
  constructor(private llm: LLM) { }

  /**
   * Stream structured response with type safety
   * Replaces the 300+ lines of manual parsing in requestLLMJsonStream
   */
  async streamStructuredResponse<T extends Record<string, any>>(
    request: LLMRequest,
    schema: object,
    onStoryUpdate?: (story: string, isComplete: boolean) => void,
    onThoughtUpdate?: (thought: string, isComplete: boolean) => void
  ): Promise<T | undefined> {

    // Configure for structured output - eliminates manual JSON parsing
    const config: GenerateContentConfig = {
      ...request.config,
      responseMimeType: 'application/json',
      responseSchema: schema,
      thinkingConfig: {
        includeThoughts: !!onThoughtUpdate,
        thinkingBudget: request.thinkingConfig?.thinkingBudget
      }
    };

    const enhancedRequest: LLMRequest = {
      ...request,
      config,
      stream: true
    };

    try {
      // Use LLM's generateContentStream which now returns structured data
      const streamResponse = await this.llm.generateContentStream(
        enhancedRequest,
        onStoryUpdate || (() => { }),
        onThoughtUpdate
      );

      // The response is already parsed and typed by the SDK
      return streamResponse as T;

    } catch (error) {
      console.error('Structured streaming failed:', error);

      // Fallback: try non-streaming structured generation
      try {
        console.log('Attempting fallback to non-streaming structured generation...');
        const fallbackRequest: LLMRequest = {
          ...request,
          config: {
            ...config,
            responseMimeType: 'application/json',
            responseSchema: schema
          },
          stream: false
        };

        const result = await this.llm.generateContent(fallbackRequest);
        if (result?.content) {
          // Ensure final callbacks are called for fallback
          const typedResult = result.content as T;
          if (onStoryUpdate && 'story' in typedResult) {
            onStoryUpdate(String(typedResult.story), true);
          }
          if (onThoughtUpdate && result.thoughts) {
            onThoughtUpdate(result.thoughts, true);
          }
          return typedResult;
        }
      } catch (fallbackError) {
        console.error('Fallback structured generation also failed:', fallbackError);
      }

      throw error;
    }
  }

  /**
   * Stream with progressive story updates using SDK's partial streaming
   * Much simpler than the manual chunk processing in jsonStreamHelper
   */
  async streamWithProgressiveUpdates<T extends { story?: string }>(
    request: LLMRequest,
    schema: object,
    onStoryUpdate: (story: string, isComplete: boolean) => void,
    onThoughtUpdate?: (thought: string, isComplete: boolean) => void
  ): Promise<T | undefined> {

    // Enable partial values for progressive updates
    const config: GenerateContentConfig = {
      ...request.config,
      responseMimeType: 'application/json',
      responseSchema: schema,
      thinkingConfig: {
        includeThoughts: !!onThoughtUpdate,
        thinkingBudget: request.thinkingConfig?.thinkingBudget
      }
    };

    const enhancedRequest: LLMRequest = {
      ...request,
      config,
      stream: true
    };

    try {
      // The SDK handles all the complexity of streaming JSON parsing
      let accumulatedStory = '';
      let finalResult: T | undefined;

      const storyCallback = (partialStory: string, isComplete: boolean) => {
        if (partialStory !== accumulatedStory) {
          accumulatedStory = partialStory;
          onStoryUpdate(partialStory, isComplete);
        }
      };

      finalResult = await this.llm.generateContentStream(
        enhancedRequest,
        storyCallback,
        onThoughtUpdate
      ) as T;

      return finalResult;

    } catch (error) {
      console.error('Progressive streaming failed:', error);
      throw error;
    }
  }

  /**
   * Simple structured generation without streaming
   * For cases where streaming is not needed
   */
  async generateStructured<T>(
    request: LLMRequest,
    schema: object
  ): Promise<T | undefined> {

    const config: GenerateContentConfig = {
      ...request.config,
      responseMimeType: 'application/json',
      responseSchema: schema,
      thinkingConfig: request.thinkingConfig
    };

    const enhancedRequest: LLMRequest = {
      ...request,
      config,
      stream: false
    };

    try {
      const result = await this.llm.generateContent(enhancedRequest);
      return result?.content as T;
    } catch (error) {
      console.error('Structured generation failed:', error);
      throw error;
    }
  }

  /**
   * Batch process multiple structured requests
   * Useful for generating multiple related responses efficiently
   */
  async generateBatch<T>(
    requests: Array<{ request: LLMRequest; schema: object }>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Array<T | undefined>> {

    const results: Array<T | undefined> = [];

    for (let i = 0; i < requests.length; i++) {
      const { request, schema } = requests[i];

      try {
        const result = await this.generateStructured<T>(request, schema);
        results.push(result);
      } catch (error) {
        console.error(`Batch request ${i} failed:`, error);
        results.push(undefined);
      }

      if (onProgress) {
        onProgress(i + 1, requests.length);
      }
    }

    return results;
  }
}

/**
 * Factory function to create structured stream handlers
 * Provides a clean interface for different LLM providers
 */
export function createStructuredStreamHandler(llm: LLM): StructuredStreamHandler {
  return new StructuredStreamHandler(llm);
}

/**
 * Utility type for extracting the story field from responses
 * Helps with type safety for story callbacks
 */
export type StoryExtractor<T> = T extends { story: infer S }
  ? S extends string
  ? S
  : never
  : never;

/**
 * Helper function to safely extract story from response
 * Provides type-safe story extraction for callbacks
 */
export function extractStory<T extends Record<string, any>>(
  response: T
): string {
  if ('story' in response && typeof response.story === 'string') {
    return response.story;
  }
  return '';
}

/**
 * Configuration builder for common streaming scenarios
 * Simplifies setup for different types of structured responses
 */
export class StreamingConfigBuilder {
  private config: Partial<GenerateContentConfig> = {};

  static create(): StreamingConfigBuilder {
    return new StreamingConfigBuilder();
  }

  withSchema(schema: object): this {
    this.config.responseSchema = schema;
    this.config.responseMimeType = 'application/json';
    return this;
  }

  withThinking(budget?: number): this {
    this.config.thinkingConfig = {
      includeThoughts: true,
      thinkingBudget: budget
    };
    return this;
  }

  withTemperature(temperature: number): this {
    this.config.temperature = temperature;
    return this;
  }

  withSafetySettings(settings: any[]): this {
    this.config.safetySettings = settings;
    return this;
  }

  build(): GenerateContentConfig {
    return {
      responseMimeType: 'application/json',
      ...this.config
    };
  }
}
