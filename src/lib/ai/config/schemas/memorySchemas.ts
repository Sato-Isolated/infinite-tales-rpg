/**
 * Memory and summarization-related response schemas for AI agents
 * Includes story summarization and history retrieval schemas
 */

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
