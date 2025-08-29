/**
 * Shared prompts used across multiple agents
 */
export { LANGUAGE_PROMPT, DETAILED_LANGUAGE_PROMPT, LANGUAGE_VALIDATION } from './languagePrompt';
export * from './tropesPrompt';
export * from './narrativePrompts';
export { SLOW_STORY_PROMPT } from './slowStoryPrompt';
export { PAST_STORY_PLOT_RULE } from './pastStoryPlotRule';
export { TIME_DURATION_GUIDELINES } from './timeDurationGuidelines';
export {
  DIALOGUE_CONSISTENCY_PROMPT,
  DIALOGUE_MEMORY_CHECK,
  DIALOGUE_QUALITY_GUIDELINES
} from './dialogueConsistencyPrompt';
export {
  ACTION_DIALOGUE_DISTINCTION_PROMPT,
  EXACT_DIALOGUE_PRESERVATION_PROMPT,
  PRESERVE_ESSENCE_DIALOGUE_PROMPT,
  CREATIVE_DIALOGUE_INTERPRETATION_PROMPT,
  generateDynamicFidelityPrompt,
  ANTI_TRANSFORMATION_PROMPT,
  FIDELITY_SYSTEM_INSTRUCTION,
  DIALOGUE_TYPE_EXAMPLES,
  GAME_AGENT_FIDELITY_INTEGRATION
} from './dialoguePreservationPrompts';
