import { type Type } from '@google/genai';

/**
 * Comprehensive response schemas for all AI agents
 * Replaces manual JSON parsing with type-safe structured output
 */

// Story Generation Response Schema
export const StoryGenerationResponseSchema = {
  type: 'object' as const,
  properties: {
    game: { type: 'string' as const },
    world_details: { type: 'string' as const },
    story_pace: { type: 'string' as const },
    main_scenario: { type: 'string' as const },
    character_simple_description: { type: 'string' as const },
    theme: { type: 'string' as const },
    tonality: { type: 'string' as const },
    background_context: { type: 'string' as const },
    social_dynamics: { type: 'string' as const },
    locations: { type: 'string' as const },
    npcs: { type: 'string' as const },
    story_catalyst: { type: 'string' as const },
    potential_developments: { type: 'string' as const },
    narrative_flexibility: { type: 'string' as const },
    player_agency: { type: 'string' as const },
    content_rating: { type: 'string' as const },
    tags: { type: 'string' as const }
  },
  required: [
    'game', 'world_details', 'story_pace', 'main_scenario', 'character_simple_description',
    'theme', 'tonality', 'background_context', 'social_dynamics', 'locations', 'npcs',
    'story_catalyst', 'potential_developments', 'narrative_flexibility', 'player_agency',
    'content_rating', 'tags'
  ]
};

export interface StoryGenerationResponse {
  game: string;
  world_details: string;
  story_pace: string;
  main_scenario: string;
  character_simple_description: string;
  theme: string;
  tonality: string;
  background_context: string;
  social_dynamics: string;
  locations: string;
  npcs: string;
  story_catalyst: string;
  potential_developments: string;
  narrative_flexibility: string;
  player_agency: string;
  content_rating: string;
  tags: string;
}

// Story Progression Response Schema
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
  required: ['story', 'xp_gain', 'inventory_update', 'stats_update']
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

// Character Description Response Schema
export const CharacterDescriptionResponseSchema = {
  type: 'object' as const,
  properties: {
    name: { type: 'string' as const },
    class: { type: 'string' as const },
    race: { type: 'string' as const },
    gender: { type: 'string' as const },
    appearance: { type: 'string' as const },
    alignment: { type: 'string' as const },
    personality: { type: 'string' as const },
    background: { type: 'string' as const },
    motivation: { type: 'string' as const }
  },
  required: ['name', 'class', 'race', 'gender', 'appearance', 'alignment', 'personality', 'background', 'motivation']
};

export interface CharacterDescriptionResponse {
  name: string;
  class: string;
  race: string;
  gender: string;
  appearance: string;
  alignment: string;
  personality: string;
  background: string;
  motivation: string;
}

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

// Character Stats Agent Response Schema
export const CharacterStatsResponseSchema = {
  type: 'object' as const,
  properties: {
    level: { type: 'number' as const },
    resources: {
      type: 'object' as const,
      additionalProperties: {
        type: 'object' as const,
        properties: {
          max_value: { type: 'number' as const },
          start_value: { type: 'number' as const },
          game_ends_when_zero: { type: 'boolean' as const }
        },
        required: ['max_value', 'start_value', 'game_ends_when_zero']
      }
    },
    attributes: {
      type: 'object' as const,
      additionalProperties: { type: 'number' as const }
    },
    skills: {
      type: 'object' as const,
      additionalProperties: { type: 'number' as const }
    },
    spells_and_abilities: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          name: { type: 'string' as const },
          effect: { type: 'string' as const },
          resource_cost: {
            type: 'object' as const,
            properties: {
              resource_key: { type: 'string' as const },
              cost: { type: 'number' as const }
            },
            required: ['resource_key', 'cost']
          }
        },
        required: ['name', 'effect', 'resource_cost']
      }
    }
  },
  required: ['level', 'resources', 'attributes', 'skills', 'spells_and_abilities']
};

