/**
 * Test de validation finale pour l'intégration de l'adaptation de style
 * Ce test vérifie que les adaptations fonctionnent correctement avec les vraies fonctions
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setGameStyle, resetGameStyle } from '$lib/state/gameStyleState.svelte';
import { jsonSystemInstructionForGameAgent, jsonSystemInstructionForPlayerQuestion } from '../gameJsonPrompts';
import { systemBehaviour } from '../gameSystemPrompts';
import type { GameSettings } from '$lib/types/gameSettings';

const testGameSettings: GameSettings = {
  detailedNarrationLength: true,
  generateAmbientDialogue: false,
  aiIntroducesSkills: false,
  randomEventsHandling: 'none',
  diceSimulationMode: 'auto'
};

describe('Style Adaptation Final Validation', () => {
  beforeEach(() => {
    resetGameStyle();
  });

  describe('Adaptations work correctly', () => {
    it('RPG style should preserve original terms', () => {
      setGameStyle('rpg');
      
      const jsonPrompt = jsonSystemInstructionForGameAgent(testGameSettings);
      const playerQuestionPrompt = jsonSystemInstructionForPlayerQuestion();
      const behaviorPrompt = systemBehaviour(testGameSettings);
      
      // RPG terms should be preserved
      expect(playerQuestionPrompt).toContain('`tactical_advice`'); // Les backticks sont dans playerQuestion, pas gameAgent
      expect(jsonPrompt).toContain('Combat Status');
      expect(behaviorPrompt).toContain('Pen & Paper Game Master');
    });

    it('Visual Novel style should apply adaptations', () => {
      setGameStyle('visual-novel');
      
      const jsonPrompt = jsonSystemInstructionForGameAgent(testGameSettings);
      const playerQuestionPrompt = jsonSystemInstructionForPlayerQuestion();
      const behaviorPrompt = systemBehaviour(testGameSettings);
      
      // Visual Novel adaptations should be applied
      expect(playerQuestionPrompt).toContain('`emotional_guidance`'); // `tactical_advice` -> `emotional_guidance`
      expect(jsonPrompt).toContain('Emotional State'); // Combat Status -> Emotional State
      
      // systemBehaviour should get full Visual Novel replacement
      expect(behaviorPrompt).toContain('Interactive Story Director');
      expect(behaviorPrompt).toContain('CHARACTER-driven experiences');
    });

    it('Different styles produce different prompts', () => {
      setGameStyle('rpg');
      const rpgJson = jsonSystemInstructionForGameAgent(testGameSettings);
      const rpgPlayerQuestion = jsonSystemInstructionForPlayerQuestion();
      const rpgBehavior = systemBehaviour(testGameSettings);
      
      setGameStyle('visual-novel');
      const vnJson = jsonSystemInstructionForGameAgent(testGameSettings);
      const vnPlayerQuestion = jsonSystemInstructionForPlayerQuestion();
      const vnBehavior = systemBehaviour(testGameSettings);
      
      // Prompts should be different between styles
      expect(rpgJson).not.toEqual(vnJson);
      expect(rpgPlayerQuestion).not.toEqual(vnPlayerQuestion);
      expect(rpgBehavior).not.toEqual(vnBehavior);
    });
  });
});