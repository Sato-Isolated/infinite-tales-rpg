import { type Type } from '@google/genai';

/**
 * Comprehensive response schemas for all AI agents
 * Replaces manual JSON parsing with type-safe structured output
 */

// Story Agent Response Schema
export const StoryResponseSchema = {
  type: 'object' as const,
  properties: {
    story: {
      type: 'string' as const,
      description: 'The main story narrative text'
    },
    xp_gain: {
      type: 'number' as const,
      description: 'Experience points gained from this action'
    },
    inventory_update: {
      type: 'object' as const,
      properties: {
        items_added: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              name: { type: 'string' as const },
              quantity: { type: 'number' as const },
              description: { type: 'string' as const, nullable: true }
            },
            required: ['name', 'quantity']
          }
        },
        items_removed: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              name: { type: 'string' as const },
              quantity: { type: 'number' as const }
            },
            required: ['name', 'quantity']
          }
        }
      },
      required: ['items_added', 'items_removed']
    },
    stats_update: {
      type: 'object' as const,
      properties: {
        health: { type: 'number' as const, nullable: true },
        mana: { type: 'number' as const, nullable: true },
        energy: { type: 'number' as const, nullable: true },
        mood: { type: 'string' as const, nullable: true },
        location: { type: 'string' as const, nullable: true }
      }
    },
    image_prompt: {
      type: 'string' as const,
      description: 'Prompt for generating an image for this scene'
    },
    plotPointAdvancingNudgeExplanation: {
      type: 'string' as const,
      nullable: true,
      description: 'Explanation of how this advances the plot'
    },
    time_progression: {
      type: 'object' as const,
      nullable: true,
      properties: {
        hours_passed: { type: 'number' as const },
        new_time_description: { type: 'string' as const }
      },
      required: ['hours_passed', 'new_time_description']
    },
    story_beats: {
      type: 'array' as const,
      nullable: true,
      items: { type: 'string' as const }
    },
    consequences: {
      type: 'array' as const,
      nullable: true,
      items: { type: 'string' as const }
    }
  },
  required: ['story', 'xp_gain', 'inventory_update', 'stats_update', 'image_prompt']
};

export interface StoryResponse {
  story: string;
  xp_gain: number;
  inventory_update: {
    items_added: Array<{
      name: string;
      quantity: number;
      description?: string;
    }>;
    items_removed: Array<{
      name: string;
      quantity: number;
    }>;
  };
  stats_update: {
    health?: number;
    mana?: number;
    energy?: number;
    mood?: string;
    location?: string;
  };
  plotPointAdvancingNudgeExplanation?: string;
  time_progression?: {
    hours_passed: number;
    new_time_description: string;
  };
  story_beats?: string[];
  consequences?: string[];
}

// Action Agent Response Schema
export const ActionResponseSchema = {
  type: 'object' as const,
  properties: {
    actions: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          action: { type: 'string' as const },
          description: { type: 'string' as const },
          difficulty: { type: 'string' as const },
          potential_outcomes: {
            type: 'array' as const,
            items: { type: 'string' as const }
          },
          required_stats: {
            type: 'object' as const,
            nullable: true,
            properties: {
              stat_name: { type: 'string' as const },
              minimum_value: { type: 'number' as const }
            },
            required: ['stat_name', 'minimum_value']
          }
        },
        required: ['action', 'description', 'difficulty', 'potential_outcomes']
      }
    }
  },
  required: ['actions']
};

export interface ActionResponse {
  actions: Array<{
    action: string;
    description: string;
    difficulty: string;
    potential_outcomes: string[];
    required_stats?: {
      stat_name: string;
      minimum_value: number;
    };
  }>;
}

// Character Agent Response Schema
export const CharacterResponseSchema = {
  type: 'object' as const,
  properties: {
    character_description: { type: 'string' as const },
    personality_traits: {
      type: 'array' as const,
      items: { type: 'string' as const }
    },
    background_story: { type: 'string' as const },
    goals_motivations: {
      type: 'array' as const,
      items: { type: 'string' as const }
    }
  },
  required: ['character_description', 'personality_traits', 'background_story', 'goals_motivations']
};

export interface CharacterResponse {
  character_description: string;
  personality_traits: string[];
  background_story: string;
  goals_motivations: string[];
}

// Summary Agent Response Schema
export const SummaryResponseSchema = {
  type: 'object' as const,
  properties: {
    keyDetails: {
      type: 'array' as const,
      items: { type: 'string' as const }
    },
    story: { type: 'string' as const }
  },
  required: ['keyDetails', 'story']
};

export interface SummaryResponse {
  keyDetails: string[];
  story: string;
}

// Related History Response Schema
export const RelatedHistoryResponseSchema = {
  type: 'object' as const,
  properties: {
    relatedDetails: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          storyReference: { type: 'string' as const },
          relevanceScore: { type: 'number' as const }
        },
        required: ['storyReference', 'relevanceScore']
      }
    }
  },
  required: ['relatedDetails']
};

export interface RelatedHistoryResponse {
  relatedDetails: Array<{
    storyReference: string;
    relevanceScore: number;
  }>;
}

/**
 * Get the appropriate response schema for an agent type
 */
export function getResponseSchemaForAgent(agentType: string): any {
  const schemas: Record<string, any> = {
    story: StoryResponseSchema,
    action: ActionResponseSchema,
    character: CharacterResponseSchema,
    summary: SummaryResponseSchema,
    relatedHistory: RelatedHistoryResponseSchema
  };

  return schemas[agentType] || StoryResponseSchema;
}
