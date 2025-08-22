/**
 * Centralized error handling for Gemini API
 * Consolidates error handling logic from GeminiProvider
 */

import type { LLM, LLMRequest } from '../llm';
import { handleError } from '../../util.svelte';
import {
  setIsGeminiThinkingOverloaded,
  setIsGeminiFlashExpOverloaded,
  getIsGeminiThinkingOverloaded
} from '../../state/errorState.svelte';

/**
 * Custom error types for better error handling
 */
export class GeminiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}

export class RateLimitError extends GeminiError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT', 429, true);
  }
}

export class OverloadError extends GeminiError {
  constructor(message: string = 'Service temporarily overloaded') {
    super(message, 'OVERLOAD', 503, true);
  }
}

export class AuthenticationError extends GeminiError {
  constructor(message: string = 'Invalid API key') {
    super(message, 'AUTH_ERROR', 401, false);
  }
}

export class QuotaExceededError extends GeminiError {
  constructor(message: string = 'API quota exceeded') {
    super(message, 'QUOTA_EXCEEDED', 429, false);
  }
}

/**
 * Centralized error handler for Gemini API interactions
 * Replaces scattered error handling logic in GeminiProvider
 */
export class GeminiErrorHandler {
  constructor(private fallbackLLM?: LLM) { }

  /**
   * Main error handling method
   * Consolidates all error handling logic from GeminiProvider.handleGeminiError
   */
  async handle(
    error: unknown,
    request: LLMRequest,
    modelToUse: string,
    fallbackMethod?: (request: LLMRequest) => Promise<any>
  ): Promise<any> {

    const geminiError = this.parseError(error);

    // Update overload state based on error type and model
    this.updateOverloadState(geminiError, modelToUse);

    // Handle specific error types
    switch (geminiError.code) {
      case 'AUTH_ERROR':
        handleError(geminiError.message);
        return undefined;

      case 'RATE_LIMIT':
      case 'QUOTA_EXCEEDED':
        // These are typically non-recoverable in the short term
        handleError(geminiError.message);
        return this.attemptFallback(request, fallbackMethod);

      case 'OVERLOAD':
        // Try fallback for overload errors
        return this.attemptFallback(request, fallbackMethod);

      default:
        // Unknown error, try fallback if available
        console.error('Unknown Gemini error:', geminiError);
        return this.attemptFallback(request, fallbackMethod);
    }
  }

  /**
   * Parse raw error into structured GeminiError
   */
  private parseError(error: unknown): GeminiError {
    if (error instanceof GeminiError) {
      return error;
    }

    if (error instanceof Error) {
      const message = error.message;

      // API key validation
      if (message.includes('API key not valid') || message.includes('401')) {
        return new AuthenticationError(message);
      }

      // Rate limiting
      if (message.includes('429')) {
        if (message.includes('quota')) {
          return new QuotaExceededError(
            'You have reached the daily quota for the Gemini AI. Please try again tomorrow.'
          );
        }
        return new RateLimitError(
          'You have reached the rate limit for the Gemini AI. Please try again in a few minutes.'
        );
      }

      // Service overload
      if (message.includes('503') || message.includes('500')) {
        return new OverloadError(
          'The Gemini AI is currently overloaded! You can enable the fallback in settings.'
        );
      }

      // Generic error
      return new GeminiError(message, 'UNKNOWN_ERROR', undefined, true);
    }

    // Non-Error object
    return new GeminiError(String(error), 'UNKNOWN_ERROR', undefined, true);
  }

  /**
   * Update overload state for UI feedback
   */
  private updateOverloadState(error: GeminiError, modelToUse: string): void {
    if (error.code === 'OVERLOAD') {
      if (this.isThinkingModel(modelToUse)) {
        setIsGeminiThinkingOverloaded(true);
      } else {
        setIsGeminiFlashExpOverloaded(true);
      }
    }
  }

