import type { GameSettings } from '$lib/types/gameSettings';
import {
  storyWordLimitConcise,
  storyWordLimitDetailed,
  actionDescriptionConcise,
  actionDescriptionDetailed,
  combatNarrationConcise,
  combatNarrationDetailed,
  characterDescriptionConcise,
  characterDescriptionDetailed,
  eventNarrationConcise,
  eventNarrationDetailed
} from './narrativePrompts';

/**
 * Centralized narration prompt system for applying detailed narration length settings
 * across all AI agents consistently.
 * 
 * This module provides a unified interface for getting appropriate word limits and
 * narrative instructions based on the detailedNarrationLength setting.
 */

export type NarrationType = 
  | 'story'
  | 'action' 
  | 'combat'
  | 'character'
  | 'event';

/**
 * Get the appropriate word limit instruction for a given narration type and game settings
 */
export function getNarrationLimit(type: NarrationType, gameSettings: GameSettings): string {
  const isDetailed = gameSettings.detailedNarrationLength;
  
  switch (type) {
    case 'story':
      return isDetailed ? storyWordLimitDetailed : storyWordLimitConcise;
    case 'action':
      return isDetailed ? actionDescriptionDetailed : actionDescriptionConcise;
    case 'combat':
      return isDetailed ? combatNarrationDetailed : combatNarrationConcise;
    case 'character':
      return isDetailed ? characterDescriptionDetailed : characterDescriptionConcise;
    case 'event':
      return isDetailed ? eventNarrationDetailed : eventNarrationConcise;
    default:
      return isDetailed ? storyWordLimitDetailed : storyWordLimitConcise;
  }
}

/**
 * Get detailed narration instructions for story generation
 */
export function getStoryNarrationPrompt(gameSettings: GameSettings): string {
  const limit = getNarrationLimit('story', gameSettings);
  return `Story narration ${limit}`;
}

/**
 * Get detailed narration instructions for action descriptions
 */
export function getActionNarrationPrompt(gameSettings: GameSettings): string {
  const limit = getNarrationLimit('action', gameSettings);
  return `Action description ${limit}`;
}

/**
 * Get detailed narration instructions for combat scenarios
 */
export function getCombatNarrationPrompt(gameSettings: GameSettings): string {
  const limit = getNarrationLimit('combat', gameSettings);
  return `Combat narration ${limit}`;
}

/**
 * Get detailed narration instructions for character descriptions
 */
export function getCharacterNarrationPrompt(gameSettings: GameSettings): string {
  const limit = getNarrationLimit('character', gameSettings);
  return `Character description ${limit}`;
}

/**
 * Get detailed narration instructions for event descriptions
 */
export function getEventNarrationPrompt(gameSettings: GameSettings): string {
  const limit = getNarrationLimit('event', gameSettings);
  return `Event description ${limit}`;
}

/**
 * Get general narration style instructions based on detailed setting
 */
export function getNarrationStylePrompt(gameSettings: GameSettings): string {
  if (gameSettings.detailedNarrationLength) {
    return `
DETAILED NARRATION MODE ACTIVE:
- Use rich, descriptive language with vivid imagery
- Include sensory details (sight, sound, smell, touch, taste)
- Develop character emotions and internal thoughts
- Provide comprehensive environmental context
- Create immersive, cinematic scenes
- Balance dialogue with narrative description
- Show character motivations and reactions in detail`;
  } else {
    return `
CONCISE NARRATION MODE ACTIVE:
- Focus on essential plot points and key actions
- Use clear, direct language
- Prioritize important dialogue and character interactions
- Maintain narrative flow while being economical with words
- Include only the most relevant environmental details`;
  }
}

/**
 * Build complete narration instructions for any content type
 */
export function buildNarrationInstructions(
  type: NarrationType,
  gameSettings: GameSettings,
  additionalInstructions?: string
): string {
  const limitPrompt = getNarrationLimit(type, gameSettings);
  const stylePrompt = getNarrationStylePrompt(gameSettings);
  
  let instructions = `${limitPrompt}\n\n${stylePrompt}`;
  
  if (additionalInstructions) {
    instructions += `\n\nADDITIONAL INSTRUCTIONS:\n${additionalInstructions}`;
  }
  
  return instructions;
}

/**
 * Utility to check if detailed narration is enabled
 */
export function isDetailedNarrationEnabled(gameSettings: GameSettings): boolean {
  return gameSettings.detailedNarrationLength;
}
