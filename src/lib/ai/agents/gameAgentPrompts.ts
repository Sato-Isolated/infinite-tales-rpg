import { stringifyPretty, type ThoughtsState } from '$lib/util.svelte';
import type { GameTime } from '$lib/types/gameTime';
import type { Action } from '$lib/types/action';
import type { LLMMessage, SystemInstructionsState } from '$lib/ai/llm';
import type { CharacterDescription } from '$lib/ai/agents/characterAgent';
import type { Story } from '$lib/ai/agents/storyAgent';
import type { GameActionState, GameMasterAnswer } from '$lib/types/actions';
import type { GameSettings } from '$lib/types/gameSettings';
import type { InventoryState } from '$lib/types/inventory';
import type { PlayerCharactersGameState } from '$lib/types/players';
import type { ResourcesWithCurrentValue } from '$lib/types/resources';
import type { NPCState, Resources } from '$lib/ai/agents/characterStatsAgent';
import {
  PAST_STORY_PLOT_RULE,
  TIME_DURATION_GUIDELINES,
  DIALOGUE_CONSISTENCY_PROMPT,
  DIALOGUE_MEMORY_CHECK
} from '$lib/ai/prompts/shared';
import {
  systemBehaviour,
  jsonSystemInstructionForGameAgent,
  jsonSystemInstructionForPlayerQuestion
} from '$lib/ai/prompts/system';
import {
  NPC_TEMPORAL_CONTINUITY_PROMPT,
  NPC_ACTIVITY_DURING_ABSENCE_PROMPT,
  INTEGRATE_NPC_TEMPORAL_CONTEXT,
  NPC_TIME_GAP_EXAMPLES
} from '$lib/ai/prompts/templates/npcTemporalContinuity';

// ========================================
// DIALOGUE PRESERVATION CONSTANTS
// ========================================

export const DIALOGUE_PRESERVATION_INSTRUCTIONS = {
  CRITICAL_HEADER: '⚠️ CRITICAL DIALOGUE PRESERVATION INSTRUCTION:',
  MAIN_INSTRUCTION: 'The player provided {count} quoted dialogue segment(s). You MUST include each segment verbatim (character-for-character) in your story.',
  RULES: [
    '- Do NOT paraphrase, translate, or alter punctuation/casing/spaces for these segments.',
    '- Attribute the quotes as spoken by {characterName} unless the action explicitly names a different speaker.',
    '- Prefer rendering using the markup [speaker:NAME]TEXT[/speaker] so the UI styles dialogue; otherwise include the quotes directly.',
    '- If the player indicates whispering/murmuring, keep it subtle but still use the exact quoted words.'
  ],
  SEGMENTS_HEADER: 'Quoted segments to include verbatim:'
};

// ========================================
// ANTI-REPETITION CONSTANTS
// ========================================

export const ANTI_REPETITION_PROMPTS = {
  ALERT_HEADER: '🚨 CRITICAL ANTI-REPETITION ALERT:',
  DETECTION_MESSAGE: 'Previous similar interaction detected (score: {score})',
  EXPLANATION_PREFIX: 'Similarity explanation: {explanation}',
  MANDATORY_INSTRUCTION: 'You MUST create a completely different conversation approach.',
  ALTERNATIVE_PREFIX: 'Suggested alternative: {suggestion}',
  INTERACTION_RULES: [
    'If characters need to interact, have them:',
    '- Reference the previous conversation ("As we discussed earlier...")',
    '- Approach the topic from a new angle',
    '- Focus on progression or new developments',
    '- Show character growth or changed perspectives'
  ],
  FINAL_WARNING: 'NEVER repeat the same dialogue patterns or information delivery.'
};

// ========================================
// CONTEXT EXTRACTION CONSTANTS
// ========================================

export const TEMPORAL_CONTEXT_PROMPTS = {
  HEADER: 'TEMPORAL CONTEXT FROM RECENT HISTORY:',
  ANALYSIS_HEADER: '⚠️ MANDATORY TEMPORAL ANALYSIS:',
  ANALYSIS_RULES: [
    'You MUST analyze the time gaps between each interaction above. If CHARACTER returns to NPCs after significant time (30+ minutes), those NPCs MUST:',
    '- Acknowledge the time that passed',
    '- Reference what they did meanwhile',
    '- Show appropriate emotional responses to reunion',
    '- Have potentially changed status/mood/location'
  ],
  FORBIDDEN: '🚫 NEVER ignore time passage in NPC interactions!',
  CONSISTENCY_RULE: 'Maintain chronological consistency with this timeline.'
};

