import type { LLM, LLMMessage, LLMRequest } from '../llm';
import type { GameActionState } from '$lib/types/actions';
import { GEMINI_MODELS } from '../geminiProvider';
import { stringifyPretty } from '$lib/util.svelte';
import {
  DialogueTrackingResponseSchema,
  ConversationSummaryResponseSchema,
  type DialogueTrackingResponse,
  type ConversationSummaryResponse
} from '$lib/ai/config/ResponseSchemas';
import {
  buildSimilarityCheckPrompt,
  buildSimilarityCheckUserMessage,
  buildExtractionPrompt,
  buildExtractionUserMessage,
  getFallbackSimilarityResult
} from './dialogueTrackingAgentPrompts';

/**
 * Conversation summary for tracking dialogue history
 */
export interface ConversationSummary {
  /** Unique identifier for the conversation */
  conversation_id: string;
  /** Characters involved in the conversation */
  participants: string[];
  /** Main topics discussed */
  topics: string[];
  /** Key dialogue points or revelations */
  key_points: string[];
  /** Conversation outcome or resolution */
  outcome: string;
  /** Game state ID where this conversation occurred */
  game_state_id: number;
  /** Temporal context (when this conversation happened) */
  temporal_context?: string;
}

/**
 * Dialogue Tracking Agent
 * 
 * This agent is responsible for:
 * 1. Tracking conversation history and topics
 * 2. Detecting similar conversations to prevent repetition
 * 3. Providing alternative dialogue approaches
 * 4. Managing dialogue memory across game sessions
 */
export class DialogueTrackingAgent {
  llm: LLM;

  constructor(llm: LLM) {
    this.llm = llm;
  }

  /**
   * Check if a planned conversation is similar to previous conversations
   * @param plannedConversation The conversation content that's about to be generated
   * @param conversationHistory Array of previous conversation summaries
   * @param currentParticipants Characters involved in the current conversation
   * @returns DialogueTrackingResult indicating similarity and suggestions
   */
  async checkConversationSimilarity(
    plannedConversation: string,
    conversationHistory: ConversationSummary[],
    currentParticipants: string[]
  ): Promise<DialogueTrackingResponse> {
    if (conversationHistory.length === 0) {
      return {
        is_similar_conversation: false,
        similarity_score: 0.0,
        similarity_explanation: "No previous conversations to compare against."
      };
    }

    // Filter conversations involving the same or overlapping participants
    const relevantConversations = conversationHistory.filter(conv =>
      conv.participants.some(participant =>
        currentParticipants.includes(participant)
      )
    );

    if (relevantConversations.length === 0) {
      return {
        is_similar_conversation: false,
        similarity_score: 0.0,
        similarity_explanation: "No previous conversations found with these participants."
      };
    }

    const systemInstruction = buildSimilarityCheckPrompt();

    const userMessage = buildSimilarityCheckUserMessage(
      plannedConversation,
      relevantConversations,
      currentParticipants
    );

    const request: LLMRequest = {
      userMessage,
      systemInstruction,
      temperature: 0.1, // Low temperature for consistent analysis
      model: GEMINI_MODELS.FLASH_THINKING_2_0,
      tryAutoFixJSONError: true,
      config: {
        responseSchema: DialogueTrackingResponseSchema
      }
    };

    try {
      const response = await this.llm.generateContent(request);
      const result = response?.content as DialogueTrackingResponse;

      if (!result || typeof result.is_similar_conversation !== 'boolean') {
        console.warn('Invalid dialogue tracking response, returning fallback');
        return getFallbackSimilarityResult();
      }

      return {
        is_similar_conversation: result.is_similar_conversation,
        similarity_score: result.similarity_score,
        similarity_explanation: result.similarity_explanation,
        previous_conversation_reference: result.previous_conversation_reference || undefined,
        alternative_approach_suggestion: result.alternative_approach_suggestion || undefined
      };
    } catch (error) {
      console.error('Error checking conversation similarity:', error);
      return getFallbackSimilarityResult();
    }
  }

  /**
   * Extract conversation summary from story content
   * @param storyContent The story content containing dialogue
   * @param gameStateId The current game state ID
   * @param temporalContext Optional temporal context
   * @returns ConversationSummary or null if no significant conversation found
   */
  async extractConversationSummary(
    storyContent: string,
    gameStateId: number,
    temporalContext?: string
  ): Promise<ConversationSummary | null> {
    const systemInstruction = buildExtractionPrompt();

    const userMessage = buildExtractionUserMessage(storyContent, gameStateId, temporalContext);

    const request: LLMRequest = {
      userMessage,
      systemInstruction,
      temperature: 0.3,
      model: GEMINI_MODELS.FLASH_THINKING_2_0,
      tryAutoFixJSONError: true,
      config: {
        responseSchema: ConversationSummaryResponseSchema
      }
    };

    try {
      const response = await this.llm.generateContent(request);
      const result = response?.content as ConversationSummaryResponse;

      // Validate that we have a meaningful conversation
      if (!result || !result.participants || result.participants.length === 0 ||
        !result.topics || result.topics.length === 0) {
        return null; // No significant conversation found
      }

      return {
        conversation_id: result.conversation_id,
        participants: result.participants,
        topics: result.topics,
        key_points: result.key_points,
        outcome: result.outcome,
        game_state_id: gameStateId,
        temporal_context: temporalContext
      };
    } catch (error) {
      console.error('Error extracting conversation summary:', error);
      return null;
    }
  }
}
