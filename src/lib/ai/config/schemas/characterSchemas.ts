/**
 * Character-related response schemas for AI agents
 * Includes character generation, description, and stats schemas
 */

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

// Character Stats Agent Response Schema
export const CharacterStatsResponseSchema = {
  type: 'object' as const,
  properties: {
    level: { type: 'number' as const },
    resources: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          key: { type: 'string' as const },
          max_value: { type: 'number' as const },
          start_value: { type: 'number' as const },
          game_ends_when_zero: { type: 'boolean' as const }
        },
        required: ['key', 'max_value', 'start_value', 'game_ends_when_zero']
      }
    },
    attributes: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          name: { type: 'string' as const },
          value: { type: 'number' as const }
        },
        required: ['name', 'value']
      }
    },
    skills: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          name: { type: 'string' as const },
          value: { type: 'number' as const }
        },
        required: ['name', 'value']
      }
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
  resources: Array<{
    key: string;
    max_value: number;
    start_value: number;
    game_ends_when_zero: boolean;
  }>;
  attributes: Array<{ name: string; value: number }>;
  skills: Array<{ name: string; value: number }>;
  spells_and_abilities: Array<{
    name: string;
    effect: string;
    resource_cost: {
      resource_key: string | undefined;
      cost: number;
    };
  }>;
}
