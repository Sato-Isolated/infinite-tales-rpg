/**
 * Dialogue and conversation-related response schemas for AI agents
 * Includes conversation tracking and summarization schemas
 */

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
