import type { LLM, LLMMessage, LLMRequest } from '../llm';
import type { GameActionState } from './gameAgent';
import { GEMINI_MODELS } from '../geminiProvider';
import { stringifyPretty } from '$lib/util.svelte';
import { 
  DialogueTrackingResponseSchema, 
  ConversationSummaryResponseSchema,
  type DialogueTrackingResponse,
  type ConversationSummaryResponse 
} from '$lib/ai/config/ResponseSchemas';

/**
 * Dialogue tracking result for detecting conversation similarities
 */
export interface DialogueTrackingResult {
  /** Whether the current conversation is similar to a previous one */
  is_similar_conversation: boolean;
  /** Similarity score from 0.0 to 1.0 */
  similarity_score: number;
  /** Explanation of the similarity or differences */
  similarity_explanation: string;
  /** Reference to the previous similar conversation if any */
  previous_conversation_reference?: string;
  /** Suggested alternative dialogue approach to avoid repetition */
  alternative_approach_suggestion?: string;
}

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
  ): Promise<DialogueTrackingResult> {
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

    const systemInstruction = this.buildSimilarityCheckPrompt();

    const userMessage = this.buildSimilarityCheckUserMessage(
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
        return this.getFallbackSimilarityResult();
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
      return this.getFallbackSimilarityResult();
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
    const systemInstruction = this.buildExtractionPrompt();

    const userMessage = `STORY CONTENT TO ANALYZE:\n${storyContent}\n\nGAME_STATE_ID: ${gameStateId}\nTEMPORAL_CONTEXT: ${temporalContext || 'Not specified'}`;

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

  /**
   * Build the system prompt for conversation similarity checking
   */
  private buildSimilarityCheckPrompt(): string {
    return [
      'You are a Dialogue Tracking Agent responsible for preventing repetitive conversations in an AI RPG game.',
      'Your task is to analyze planned conversation content against previous conversation history to detect similarities.',
      '',
      '🎯 ANALYSIS OBJECTIVES:',
      '- Detect if the planned conversation covers similar topics to previous conversations',
      '- Identify if the same characters are discussing the same subjects again',
      '- Determine if the conversation would feel repetitive to the player',
      '- Suggest alternative approaches to make conversations fresh and engaging',
      '',
      '🔍 SIMILARITY CRITERIA:',
      '- HIGH SIMILARITY (0.8-1.0): Same characters discussing very similar topics with similar outcomes',
      '- MEDIUM SIMILARITY (0.5-0.7): Similar topics but different context, participants, or outcomes',
      '- LOW SIMILARITY (0.2-0.4): Some overlapping elements but substantially different conversation',
      '- NO SIMILARITY (0.0-0.1): Completely different conversation topics or contexts',
      '',
      '✅ ACCEPTABLE REPETITION:',
      '- Brief acknowledgments or greetings between characters who know each other',
      '- Follow-up conversations that build upon previous discussions',
      '- New information or developments related to previously discussed topics',
      '',
      '❌ UNACCEPTABLE REPETITION:',
      '- Exact same conversations happening again without narrative purpose',
      '- Characters re-explaining information they\'ve already shared',
      '- Identical introductions or first-meeting dialogues repeating',
      '',
      'Generate structured response with similarity analysis and recommendations.'
    ].join('\n');
  }

  /**
   * Build the user message for similarity checking
   */
  private buildSimilarityCheckUserMessage(
    plannedConversation: string,
    relevantConversations: ConversationSummary[],
    currentParticipants: string[]
  ): string {
    const conversationHistoryText = relevantConversations.map((conv, index) =>
      `CONVERSATION ${index + 1}:\n` +
      `- Participants: ${conv.participants.join(', ')}\n` +
      `- Topics: ${conv.topics.join(', ')}\n` +
      `- Key Points: ${conv.key_points.join('; ')}\n` +
      `- Outcome: ${conv.outcome}\n` +
      `- Context: ${conv.temporal_context || 'Not specified'}\n`
    ).join('\n');

    return [
      'PLANNED CONVERSATION TO ANALYZE:',
      plannedConversation,
      '',
      'CURRENT PARTICIPANTS:',
      currentParticipants.join(', '),
      '',
      'PREVIOUS RELEVANT CONVERSATIONS:',
      conversationHistoryText,
      '',
      'Analyze the planned conversation against the previous conversations and provide similarity assessment.'
    ].join('\n');
  }

  /**
   * Build the system prompt for conversation extraction
   */
  private buildExtractionPrompt(): string {
    return [
      'You are a Conversation Extraction Agent responsible for identifying and summarizing dialogue content from story text.',
      'Your task is to extract meaningful conversation information that can be used to prevent future repetitive dialogues.',
      '',
      '🎯 EXTRACTION OBJECTIVES:',
      '- Identify if the story content contains significant character dialogue',
      '- Extract conversation participants, topics, and key points',
      '- Summarize the outcome or resolution of the conversation',
      '- Generate a unique conversation identifier',
      '',
      '🔍 WHAT CONSTITUTES A SIGNIFICANT CONVERSATION:',
      '- Character interactions with meaningful dialogue (not just actions)',
      '- Information exchange between characters',
      '- Relationship developments or revelations',
      '- Plot-relevant discussions',
      '- Character introductions or first meetings',
      '',
      '❌ WHAT TO IGNORE:',
      '- Pure action sequences without dialogue',
      '- Internal monologue or narrator descriptions',
      '- Brief acknowledgments or single-word responses',
      '- Combat descriptions without character interaction',
      '',
      'Generate structured conversation summary or null if no significant conversation found.'
    ].join('\n');
  }

  /**
   * Get fallback result when similarity check fails
   */
  private getFallbackSimilarityResult(): DialogueTrackingResult {
    return {
      is_similar_conversation: false,
      similarity_score: 0.0,
      similarity_explanation: "Unable to analyze similarity due to technical error. Allowing conversation to proceed."
    };
  }
}