export const PLOT_CONTEXT_PROMPTS = {
  HEADER: 'PLOT CONTEXT FROM RECENT HISTORY:',
  ANALYSIS_HEADER: '🚨 CRITICAL ANALYSIS REQUIRED:',
  ANALYSIS_STEPS: [
    'BEFORE writing ANY NPC dialogue or interaction, you MUST:',
    '1. ⏰ ANALYZE each previous interaction with NPCs shown above',
    '2. 🕵️ IDENTIFY which NPCs the CHARACTER last interacted with and WHEN',
    '3. ⏱️ CALCULATE the time gap since each NPC was last seen',
    '4. 💭 DETERMINE what each NPC likely did during the CHARACTER\'s absence',
    '5. 🎭 ADAPT their emotional state and knowledge based on time passed',
    '6. 🗣️ WRITE dialogue that ACKNOWLEDGES the time separation appropriately'
  ],
  FORBIDDEN: '❌ FORBIDDEN: NPCs acting like no time has passed when hours/days have elapsed',
  REQUIRED: '✅ REQUIRED: NPCs referencing what happened since they last met the CHARACTER',
  COHERENCE_RULE: 'Maintain narrative coherence with these plot developments throughout the story.'
};

// ========================================
// GAME MASTER CONSTANTS
// ========================================

export const GAME_MASTER_PROMPTS = {
  CORE_INSTRUCTION: 'You are an intelligent Game Master Assistant designed to help players understand the game world, rules, and current situation.\nAnalyze the question type and provide helpful, contextual responses with appropriate confidence levels.',
  CUSTOM_NOTES_HEADER: 'Custom GM Notes (considered as additional rules):',
  THOUGHTS_HEADER: 'Game Master\'s Current Thoughts about Story Progression:',
  HISTORICAL_CONTEXT_HEADER: 'Historical Context:',
  DIALOGUE_CONSISTENCY_HEADER: 'Dialogue Consistency Rules:',
  CONSTRAINT_PREFIX: 'Current Character Constraint: {constraint} - Consider this in your response.',
  QUESTION_INSTRUCTION: 'IMPORTANT: Answer this player question out-of-character as a helpful Game Master assistant.',
  QUESTION_HEADER: 'PLAYER QUESTION: {question}',
  CONTEXT_HEADER: 'GAME MASTER RULES AND CONTEXT:'
};

// ========================================
// STATIC PROMPT CONSTANTS
// ========================================

export const STATIC_PROMPTS = {
  GAME_ENDED: 'The CHARACTER has fallen to 0 {resources}; Describe how the GAME is ending.',
  STARTING_PROMPT: [
    'Begin the story by setting the scene in a vivid and detailed manner, describing the environment and atmosphere with rich sensory details.',
    'At the beginning do not disclose story secrets, which are meant to be discovered by the player later into the story.',
    'If the player character is accompanied by party members, give them names and add them to currently_present_npcs',
    'CHARACTER starts with some random items.',
    '',
    'IMPORTANT: This is the INITIAL story setup. You must also generate an appropriate starting time in the initial_game_time field that fits the story context, setting, and opening scene.'
  ].join('\n'),
  CRAFTING_PROMPT: [
    'Crafting:',
    'On success, create a new item and remove the combined items.',
    'On partial failure, do not create a new item but do not remove the combined items.',
    'On failure, do not create a new item and remove the combined items.'
  ].join('\n'),
  GM_NOTES_PREFIX: 'Following are Game Master Notes to consider for the next story progression:',
  TIME_GENERATION_CORE: [
    'You are a Time Generation Agent for a RPG adventure. Your task is to generate an appropriate starting date and time that fits the story context.',
    'Consider the story setting, theme, character background, and narrative tone to determine:',
    '1. What time of day would create the most engaging opening scene',
    '2. What season/month would fit the story theme',
    '3. What day of the week might be narratively interesting',
    '4. What year fits the setting (medieval fantasy typically 800-1200, modern fantasy 1900-2100, etc.)',
    '5. What weather conditions would enhance the story atmosphere'
  ].join('\n'),
  TIME_WEATHER_GUIDANCE: [
    'For weather, consider:',
    '- Story mood and tone (gloomy stories might have rain/storms, adventure might have clear skies)',
    '- Season consistency (winter=snow/cold, summer=heat/storms, etc.)',
    '- Dramatic potential (storms for epic moments, fog for mystery, clear for peaceful starts)',
    '- Setting realism (desert=heat/dust, mountains=wind/snow, coastal=mist/storms)'
  ].join('\n'),
  TIME_GENERATION_USER_MESSAGE: 'Generate an appropriate initial game time for this story and character. Consider what time would create the most dramatic and engaging opening scene.'
};

