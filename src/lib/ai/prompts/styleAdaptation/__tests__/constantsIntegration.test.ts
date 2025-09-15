/**
 * Integration tests for the new constants-based prompt system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { systemBehaviour } from '../../system/gameMasterBehaviour';
import { jsonSystemInstructionForGameAgent } from '../../system/gameJsonPrompts';
import { defaultGameSettings } from '$lib/types/gameSettings';
import * as gameStyleState from '$lib/state/gameStyleState.svelte';

// Mock game settings
const mockGameSettings = defaultGameSettings();

describe('Constants-based prompt integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('systemBehaviour prompt', () => {
    it('should generate RPG-style prompts when RPG style is selected', () => {
      vi.spyOn(gameStyleState, 'getCurrentGameStyle').mockReturnValue('rpg');
      
      const prompt = systemBehaviour(mockGameSettings);
      
      expect(prompt).toContain('Pen & Paper Game Master');
      expect(prompt).toContain('Game Master');
      expect(prompt).toContain('RPG MECHANICS');
      expect(prompt).toContain('combat');
      expect(prompt).toContain('COMBAT RULES');
    });

    it('should generate Visual Novel-style prompts when visual-novel style is selected', () => {
      vi.spyOn(gameStyleState, 'getCurrentGameStyle').mockReturnValue('visual-novel');
      
      const prompt = systemBehaviour(mockGameSettings);
      
      expect(prompt).toContain('Interactive Story Director');
      expect(prompt).toContain('Story Director');
      expect(prompt).toContain('INTERACTIVE STORY MECHANICS');
      expect(prompt).toContain('emotional conflict');
      expect(prompt).toContain('EMOTIONAL CONFLICT RULES');
    });

    it('should use style-specific action guidance', () => {
      vi.spyOn(gameStyleState, 'getCurrentGameStyle').mockReturnValue('visual-novel');
      
      const prompt = systemBehaviour(mockGameSettings);
      
      expect(prompt).toContain('Guide emotional growth, nurture meaningful connections');
    });
  });

  describe('jsonSystemInstructionForGameAgent prompt', () => {
    it('should adapt JSON prompts for RPG style', () => {
      vi.spyOn(gameStyleState, 'getCurrentGameStyle').mockReturnValue('rpg');
      
      const prompt = jsonSystemInstructionForGameAgent(mockGameSettings);
      
      expect(prompt).toContain('SCENE breaks');
      expect(prompt).toContain('SCENE & MECHANICAL LOGIC');
      expect(prompt).toContain('Combat Status:');
    });

    it('should adapt JSON prompts for Visual Novel style', () => {
      vi.spyOn(gameStyleState, 'getCurrentGameStyle').mockReturnValue('visual-novel');
      
      const prompt = jsonSystemInstructionForGameAgent(mockGameSettings);
      
      expect(prompt).toContain('narrative breaks');
      expect(prompt).toContain('NARRATIVE & NARRATIVE LOGIC');
      expect(prompt).toContain('Emotional State:');
    });
  });

  describe('prompt consistency', () => {
    it('should use consistent terminology across all prompts for the same style', () => {
      vi.spyOn(gameStyleState, 'getCurrentGameStyle').mockReturnValue('visual-novel');
      
      const systemPrompt = systemBehaviour(mockGameSettings);
      const jsonPrompt = jsonSystemInstructionForGameAgent(mockGameSettings);
      
      // Both should use "emotional conflict" instead of "combat"
      expect(systemPrompt).toContain('emotional conflict');
      expect(jsonPrompt).toContain('emotional conflict');
      
      // Both should use "Emotional State" instead of "Combat Status"
      expect(systemPrompt).not.toContain('Combat Status');
      expect(jsonPrompt).toContain('Emotional State:');
    });

    it('should preserve RPG terminology when RPG style is selected', () => {
      vi.spyOn(gameStyleState, 'getCurrentGameStyle').mockReturnValue('rpg');
      
      const systemPrompt = systemBehaviour(mockGameSettings);
      const jsonPrompt = jsonSystemInstructionForGameAgent(mockGameSettings);
      
      // Both should preserve original RPG terms
      expect(systemPrompt).toContain('combat');
      expect(jsonPrompt).toContain('Combat Status:');
      expect(systemPrompt).toContain('Game Master');
    });
  });

  describe('performance and simplicity', () => {
    it('should be fast without complex text replacements', () => {
      vi.spyOn(gameStyleState, 'getCurrentGameStyle').mockReturnValue('visual-novel');
      
      const startTime = performance.now();
      systemBehaviour(mockGameSettings);
      jsonSystemInstructionForGameAgent(mockGameSettings);
      const endTime = performance.now();
      
      // Should be fast (less than 10ms for both calls)
      expect(endTime - startTime).toBeLessThan(10);
    });

    it('should not require complex replacement logic', () => {
      vi.spyOn(gameStyleState, 'getCurrentGameStyle').mockReturnValue('visual-novel');
      
      const prompt = systemBehaviour(mockGameSettings);
      
      // Should contain the expected constants directly, not as replaced text
      expect(prompt).toContain('Interactive Story Director');
      expect(prompt).toContain('Story Director');
    });
  });
});