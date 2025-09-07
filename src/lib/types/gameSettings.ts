/**
 * Game settings and configuration type definitions
 */
import type { DiceSimulationMode } from '$lib/utils/webglDetection';

export type RandomEventsHandling = 'none' | 'probability' | 'ai_decides';

export type GameSettings = {
  detailedNarrationLength: boolean;
  aiIntroducesSkills: boolean;
  randomEventsHandling: RandomEventsHandling;
  generateAmbientDialogue: boolean;
  diceSimulationMode: DiceSimulationMode;
};

export const defaultGameSettings = () => ({
  detailedNarrationLength: true,
  aiIntroducesSkills: false,
  randomEventsHandling: 'probability' as const,
  generateAmbientDialogue: true,
  diceSimulationMode: 'auto' as const
});