  /**
   * Attempt to use fallback LLM
   */
  private async attemptFallback(
    request: LLMRequest,
    fallbackMethod?: (request: LLMRequest) => Promise<any>
  ): Promise<any> {

    if (!this.fallbackLLM && !fallbackMethod) {
      return undefined;
    }

    try {
      console.log('Attempting fallback LLM...');

      if (fallbackMethod) {
        const fallbackResult = await fallbackMethod(request);
        return this.addFallbackMarker(fallbackResult, request);
      }

      if (this.fallbackLLM) {
        // Determine which method to call based on request type
        if (request.stream) {
          // This is a streaming request
          const fallbackResult = await this.fallbackLLM.generateContentStream(
            request,
            () => { }, // Empty story callback
            undefined // No thought callback
          );
          return this.addFallbackMarker(fallbackResult, request);
        } else {
          // Regular generation request
          const fallbackResult = await this.fallbackLLM.generateContent(request);
          return this.addFallbackMarker(fallbackResult, request);
        }
      }

    } catch (fallbackError) {
      console.error('Fallback LLM also failed:', fallbackError);
      return undefined;
    }

    return undefined;
  }

  /**
   * Add fallback marker to result if requested
   */
  private addFallbackMarker(result: any, request: LLMRequest): any {
    if (!result) return result;

    const shouldMarkFallback = request.returnFallbackProperty ||
      (this.fallbackLLM as any)?.llmConfig?.returnFallbackProperty;

    if (shouldMarkFallback) {
      if (result.content) {
        result.content.fallbackUsed = true;
      } else {
        result.fallbackUsed = true;
      }
    }

    return result;
  }

  /**
   * Check if model supports thinking
   */
  private isThinkingModel(model: string): boolean {
    return model === 'gemini-2.5-flash-preview-05-20';
  }

  /**
   * Check if early fallback should be used
   */
  shouldEarlyFallback(modelToUse: string): boolean {
    return this.fallbackLLM !== undefined &&
      this.isThinkingModel(modelToUse) &&
      getIsGeminiThinkingOverloaded();
  }

  /**
   * Create appropriate error for early fallback
   */
  createEarlyFallbackError(): GeminiError {
    return new OverloadError(
      'Gemini Thinking is overloaded! Using fallback to avoid waiting.'
    );
  }
}

/**
 * Retry configuration for different error types
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: ['OVERLOAD', 'RATE_LIMIT', 'UNKNOWN_ERROR']
};

/**
 * Retry handler with exponential backoff
 * For critical operations that should be retried
 */
export class RetryHandler {
  constructor(private config: RetryConfig = DEFAULT_RETRY_CONFIG) { }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string = 'operation'
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on last attempt
        if (attempt === this.config.maxRetries) {
          break;
        }

        // Check if error is retryable
        const geminiError = error instanceof GeminiError ?
          error :
          new GeminiError(lastError.message, 'UNKNOWN_ERROR');

        if (!this.config.retryableErrors.includes(geminiError.code)) {
          throw lastError;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt),
          this.config.maxDelay
        );

        console.warn(`${context} failed (attempt ${attempt + 1}/${this.config.maxRetries + 1}), retrying in ${delay}ms...`, error);

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}

/**
 * Factory function to create error handlers
 */
export function createErrorHandler(fallbackLLM?: LLM): GeminiErrorHandler {
  return new GeminiErrorHandler(fallbackLLM);
}

/**
 * Utility functions for error handling
 */
export class ErrorUtils {
  /**
   * Check if an error is recoverable
   */
  static isRecoverable(error: unknown): boolean {
    if (error instanceof GeminiError) {
      return error.retryable;
    }
    return false;
  }

  /**
   * Extract error message for user display
   */
  static getUserMessage(error: unknown): string {
    if (error instanceof GeminiError) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'An unexpected error occurred';
  }

  /**
   * Log error with context
   */
  static logError(error: unknown, context: string, additionalInfo?: Record<string, any>): void {
    console.error(`[${context}] Error:`, error);
    if (additionalInfo) {
      console.error(`[${context}] Additional info:`, additionalInfo);
    }
  }
}
