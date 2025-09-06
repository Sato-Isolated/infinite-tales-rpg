/**
 * Barrel export file for all response schemas
 * Re-exports all schemas and interfaces from individual domain files
 */

// Story schemas
export * from './storySchemas.js';

// Action schemas
export * from './actionSchemas.js';

// Character schemas
export * from './characterSchemas.js';

// Combat schemas
export * from './combatSchemas.js';

// Event schemas
export * from './eventSchemas.js';

// Memory schemas
export * from './memorySchemas.js';

// Progression schemas
export * from './progressionSchemas.js';

// NPC schemas
export * from './npcSchemas.js';

// Dialogue schemas
export * from './dialogueSchemas.js';

// Abilities schemas
export * from './abilitiesSchemas.js';

// Game schemas
export * from './gameSchemas.js';

// Import all schemas for the helper function
import { StoryResponseSchema, StoryGenerationResponseSchema } from './storySchemas';
import { ActionResponseSchema, SingleActionResponseSchema, ActionsWithThoughtsResponseSchema } from './actionSchemas';
import { CharacterResponseSchema, CharacterDescriptionResponseSchema, CharacterStatsResponseSchema } from './characterSchemas';
import { CombatResponseSchema } from './combatSchemas';
import { EventResponseSchema } from './eventSchemas';
import { SummaryResponseSchema, RelatedHistoryResponseSchema } from './memorySchemas';
import { LevelUpResponseSchema } from './progressionSchemas';
import { NPCStatsResponseSchema } from './npcSchemas';
import { DialogueTrackingResponseSchema, ConversationSummaryResponseSchema } from './dialogueSchemas';
import { AbilitiesResponseSchema } from './abilitiesSchemas';
import { GameAgentResponseSchema, GameTimeResponseSchema, GameMasterAnswerResponseSchema } from './gameSchemas';

/**
 * Get the appropriate response schema for an agent type
 */
export function getResponseSchemaForAgent(agentType: string): any {
  const schemas: Record<string, any> = {
    story: StoryResponseSchema,
    storyGeneration: StoryGenerationResponseSchema,
    gameAgent: GameAgentResponseSchema,
    gameMasterAnswer: GameMasterAnswerResponseSchema,
    action: ActionResponseSchema,
    singleAction: SingleActionResponseSchema,
    actionsWithThoughts: ActionsWithThoughtsResponseSchema,
    gameTime: GameTimeResponseSchema,
    character: CharacterResponseSchema,
    characterDescription: CharacterDescriptionResponseSchema,
    summary: SummaryResponseSchema,
    relatedHistory: RelatedHistoryResponseSchema,
    characterStats: CharacterStatsResponseSchema,
    levelUp: LevelUpResponseSchema,
    npcStats: NPCStatsResponseSchema,
    combat: CombatResponseSchema,
    event: EventResponseSchema,
    dialogueTracking: DialogueTrackingResponseSchema,
    conversationSummary: ConversationSummaryResponseSchema,
    abilities: AbilitiesResponseSchema
  };

  return schemas[agentType] || StoryResponseSchema;
}
