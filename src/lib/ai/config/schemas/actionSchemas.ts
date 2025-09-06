/**
 * Action-related response schemas for AI agents
 * Includes action generation, single actions, and enhanced action schemas
 */

import type { Action } from '$lib/types/action';

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
    narration_details: {
      type: 'object' as const,
      nullable: true,
      properties: {
        reasoning: { type: 'string' as const },
        enum_english: { type: 'string' as const }
      },
      required: ['reasoning', 'enum_english']
    },
    actionSideEffects: { type: 'string' as const, nullable: true },
    enemyEncounterExplanation: {
      type: 'object' as const,
      nullable: true,
      properties: {
        reasoning: { type: 'string' as const },
        enum_english: { type: 'string' as const }
      },
      required: ['reasoning', 'enum_english']
    },
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

// Use the centralized Action type for consistency
export type SingleActionResponse = Action;

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
          narration_details: {
            type: 'object' as const,
            nullable: true,
            properties: {
              reasoning: { type: 'string' as const },
              enum_english: {
                type: 'string' as const,
                enum: ['LOW', 'MEDIUM', 'HIGH']
              }
            },
            required: ['reasoning', 'enum_english']
          },
          actionSideEffects: { type: 'string' as const, nullable: true },
          enemyEncounterExplanation: {
            type: 'object' as const,
            nullable: true,
            properties: {
              reasoning: { type: 'string' as const },
              enum_english: {
                type: 'string' as const,
                enum: ['LOW', 'MEDIUM', 'HIGH']
              }
            },
            required: ['reasoning', 'enum_english']
          },
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
    narration_details?: {
      reasoning: string;
      enum_english: 'LOW' | 'MEDIUM' | 'HIGH';
    };
    actionSideEffects?: string;
    enemyEncounterExplanation?: {
      reasoning: string;
      enum_english: 'LOW' | 'MEDIUM' | 'HIGH';
    };
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