export interface CharacterStatsResponse {
  level: number;
  resources: {
    [resourceKey: string]: {
      max_value: number;
      start_value: number;
      game_ends_when_zero: boolean;
    };
  };
  attributes: { [stat: string]: number };
  skills: { [stat: string]: number };
  spells_and_abilities: Array<{
    name: string;
    effect: string;
    resource_cost: {
      resource_key: string | undefined;
      cost: number;
    };
  }>;
}

// Level Up Agent Response Schema
export const LevelUpResponseSchema = {
  type: 'object' as const,
  properties: {
    character_name: { type: 'string' as const },
    level_up_explanation: { type: 'string' as const },
    attribute: { type: 'string' as const },
    formerAbilityName: { type: 'string' as const, nullable: true },
    ability: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        effect: { type: 'string' as const },
        resource_cost: {
          type: 'object' as const,
          properties: {
            resource_key: { type: 'string' as const },
            cost: { type: 'number' as const }
          },
          required: ['resource_key', 'cost']
        }
      },
      required: ['name', 'effect', 'resource_cost']
    },
    resources: {
      type: 'object' as const,
      additionalProperties: { type: 'number' as const }
    }
  },
  required: ['character_name', 'level_up_explanation', 'attribute', 'ability', 'resources']
};

export interface LevelUpResponse {
  character_name: string;
  level_up_explanation: string;
  attribute: string;
  formerAbilityName?: string;
  ability: {
    name: string;
    effect: string;
    resource_cost: {
      resource_key: string | undefined;
      cost: number;
    };
  };
  resources: { [resourceKey: string]: number };
}

// NPC Stats Response Schema
export const NPCStatsResponseSchema = {
  type: 'object' as const,
  additionalProperties: {
    type: 'object' as const,
    properties: {
      known_names: {
        type: 'array' as const,
        items: { type: 'string' as const },
        nullable: true
      },
      is_party_member: { type: 'boolean' as const },
      resources: {
        type: 'object' as const,
        nullable: true,
        properties: {
          current_hp: { type: 'number' as const },
          current_mp: { type: 'number' as const }
        },
        required: ['current_hp', 'current_mp']
      },
      class: { type: 'string' as const },
      rank_enum_english: { 
        type: 'string' as const,
        enum: ['Very Weak', 'Weak', 'Average', 'Strong', 'Boss', 'Legendary']
      },
      level: { type: 'number' as const },
      spells_and_abilities: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            name: { type: 'string' as const },
            effect: { type: 'string' as const },
            resource_cost: {
              type: 'object' as const,
              properties: {
                resource_key: { type: 'string' as const, nullable: true },
                cost: { type: 'number' as const }
              },
              required: ['resource_key', 'cost']
            }
          },
          required: ['name', 'effect', 'resource_cost']
        }
      },
      relationships: {
        type: 'array' as const,
        nullable: true,
        items: {
          type: 'object' as const,
          properties: {
            target_npc_id: { type: 'string' as const, nullable: true },
            target_name: { type: 'string' as const },
            relationship_type: {
              type: 'string' as const,
              enum: ['family', 'friend', 'romantic', 'enemy', 'acquaintance', 'professional', 'other']
            },
            specific_role: { type: 'string' as const, nullable: true },
            emotional_bond: {
              type: 'string' as const,
              enum: ['very_negative', 'negative', 'neutral', 'positive', 'very_positive']
            },
            description: { type: 'string' as const }
          },
          required: ['target_name', 'relationship_type', 'emotional_bond', 'description']
        }
      },
      personality_traits: {
        type: 'array' as const,
        nullable: true,
        items: { type: 'string' as const }
      },
      speech_patterns: { type: 'string' as const, nullable: true },
      background_notes: { type: 'string' as const, nullable: true }
    },
    required: ['is_party_member', 'class', 'rank_enum_english', 'level', 'spells_and_abilities']
  }
};

