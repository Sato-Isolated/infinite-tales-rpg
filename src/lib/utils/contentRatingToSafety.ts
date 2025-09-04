/**
 * Maps content rating from tale settings to appropriate safety level
 * This allows each tale to have its own safety configuration based on content needs
 */

import type { SafetyLevel } from '$lib/types/safetySettings';

export type { SafetyLevel } from '$lib/types/safetySettings';

/**
 * Maps a tale's content rating to the appropriate safety level
 * @param contentRating The content rating from the tale settings
 * @returns The corresponding safety level for LLM configuration
 */
export function contentRatingToSafetyLevel(contentRating: string): SafetyLevel {
  // Normalize the content rating string
  const normalized = contentRating.toLowerCase().trim();

  switch (normalized) {
    case 'safe':
    case 'family-friendly':
      return 'strict';
    case 'mid':
    case 'mild':
    case 'moderate':
      return 'balanced';
    case 'adult':
    case 'mature':
    case 'uncensored':
    case 'no restrictions':
      return 'permissive';
    default:
      // Throw error for unknown values instead of defaulting
      throw new Error(`Unknown content rating: ${contentRating}. Must be one of: safe, mid, adult, uncensored`);
  }
}

/**
 * Gets safety level from a story object
 * @param story The story object containing content_rating
 * @returns The appropriate safety level
 * @throws Error if story or content_rating is missing
 */
export function getSafetyLevelFromStory(story: { content_rating?: string }): SafetyLevel {
  if (!story?.content_rating) {
    throw new Error('Story must have a content_rating configured. Please set content rating in tale settings.');
  }
  return contentRatingToSafetyLevel(story.content_rating);
}
