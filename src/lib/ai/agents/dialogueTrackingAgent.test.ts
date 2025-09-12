import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DialogueTrackingAgent, type ConversationSummary } from './dialogueTrackingAgent';
import type { LLM, LLMRequest } from '../llm';
import type { DialogueTrackingResponse, ConversationSummaryResponse } from '$lib/ai/config/ResponseSchemas';
import { GEMINI_MODELS } from '../geminiProvider';

// Mock dependencies
const mockLLMInstance = {
  generateContent: vi.fn()
};

// Mock response schemas and prompts
vi.mock('./dialogueTrackingAgentPrompts', () => ({
  buildSimilarityCheckPrompt: vi.fn(() => 'similarity check prompt'),
  buildSimilarityCheckUserMessage: vi.fn(() => 'similarity check user message'),
  buildExtractionPrompt: vi.fn(() => 'extraction prompt'),
  buildExtractionUserMessage: vi.fn(() => 'extraction user message'),
  getFallbackSimilarityResult: vi.fn(() => ({
    is_similar_conversation: false,
    similarity_score: 0.0,
    similarity_explanation: 'Error occurred during similarity check'
  }))
}));

describe('DialogueTrackingAgent', () => {
  let agent: DialogueTrackingAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new DialogueTrackingAgent(mockLLMInstance as unknown as LLM);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with LLM instance', () => {
      expect(agent.llm).toBe(mockLLMInstance);
    });
  });

  describe('checkConversationSimilarity', () => {
    const mockConversationHistory: ConversationSummary[] = [
      {
        conversation_id: 'conv-1',
        participants: ['Alice', 'Bob'],
        topics: ['weather', 'travel'],
        key_points: ['Planning trip to mountains', 'Discussing equipment needed'],
        outcome: 'Agreed to meet tomorrow',
        game_state_id: 1,
        temporal_context: 'Yesterday afternoon'
      },
      {
        conversation_id: 'conv-2',
        participants: ['Alice', 'Charlie'],
        topics: ['magic', 'spells'],
        key_points: ['Learning fireball spell', 'Discussing mana costs'],
        outcome: 'Alice learned new spell',
        game_state_id: 2,
        temporal_context: 'This morning'
      }
    ];

    it('should return no similarity when conversation history is empty', async () => {
      const result = await agent.checkConversationSimilarity(
        'Hello Alice, how are you?',
        [],
        ['Alice', 'Bob']
      );

      expect(result).toEqual({
        is_similar_conversation: false,
        similarity_score: 0.0,
        similarity_explanation: "No previous conversations to compare against."
      });
      expect(mockLLMInstance.generateContent).not.toHaveBeenCalled();
    });

    it('should return no similarity when no relevant conversations found', async () => {
      const result = await agent.checkConversationSimilarity(
        'Hello David, nice to meet you!',
        mockConversationHistory,
        ['David', 'Eve']
      );

      expect(result).toEqual({
        is_similar_conversation: false,
        similarity_score: 0.0,
        similarity_explanation: "No previous conversations found with these participants."
      });
      expect(mockLLMInstance.generateContent).not.toHaveBeenCalled();
    });

    it('should call LLM when relevant conversations exist', async () => {
      const mockResponse: DialogueTrackingResponse = {
        is_similar_conversation: true,
        similarity_score: 0.8,
        similarity_explanation: 'Very similar topic about weather and travel',
        previous_conversation_reference: 'conv-1',
        alternative_approach_suggestion: 'Focus on different aspect of travel'
      };

      mockLLMInstance.generateContent.mockResolvedValue({
        content: mockResponse
      });

      const result = await agent.checkConversationSimilarity(
        'Alice, shall we discuss our travel plans again?',
        mockConversationHistory,
        ['Alice', 'Bob']
      );

      expect(result).toEqual(mockResponse);
      expect(mockLLMInstance.generateContent).toHaveBeenCalledWith({
        userMessage: 'similarity check user message',
        systemInstruction: 'similarity check prompt',
        temperature: 0.1,
        model: GEMINI_MODELS.FLASH_THINKING_2_5,
        tryAutoFixJSONError: true,
        config: {
          responseSchema: expect.any(Object)
        }
      });
    });

    it('should handle partial responses correctly', async () => {
      const mockResponse: Partial<DialogueTrackingResponse> = {
        is_similar_conversation: false,
        similarity_score: 0.2,
        similarity_explanation: 'Different topics'
        // Missing optional fields
      };

      mockLLMInstance.generateContent.mockResolvedValue({
        content: mockResponse
      });

      const result = await agent.checkConversationSimilarity(
        'Alice, let\'s talk about the weather',
        mockConversationHistory,
        ['Alice', 'Bob']
      );

      expect(result).toEqual({
        is_similar_conversation: false,
        similarity_score: 0.2,
        similarity_explanation: 'Different topics',
        previous_conversation_reference: undefined,
        alternative_approach_suggestion: undefined
      });
    });

    it('should return fallback result when LLM response is invalid', async () => {
      const invalidResponse = {
        content: { invalid: 'response' }
      };

      mockLLMInstance.generateContent.mockResolvedValue(invalidResponse);

      const result = await agent.checkConversationSimilarity(
        'Alice, how are you?',
        mockConversationHistory,
        ['Alice', 'Bob']
      );

      expect(result).toEqual({
        is_similar_conversation: false,
        similarity_score: 0.0,
        similarity_explanation: 'Error occurred during similarity check'
      });
    });

    it('should handle LLM errors gracefully', async () => {
      mockLLMInstance.generateContent.mockRejectedValue(new Error('LLM Error'));

      const result = await agent.checkConversationSimilarity(
        'Alice, how are you?',
        mockConversationHistory,
        ['Alice', 'Bob']
      );

      expect(result).toEqual({
        is_similar_conversation: false,
        similarity_score: 0.0,
        similarity_explanation: 'Error occurred during similarity check'
      });
    });

    it('should filter conversations by participants correctly', async () => {
      const mockResponse: DialogueTrackingResponse = {
        is_similar_conversation: false,
        similarity_score: 0.1,
        similarity_explanation: 'Different context'
      };

      mockLLMInstance.generateContent.mockResolvedValue({
        content: mockResponse
      });

      // Only 'Alice' overlaps with existing conversations
      await agent.checkConversationSimilarity(
        'Alice, let\'s discuss something new',
        mockConversationHistory,
        ['Alice', 'David']
      );

      expect(mockLLMInstance.generateContent).toHaveBeenCalled();
      // Should have filtered to relevant conversations involving Alice
    });
  });

  describe('extractConversationSummary', () => {
    const gameStateId = 123;
    const temporalContext = 'Evening after dinner';

    it('should extract conversation summary successfully', async () => {
      const mockResponse: ConversationSummaryResponse = {
        conversation_id: 'conv-new-1',
        participants: ['Alice', 'Bob'],
        topics: ['quest', 'treasure'],
        key_points: ['Found ancient map', 'Planning expedition'],
        outcome: 'Decided to explore ruins together',
        game_state_id: gameStateId,
        temporal_context: temporalContext
      };

      mockLLMInstance.generateContent.mockResolvedValue({
        content: mockResponse
      });

      const storyContent = 'Alice showed Bob the ancient map. "We should explore these ruins together," she suggested.';

      const result = await agent.extractConversationSummary(
        storyContent,
        gameStateId,
        temporalContext
      );

      expect(result).toEqual({
        conversation_id: 'conv-new-1',
        participants: ['Alice', 'Bob'],
        topics: ['quest', 'treasure'],
        key_points: ['Found ancient map', 'Planning expedition'],
        outcome: 'Decided to explore ruins together',
        game_state_id: gameStateId,
        temporal_context: temporalContext
      });

      expect(mockLLMInstance.generateContent).toHaveBeenCalledWith({
        userMessage: 'extraction user message',
        systemInstruction: 'extraction prompt',
        temperature: 0.3,
        model: GEMINI_MODELS.FLASH_THINKING_2_5,
        tryAutoFixJSONError: true,
        config: {
          responseSchema: expect.any(Object)
        }
      });
    });

    it('should return null when no significant conversation found', async () => {
      const mockResponse: Partial<ConversationSummaryResponse> = {
        conversation_id: 'conv-none',
        participants: [], // Empty participants
        topics: [],
        key_points: [],
        outcome: 'No conversation',
        game_state_id: gameStateId
      };

      mockLLMInstance.generateContent.mockResolvedValue({
        content: mockResponse
      });

      const result = await agent.extractConversationSummary(
        'Alice walked down the empty hallway.',
        gameStateId,
        temporalContext
      );

      expect(result).toBeNull();
    });

    it('should return null when response is invalid', async () => {
      const invalidResponse = {
        content: null
      };

      mockLLMInstance.generateContent.mockResolvedValue(invalidResponse);

      const result = await agent.extractConversationSummary(
        'Some story content',
        gameStateId,
        temporalContext
      );

      expect(result).toBeNull();
    });

    it('should handle LLM errors gracefully', async () => {
      mockLLMInstance.generateContent.mockRejectedValue(new Error('LLM Error'));

      const result = await agent.extractConversationSummary(
        'Some story content',
        gameStateId,
        temporalContext
      );

      expect(result).toBeNull();
    });

    it('should work without temporal context', async () => {
      const mockResponse: ConversationSummaryResponse = {
        conversation_id: 'conv-no-temporal',
        participants: ['Alice'],
        topics: ['thoughts'],
        key_points: ['Reflecting on journey'],
        outcome: 'Gained clarity',
        game_state_id: gameStateId
      };

      mockLLMInstance.generateContent.mockResolvedValue({
        content: mockResponse
      });

      const result = await agent.extractConversationSummary(
        'Alice pondered her next move.',
        gameStateId
        // No temporal context provided
      );

      expect(result).toEqual({
        conversation_id: 'conv-no-temporal',
        participants: ['Alice'],
        topics: ['thoughts'],
        key_points: ['Reflecting on journey'],
        outcome: 'Gained clarity',
        game_state_id: gameStateId,
        temporal_context: undefined
      });
    });

    it('should validate required fields in response', async () => {
      const invalidResponses = [
        // Missing participants
        {
          conversation_id: 'conv-1',
          topics: ['test'],
          key_points: ['test'],
          outcome: 'test',
          game_state_id: gameStateId
        },
        // Empty participants
        {
          conversation_id: 'conv-1',
          participants: [],
          topics: ['test'],
          key_points: ['test'],
          outcome: 'test',
          game_state_id: gameStateId
        },
        // Missing topics
        {
          conversation_id: 'conv-1',
          participants: ['Alice'],
          key_points: ['test'],
          outcome: 'test',
          game_state_id: gameStateId
        },
        // Empty topics
        {
          conversation_id: 'conv-1',
          participants: ['Alice'],
          topics: [],
          key_points: ['test'],
          outcome: 'test',
          game_state_id: gameStateId
        }
      ];

      for (const invalidResponse of invalidResponses) {
        mockLLMInstance.generateContent.mockResolvedValue({
          content: invalidResponse
        });

        const result = await agent.extractConversationSummary(
          'Some story content',
          gameStateId,
          temporalContext
        );

        expect(result).toBeNull();
      }
    });
  });
});
