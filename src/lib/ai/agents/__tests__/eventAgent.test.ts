import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  EventAgent,
  type EventEvaluation,
  type CharacterChangedInto,
  type AbilitiesLearned,
  initialCharacterTransformState,
  initialEventEvaluationState
} from '../eventAgent';
import type { LLM } from '$lib/ai/llm';
import type { GameSettings } from '$lib/types/gameSettings';
import type { Ability } from '../characterStatsAgent';

// Mock the dependencies
vi.mock('$lib/ai/llmProvider');
vi.mock('$lib/ai/geminiProvider');

// Mock the prompt functions
vi.mock('../eventAgentPrompts', () => ({
  buildModernEventPrompt: vi.fn(),
  buildLegacyEventPrompt: vi.fn(),
  buildUserMessage: vi.fn(),
  getFallbackResponse: vi.fn()
}));

// Import the mocked functions
import {
  buildModernEventPrompt,
  buildLegacyEventPrompt,
  buildUserMessage,
  getFallbackResponse
} from '../eventAgentPrompts';

// Mock LLM instance
const mockLLMInstance = {
  generateContent: vi.fn()
};

describe('EventAgent', () => {
  let eventAgent: EventAgent;

  // Mock functions with proper types
  const mockBuildModernEventPrompt = buildModernEventPrompt as ReturnType<typeof vi.fn>;
  const mockBuildLegacyEventPrompt = buildLegacyEventPrompt as ReturnType<typeof vi.fn>;
  const mockBuildUserMessage = buildUserMessage as ReturnType<typeof vi.fn>;
  const mockGetFallbackResponse = getFallbackResponse as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    eventAgent = new EventAgent(mockLLMInstance as unknown as LLM);

    // Setup default mock implementations
    mockBuildModernEventPrompt.mockReturnValue('Modern event prompt');
    mockBuildLegacyEventPrompt.mockReturnValue('Legacy event prompt');
    mockBuildUserMessage.mockReturnValue('User message');
    mockGetFallbackResponse.mockReturnValue({
      event_evaluation: {
        character_changed: {
          changed_into: '',
          description: ''
        },
        abilities_learned: {
          abilities: []
        }
      },
      thoughts: 'Fallback thoughts'
    });
  });

  // Sample test data based on real API
  const sampleStoryHistory: string[] = [
    'A brave adventurer enters a magical forest and encounters ancient ruins.',
    'The hero discovers a mysterious artifact glowing with otherworldly power.',
    'After touching the artifact, strange energy courses through their veins.'
  ];

  const sampleCurrentAbilitiesNames: string[] = [
    'Sword Combat',
    'Basic Magic',
    'Tracking'
  ];

  const sampleGameSettings: GameSettings = {
    detailedNarrationLength: true,
    aiIntroducesSkills: false,
    randomEventsHandling: 'probability',
    generateAmbientDialogue: true,
    diceSimulationMode: 'auto'
  };

  describe('constructor and initialization', () => {
    it('should initialize with LLM instance', () => {
      expect(eventAgent).toBeDefined();
      expect(eventAgent.llm).toBe(mockLLMInstance);
    });

    it('should initialize with modern prompts disabled by default', () => {
      const modernEventAgent = new EventAgent(mockLLMInstance as unknown as LLM, true);
      expect(modernEventAgent).toBeDefined();
    });
  });

  describe('evaluateEvents', () => {
    it('should evaluate events with character transformation', async () => {
      const mockResponse = {
        content: {
          character_changed: {
            changed_into: 'Dragon Slayer',
            description: 'Transformed into a legendary dragon slayer after defeating the ancient wyrm'
          },
          abilities_learned: [
            {
              uniqueTechnicalId: 'dragon_breath_resistance',
              name: 'Dragon Breath Resistance',
              effect: 'Immune to dragon breath attacks',
              resource_cost: {
                resource_key: undefined,
                cost: 0
              }
            }
          ]
        },
        thoughts: 'The magical artifact has triggered a powerful transformation event.'
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      const result = await eventAgent.evaluateEvents(
        sampleStoryHistory,
        sampleCurrentAbilitiesNames,
        sampleGameSettings
      );

      expect(mockLLMInstance.generateContent).toHaveBeenCalledOnce();
      expect(result.thoughts).toBe('The magical artifact has triggered a powerful transformation event.');
      expect(result.event_evaluation.character_changed?.changed_into).toBe('Dragon Slayer');
      expect(result.event_evaluation.abilities_learned?.abilities).toHaveLength(1);
      expect(result.event_evaluation.abilities_learned?.abilities[0].name).toBe('Dragon Breath Resistance');
    });

    it('should evaluate events with only abilities learned', async () => {
      const mockResponse = {
        content: {
          character_changed: undefined,
          abilities_learned: [
            {
              uniqueTechnicalId: 'ancient_knowledge',
              name: 'Ancient Knowledge',
              effect: 'Gain insight into historical events',
              resource_cost: {
                resource_key: 'mp',
                cost: 3
              }
            },
            {
              uniqueTechnicalId: 'rune_reading',
              name: 'Rune Reading',
              effect: 'Understand ancient texts and symbols',
              resource_cost: {
                resource_key: undefined,
                cost: 0
              }
            }
          ]
        },
        usage: {
          thoughts: 'The hero has learned new abilities from the ancient runes.'
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      const result = await eventAgent.evaluateEvents(
        sampleStoryHistory,
        sampleCurrentAbilitiesNames,
        sampleGameSettings
      );

      expect(result.event_evaluation.character_changed?.changed_into).toBe('');
      expect(result.event_evaluation.abilities_learned?.abilities).toHaveLength(2);
      expect(result.event_evaluation.abilities_learned?.abilities[0].name).toBe('Ancient Knowledge');
      expect(result.event_evaluation.abilities_learned?.abilities[1].name).toBe('Rune Reading');
    });

    it('should handle no events detected', async () => {
      const mockResponse = {
        content: {
          character_changed: undefined,
          abilities_learned: []
        },
        thoughts: 'No significant events detected that would trigger character changes or new abilities.'
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      const result = await eventAgent.evaluateEvents(
        sampleStoryHistory,
        sampleCurrentAbilitiesNames,
        sampleGameSettings
      );

      expect(result.event_evaluation.character_changed?.changed_into).toBe('');
      expect(result.event_evaluation.abilities_learned?.abilities).toHaveLength(0);
      expect(result.thoughts).toContain('No significant events detected');
    });

    it('should retry on failure and eventually succeed', async () => {
      const error = new Error('Network timeout');
      const successResponse = {
        content: {
          character_changed: undefined,
          abilities_learned: []
        },
        thoughts: 'Success on retry'
      };

      mockLLMInstance.generateContent
        .mockRejectedValueOnce(error)
        .mockResolvedValue(successResponse);

      const result = await eventAgent.evaluateEvents(
        sampleStoryHistory,
        sampleCurrentAbilitiesNames,
        sampleGameSettings
      );

      expect(mockLLMInstance.generateContent).toHaveBeenCalledTimes(2);
      expect(result.thoughts).toBe('Success on retry');
    });

    it('should use fallback response on persistent failure', async () => {
      const error = new Error('Persistent failure');
      mockLLMInstance.generateContent.mockRejectedValue(error);

      const result = await eventAgent.evaluateEvents(
        sampleStoryHistory,
        sampleCurrentAbilitiesNames,
        sampleGameSettings
      );

      expect(mockLLMInstance.generateContent).toHaveBeenCalledTimes(2); // maxRetries
      expect(mockGetFallbackResponse).toHaveBeenCalledOnce();
      expect(result.thoughts).toBe('Fallback thoughts');
    });

    it('should use modern prompts when enabled', async () => {
      eventAgent.setModernPrompts(true);

      const mockResponse = {
        content: {
          character_changed: undefined,
          abilities_learned: []
        },
        usage: {
          thoughts: 'Modern prompt response'
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      await eventAgent.evaluateEvents(
        sampleStoryHistory,
        sampleCurrentAbilitiesNames,
        sampleGameSettings
      );

      expect(mockBuildModernEventPrompt).toHaveBeenCalledWith(
        sampleCurrentAbilitiesNames,
        sampleGameSettings
      );
      expect(mockBuildLegacyEventPrompt).not.toHaveBeenCalled();
    });

    it('should use legacy prompts by default', async () => {
      const mockResponse = {
        content: {
          character_changed: undefined,
          abilities_learned: []
        },
        usage: {
          thoughts: 'Legacy prompt response'
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      await eventAgent.evaluateEvents(
        sampleStoryHistory,
        sampleCurrentAbilitiesNames,
        sampleGameSettings
      );

      expect(mockBuildLegacyEventPrompt).toHaveBeenCalledWith(
        sampleCurrentAbilitiesNames,
        sampleGameSettings
      );
      expect(mockBuildModernEventPrompt).not.toHaveBeenCalled();
    });
  });

  describe('mapResponse', () => {
    it('should map response correctly', () => {
      const response = {
        character_changed: {
          changed_into: 'Wizard',
          description: 'Magical transformation'
        },
        abilities_learned: [
          {
            uniqueTechnicalId: 'fireball',
            name: 'Fireball',
            effect: 'Cast fireball spell'
          }
        ]
      };

      const result = eventAgent.mapResponse(response);

      expect(result.character_changed?.changed_into).toBe('Wizard');
      expect(result.abilities_learned?.abilities).toHaveLength(1);
      expect(result.abilities_learned?.abilities[0].name).toBe('Fireball');
    });
  });

  describe('mapEventResponse', () => {
    it('should handle response with character change', () => {
      const response = {
        character_changed: {
          changed_into: 'Paladin',
          description: 'Divine calling',
          aiProcessingComplete: true,
          showEventConfirmationDialog: false
        },
        abilities_learned: []
      };

      const result = eventAgent.mapEventResponse(response);

      expect(result.character_changed?.changed_into).toBe('Paladin');
      expect(result.abilities_learned?.abilities).toHaveLength(0);
    });

    it('should handle response without character change', () => {
      const response = {
        character_changed: undefined,
        abilities_learned: [
          {
            uniqueTechnicalId: 'stealth',
            name: 'Stealth',
            effect: 'Move unseen'
          }
        ]
      };

      const result = eventAgent.mapEventResponse(response);

      expect(result.character_changed).toEqual(initialCharacterTransformState);
      expect(result.abilities_learned?.abilities).toHaveLength(1);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle malformed LLM response', async () => {
      const malformedResponse = { content: 'invalid json' };
      mockLLMInstance.generateContent.mockResolvedValue(malformedResponse);

      const result = await eventAgent.evaluateEvents(
        sampleStoryHistory,
        sampleCurrentAbilitiesNames,
        sampleGameSettings
      );

      // Should fall back to default handling
      expect(result).toBeDefined();
    });

    it('should handle empty story history', async () => {
      const mockResponse = {
        content: {
          character_changed: undefined,
          abilities_learned: []
        },
        usage: {
          thoughts: 'No story to evaluate'
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      const result = await eventAgent.evaluateEvents(
        [],
        sampleCurrentAbilitiesNames,
        sampleGameSettings
      );

      expect(result).toBeDefined();
      expect(mockBuildUserMessage).toHaveBeenCalledWith([], 1);
    });

    it('should handle empty current abilities', async () => {
      const mockResponse = {
        content: {
          character_changed: undefined,
          abilities_learned: []
        },
        usage: {
          thoughts: 'No existing abilities'
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      const result = await eventAgent.evaluateEvents(
        sampleStoryHistory,
        [],
        sampleGameSettings
      );

      expect(result).toBeDefined();
    });
  });
});