// ========================================
// SYSTEM INSTRUCTION TEMPLATES
// ========================================

export const SYSTEM_INSTRUCTION_TEMPLATES = {
  CORE_BEHAVIOR: '=== CORE BEHAVIOR INSTRUCTIONS ===',
  STORY_STATE: '=== CURRENT STORY STATE ===',
  CHARACTER_DESC: '=== CHARACTER DESCRIPTION ===',
  CHARACTER_DESC_TEXT: 'The following is a description of the player character, always refer to it when considering appearance, reasoning, motives etc.',
  CHARACTER_RESOURCES: '=== CHARACTER RESOURCES ===',
  CHARACTER_RESOURCES_TEXT: 'The following are the character\'s CURRENT resources, consider it in your response',
  CHARACTER_INVENTORY: '=== CHARACTER INVENTORY ===',
  CHARACTER_INVENTORY_TEXT: 'The following is the character\'s inventory, check items for relevant passive effects relevant for the story progression or effects that are triggered every action.',
  NPC_CONTEXT: '=== NPC CONTEXT ===',
  OVERRIDE_INSTRUCTIONS: '=== OVERRIDE INSTRUCTIONS (HIGHEST PRIORITY) ===',
  OVERRIDE_PREFIX: 'Following instructions overrule all others: ',
  STORY_AGENT_OVERRIDES: '=== STORY AGENT OVERRIDES ===',
  COMBAT_AGENT_OVERRIDES: '=== COMBAT AGENT OVERRIDES ==='
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Builds dialogue preservation instructions for quoted segments
 */
export function buildDialoguePreservationInstructions(
  quotedSegments: string[],
  characterName: string
): string {
  if (quotedSegments.length === 0) return '';

  console.log('🎭 Quoted dialogue segments detected:', quotedSegments);

  let instructions = `\n\n${DIALOGUE_PRESERVATION_INSTRUCTIONS.CRITICAL_HEADER}`;
  instructions += `\n${DIALOGUE_PRESERVATION_INSTRUCTIONS.MAIN_INSTRUCTION
    .replace('{count}', quotedSegments.length.toString())}`;

  const rules = DIALOGUE_PRESERVATION_INSTRUCTIONS.RULES.map(rule =>
    rule.replace('{characterName}', characterName)
  );
  instructions += `\n${rules.join('\n')}`;

  instructions += `\n${DIALOGUE_PRESERVATION_INSTRUCTIONS.SEGMENTS_HEADER}`;
  quotedSegments.forEach((q, i) => {
    instructions += `\n  ${i + 1}) "${q}"`;
  });

  return instructions;
}

/**
 * Builds anti-repetition alert for similar conversations
 */
export function buildAntiRepetitionAlert(
  similarityScore: number,
  explanation: string,
  alternativeSuggestion?: string
): string {
  let alert = `\n\n${ANTI_REPETITION_PROMPTS.ALERT_HEADER}\n`;
  alert += `${ANTI_REPETITION_PROMPTS.DETECTION_MESSAGE.replace('{score}', similarityScore.toString())}\n`;
  alert += `${ANTI_REPETITION_PROMPTS.EXPLANATION_PREFIX.replace('{explanation}', explanation)}\n`;
  alert += `${ANTI_REPETITION_PROMPTS.MANDATORY_INSTRUCTION}\n`;

  if (alternativeSuggestion) {
    alert += `${ANTI_REPETITION_PROMPTS.ALTERNATIVE_PREFIX.replace('{suggestion}', alternativeSuggestion)}\n`;
  }

  alert += `${ANTI_REPETITION_PROMPTS.INTERACTION_RULES.join('\n')}\n`;
  alert += `${ANTI_REPETITION_PROMPTS.FINAL_WARNING}\n`;

  return alert;
}

/**
 * Helper to extract and format temporal context from history messages
 */
export function extractTemporalContext(historyMessages: Array<LLMMessage>): string {
  const timeMarkers: string[] = [];

  historyMessages.forEach((message, index) => {
    if (message.role === 'model' && message.content) {
      try {
        const content =
          typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
        const timeMatch = content.match(/\[Time: ([^\]]+)\]/);
        if (timeMatch) {
          timeMarkers.push(`Step ${index + 1}: ${timeMatch[1]}`);
        }
      } catch {
        // Ignore parsing errors
      }
    }
  });

  if (timeMarkers.length === 0) return '';

  let context = `\n\n${TEMPORAL_CONTEXT_PROMPTS.HEADER}\n${timeMarkers.slice(-5).join('\n')}\n\n`;
  context += `${TEMPORAL_CONTEXT_PROMPTS.ANALYSIS_HEADER}\n`;
  context += `${TEMPORAL_CONTEXT_PROMPTS.ANALYSIS_RULES.join('\n')}\n`;
  context += `${TEMPORAL_CONTEXT_PROMPTS.FORBIDDEN}\n`;
  context += `${TEMPORAL_CONTEXT_PROMPTS.CONSISTENCY_RULE}`;

  return context;
}

