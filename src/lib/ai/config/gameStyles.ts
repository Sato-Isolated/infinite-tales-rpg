/**
 * Game style configuration for adapting narrative prompts
 * Supports RPG and Visual Novel styles with different focus areas
 */

export type GameStyle = 'rpg' | 'visual-novel';

export interface GameStyleConfig {
  id: GameStyle;
  name: string;
  description: string;
  gmRole: string;
  narrativeFocus: string;
  actionGuidance: string;
  characterEmphasis: number; // 0-1, emphasis on character development
  mechanicsWeight: number; // 0-1, emphasis on game mechanics
  relationshipFocus: boolean; // whether to emphasize relationships
  emotionalDepth: boolean; // whether to include emotional depth
}

export const GAME_STYLES: Record<GameStyle, GameStyleConfig> = {
  'rpg': {
    id: 'rpg',
    name: 'Classic RPG',
    description: 'Adventure-focused with Game Master approach',
    gmRole: 'Pen & Paper Game Master',
    narrativeFocus: 'crafting captivating GAME experiences',
    actionGuidance: 'Reward innovation, punish foolishness',
    characterEmphasis: 0.4,
    mechanicsWeight: 0.8,
    relationshipFocus: false,
    emotionalDepth: false
  },
  'visual-novel': {
    id: 'visual-novel',
    name: 'Visual Novel',
    description: 'Character-driven narrative with emotional choices',
    gmRole: 'Interactive Story Director',
    narrativeFocus: 'weaving compelling CHARACTER-driven narratives',
    actionGuidance: 'Focus on emotional resonance and character development',
    characterEmphasis: 0.9,
    mechanicsWeight: 0.3,
    relationshipFocus: true,
    emotionalDepth: true
  }
};

/**
 * Get the current game style configuration
 */
export function getGameStyleConfig(style: GameStyle): GameStyleConfig {
  return GAME_STYLES[style] || GAME_STYLES.rpg;
}

/**
 * Check if a style emphasizes character relationships
 */
export function isCharacterFocused(style: GameStyle): boolean {
  return getGameStyleConfig(style).relationshipFocus;
}

/**
 * Check if a style includes emotional depth
 */
export function hasEmotionalDepth(style: GameStyle): boolean {
  return getGameStyleConfig(style).emotionalDepth;
}