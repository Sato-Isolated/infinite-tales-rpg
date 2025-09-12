/**
 * Game-related response schemas for AI agents
 * Includes main game agent, time management, and game master schemas
 */

// Game Agent Response Schema - Complete schema for story progression
export const GameAgentResponseSchema = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'number' as const,
      description: 'Unique identifier for this game action'
    },
    currentPlotPoint: {
      type: 'string' as const,
      description: 'Current plot point identification and reasoning in English'
    },
    nextPlotPoint: {
      type: 'string' as const,
      description: 'Next plot point identification and planning'
    },
    gradualNarrativeExplanation: {
      type: 'string' as const,
      description: 'How the story development breaks down into meaningful narrative moments'
    },
    plotPointAdvancingNudgeExplanation: {
      type: 'string' as const,
      description: 'Explanation of what could happen next to advance the story in English'
    },
    story: {
      type: 'string' as const,
      description: 'The main narrative content with structured markup tags'
    },
    story_memory_explanation: {
      type: 'string' as const,
      description: 'Explanation of long-term story impact with LOW/MEDIUM/HIGH rating'
    },
    xpGainedExplanation: {
      type: 'string' as const,
      description: 'Explanation of why the character gains or does not gain XP'
    },
    time_passed_minutes: {
      type: 'number' as const,
      description: 'Number of minutes that passed during this action'
    },
    time_passed_explanation: {
      type: 'string' as const,
      description: 'Brief explanation of why this amount of time passed'
    },
    initial_game_time: {
      type: 'object' as const,
      nullable: true,
      properties: {
        day: { type: 'number' as const },
        dayName: { type: 'string' as const },
        month: { type: 'number' as const },
        monthName: { type: 'string' as const },
        year: { type: 'number' as const },
        hour: { type: 'number' as const },
        minute: { type: 'number' as const },
        timeOfDay: { type: 'string' as const },
        explanation: { type: 'string' as const, nullable: true }
      },
      required: ['day', 'dayName', 'month', 'monthName', 'year', 'hour', 'minute', 'timeOfDay'],
      description: 'Only for initial story setup - starting date and time'
    },
    stats_update: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          sourceName: { type: 'string' as const, nullable: true },
          targetName: { type: 'string' as const },
          value: {
            type: 'object' as const,
            properties: {
              result: { type: 'number' as const },
              dice_roll_explanation: { type: 'string' as const }
            },
            required: ['result', 'dice_roll_explanation']
          },
          type: { type: 'string' as const }
        },
        required: ['targetName', 'value', 'type']
      },
      description: 'Character statistics and resource updates'
    },
    inventory_update: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          type: {
            type: 'string' as const,
            enum: ['add_item', 'remove_item']
          },
          item_id: { type: 'string' as const },
          item_added: {
            type: 'object' as const,
            nullable: true,
            properties: {
              description: { type: 'string' as const },
              effect: { type: 'string' as const }
            },
            required: ['description', 'effect']
          }
        },
        required: ['type', 'item_id']
      },
      description: 'Inventory changes - items added or removed'
    },
    is_character_in_combat: {
      type: 'boolean' as const,
      description: 'Whether the character is currently in active combat'
    },
    is_character_restrained_explanation: {
      type: 'string' as const,
      nullable: true,
      description: 'Explanation if character is restrained or under external control, null otherwise'
    },
    currently_present_npcs_explanation: {
      type: 'string' as const,
      description: 'Explanation of which NPCs are present and why'
    },
    currently_present_npcs: {
      type: 'object' as const,
      properties: {
        hostile: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              uniqueTechnicalNameId: { type: 'string' as const },
              displayName: { type: 'string' as const }
            },
            required: ['uniqueTechnicalNameId', 'displayName']
          }
        },
        friendly: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              uniqueTechnicalNameId: { type: 'string' as const },
              displayName: { type: 'string' as const }
            },
            required: ['uniqueTechnicalNameId', 'displayName']
          }
        },
        neutral: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              uniqueTechnicalNameId: { type: 'string' as const },
              displayName: { type: 'string' as const }
            },
            required: ['uniqueTechnicalNameId', 'displayName']
          }
        }
      },
      required: ['hostile', 'friendly', 'neutral'],
      description: 'NPCs currently present in the scene categorized by relationship'
    }
  },
  required: [
    'id', 'currentPlotPoint', 'nextPlotPoint', 'gradualNarrativeExplanation', 'plotPointAdvancingNudgeExplanation',
    'story', 'story_memory_explanation', 'xpGainedExplanation', 'time_passed_minutes',
    'time_passed_explanation', 'stats_update', 'inventory_update', 'is_character_in_combat',
    'currently_present_npcs_explanation', 'currently_present_npcs'
  ]
};

