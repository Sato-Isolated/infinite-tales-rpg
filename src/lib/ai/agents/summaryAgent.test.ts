import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SummaryAgent, type RelatedStoryHistory } from './summaryAgent';
import type { LLM, LLMMessage } from '../llm';
import type { GameActionState } from '$lib/types/gameState';
import type { SummaryResponse, RelatedHistoryResponse } from '$lib/ai/config/ResponseSchemas';
import { GEMINI_MODELS } from '../geminiProvider';

// Mock dependencies
const mockLLMInstance = {
  generateContent: vi.fn()
};

// Mock the utility function
vi.mock('$lib/util.svelte', () => ({
  stringifyPretty: vi.fn((obj) => JSON.stringify(obj, null, 2))
}));

describe('SummaryAgent', () => {
  let agent: SummaryAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new SummaryAgent(mockLLMInstance as unknown as LLM);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with LLM instance', () => {
      expect(agent.llm).toBe(mockLLMInstance);
    });
  });

  describe('summarizeStoryIfTooLong', () => {
    const createMockHistoryMessages = (count: number): LLMMessage[] => {
      const messages: LLMMessage[] = [];
      for (let i = 0; i < count; i++) {
        messages.push({
          role: i % 2 === 0 ? 'user' : 'model',
          content: `Message ${i + 1} content`
        });
      }
      return messages;
    };

    it('should return original history when not too long', async () => {
      const shortHistory = createMockHistoryMessages(10); // Less than default 24

      const result = await agent.summarizeStoryIfTooLong(shortHistory);

      expect(result).toEqual({
        newHistory: shortHistory,
        summary: ''
      });
      expect(mockLLMInstance.generateContent).not.toHaveBeenCalled();
    });

    it('should summarize when history is too long', async () => {
      const longHistory = createMockHistoryMessages(30); // More than default 24
      const mockSummaryResponse: SummaryResponse = {
        keyDetails: ['Character met wizard', 'Found magic sword', 'Defeated dragon'],
        story: 'A comprehensive summary of the adventure so far including dialogue and character development.'
      };

      mockLLMInstance.generateContent.mockResolvedValue({
        content: mockSummaryResponse
      });

      const result = await agent.summarizeStoryIfTooLong(longHistory);

      expect(result.summary).toBe(mockSummaryResponse.story);
      expect(result.newHistory).toHaveLength(9); // 2 first + 1 summary + 6 last messages
      expect(result.newHistory[2]).toEqual({
        role: 'model',
        content: JSON.stringify(mockSummaryResponse)
      });

      expect(mockLLMInstance.generateContent).toHaveBeenCalledWith({
        userMessage: expect.stringContaining('Summarize the following story:'),
        systemInstruction: expect.stringContaining('Summary Agent for a RPG adventure'),
        temperature: 1,
        model: GEMINI_MODELS.FLASH_THINKING_2_5,
        config: {
          responseSchema: expect.any(Object)
        }
      });
    });

    it('should use custom parameters', async () => {
      const longHistory = createMockHistoryMessages(20);
      const mockSummaryResponse: SummaryResponse = {
        keyDetails: ['Key event'],
        story: 'Custom summary'
      };

      mockLLMInstance.generateContent.mockResolvedValue({
        content: mockSummaryResponse
      });

      const result = await agent.summarizeStoryIfTooLong(
        longHistory,
        15, // startSummaryAtSize
        2 * 2 // numOfLastActions (2 actions = 4 messages)
      );

      expect(result.newHistory).toHaveLength(7); // 2 first + 1 summary + 4 last messages
      expect(mockLLMInstance.generateContent).toHaveBeenCalled();
    });

    it('should handle null response gracefully', async () => {
      const longHistory = createMockHistoryMessages(30);

      mockLLMInstance.generateContent.mockResolvedValue({
        content: null
      });

      const result = await agent.summarizeStoryIfTooLong(longHistory);

      expect(result).toEqual({
        newHistory: longHistory,
        summary: ''
      });
    });

    it('should handle LLM errors gracefully', async () => {
      const longHistory = createMockHistoryMessages(30);

      mockLLMInstance.generateContent.mockRejectedValue(new Error('LLM Error'));

      await expect(agent.summarizeStoryIfTooLong(longHistory)).rejects.toThrow('LLM Error');
    });

    it('should preserve dialogue context in summary instructions', async () => {
      const longHistory = createMockHistoryMessages(30);
      const mockSummaryResponse: SummaryResponse = {
        keyDetails: ['Dialogue preserved'],
        story: 'Summary with dialogue'
      };

      mockLLMInstance.generateContent.mockResolvedValue({
        content: mockSummaryResponse
      });

      await agent.summarizeStoryIfTooLong(longHistory);

      const call = mockLLMInstance.generateContent.mock.calls[0][0];
      expect(call.systemInstruction).toContain('DIALOGUE MEMORY PRESERVATION');
      expect(call.systemInstruction).toContain('preserve important dialogue context');
      expect(call.systemInstruction).toContain('temporal context');
    });
  });

  describe('retrieveRelatedHistory', () => {
    const createMockGameStates = (count: number): GameActionState[] => {
      const states: GameActionState[] = [];
      for (let i = 0; i < count; i++) {
        states.push({
          id: i + 1,
          currentPlotPoint: `Plot point ${i + 1}`,
          nextPlotPoint: `Next plot point ${i + 1}`,
          story: `Story content ${i + 1}`,
          inventory_update: [],
          stats_update: [],
          is_character_in_combat: false,
          currently_present_npcs: { hostile: [], friendly: [], neutral: [] },
          story_memory_explanation: i % 3 === 0 ? 'HIGH importance' : 'MEDIUM importance'
        });
      }
      return states;
    };

    it('should return empty details when too few states and no additional history', async () => {
      const fewStates = createMockGameStates(3); // Less than 5

      const result = await agent.retrieveRelatedHistory(
        'Current story progression',
        fewStates
      );

      expect(result).toEqual({ relatedDetails: [] });
      expect(mockLLMInstance.generateContent).not.toHaveBeenCalled();
    });

    it('should process when enough states exist', async () => {
      const manyStates = createMockGameStates(10); // More than 5
      const mockRelatedResponse: RelatedHistoryResponse = {
        relatedDetails: [
          {
            storyReference: 'Character met the wizard in the forest',
            relevanceScore: 0.9
          },
          {
            storyReference: 'Found ancient map in the ruins',
            relevanceScore: 0.7
          }
        ]
      };

      mockLLMInstance.generateContent.mockResolvedValue({
        content: mockRelatedResponse
      });

      const result = await agent.retrieveRelatedHistory(
        'Looking for the wizard again',
        manyStates
      );

      expect(result).toEqual(mockRelatedResponse);
      expect(mockLLMInstance.generateContent).toHaveBeenCalledWith({
        userMessage: 'STORY PROGRESSION:\nLooking for the wizard again',
        systemInstruction: expect.stringContaining('Scan the FULL STORY HISTORY'),
        historyMessages: expect.arrayContaining([
          expect.objectContaining({
            role: 'model',
            content: expect.stringContaining('Story content')
          })
        ]),
        model: GEMINI_MODELS.FLASH_THINKING_2_5,
        temperature: 0.1,
        config: {
          responseSchema: expect.any(Object)
        }
      });
    });

    it('should process with additional history even with few states', async () => {
      const fewStates = createMockGameStates(3);
      const additionalHistory = ['Additional context 1', 'Additional context 2'];
      const mockRelatedResponse: RelatedHistoryResponse = {
        relatedDetails: [
          {
            storyReference: 'From additional context',
            relevanceScore: 0.8
          }
        ]
      };

      mockLLMInstance.generateContent.mockResolvedValue({
        content: mockRelatedResponse
      });

      const result = await agent.retrieveRelatedHistory(
        'Current progression',
        fewStates,
        3,
        additionalHistory
      );

      expect(result).toEqual(mockRelatedResponse);
      expect(mockLLMInstance.generateContent).toHaveBeenCalled();

      const call = mockLLMInstance.generateContent.mock.calls[0][0];
      expect(call.historyMessages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'model',
            content: 'Additional context 1'
          }),
          expect.objectContaining({
            role: 'model',
            content: 'Additional context 2'
          })
        ])
      );
    });

    it('should filter game states by relevance correctly', async () => {
      const states = createMockGameStates(15);
      // Modify some states to have different memory importance
      states[5].story_memory_explanation = 'LOW importance';
      states[10].story_memory_explanation = 'NO importance';

      const mockRelatedResponse: RelatedHistoryResponse = {
        relatedDetails: []
      };

      mockLLMInstance.generateContent.mockResolvedValue({
        content: mockRelatedResponse
      });

      await agent.retrieveRelatedHistory(
        'Current progression',
        states
      );

      const call = mockLLMInstance.generateContent.mock.calls[0][0];
      const historyMessages = call.historyMessages;

      // Should include recent states (within last 5) and older states with HIGH/MEDIUM importance
      expect(historyMessages.length).toBeGreaterThan(0);
      expect(historyMessages.every((msg: LLMMessage) => msg.role === 'model')).toBe(true);
    });

    it('should handle response without relatedDetails', async () => {
      const states = createMockGameStates(10);
      const mockRelatedResponse = {} as RelatedHistoryResponse; // Missing relatedDetails

      mockLLMInstance.generateContent.mockResolvedValue({
        content: mockRelatedResponse
      });

      const result = await agent.retrieveRelatedHistory(
        'Current progression',
        states
      );

      expect(result).toEqual({ relatedDetails: [] });
    });

    it('should handle LLM errors gracefully', async () => {
      const states = createMockGameStates(10);

      mockLLMInstance.generateContent.mockRejectedValue(new Error('LLM Error'));

      await expect(agent.retrieveRelatedHistory(
        'Current progression',
        states
      )).rejects.toThrow('LLM Error');
    });

    it('should include dialogue relevance instructions', async () => {
      const states = createMockGameStates(10);
      const mockRelatedResponse: RelatedHistoryResponse = {
        relatedDetails: []
      };

      mockLLMInstance.generateContent.mockResolvedValue({
        content: mockRelatedResponse
      });

      await agent.retrieveRelatedHistory(
        'Character conversation progression',
        states
      );

      const call = mockLLMInstance.generateContent.mock.calls[0][0];
      expect(call.systemInstruction).toContain('DIALOGUE RELEVANCE PRIORITY');
      expect(call.systemInstruction).toContain('previous conversations that relate to current character interactions');
      expect(call.systemInstruction).toContain('BOOST SCORES FOR DIALOGUE RELEVANCE');
    });

    it('should use custom maxRelatedDetails parameter', async () => {
      const states = createMockGameStates(10);
      const mockRelatedResponse: RelatedHistoryResponse = {
        relatedDetails: [
          { storyReference: 'ref1', relevanceScore: 0.9 },
          { storyReference: 'ref2', relevanceScore: 0.8 },
          { storyReference: 'ref3', relevanceScore: 0.7 },
          { storyReference: 'ref4', relevanceScore: 0.6 },
          { storyReference: 'ref5', relevanceScore: 0.5 }
        ]
      };

      mockLLMInstance.generateContent.mockResolvedValue({
        content: mockRelatedResponse
      });

      const result = await agent.retrieveRelatedHistory(
        'Current progression',
        states,
        5 // maxRelatedDetails
      );

      expect(result.relatedDetails).toHaveLength(5);
      expect(mockLLMInstance.generateContent).toHaveBeenCalled();
    });

    it('should handle empty additional history gracefully', async () => {
      const states = createMockGameStates(10);
      const mockRelatedResponse: RelatedHistoryResponse = {
        relatedDetails: []
      };

      mockLLMInstance.generateContent.mockResolvedValue({
        content: mockRelatedResponse
      });

      const result = await agent.retrieveRelatedHistory(
        'Current progression',
        states,
        3,
        [] // Empty additional history
      );

      expect(result).toEqual(mockRelatedResponse);
      expect(mockLLMInstance.generateContent).toHaveBeenCalled();
    });
  });
});