export interface NPCStatsResponse {
  [uniqueTechnicalNameId: string]: {
    known_names?: string[];
    is_party_member: boolean;
    resources?: {
      current_hp: number;
      current_mp: number;
    };
    class: string;
    rank_enum_english: 'Very Weak' | 'Weak' | 'Average' | 'Strong' | 'Boss' | 'Legendary';
    level: number;
    spells_and_abilities: Array<{
      name: string;
      effect: string;
      resource_cost: {
        resource_key: string | undefined;
        cost: number;
      };
    }>;
    relationships?: Array<{
      target_npc_id?: string;
      target_name: string;
      relationship_type: 'family' | 'friend' | 'romantic' | 'enemy' | 'acquaintance' | 'professional' | 'other';
      specific_role?: string;
      emotional_bond: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
      description: string;
    }>;
    personality_traits?: string[];
    speech_patterns?: string;
    background_notes?: string;
  };
}

// Combat Agent Response Schema
export const CombatResponseSchema = {
  type: 'object' as const,
  properties: {
    actions: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          sourceId: { type: 'string' as const },
          targetId: { type: 'string' as const },
          text: { type: 'string' as const },
          explanation: { type: 'string' as const }
        },
        required: ['sourceId', 'targetId', 'text', 'explanation']
      }
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
              number: { type: 'number' as const, nullable: true },
              type: { type: 'number' as const, nullable: true },
              modifier: { type: 'number' as const, nullable: true },
              rolls: {
                type: 'array' as const,
                nullable: true,
                items: { type: 'number' as const }
              }
            },
            required: ['result']
          },
          type: { type: 'string' as const }
        },
        required: ['targetName', 'value', 'type']
      }
    }
  },
  required: ['actions', 'stats_update']
};

export interface CombatResponse {
  actions: Array<{
    sourceId: string;
    targetId: string;
    text: string;
    explanation: string;
  }>;
  stats_update: Array<{
    sourceName?: string;
    targetName: string;
    value: {
      result: number;
      number?: number;
      type?: number;
      modifier?: number;
      rolls?: number[];
    };
    type: string;
  }>;
}

// Event Agent Response Schema
export const EventResponseSchema = {
  type: 'object' as const,
  properties: {
    character_changed: {
      type: 'object' as const,
      nullable: true,
      properties: {
        changed_into: { type: 'string' as const },
        description: { type: 'string' as const },
        aiProcessingComplete: { type: 'boolean' as const },
        showEventConfirmationDialog: { type: 'boolean' as const }
      },
      required: ['changed_into', 'description', 'aiProcessingComplete', 'showEventConfirmationDialog']
    },
    abilities_learned: {
      type: 'array' as const,
      nullable: true,
      items: {
        type: 'object' as const,
        properties: {
          uniqueTechnicalId: { type: 'string' as const },
          name: { type: 'string' as const, nullable: true },
          effect: { type: 'string' as const, nullable: true },
          resource_cost: {
            type: 'object' as const,
            nullable: true,
            properties: {
              resource_key: { type: 'string' as const, nullable: true },
              cost: { type: 'number' as const }
            },
            required: ['resource_key', 'cost']
          }
        },
        required: ['uniqueTechnicalId']
      }
    }
  }
};

export interface EventResponse {
  character_changed?: {
    changed_into: string;
    description: string;
    aiProcessingComplete: boolean;
    showEventConfirmationDialog: boolean;
  };
  abilities_learned?: Array<{
    uniqueTechnicalId: string;
    name?: string;
    effect?: string;
    resource_cost?: {
      resource_key: string | undefined;
      cost: number;
    };
  }>;
}

// Dialogue Tracking Agent Response Schema
export const DialogueTrackingResponseSchema = {
  type: 'object' as const,
  properties: {
    is_similar_conversation: { type: 'boolean' as const },
    similarity_score: { type: 'number' as const },
    similarity_explanation: { type: 'string' as const },
    previous_conversation_reference: { type: 'string' as const, nullable: true },
    alternative_approach_suggestion: { type: 'string' as const, nullable: true }
  },
  required: ['is_similar_conversation', 'similarity_score', 'similarity_explanation']
};

export interface DialogueTrackingResponse {
  is_similar_conversation: boolean;
  similarity_score: number;
  similarity_explanation: string;
  previous_conversation_reference?: string;
  alternative_approach_suggestion?: string;
}

