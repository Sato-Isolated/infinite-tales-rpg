/**
 * Example integration of improved prompts in gameAgent
 * Demonstrates how to use the new templates and patterns
 * This is a reference implementation - actual integration should be done gradually
 */

import type { GameSettings } from '$lib/ai/agents/gameAgent';
import { 
  createJsonInstruction, 
  gameAgentJsonTemplate,
  GAME_AGENT_CHAIN_OF_THOUGHT,
  getFewShotExamples,
  buildHierarchicalInstructions,
  TIME_CONSISTENCY_PROMPT,
  DETAILED_TIME_GUIDELINES
} from '$lib/ai/prompts/templates';
import { systemBehaviour } from '$lib/ai/prompts/system';
import { LANGUAGE_PROMPT } from '$lib/ai/prompts/shared';

/**
 * Enhanced game agent prompt builder with modern techniques
 */
export const buildEnhancedGameAgentPrompt = (
  gameSettings: GameSettings,
  customInstructions: {
    general?: string;
    story?: string;
    combat?: string;
  } = {},
  includeExamples = true,
  includeChainOfThought = true
): string[] => {
  
  // Base instructions with hierarchy
  const baseInstructions = [
    systemBehaviour(gameSettings),
    TIME_CONSISTENCY_PROMPT,
    DETAILED_TIME_GUIDELINES
  ];
  
  // Build hierarchical instructions
  const instructions = buildHierarchicalInstructions(
    baseInstructions,
    customInstructions
  );
  
  // Add chain-of-thought reasoning if enabled
  if (includeChainOfThought) {
    instructions.push(GAME_AGENT_CHAIN_OF_THOUGHT);
  }
  
  // Add few-shot examples if enabled
  if (includeExamples) {
    instructions.push(getFewShotExamples('game'));
  }
  
  // Add JSON format instruction
  instructions.push(createJsonInstruction(gameAgentJsonTemplate));
  
  return instructions;
};

/**
 * Enhanced language-aware prompt builder
 */
export const buildLanguageAwarePrompt = (
  baseInstructions: string[],
  targetLanguage?: string
): string[] => {
  const instructions = [...baseInstructions];
  
  if (targetLanguage && targetLanguage !== 'en') {
    instructions.push(`${LANGUAGE_PROMPT}${targetLanguage}`);
  }
  
  return instructions;
};

/**
 * Performance-optimized prompt builder for token-conscious scenarios
 */
export const buildConciseGameAgentPrompt = (
  gameSettings: GameSettings,
  customInstructions: {
    general?: string;
    story?: string;
    combat?: string;
  } = {}
): string[] => {
  
  // Use concise versions
  const instructions = [
    // systemBehaviourConcise(gameSettings), // Would need to be exported from gameMasterBehaviour
    "Game Master: Create compelling stories. Show don't tell. Multi-round challenges. Player-guided. Track resources.",
    "TIME: Realistic durations. Sleep=6-8h. Combat=5-15min. Conversations=5-30min.",
    createJsonInstruction(gameAgentJsonTemplate)
  ];
  
  // Add only critical custom instructions
  if (customInstructions.general) {
    instructions.splice(1, 0, `OVERRIDE: ${customInstructions.general}`);
  }
  
  return instructions;
};

/**
 * Validation helper for prompt quality
 */
export const validatePromptQuality = (instructions: string[]): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
} => {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  // Check for basic requirements
  const hasJsonInstruction = instructions.some(inst => 
    inst.includes('CRITICAL: Respond ONLY with valid JSON')
  );
  
  if (!hasJsonInstruction) {
    issues.push('Missing JSON format instruction');
  }
  
  // Check for excessive length
  const totalLength = instructions.join('').length;
  if (totalLength > 10000) {
    suggestions.push('Consider using concise prompt builder for better performance');
  }
  
  // Check for hierarchy
  const hasHierarchy = instructions.some(inst => 
    inst.includes('INSTRUCTION PRIORITY SYSTEM')
  );
  
  if (!hasHierarchy) {
    suggestions.push('Consider adding instruction hierarchy for conflict resolution');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestions
  };
};

/**
 * Migration helper for existing agents
 */
export const migrateAgentPrompts = (
  existingPrompts: string[],
  agentType: 'action' | 'game' | 'summary' | 'character' | 'combat'
): {
  enhanced: string[];
  changes: string[];
} => {
  const changes: string[] = [];
  
  // Add chain-of-thought based on agent type
  const chainOfThought = (() => {
    switch (agentType) {
      case 'game': return GAME_AGENT_CHAIN_OF_THOUGHT;
      // Add other agent types as needed
      default: return '';
    }
  })();
  
  const enhanced = [...existingPrompts];
  
  if (chainOfThought) {
    enhanced.push(chainOfThought);
    changes.push('Added chain-of-thought reasoning');
  }
  
  // Add few-shot examples
  const examples = getFewShotExamples(agentType);
  if (examples) {
    enhanced.push(examples);
    changes.push('Added few-shot examples');
  }
  
  return { enhanced, changes };
};