/**
 * Extract first numeric PLOT_ID occurrences from a string
 */
export function mapPlotStringToIds(input: string): number[] {
  if (!input) return [];
  const matches = Array.from(input.matchAll(/PLOT_ID:\s*(\d+)/g));
  return matches.map((m) => Number.parseInt(m[1], 10)).filter((n) => !Number.isNaN(n));
}

/**
 * Helper to extract and format plot context from history messages
 */
export function extractPlotContext(historyMessages: Array<LLMMessage>): string {
  const plotMarkers: { step: number; plotIds: number[]; context: string; story?: string }[] = [];

  historyMessages.forEach((message, index) => {
    if (message.role === 'model' && message.content) {
      try {
        const content =
          typeof message.content === 'string' ? message.content : JSON.stringify(message.content);

        let plotIds: number[] = [];
        let context = '';
        let story = '';

        // Extract currentPlotPoint if it exists in the JSON response
        const plotPointMatch = content.match(/"currentPlotPoint":\s*"([^"]+)"/);
        if (plotPointMatch) {
          plotIds = mapPlotStringToIds(plotPointMatch[1]);
          context = plotPointMatch[1].split(' - PLOT_ID:')[0];
        }

        // Also extract from plotPointAdvancingNudgeExplanation for additional context
        const nudgeMatch = content.match(/"plotPointAdvancingNudgeExplanation":\s*"([^"]+)"/);
        if (nudgeMatch && !plotPointMatch) {
          plotIds = mapPlotStringToIds(nudgeMatch[1]);
          context = 'Plot advancement context';
        }

        // Extract story content (full content for rich context)
        const storyMatch = content.match(/"story":\s*"([^"]+)"/);
        if (storyMatch) {
          story = storyMatch[1];
          // Clean up escaped characters for readability
          story = story.replace(/\\n/g, ' ').replace(/\\"/g, '"');
        }

        // Only add to markers if we have plot IDs or story content
        if ((plotIds.length > 0 && plotIds[0] > 0) || story) {
          plotMarkers.push({
            step: index + 1,
            plotIds: plotIds,
            context: context || 'Story progression',
            story: story || undefined
          });
        }
      } catch {
        // Ignore parsing errors
      }
    }
  });

  if (plotMarkers.length === 0) return '';

  // Use all plot markers for complete context
  const allPlotMarkers = plotMarkers;
  const formattedMarkers = allPlotMarkers.map(marker => {
    let formatted = '';
    if (marker.plotIds.length > 0 && marker.plotIds[0] > 0) {
      formatted = `Step ${marker.step}: PLOT_ID: ${marker.plotIds[0]} - ${marker.context}`;
    } else {
      formatted = `Step ${marker.step}: ${marker.context}`;
    }
    if (marker.story) {
      formatted += `\nStory: ${marker.story}`;
    }
    return formatted;
  });

  let context = `\n\n${PLOT_CONTEXT_PROMPTS.HEADER}\n${formattedMarkers.join('\n')}\n\n`;
  context += `${PLOT_CONTEXT_PROMPTS.ANALYSIS_HEADER}\n`;
  context += `${PLOT_CONTEXT_PROMPTS.ANALYSIS_STEPS.join('\n')}\n\n`;
  context += `${PLOT_CONTEXT_PROMPTS.FORBIDDEN}\n`;
  context += `${PLOT_CONTEXT_PROMPTS.REQUIRED}\n\n`;
  context += `${PLOT_CONTEXT_PROMPTS.COHERENCE_RULE}`;

  return context;
}

