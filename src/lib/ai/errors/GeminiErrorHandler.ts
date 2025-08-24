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
