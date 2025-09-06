/**
 * Combat-related response schemas for AI agents
 * Includes combat action and statistics update schemas
 */

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