export interface GameAgentResponse {
  id: number;
  currentPlotPoint: string;
  nextPlotPoint: string;
  gradualNarrativeExplanation: string;
  plotPointAdvancingNudgeExplanation: string;
  story: string;
  story_memory_explanation: string;
  xpGainedExplanation: string;
  time_passed_minutes: number;
  time_passed_explanation: string;
  initial_game_time?: {
    day: number;
    dayName: string;
    month: number;
    monthName: string;
    year: number;
    hour: number;
    minute: number;
    timeOfDay: string;
    explanation?: string;
  };
  stats_update: Array<{
    sourceName?: string;
    targetName: string;
    value: {
      result: number;
      dice_roll_explanation: string;
    };
    type: string;
  }>;
  inventory_update: Array<{
    type: 'add_item' | 'remove_item';
    item_id: string;
    item_added?: {
      description: string;
      effect: string;
    };
  }>;
  is_character_in_combat: boolean;
  is_character_restrained_explanation?: string;
  currently_present_npcs_explanation: string;
  currently_present_npcs: {
    hostile: Array<{
      uniqueTechnicalNameId: string;
      displayName: string;
    }>;
    friendly: Array<{
      uniqueTechnicalNameId: string;
      displayName: string;
    }>;
    neutral: Array<{
      uniqueTechnicalNameId: string;
      displayName: string;
    }>;
  };
}

// Game Time Response Schema for GameAgent
export const GameTimeResponseSchema = {
  type: 'object' as const,
  properties: {
    day: { type: 'number' as const },
    dayName: { type: 'string' as const },
    month: { type: 'number' as const },
    monthName: { type: 'string' as const },
    year: { type: 'number' as const },
    hour: { type: 'number' as const },
    minute: { type: 'number' as const },
    timeOfDay: {
      type: 'string' as const,
      enum: ['dawn', 'morning', 'midday', 'afternoon', 'evening', 'night', 'deep_night']
    },
    season: {
      type: 'string' as const,
      enum: ['spring', 'summer', 'autumn', 'winter']
    },
    weather: {
      type: 'object' as const,
      properties: {
        type: {
          type: 'string' as const,
          enum: [
            'clear', 'cloudy', 'light_rain', 'heavy_rain', 'drizzle', 'snow',
            'blizzard', 'storm', 'thunderstorm', 'fog', 'mist', 'wind',
            'hail', 'heat_wave', 'cold_snap'
          ]
        },
        intensity: {
          type: 'string' as const,
          enum: ['light', 'moderate', 'heavy', 'extreme']
        },
        description: { type: 'string' as const, nullable: true }
      },
      required: ['type', 'intensity']
    },
    explanation: { type: 'string' as const, nullable: true }
  },
  required: ['day', 'dayName', 'month', 'monthName', 'year', 'hour', 'minute', 'timeOfDay', 'season', 'weather']
};

// Enhanced Game Master Answer Response Schema (for player questions)
export const GameMasterAnswerResponseSchema = {
  type: 'object' as const,
  properties: {
    answerToPlayer: {
      type: 'string' as const,
      description: 'Direct answer to the player\'s question, written out-of-character'
    },
    answerType: {
      type: 'string' as const,
      enum: ['rule_clarification', 'world_lore', 'tactical_advice', 'current_situation', 'character_info', 'general'],
      description: 'Category of the question being answered'
    },
    confidence: {
      type: 'number' as const,
      minimum: 0,
      maximum: 100,
      description: 'Confidence level of the answer (0-100)'
    },
    rules_considered: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'List of relevant Game Master rules that apply to this question'
    },
    game_state_considered: {
      type: 'string' as const,
      description: 'Analysis of how current game state relates to the question'
    },
    relatedQuestions: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Suggestions for related questions the player might want to ask'
    },
    sources: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'References to rules, lore, or game elements mentioned in the answer'
    },
    followUpSuggestions: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Optional follow-up actions or questions the player might consider'
    },
    requiresClarification: {
      type: 'boolean' as const,
      description: 'Whether the question was ambiguous and might need clarification'
    },
    suggestedActions: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Optional game actions the player could take based on this information'
    }
  },
  required: ['answerToPlayer', 'answerType', 'confidence', 'rules_considered', 'game_state_considered', 'relatedQuestions', 'sources']
};

export interface GameMasterAnswerResponse {
  answerToPlayer: string;
  answerType: 'rule_clarification' | 'world_lore' | 'tactical_advice' | 'current_situation' | 'character_info' | 'general';
  confidence: number;
  rules_considered: string[];
  game_state_considered: string;
  relatedQuestions: string[];
  sources: string[];
  followUpSuggestions?: string[];
  requiresClarification?: boolean;
  suggestedActions?: string[];
}
