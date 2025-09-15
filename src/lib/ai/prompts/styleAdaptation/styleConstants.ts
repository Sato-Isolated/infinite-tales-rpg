/**
 * Style-specific constants for prompt generation
 * Each constant is organized by category and provides values for each game style
 */

import type { GameStyle } from '../../config/gameStyles';

/**
 * Role definitions for different game styles
 */
export const STYLE_ROLES = {
  rpg: 'Game Master',
  'visual-novel': 'Story Director'
} as const satisfies Record<GameStyle, string>;

/**
 * Enhanced role definitions with more context
 */
export const STYLE_ROLE_DESCRIPTIONS = {
  rpg: 'Pen & Paper Game Master',
  'visual-novel': 'Interactive Story Director'
} as const satisfies Record<GameStyle, string>;

/**
 * Narrative focus for different styles
 */
export const STYLE_NARRATIVE_FOCUS = {
  rpg: 'crafting captivating GAME experiences',
  'visual-novel': 'crafting emotionally engaging CHARACTER-driven experiences'
} as const satisfies Record<GameStyle, string>;

/**
 * Guidance approach for different styles
 */
export const STYLE_ACTION_GUIDANCE = {
  rpg: 'Reward innovation, punish foolishness',
  'visual-novel': 'Guide emotional growth, nurture meaningful connections'
} as const satisfies Record<GameStyle, string>;

/**
 * Experience terminology
 */
export const STYLE_EXPERIENCE_TERMS = {
  rpg: 'adventure',
  'visual-novel': 'narrative journey'
} as const satisfies Record<GameStyle, string>;

/**
 * Conflict terminology
 */
export const STYLE_CONFLICT_TERMS = {
  rpg: 'combat',
  'visual-novel': 'emotional conflict'
} as const satisfies Record<GameStyle, string>;

/**
 * Status/state terminology
 */
export const STYLE_STATUS_TERMS = {
  rpg: 'Combat Status',
  'visual-novel': 'Emotional State'
} as const satisfies Record<GameStyle, string>;

/**
 * Advice/guidance terminology
 */
export const STYLE_ADVICE_TERMS = {
  rpg: 'tactical_advice',
  'visual-novel': 'emotional_guidance'
} as const satisfies Record<GameStyle, string>;

/**
 * Scene/setting terminology
 */
export const STYLE_SCENE_TERMS = {
  rpg: 'SCENE',
  'visual-novel': 'narrative'
} as const satisfies Record<GameStyle, string>;

/**
 * Game terminology
 */
export const STYLE_GAME_TERMS = {
  rpg: 'RPG',
  'visual-novel': 'Interactive Story'
} as const satisfies Record<GameStyle, string>;

/**
 * Mechanical vs narrative focus
 */
export const STYLE_FOCUS_TERMS = {
  rpg: 'mechanical',
  'visual-novel': 'narrative'
} as const satisfies Record<GameStyle, string>;

/**
 * Helper function to get style-specific constant
 */
export function getStyleConstant<T extends Record<GameStyle, string>>(
  constants: T,
  gameStyle: GameStyle
): T[GameStyle] {
  return constants[gameStyle];
}

/**
 * Bundle of all commonly used style constants for easy access
 */
export function getStyleConstants(gameStyle: GameStyle) {
  return {
    role: STYLE_ROLES[gameStyle],
    roleDescription: STYLE_ROLE_DESCRIPTIONS[gameStyle],
    narrativeFocus: STYLE_NARRATIVE_FOCUS[gameStyle],
    actionGuidance: STYLE_ACTION_GUIDANCE[gameStyle],
    experience: STYLE_EXPERIENCE_TERMS[gameStyle],
    conflict: STYLE_CONFLICT_TERMS[gameStyle],
    status: STYLE_STATUS_TERMS[gameStyle],
    advice: STYLE_ADVICE_TERMS[gameStyle],
    scene: STYLE_SCENE_TERMS[gameStyle],
    gameType: STYLE_GAME_TERMS[gameStyle],
    focus: STYLE_FOCUS_TERMS[gameStyle]
  };
}

/**
 * Type-safe way to get all constants for a specific style
 */
export type StyleConstants = ReturnType<typeof getStyleConstants>;