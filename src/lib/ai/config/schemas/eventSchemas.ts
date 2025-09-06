/**
 * Event-related response schemas for AI agents
 * Includes character transformation and ability learning events
 */

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