/**
 * Generates enriched NPC context including relationships and temporal continuity
 */
export function generateEnrichedNPCContext(npcState: NPCState, playerName: string = "CHARACTER"): string {
  let enrichedContext = "The following is the internal state of the NPCs.\n";
  enrichedContext += stringifyPretty(npcState);

  // Add temporal continuity rules for NPCs
  enrichedContext += `\n${NPC_TEMPORAL_CONTINUITY_PROMPT}\n`;
  enrichedContext += `\n${NPC_ACTIVITY_DURING_ABSENCE_PROMPT}\n`;
  enrichedContext += `\n${INTEGRATE_NPC_TEMPORAL_CONTEXT}\n`;
  enrichedContext += `\n${NPC_TIME_GAP_EXAMPLES}\n`;

  // Add relational context for each NPC
  Object.keys(npcState).forEach(npcId => {
    const npc = npcState[npcId];
    if (npc?.relationships && npc.relationships.length > 0) {
      enrichedContext += `\n=== RELATIONAL CONTEXT FOR ${npcId} ===\n`;

      npc.relationships.forEach(rel => {
        const emotionalTone = {
          'very_negative': 'deeply hates',
          'negative': 'dislikes',
          'neutral': 'has a neutral relationship with',
          'positive': 'likes',
          'very_positive': 'adores'
        }[rel.emotional_bond];

        if (rel.target_npc_id) {
          enrichedContext += `• ${rel.specific_role || rel.relationship_type} of ${rel.target_name} - ${emotionalTone} this person\n`;
        } else {
          enrichedContext += `• Relationship with ${playerName}: ${rel.specific_role || rel.relationship_type} - ${emotionalTone} the player\n`;
        }

        if (rel.description) {
          enrichedContext += `  └─ ${rel.description}\n`;
        }
      });

      if (npc.speech_patterns) {
        enrichedContext += `• Speech patterns: ${npc.speech_patterns}\n`;
      }

      if (npc.personality_traits && npc.personality_traits.length > 0) {
        enrichedContext += `• Personality traits: ${npc.personality_traits.join(', ')}\n`;
      }

      if (npc.background_notes) {
        enrichedContext += `• Personal background: ${npc.background_notes}\n`;
      }

      enrichedContext += "=== END OF RELATIONAL CONTEXT ===\n";
    }
  });

  return enrichedContext;
}

/**
 * Builds game master system instructions for player questions
 */
export function buildGameMasterSystemInstructions(
  npcState: NPCState,
  characterName: string,
  thoughtsState?: ThoughtsState,
  customGmNotes?: string,
  relatedHistory?: string[],
  restraintExplanation?: string
): string[] {
  const gameAgent = [
    GAME_MASTER_PROMPTS.CORE_INSTRUCTION,
    generateEnrichedNPCContext(npcState, characterName)
  ];

  if (customGmNotes) {
    gameAgent.push(
      `${GAME_MASTER_PROMPTS.CUSTOM_NOTES_HEADER}\n${customGmNotes}`
    );
  }

  if (thoughtsState?.storyThoughts) {
    gameAgent.push(
      `${GAME_MASTER_PROMPTS.THOUGHTS_HEADER}\n${JSON.stringify(thoughtsState)}`
    );
  }

  if (relatedHistory && relatedHistory.length > 0) {
    gameAgent.push(`${GAME_MASTER_PROMPTS.HISTORICAL_CONTEXT_HEADER}\n${PAST_STORY_PLOT_RULE}${relatedHistory.join('\n')}`);
    gameAgent.push(`${GAME_MASTER_PROMPTS.DIALOGUE_CONSISTENCY_HEADER}\n${DIALOGUE_CONSISTENCY_PROMPT}`);
  }

  if (restraintExplanation) {
    gameAgent.push(
      GAME_MASTER_PROMPTS.CONSTRAINT_PREFIX.replace('{constraint}', restraintExplanation)
    );
  }

  gameAgent.push(jsonSystemInstructionForPlayerQuestion);

  return gameAgent;
}

/**
 * Builds game master user message for player questions
 */
export function buildGameMasterUserMessage(
  question: string,
  systemInstructions: string
): string {
  return [
    GAME_MASTER_PROMPTS.QUESTION_INSTRUCTION,
    '',
    GAME_MASTER_PROMPTS.QUESTION_HEADER.replace('{question}', question),
    '',
    GAME_MASTER_PROMPTS.CONTEXT_HEADER,
    systemInstructions
  ].join('\n');
}

