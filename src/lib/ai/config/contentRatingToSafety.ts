/**
 * Content Rating to Safety Level Mapping
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
 */
export function contentRatingToSafetyLevel(contentRating: ContentRating): SafetyLevel {
  const description = CONTENT_RATING_DESCRIPTIONS[contentRating];
  if (!description) {
    throw new Error(`Unknown content rating: ${contentRating}. Must be one of: safe, mid, adult, uncensored`);
  }
  return description.safetyLevel;
}

/**
 * Extracts the safety level from a story's content rating
 * @throws Error if story or content_rating is missing
 */
export function getSafetyLevelFromStory(story: Story | null | undefined): SafetyLevel {
  if (!story?.content_rating) {
    throw new Error('Story must have a content_rating configured. Please set content rating in tale settings.');
  }

  const contentRating = story.content_rating as ContentRating;
  return contentRatingToSafetyLevel(contentRating);
}