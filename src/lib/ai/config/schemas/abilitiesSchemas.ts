/**
 * Abilities-related response schemas for AI agents
 * Includes character abilities and spells schemas
 */

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
}> { }