// Conversation Summary Response Schema
export const ConversationSummaryResponseSchema = {
  type: 'object' as const,
  properties: {
    conversation_id: { type: 'string' as const },
    participants: {
      type: 'array' as const,
      items: { type: 'string' as const }
    },
    topics: {
      type: 'array' as const,
      items: { type: 'string' as const }
    },
    key_points: {
      type: 'array' as const,
      items: { type: 'string' as const }
    },
    outcome: { type: 'string' as const },
    game_state_id: { type: 'number' as const },
    temporal_context: { type: 'string' as const, nullable: true }
  },
  required: ['conversation_id', 'participants', 'topics', 'key_points', 'outcome', 'game_state_id']
};

export interface ConversationSummaryResponse {
  conversation_id: string;
  participants: string[];
  topics: string[];
  key_points: string[];
  outcome: string;
  game_state_id: number;
  temporal_context?: string;
}

// Abilities Array Response Schema
export const AbilitiesResponseSchema = {
  type: 'array' as const,
  items: {
    type: 'object' as const,
    properties: {
      name: { type: 'string' as const },
      effect: { type: 'string' as const },
      resource_cost: {
        type: 'object' as const,
        properties: {
          resource_key: { type: 'string' as const, nullable: true },
          cost: { type: 'number' as const }
        },
        required: ['resource_key', 'cost']
      }
    },
    required: ['name', 'effect', 'resource_cost']
  }
};

export interface AbilitiesResponse extends Array<{
  name: string;
  effect: string;
  resource_cost: {
    resource_key: string | undefined;
    cost: number;
  };
}> {}

// Single Action Response Schema for ActionAgent
export const SingleActionResponseSchema = {
  type: 'object' as const,
  properties: {
    characterName: { type: 'string' as const },
    text: { type: 'string' as const },
    related_attribute: { type: 'string' as const, nullable: true },
    related_skill: { type: 'string' as const, nullable: true },
    action_difficulty: { 
      type: 'string' as const, 
      nullable: true,
      enum: ['simple', 'medium', 'difficult', 'very_difficult']
    },
    is_custom_action: { type: 'boolean' as const, nullable: true },
    is_possible: { type: 'boolean' as const, nullable: true },
    plausibility: { type: 'string' as const, nullable: true },
    difficulty_explanation: { type: 'string' as const, nullable: true },
    type: { type: 'string' as const, nullable: true },
    narration_details: { type: 'object' as const, nullable: true },
    actionSideEffects: { type: 'string' as const, nullable: true },
    enemyEncounterExplanation: { type: 'object' as const, nullable: true },
    is_interruptible: {
      type: 'object' as const,
      nullable: true,
      properties: {
        reasoning: { type: 'string' as const },
        enum_english: { type: 'string' as const }
      },
      required: ['reasoning', 'enum_english']
    },
    resource_cost: {
      type: 'object' as const,
      nullable: true,
      properties: {
        resource_key: { type: 'string' as const, nullable: true },
        cost: { type: 'number' as const }
      },
      required: ['resource_key', 'cost']
    },
    dice_roll: {
      type: 'object' as const,
      nullable: true,
      properties: {
        modifier: { 
          type: 'string' as const,
          enum: ['none', 'bonus', 'malus']
        },
        modifier_value: { type: 'number' as const },
        modifier_explanation: { type: 'string' as const }
      },
      required: ['modifier', 'modifier_value', 'modifier_explanation']
    }
  },
  required: ['characterName', 'text']
};

export interface SingleActionResponse {
  characterName: string;
  text: string;
  related_attribute?: string;
  related_skill?: string;
  action_difficulty?: 'simple' | 'medium' | 'difficult' | 'very_difficult';
  is_custom_action?: boolean;
  is_possible?: boolean;
  plausibility?: string;
  difficulty_explanation?: string;
  type?: string;
  narration_details?: object;
  actionSideEffects?: string;
  enemyEncounterExplanation?: object;
  is_interruptible?: {
    reasoning: string;
    enum_english: string;
  };
  resource_cost?: {
    resource_key: string | undefined;
    cost: number;
  };
  dice_roll?: {
    modifier: 'none' | 'bonus' | 'malus';
    modifier_value: number;
    modifier_explanation: string;
  };
}

