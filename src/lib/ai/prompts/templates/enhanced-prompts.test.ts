/**
 * Test des nouvelles fonctionnalités de prompts
 * Vérifie que tous les imports et templates fonctionnent correctement
 */

import { describe, it, expect } from 'vitest';
import {
  createJsonInstruction,
  gameAgentJsonTemplate
} from './jsonTemplates';  // Direct import since deprecated from index
import {
  GAME_AGENT_CHAIN_OF_THOUGHT,
  getFewShotExamples,
  buildHierarchicalInstructions,
  TIME_CONSISTENCY_PROMPT
} from '$lib/ai/prompts/templates';
import { LANGUAGE_PROMPT, DETAILED_LANGUAGE_PROMPT } from '$lib/ai/prompts/shared';
import { systemBehaviour } from '$lib/ai/prompts/system';
import { COMBAT_CHAIN_OF_THOUGHT } from '$lib/ai/prompts/formats';

describe('Enhanced Prompts System', () => {

  describe('Template Imports', () => {
    it('should import all template functions', () => {
      expect(createJsonInstruction).toBeDefined();
      expect(buildHierarchicalInstructions).toBeDefined();
      expect(getFewShotExamples).toBeDefined();
    });

    it('should import all template constants', () => {
      expect(gameAgentJsonTemplate).toBeDefined();
      expect(GAME_AGENT_CHAIN_OF_THOUGHT).toBeDefined();
      expect(TIME_CONSISTENCY_PROMPT).toBeDefined();
      expect(COMBAT_CHAIN_OF_THOUGHT).toBeDefined();
    });

    it('should import enhanced language prompts', () => {
      expect(LANGUAGE_PROMPT).toBeDefined();
      expect(DETAILED_LANGUAGE_PROMPT).toBeDefined();
      expect(LANGUAGE_PROMPT).toContain('TRANSLATION RULES');
    });
  });

  describe('JSON Template Creation', () => {
    it('should create valid JSON instructions', () => {
      const instruction = createJsonInstruction('{"test": "value"}');

      expect(instruction).toContain('CRITICAL: Respond ONLY with valid JSON');
      expect(instruction).toContain('JSON RULES');
      expect(instruction).toContain('{"test": "value"}');
    });

    it('should include validation rules', () => {
      const instruction = createJsonInstruction(gameAgentJsonTemplate);

      expect(instruction).toContain('All JSON keys must remain in English');
      expect(instruction).toContain('Enum values must be in UPPERCASE');
      expect(instruction).toContain('Validate structure before responding');
    });
  });

  describe('Chain-of-Thought Implementation', () => {
    it('should provide structured reasoning steps', () => {
      expect(GAME_AGENT_CHAIN_OF_THOUGHT).toContain('STORY PROGRESSION REASONING');
      expect(GAME_AGENT_CHAIN_OF_THOUGHT).toContain('1. 📋 ACTION ANALYSIS');
      expect(GAME_AGENT_CHAIN_OF_THOUGHT).toContain('5. 🔄 CONTINUITY CHECK');
    });

    it('should include combat-specific reasoning', () => {
      expect(COMBAT_CHAIN_OF_THOUGHT).toContain('COMBAT REASONING PROCESS');
      expect(COMBAT_CHAIN_OF_THOUGHT).toContain('1. ⚔️ COMBAT STATE ASSESSMENT');
      expect(COMBAT_CHAIN_OF_THOUGHT).toContain('5. 📈 TACTICAL CONSEQUENCES');
    });
  });

  describe('Few-Shot Examples', () => {
    it('should provide examples for different agent types', () => {
      const actionExamples = getFewShotExamples('action');
      const gameExamples = getFewShotExamples('game');

      expect(actionExamples).toContain('EXAMPLES OF PROPER ACTION GENERATION');
      expect(gameExamples).toContain('EXAMPLES OF PROPER STORY PROGRESSION');

      expect(actionExamples).toContain('User Input:');
      expect(actionExamples).toContain('Expected Response:');

      expect(gameExamples).toContain('User Action:');
      expect(gameExamples).toContain('Expected Response:');
    });

    it('should return empty string for unknown agent types', () => {
      const unknownExamples = getFewShotExamples('unknown' as any);
      expect(unknownExamples).toBe('');
    });
  });

  describe('Instruction Hierarchy', () => {
    it('should build hierarchical instructions with base prompts', () => {
      const baseInstructions = ['Base instruction 1', 'Base instruction 2'];
      const customInstructions = {
        general: 'Custom general instruction',
        story: 'Custom story instruction'
      };

      const result = buildHierarchicalInstructions(baseInstructions, customInstructions);
      const joinedResult = result.join('\n');

      expect(joinedResult).toContain('INSTRUCTION PRIORITY SYSTEM');
      expect(joinedResult).toContain('Base instruction 1');
      expect(joinedResult).toContain('Base instruction 2');
      expect(joinedResult).toContain('🎯 CUSTOM OVERRIDE (HIGH PRIORITY): Custom general instruction');
      expect(joinedResult).toContain('🎯 STORY OVERRIDE: Custom story instruction');
    });

    it('should handle empty custom instructions', () => {
      const baseInstructions = ['Base instruction'];
      const result = buildHierarchicalInstructions(baseInstructions);
      const joinedResult = result.join('\n');

      expect(joinedResult).toContain('INSTRUCTION PRIORITY SYSTEM');
      expect(joinedResult).toContain('Base instruction');
      expect(joinedResult).toContain('BEFORE RESPONDING, VALIDATE');
    });
  });

  describe('Time Consistency', () => {
    it('should provide realistic time guidelines', () => {
      expect(TIME_CONSISTENCY_PROMPT).toContain('🕐 REALISTIC DURATION');
      expect(TIME_CONSISTENCY_PROMPT).toContain('Sleep: 6-8 hours (360-480 minutes)');
      expect(TIME_CONSISTENCY_PROMPT).toContain('Combat: 5-15 minutes');
    });
  });

  describe('System Behavior Integration', () => {
    it('should work with existing system behavior', () => {
      const gameSettings = {
        detailedNarrationLength: true,
        aiIntroducesSkills: false,
        randomEventsHandling: 'probability' as const,
        generateAmbientDialogue: true,
        diceSimulationMode: 'auto' as const
      };

      const behavior = systemBehaviour(gameSettings);
      expect(behavior).toBeDefined();
      expect(behavior).toContain('Game Master');
      expect(behavior).toContain('CORE RESPONSIBILITIES');
    });
  });

  describe('Performance Optimizations', () => {
    it('should provide concise alternatives', () => {
      expect(LANGUAGE_PROMPT.length).toBeLessThan(DETAILED_LANGUAGE_PROMPT.length);
      expect(LANGUAGE_PROMPT).toContain('JSON keys → English');
      expect(LANGUAGE_PROMPT).toContain('Target:');
    });
  });

});
