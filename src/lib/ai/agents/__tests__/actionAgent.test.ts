import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionAgent } from '../actionAgent';
import type { LLM, LLMMessage } from '$lib/ai/llm';
import type { CharacterDescription } from '../characterAgent';
import type { CharacterStats } from '../characterStatsAgent';
import type { Story } from '../storyAgent';
import type { Action } from '$lib/types/playerAction';
import type { GameActionState } from '$lib/types/gameState';
import type { GameSettings } from '$lib/types/gameSettings';
import type { InventoryState, Item } from '$lib/types/inventory';

// Mock the dependencies
vi.mock('$lib/ai/llmProvider');
vi.mock('$lib/ai/geminiProvider');

// Mock LLM instance
const mockLLMInstance = {
  generateContent: vi.fn()
};

describe('ActionAgent', () => {
  let actionAgent: ActionAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    actionAgent = new ActionAgent(mockLLMInstance as unknown as LLM);
  });

  // Sample test data
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

  const sampleStats: CharacterStats = {
    level: 1,
    resources: {
      hp: { max_value: 100, start_value: 100, game_ends_when_zero: true },
      mp: { max_value: 50, start_value: 50, game_ends_when_zero: false }
    },
    attributes: {
      strength: 80,
      dexterity: 70,
      constitution: 100,
      intelligence: 60,
      wisdom: 75,
      charisma: 65
    },
    skills: {
      combat: 5,
      stealth: 3,
      magic: 2
    },
    spells_and_abilities: []
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

  const sampleGameSettings: GameSettings = {
    detailedNarrationLength: true,
    aiIntroducesSkills: false,
    randomEventsHandling: 'probability',
    generateAmbientDialogue: true,
    diceSimulationMode: 'auto'
  };

  const sampleInventory: InventoryState = {};

  const sampleGameActionState: GameActionState = {
    id: 1,
    currentPlotPoint: 'The hero stands at the village entrance',
    nextPlotPoint: 'The hero will enter the tavern',
    story: 'A brave adventurer arrives at a small village seeking information',
    inventory_update: [],
    stats_update: [],
    is_character_in_combat: false,
    currently_present_npcs: {
      hostile: [],
      friendly: [],
      neutral: []
    },
    story_memory_explanation: 'First visit to this village'
  };

  const sampleAction: Action = {
    characterName: 'Test Hero',
    text: 'Attack with sword',
    is_possible: true,
    type: 'combat'
  };

  const sampleMessages: LLMMessage[] = [
    {
      role: 'user',
      content: 'What should I do next?'
    }
  ];

  describe('generateActions', () => {
    it('should generate a list of possible actions', async () => {
      const mockResponse = {
        content: {
          actions: [
            {
              characterName: 'Test Hero',
              text: 'Attack with sword',
              is_possible: true,
              type: 'combat'
            },
            {
              characterName: 'Test Hero',
              text: 'Look around',
              is_possible: true,
              type: 'exploration'
            },
            {
              characterName: 'Test Hero',
              text: 'Cast magic missile',
              is_possible: false,
              type: 'magic'
            }
          ],
          thoughts: 'Generated combat and exploration actions for the current situation.'
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      const result = await actionAgent.generateActions(
        sampleGameActionState,
        sampleMessages,
        sampleStory,
        sampleCharacter,
        sampleStats,
        sampleInventory,
        sampleGameSettings
      );

      expect(mockLLMInstance.generateContent).toHaveBeenCalledOnce();
      expect(result.actions).toHaveLength(3);
      expect(result.actions.map(a => a.text)).toContain('Attack with sword');
      expect(result.actions.map(a => a.text)).toContain('Look around');
      expect(result.actions.some(a => a.is_possible === false)).toBe(true);
    });

    it('should handle empty character stats gracefully', async () => {
      const emptyStats: CharacterStats = {
        level: 0,
        resources: {},
        attributes: {},
        skills: {},
        spells_and_abilities: []
      };

      const mockResponse = {
        content: {
          actions: [
            {
              characterName: 'Test Hero',
              text: 'Look around',
              is_possible: true,
              type: 'exploration'
            }
          ],
          thoughts: 'Limited actions due to low character stats.'
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      const result = await actionAgent.generateActions(
        sampleGameActionState,
        sampleMessages,
        sampleStory,
        sampleCharacter,
        emptyStats,
        sampleInventory,
        sampleGameSettings
      );

      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('exploration');
    });

    it('should handle LLM errors properly', async () => {
      const error = new Error('LLM generation failed');
      mockLLMInstance.generateContent.mockRejectedValue(error);

      await expect(actionAgent.generateActions(
        sampleGameActionState,
        sampleMessages,
        sampleStory,
        sampleCharacter,
        sampleStats,
        sampleInventory,
        sampleGameSettings
      )).rejects.toThrow('LLM generation failed');
    });
  });

  describe('generateSingleAction', () => {
    it('should generate a single action based on description', async () => {
      const mockResponse = {
        content: {
          characterName: 'Test Hero',
          text: 'Swing sword at the goblin',
          is_possible: true,
          type: 'combat',
          difficulty_explanation: 'Easy target within range'
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      const result = await actionAgent.generateSingleAction(
        sampleAction,
        sampleGameActionState,
        sampleMessages,
        sampleStory,
        sampleCharacter,
        sampleStats,
        sampleInventory,
        sampleGameSettings
      );

      expect(mockLLMInstance.generateContent).toHaveBeenCalledOnce();
      expect(result.text).toBe('Swing sword at the goblin');
      expect(result.is_possible).toBe(true);
      expect(result.type).toBe('combat');
    });

    it('should handle impossible actions', async () => {
      const impossibleAction: Action = {
        characterName: 'Test Hero',
        text: 'Cast fireball',
        is_possible: false,
        type: 'magic'
      };

      const mockResponse = {
        content: {
          characterName: 'Test Hero',
          text: 'Try to cast fireball',
          is_possible: false,
          type: 'magic',
          difficulty_explanation: 'Character has no magic abilities'
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      const result = await actionAgent.generateSingleAction(
        impossibleAction,
        sampleGameActionState,
        sampleMessages,
        sampleStory,
        sampleCharacter,
        sampleStats,
        sampleInventory,
        sampleGameSettings
      );

      expect(result.is_possible).toBe(false);
      expect(result.difficulty_explanation).toContain('no magic abilities');
    });

    it('should handle empty action description', async () => {
      const emptyAction: Action = {
        characterName: 'Test Hero',
        text: '',
        is_possible: true,
        type: 'wait'
      };

      const mockResponse = {
        content: {
          characterName: 'Test Hero',
          text: 'Stand still and observe',
          is_possible: true,
          type: 'wait',
          difficulty_explanation: 'Always possible'
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      const result = await actionAgent.generateSingleAction(
        emptyAction,
        sampleGameActionState,
        sampleMessages,
        sampleStory,
        sampleCharacter,
        sampleStats,
        sampleInventory,
        sampleGameSettings
      );

      expect(result.is_possible).toBe(true);
      expect(result.type).toBe('wait');
    });
  });

  describe('constructor and initialization', () => {
    it('should initialize with LLM instance', () => {
      expect(actionAgent).toBeDefined();
      expect(actionAgent.llm).toBe(mockLLMInstance);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle malformed LLM responses', async () => {
      const malformedResponse = null;
      mockLLMInstance.generateContent.mockResolvedValue(malformedResponse);

      await expect(actionAgent.generateActions(
        sampleGameActionState,
        sampleMessages,
        sampleStory,
        sampleCharacter,
        sampleStats,
        sampleInventory,
        sampleGameSettings
      )).rejects.toThrow();
    });

    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Network timeout');
      mockLLMInstance.generateContent.mockRejectedValue(timeoutError);

      await expect(actionAgent.generateSingleAction(
        sampleAction,
        sampleGameActionState,
        sampleMessages,
        sampleStory,
        sampleCharacter,
        sampleStats,
        sampleInventory,
        sampleGameSettings
      )).rejects.toThrow('Network timeout');
    });
  });

  describe('action validation', () => {
    it('should validate action possibility based on character stats', async () => {
      const lowStats: CharacterStats = {
        level: 1,
        resources: {
          hp: { max_value: 10, start_value: 5, game_ends_when_zero: true },
          mp: { max_value: 0, start_value: 0, game_ends_when_zero: false }
        },
        attributes: {
          strength: 20,
          magic: 0
        },
        skills: {},
        spells_and_abilities: []
      };

      const magicAction: Action = {
        characterName: 'Test Hero',
        text: 'Cast lightning bolt',
        is_possible: false,
        type: 'magic'
      };

      const mockResponse = {
        content: {
          characterName: 'Test Hero',
          text: 'Cast lightning bolt',
          is_possible: false,
          type: 'magic',
          difficulty_explanation: 'No magic power available'
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      const result = await actionAgent.generateSingleAction(
        magicAction,
        sampleGameActionState,
        sampleMessages,
        sampleStory,
        sampleCharacter,
        lowStats,
        sampleInventory,
        sampleGameSettings
      );

      expect(result.is_possible).toBe(false);
      expect(result.difficulty_explanation).toContain('No magic');
    });

    it('should consider inventory items for action possibilities', async () => {
      const inventoryWithWeapon: InventoryState = {
        magic_staff: {
          description: 'A powerful magic staff',
          effect: 'Enables spell casting'
        }
      };

      const magicAction: Action = {
        characterName: 'Test Hero',
        text: 'Cast magic missile',
        is_possible: true,
        type: 'magic'
      };

      const mockResponse = {
        content: {
          characterName: 'Test Hero',
          text: 'Cast magic missile using staff',
          is_possible: true,
          type: 'magic',
          difficulty_explanation: 'Staff enables magic use'
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      const result = await actionAgent.generateSingleAction(
        magicAction,
        sampleGameActionState,
        sampleMessages,
        sampleStory,
        sampleCharacter,
        sampleStats,
        inventoryWithWeapon,
        sampleGameSettings
      );

      expect(result.is_possible).toBe(true);
      expect(result.text).toContain('using staff');
    });
  });

  describe('helper methods', () => {
    it('should handle restraining state prompt generation', () => {
      const restrainingState = 'Character is tied up';
      const prompt = actionAgent.getRestrainingStatePrompt(restrainingState);
      expect(prompt).toContain(restrainingState);
    });

    it('should add restraining state to agent instructions', () => {
      const agent: string[] = ['Initial instruction'];
      const restrainingState = 'Character is exhausted';

      actionAgent.addRestrainingStateToAgent(agent, restrainingState);

      expect(agent.length).toBeGreaterThan(1);
    });

    it('should handle additional action input in user message', () => {
      const baseMessage = 'Base message';
      const additionalInput = 'Additional context';

      const result = actionAgent.addAdditionalActionInputToUserMessage(baseMessage, additionalInput);

      expect(result).toContain(baseMessage);
      expect(result).toContain(additionalInput);
    });
  });
});

