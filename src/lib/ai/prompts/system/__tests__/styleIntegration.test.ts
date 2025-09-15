/**
 * Tests d'intégration pour l'adaptation des prompts selon le style de jeu
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setGameStyle, resetGameStyle } from '$lib/state/gameStyleState.svelte';
import { jsonSystemInstructionForGameAgent, jsonSystemInstructionForPlayerQuestion } from '$lib/ai/prompts/system/gameJsonPrompts';
import { systemBehaviour } from '$lib/ai/prompts/system/gameSystemPrompts';
import type { GameSettings } from '$lib/types/gameSettings';

const testGameSettings: GameSettings = {
  detailedNarrationLength: true,
  generateAmbientDialogue: false,
  aiIntroducesSkills: false,
  randomEventsHandling: 'none',
  diceSimulationMode: 'auto'
};

describe('Style Adaptation Integration Tests', () => {
  beforeEach(() => {
    resetGameStyle(); // Remet le style par défaut (RPG)
  });

  describe('jsonSystemInstructionForGameAgent', () => {
    it('should return RPG-style prompt for RPG style', () => {
      setGameStyle('rpg');
      const prompt = jsonSystemInstructionForGameAgent(testGameSettings);
      
      // Le prompt RPG devrait contenir les termes de status
      expect(prompt).toContain('Combat Status'); // Terme de status RPG
    });

    it('should return adapted prompt for visual novel style', () => {
      setGameStyle('visual-novel');
      const prompt = jsonSystemInstructionForGameAgent(testGameSettings);
      
      // Le prompt Visual Novel devrait avoir des adaptations de status
      expect(prompt).toContain('Emotional State'); // Combat Status -> Emotional State
    });

    it('should generate different prompts for different styles', () => {
      setGameStyle('rpg');
      const rpgPrompt = jsonSystemInstructionForGameAgent(testGameSettings);
      
      setGameStyle('visual-novel');
      const vnPrompt = jsonSystemInstructionForGameAgent(testGameSettings);
      
      expect(rpgPrompt).not.toEqual(vnPrompt);
    });
  });

  describe('systemBehaviour', () => {
    it('should return RPG-style behavior for RPG style', () => {
      setGameStyle('rpg');
      const behavior = systemBehaviour(testGameSettings);
      
      expect(behavior).toContain('Pen & Paper Game Master');
    });

    it('should return adapted behavior for visual novel style', () => {
      setGameStyle('visual-novel');
      const behavior = systemBehaviour(testGameSettings);
      
      expect(behavior).toContain('Interactive Story Director'); // Pen & Paper Game Master -> Interactive Story Director
      // Note: systemBehaviour ne contient pas de références à status - c'est dans jsonSystemInstructionForGameAgent
    });
  });

  describe('jsonSystemInstructionForPlayerQuestion', () => {
    it('should return RPG-style prompt with tactical advice', () => {
      setGameStyle('rpg');
      const prompt = jsonSystemInstructionForPlayerQuestion();
      
      // Le prompt RPG devrait contenir tactical_advice avec backticks
      expect(prompt).toContain('`tactical_advice`');
    });

    it('should return visual novel style prompt with emotional guidance', () => {
      setGameStyle('visual-novel');
      const prompt = jsonSystemInstructionForPlayerQuestion();
      
      // Le prompt Visual Novel devrait contenir emotional_guidance avec backticks
      expect(prompt).toContain('`emotional_guidance`');
    });

    it('should return different prompts for different styles', () => {
      setGameStyle('rpg');
      const rpgPrompt = jsonSystemInstructionForPlayerQuestion();
      
      setGameStyle('visual-novel');
      const vnPrompt = jsonSystemInstructionForPlayerQuestion();
      
      expect(rpgPrompt).not.toEqual(vnPrompt);
    });
  });
});