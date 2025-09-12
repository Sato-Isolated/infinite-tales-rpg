import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameAgent } from '../gameAgent';
import type { LLM, LLMMessage } from '$lib/ai/llm';
import type { CharacterDescription } from '../characterAgent';
import type { Story } from '../storyAgent';
import type { Action } from '$lib/types/playerAction';
import type { GameSettings } from '$lib/types/gameSettings';
import type { InventoryState } from '$lib/types/inventory';
import type { PlayerCharactersGameState } from '$lib/types/players';
import type { NPCState } from '../characterStatsAgent';

// Mock the dependencies
vi.mock('$lib/ai/llmProvider');
vi.mock('$lib/ai/geminiProvider');

// Mock LLM instance
const mockLLMInstance = {
  generateContentStream: vi.fn(),
  generateContent: vi.fn()
};

describe('GameAgent', () => {
  let gameAgent: GameAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    gameAgent = new GameAgent(mockLLMInstance as unknown as LLM);
  });

  // Sample test data based on real interfaces
  const sampleCharacter: CharacterDescription = {
    name: 'Test Hero',
    class: 'Fighter',
    race: 'Human',
    gender: 'Male',
    appearance: 'A brave adventurer',
    alignment: 'Lawful Good',
    personality: 'Courageous and loyal',
    background: 'Born in a small village',
    motivation: 'Protect the innocent'
  };

  const sampleStory: Story = {
    game: 'Dungeons & Dragons',
    world_details: 'A magical realm filled with adventure',
    story_pace: 'balanced',
    main_scenario: 'Save the kingdom from an ancient evil',
    character_simple_description: 'A brave hero',
    theme: 'High Fantasy',
    tonality: 'Epic',
    background_context: 'Ancient kingdoms and magical creatures',
    social_dynamics: 'Noble courts and commoner relationships',
    locations: 'Castle, tavern, forest',
    npcs: 'King, tavern keeper, wise sage',
    story_catalyst: 'Dark forces threaten the land',
    potential_developments: 'Discovery of ancient artifacts',
    narrative_flexibility: 'Can shift between action and dialogue',
    player_agency: 'Player choices shape the story',
    content_rating: 'safe',
    tags: 'fantasy, adventure, heroic, magic'
  };

  const sampleAction: Action = {
    characterName: 'Test Hero',
    text: 'Attack with sword'
  };

  const sampleGameSettings: GameSettings = {
    detailedNarrationLength: true,
    aiIntroducesSkills: false,
    randomEventsHandling: 'probability',
    generateAmbientDialogue: true,
    diceSimulationMode: 'auto'
  };

  const sampleInventory: InventoryState = {};

  const samplePlayerCharacters: PlayerCharactersGameState = {
    'test-character': {
      hp: { current_value: 100, max_value: 100, game_ends_when_zero: true },
      mp: { current_value: 50, max_value: 50, game_ends_when_zero: false }
    }
  };

  const sampleNPCState: NPCState = {};
  const sampleHistoryMessages: LLMMessage[] = [];
  const sampleRelatedHistory: string[] = [];

  describe('generateStoryProgression', () => {
    it('should call LLM generateContentStream with proper parameters', async () => {
      const mockStoryCallback = vi.fn();
      const mockThoughtCallback = vi.fn();

      // Mock the LLM response
      const mockResponse = {
        story: 'The hero swings their sword with determination.',
        xp_gain: 10,
        inventory_update: [],
        stats_update: [],
        image_prompt: 'A hero attacking with a sword'
      };

      mockLLMInstance.generateContentStream.mockResolvedValue(mockResponse);

      const result = await gameAgent.generateStoryProgression(
        mockStoryCallback,
        mockThoughtCallback,
        sampleAction,
        '', // additionalStoryInput
        '', // customSystemInstruction
        '', // customStoryAgentInstruction
        '', // customCombatAgentInstruction
        sampleHistoryMessages,
        sampleStory,
        sampleCharacter,
        samplePlayerCharacters,
        sampleInventory,
        sampleNPCState,
        sampleRelatedHistory,
        sampleGameSettings
      );

      expect(mockLLMInstance.generateContentStream).toHaveBeenCalledOnce();
      expect(result).toHaveProperty('newState');
      expect(result).toHaveProperty('updatedHistoryMessages');
    });

    it('should handle empty action text gracefully', async () => {
      const mockStoryCallback = vi.fn();
      const mockThoughtCallback = vi.fn();

      const emptyAction: Action = {
        characterName: 'Test Hero',
        text: ''
      };

      const mockResponse = {
        story: 'Something happened...',
        xp_gain: 0,
        inventory_update: [],
        stats_update: [],
        image_prompt: 'A generic scene'
      };

      mockLLMInstance.generateContentStream.mockResolvedValue(mockResponse);

      const result = await gameAgent.generateStoryProgression(
        mockStoryCallback,
        mockThoughtCallback,
        emptyAction,
        '',
        '',
        '',
        '',
        sampleHistoryMessages,
        sampleStory,
        sampleCharacter,
        samplePlayerCharacters,
        sampleInventory,
        sampleNPCState,
        sampleRelatedHistory,
        sampleGameSettings
      );

      expect(result).toBeDefined();
      expect(mockLLMInstance.generateContentStream).toHaveBeenCalledOnce();
    });

    it('should handle LLM errors properly', async () => {
      const mockStoryCallback = vi.fn();
      const mockThoughtCallback = vi.fn();

      const error = new Error('LLM generation failed');
      mockLLMInstance.generateContentStream.mockRejectedValue(error);

      await expect(gameAgent.generateStoryProgression(
        mockStoryCallback,
        mockThoughtCallback,
        sampleAction,
        '',
        '',
        '',
        '',
        sampleHistoryMessages,
        sampleStory,
        sampleCharacter,
        samplePlayerCharacters,
        sampleInventory,
        sampleNPCState,
        sampleRelatedHistory,
        sampleGameSettings
      )).rejects.toThrow('LLM generation failed');
    });
  });

  describe('constructor and initialization', () => {
    it('should initialize with LLM instance', () => {
      expect(gameAgent).toBeDefined();
      expect(gameAgent.llm).toBe(mockLLMInstance);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty history messages', async () => {
      const mockStoryCallback = vi.fn();
      const mockThoughtCallback = vi.fn();

      const mockResponse = {
        story: 'test',
        xp_gain: 0,
        inventory_update: [],
        stats_update: [],
        image_prompt: 'test'
      };
      mockLLMInstance.generateContentStream.mockResolvedValue(mockResponse);

      const result = await gameAgent.generateStoryProgression(
        mockStoryCallback,
        mockThoughtCallback,
        sampleAction,
        '',
        '',
        '',
        '',
        [], // empty history
        sampleStory,
        sampleCharacter,
        samplePlayerCharacters,
        sampleInventory,
        sampleNPCState,
        [], // empty related history
        sampleGameSettings
      );

      expect(result).toBeDefined();
    });
  });
});