// Actions with Thoughts Response Schema for ActionAgent
export const ActionsWithThoughtsResponseSchema = {
  type: 'object' as const,
  properties: {
    thoughts: { type: 'string' as const, nullable: true },
    actions: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          characterName: { type: 'string' as const },
          text: { type: 'string' as const },
          related_attribute: { type: 'string' as const, nullable: true },
          related_skill: { type: 'string' as const, nullable: true },
          action_difficulty: { 
            type: 'string' as const, 
            nullable: true,
            enum: ['simple', 'medium', 'difficult', 'very_difficult']
          },
          is_custom_action: { type: 'boolean' as const, nullable: true },
          is_possible: { type: 'boolean' as const, nullable: true },
          plausibility: { type: 'string' as const, nullable: true },
          difficulty_explanation: { type: 'string' as const, nullable: true },
          type: { type: 'string' as const, nullable: true },
          narration_details: { type: 'object' as const, nullable: true },
          actionSideEffects: { type: 'string' as const, nullable: true },
          enemyEncounterExplanation: { type: 'object' as const, nullable: true },
          is_interruptible: {
            type: 'object' as const,
            nullable: true,
            properties: {
              reasoning: { type: 'string' as const },
              enum_english: { type: 'string' as const }
            },
            required: ['reasoning', 'enum_english']
          },
          resource_cost: {
            type: 'object' as const,
            nullable: true,
            properties: {
              resource_key: { type: 'string' as const, nullable: true },
              cost: { type: 'number' as const }
            },
            required: ['resource_key', 'cost']
          },
          dice_roll: {
            type: 'object' as const,
            nullable: true,
            properties: {
              modifier: { 
                type: 'string' as const,
                enum: ['none', 'bonus', 'malus']
              },
              modifier_value: { type: 'number' as const },
              modifier_explanation: { type: 'string' as const }
            },
            required: ['modifier', 'modifier_value', 'modifier_explanation']
          }
        },
        required: ['characterName', 'text']
      }
    }
  },
  required: ['actions']
};

export interface ActionsWithThoughtsResponse {
  thoughts?: string;
  actions: Array<{
    characterName: string;
    text: string;
    related_attribute?: string;
    related_skill?: string;
    action_difficulty?: 'simple' | 'medium' | 'difficult' | 'very_difficult';
    is_custom_action?: boolean;
    is_possible?: boolean;
    plausibility?: string;
    difficulty_explanation?: string;
    type?: string;
    narration_details?: object;
    actionSideEffects?: string;
    enemyEncounterExplanation?: object;
    is_interruptible?: {
      reasoning: string;
      enum_english: string;
    };
    resource_cost?: {
      resource_key: string | undefined;
      cost: number;
    };
    dice_roll?: {
      modifier: 'none' | 'bonus' | 'malus';
      modifier_value: number;
      modifier_explanation: string;
    };
  }>;
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

export interface GameTimeResponse {
  day: number;
  dayName: string;
  month: number;
  monthName: string;
  year: number;
  hour: number;
  minute: number;
  timeOfDay: 'dawn' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night' | 'deep_night';
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  weather: {
    type: 'clear' | 'cloudy' | 'light_rain' | 'heavy_rain' | 'drizzle' | 'snow' | 'blizzard' | 'storm' | 'thunderstorm' | 'fog' | 'mist' | 'wind' | 'hail' | 'heat_wave' | 'cold_snap';
    intensity: 'light' | 'moderate' | 'heavy' | 'extreme';
    description?: string;
  };
  explanation?: string;
}

/**
 * Get the appropriate response schema for an agent type
 */
export function getResponseSchemaForAgent(agentType: string): any {
  const schemas: Record<string, any> = {
    story: StoryResponseSchema,
    storyGeneration: StoryGenerationResponseSchema,
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