/**
 * Builds game agent system instructions from states
 */
export function buildGameAgentSystemInstructions(
  storyState: Story,
  characterState: CharacterDescription,
  playerCharactersGameState: PlayerCharactersGameState,
  inventoryState: InventoryState,
  npcState: NPCState,
  customSystemInstruction: string,
  customStoryAgentInstruction: string,
  customCombatAgentInstruction: string,
  gameSettings: GameSettings
): string[] {
  const gameAgent = [
    SYSTEM_INSTRUCTION_TEMPLATES.CORE_BEHAVIOR,
    systemBehaviour(gameSettings),
    '',
    SYSTEM_INSTRUCTION_TEMPLATES.STORY_STATE,
    stringifyPretty(storyState),
    '',
    SYSTEM_INSTRUCTION_TEMPLATES.CHARACTER_DESC,
    SYSTEM_INSTRUCTION_TEMPLATES.CHARACTER_DESC_TEXT,
    stringifyPretty(characterState),
    '',
    SYSTEM_INSTRUCTION_TEMPLATES.CHARACTER_RESOURCES,
    SYSTEM_INSTRUCTION_TEMPLATES.CHARACTER_RESOURCES_TEXT,
    stringifyPretty(Object.values(playerCharactersGameState)),
    '',
    SYSTEM_INSTRUCTION_TEMPLATES.CHARACTER_INVENTORY,
    SYSTEM_INSTRUCTION_TEMPLATES.CHARACTER_INVENTORY_TEXT,
    stringifyPretty(inventoryState),
    '',
    SYSTEM_INSTRUCTION_TEMPLATES.NPC_CONTEXT,
    generateEnrichedNPCContext(npcState, characterState?.name || "CHARACTER")
  ];

  if (customSystemInstruction) {
    gameAgent.push('', SYSTEM_INSTRUCTION_TEMPLATES.OVERRIDE_INSTRUCTIONS);
    gameAgent.push(SYSTEM_INSTRUCTION_TEMPLATES.OVERRIDE_PREFIX + customSystemInstruction);
  }
  if (customStoryAgentInstruction) {
    gameAgent.push('', SYSTEM_INSTRUCTION_TEMPLATES.STORY_AGENT_OVERRIDES);
    gameAgent.push(SYSTEM_INSTRUCTION_TEMPLATES.OVERRIDE_PREFIX + customStoryAgentInstruction);
  }
  if (customCombatAgentInstruction) {
    gameAgent.push('', SYSTEM_INSTRUCTION_TEMPLATES.COMBAT_AGENT_OVERRIDES);
    gameAgent.push(SYSTEM_INSTRUCTION_TEMPLATES.OVERRIDE_PREFIX + customCombatAgentInstruction);
  }

  return gameAgent;
}

/**
 * Builds initial game time generation instructions
 */
export function buildInitialGameTimeInstructions(
  storyState: Story,
  characterState: CharacterDescription
): string[] {
  return [
    STATIC_PROMPTS.TIME_GENERATION_CORE,
    '',
    STATIC_PROMPTS.TIME_WEATHER_GUIDANCE,
    '',
    'Story context:',
    stringifyPretty(storyState),
    '',
    'Character context:',
    stringifyPretty(characterState)
  ];
}

// ========================================
// STATIC PROMPT METHODS
// ========================================

/**
 * Gets the prompt for when the game ends
 */
export function getGameEndedPrompt(emptyResourceKey: string[]): string {
  return STATIC_PROMPTS.GAME_ENDED.replace('{resources}', emptyResourceKey.join(' and '));
}

/**
 * Gets the starting prompt for new games
 */
export function getStartingPrompt(): string {
  return STATIC_PROMPTS.STARTING_PROMPT;
}

/**
 * Gets the crafting prompt
 */
export function getCraftingPrompt(): string {
  return STATIC_PROMPTS.CRAFTING_PROMPT;
}

/**
 * Gets the prompt for game master notes
 */
export function getPromptForGameMasterNotes(notes: Array<string>): string {
  if (!notes || notes.length === 0) {
    return '';
  }
  return `\n${STATIC_PROMPTS.GM_NOTES_PREFIX}\n${notes.join('\n')}\n`;
}

/**
 * Gets the user message for initial game time generation
 */
export function getInitialGameTimeUserMessage(): string {
  return STATIC_PROMPTS.TIME_GENERATION_USER_MESSAGE;
}
