import type { GameSettings } from '$lib/types/gameSettings';
import { getEventNarrationPrompt } from '$lib/ai/prompts/shared/narrationSystem';

// ========================================
// SYSTEM PROMPTS
// ========================================

/**
 * Modern event evaluation prompt - base instructions
 */
export const MODERN_EVENT_BASE_INSTRUCTIONS = [
  '🎯 EVENT EVALUATION SPECIALIST',
  'Analyze the story for TWO specific event types:',
  '1. Major character transformations (permanent changes)',
  '2. Explicit ability/skill learning events',
  '',
  '⏰ TIME MANAGEMENT: Consider realistic durations for actions.',
  '🔍 REASONING PROCESS:',
  '- What major events occurred in this story segment?',
  '- Are there explicit mentions of character transformations?',
  '- Are there clear descriptions of learning new abilities?',
  '- When in doubt, prefer no event over false positive'
];

/**
 * Legacy event evaluation prompt template
 */
export const LEGACY_EVENT_INSTRUCTIONS = [
  'Scan the FULL STORY provided and evaluate if the following events have occurred recently or are currently active. These events must be explicitly described or strongly implied by the narrative, not just hypothetical possibilities:',
  `1. **Significant Character Change ('character_changed'):** Has the character undergone a MAJOR and likely PERMANENT transformation or alteration? (Examples: Gained a new profession rank, transformed into a vampire/werewolf, became possessed by a permanent entity, received new powers from a crystal).
    *   If yes, describe the significant change.
    *   If no, state null.`,
  `2. **New Abilities Learned ('abilities_learned'):** Has the character explicitly learned or gained access to new abilities, spells, or skills? (Examples: Read a spellbook and learned 'Fireball', trained with a master and learned 'Parry', unlocked a racial trait). Ensure the story clearly states the learning event.
    *   Do not list abilities already known: {currentAbilities}
    *   If yes, describe the new ability/spell/skill.
    *   If no, empty array.`,
  'Generate structured event evaluation with character changes and abilities learned.'
];

/**
 * Common prompt fragments
 */
export const PROMPT_FRAGMENTS = {
  SCHEMA_INSTRUCTION: 'Use the structured response schema to provide your evaluation.',
  NO_ABILITIES_TEXT: 'CHARACTER ABILITIES: No abilities currently known.',
  ABILITIES_EXCLUSION_PREFIX: 'CHARACTER ABILITIES TO EXCLUDE: ',
  ABILITIES_EXCLUSION_SUFFIX: '\nDo not report these as "newly learned" since they already exist.',
  USER_MESSAGE_PREFIX: 'Evaluate the events for STORY PROGRESSION:\n',
  RETRY_MESSAGE_TEMPLATE: '\n\n[RETRY ATTEMPT {attempt}: Previous attempts failed, please ensure valid JSON response]',
  FALLBACK_THOUGHTS: 'Event evaluation was skipped due to repeated API failures. No events detected.'
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Builds modern enhanced prompt system
 */
export function buildModernEventPrompt(currentAbilitiesNames: string[], gameSettings: GameSettings): string[] {
  console.log('EventAgent: Using enhanced legacy prompts (modern imports not available)');

  const baseInstructions = [
    ...MODERN_EVENT_BASE_INSTRUCTIONS,
    '',
    buildAbilityExclusionRule(currentAbilitiesNames),
    '',
    getEventNarrationPrompt(gameSettings),
    '',
    PROMPT_FRAGMENTS.SCHEMA_INSTRUCTION
  ];

  return baseInstructions;
}

/**
 * Builds legacy prompt system (fallback)
 */
export function buildLegacyEventPrompt(currentAbilitiesNames: string[], gameSettings: GameSettings): string[] {
  const instructions = LEGACY_EVENT_INSTRUCTIONS.map(instruction => 
    instruction.replace('{currentAbilities}', currentAbilitiesNames.join(', '))
  );
  
  // Add narration instructions
  instructions.push('', getEventNarrationPrompt(gameSettings));
  
  return instructions;
}

/**
 * Builds ability exclusion rule based on current abilities
 */
export function buildAbilityExclusionRule(currentAbilitiesNames: string[]): string {
  if (currentAbilitiesNames.length === 0) {
    return PROMPT_FRAGMENTS.NO_ABILITIES_TEXT;
  }
  return PROMPT_FRAGMENTS.ABILITIES_EXCLUSION_PREFIX + 
         currentAbilitiesNames.join(', ') + 
         PROMPT_FRAGMENTS.ABILITIES_EXCLUSION_SUFFIX;
}

/**
 * Builds user message with context and retry information
 */
export function buildUserMessage(storyHistory: string[], attempt: number): string {
  const baseMessage = PROMPT_FRAGMENTS.USER_MESSAGE_PREFIX + storyHistory.join('\n');

  if (attempt > 1) {
    return baseMessage + PROMPT_FRAGMENTS.RETRY_MESSAGE_TEMPLATE.replace('{attempt}', attempt.toString());
  }

  return baseMessage;
}

/**
 * Returns fallback response when all attempts fail
 * Note: Returns a factory function to avoid circular dependency with initialEventEvaluationState
 */
export function getFallbackResponse(): { thoughts: string; event_evaluation: any } {
  return {
    thoughts: PROMPT_FRAGMENTS.FALLBACK_THOUGHTS,
    event_evaluation: {
      character_changed: {
        changed_into: '',
        description: '',
        aiProcessingComplete: true,
        showEventConfirmationDialog: false
      },
      abilities_learned: {
        showEventConfirmationDialog: false,
        aiProcessingComplete: true,
        abilities: []
      }
    }
  };
}
