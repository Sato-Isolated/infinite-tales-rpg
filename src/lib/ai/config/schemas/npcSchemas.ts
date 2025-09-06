/**
 * NPC-related response schemas for AI agents
 * Includes NPC stats, relationships, and characteristics schemas
 */

// NPC Stats Response Schema
export const NPCStatsResponseSchema = {
  type: 'object' as const,
  properties: {
    npcs: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          uniqueTechnicalNameId: { type: 'string' as const },
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
        required: ['uniqueTechnicalNameId', 'is_party_member', 'class', 'rank_enum_english', 'level', 'spells_and_abilities']
      }
    }
  },
  required: ['npcs']
};

export interface NPCStatsResponse {
  npcs: Array<{
    uniqueTechnicalNameId: string;
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
  }>;
}
