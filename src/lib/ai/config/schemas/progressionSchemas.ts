/**
 * Character progression-related response schemas for AI agents
 * Includes level up and advancement schemas
 */

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
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          key: { type: 'string' as const },
          value: { type: 'number' as const }
        },
        required: ['key', 'value']
      }
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
  resources: Array<{ key: string; value: number }>;
}
