/**
 * Content Rating to Safety Level Mapping
 * Consolidated implementation - single source of truth for all content rating functionality
 * Maps tale content ratings to appropriate Gemini safety levels
 */

import type { Story } from '$lib/ai/agents/storyAgent';

export type SafetyLevel = 'strict' | 'balanced' | 'permissive';
export type ContentRating = 'safe' | 'mid' | 'adult' | 'uncensored';

/**
 * Descriptions for each content rating level
 */
export const CONTENT_RATING_DESCRIPTIONS: Record<ContentRating, {
  title: string;
  description: string;
  icon: string;
  safetyLevel: SafetyLevel;
}> = {
  safe: {
    title: 'Safe',
    description: 'Family-friendly content, no mature themes',
    icon: '🟢',
    safetyLevel: 'strict'
  },
  mid: {
    title: 'Mid',
    description: 'Moderate content, typical RPG themes like combat and mild language',
    icon: '🟡',
    safetyLevel: 'balanced'
  },
  adult: {
    title: 'Adult',
    description: 'Mature content, romance, violence, complex themes',
    icon: '🟠',
    safetyLevel: 'permissive'
  },
  uncensored: {
    title: 'Uncensored',
    description: 'No content restrictions, maximum creative freedom',
    icon: '🔴',
    safetyLevel: 'permissive'
  }
};

/**
 * Maps a content rating to the appropriate safety level for LLM providers
 * Enhanced version that supports both typed ContentRating and flexible string input
 * @param contentRating The content rating (typed or string)
 * @returns The corresponding safety level
 */
export function contentRatingToSafetyLevel(contentRating: ContentRating | string): SafetyLevel {
  // If it's already a typed ContentRating, use direct lookup
  if (contentRating in CONTENT_RATING_DESCRIPTIONS) {
    return CONTENT_RATING_DESCRIPTIONS[contentRating as ContentRating].safetyLevel;
  }

  // Handle string inputs with normalization (for backward compatibility)
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
      throw new Error(`Unknown content rating: ${contentRating}. Must be one of: safe, mid, adult, uncensored`);
  }
}

/**
 * Extracts the safety level from a story's content rating
 * Enhanced version that works with various story object types
 * @param story The story object containing content_rating
 * @returns The appropriate safety level
 * @throws Error if story or content_rating is missing
 */
export function getSafetyLevelFromStory(story: Story | { content_rating?: string } | null | undefined): SafetyLevel {
  if (!story?.content_rating) {
    throw new Error('Story must have a content_rating configured. Please set content rating in tale settings.');
  }

  return contentRatingToSafetyLevel(story.content_rating);
}
