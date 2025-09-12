import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CombatAgent, type StatsUpdate, type DiceRoll } from '../combatAgent';
import type { LLM, LLMMessage } from '$lib/ai/llm';
import type { Action } from '$lib/types/playerAction';
import type { InventoryState } from '$lib/types/inventory';
import type { PlayerCharactersGameState } from '$lib/types/players';
import type { ResourcesWithCurrentValue } from '$lib/types/resources';
import type { GameSettings } from '$lib/types/gameSettings';
import type { Story } from '../storyAgent';

// Mock the dependencies
vi.mock('$lib/ai/llmProvider');
vi.mock('$lib/ai/geminiProvider');

// Mock LLM instance
const mockLLMInstance = {
  generateContent: vi.fn()
};

describe('CombatAgent', () => {
  let combatAgent: CombatAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    combatAgent = new CombatAgent(mockLLMInstance as unknown as LLM);
  });

  // Sample test data
  const sampleAction: Action = {
    characterName: 'Hero',
    text: 'Attack with sword',
    is_possible: true,
    type: 'combat'
  };

  const samplePlayerResources: ResourcesWithCurrentValue = {
    hp: { max_value: 100, current_value: 80, game_ends_when_zero: true },
    mp: { max_value: 50, current_value: 30, game_ends_when_zero: false }
  };

  const sampleInventory: InventoryState = {
    sword: {
      description: 'A sharp blade',
      effect: 'Increases attack damage'
    }
  };

  const sampleNPCs = [
    { id: 'goblin1', name: 'Goblin Warrior', hp: 25 },
    { id: 'goblin2', name: 'Goblin Archer', hp: 20 }
  ];

  const sampleStory: Story = {
    game: 'Dungeons & Dragons',
    world_details: 'A dangerous dungeon',
    story_pace: 'action-packed',
    main_scenario: 'Clear the goblin nest',
    character_simple_description: 'A brave warrior',
    theme: 'High Fantasy',
    tonality: 'Epic',
    background_context: 'Ancient dungeons filled with monsters',
    social_dynamics: 'Combat encounters',
    locations: 'Underground caverns',
    npcs: 'Goblins, orcs, dragons',
    story_catalyst: 'Monsters threaten the village',
    potential_developments: 'Bigger threats await deeper',
    narrative_flexibility: 'Action-focused encounters',
    player_agency: 'Combat choices matter',
    content_rating: 'safe',
    tags: 'fantasy, combat, adventure'
  };

  const sampleGameSettings: GameSettings = {
    detailedNarrationLength: true,
    aiIntroducesSkills: false,
    randomEventsHandling: 'probability',
    generateAmbientDialogue: false,
    diceSimulationMode: 'auto'
  };

  const sampleMessages: LLMMessage[] = [
    {
      role: 'user',
      content: 'I attack the goblin!'
    }
  ];

  const samplePlayerCharactersGameState: PlayerCharactersGameState = {
    'hero': {
      hp: { max_value: 100, current_value: 80, game_ends_when_zero: true },
      mp: { max_value: 50, current_value: 30, game_ends_when_zero: false }
    }
  };

  describe('generateActionsFromContext', () => {
    it('should generate combat response with damage dealt', async () => {
      const mockResponse = {
        content: {
          actions: [
            {
              sourceId: 'hero',
              targetId: 'goblin1',
              text: 'Sword attack',
              explanation: 'Critical hit with sword'
            }
          ],
          stats_update: [
            {
              sourceName: 'Hero',
              targetName: 'Goblin Warrior',
              value: {
                result: 15,
                number: 1,
                type: 20,
                modifier: 5,
                rolls: [10]
              },
              type: 'damage'
            }
          ]
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      const result = await combatAgent.generateActionsFromContext(
        sampleAction,
        samplePlayerResources,
        sampleInventory,
        sampleNPCs,
        '',
        '',
        sampleMessages,
        sampleStory,
        sampleGameSettings,
        'balanced'
      );

      expect(mockLLMInstance.generateContent).toHaveBeenCalledOnce();
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].text).toBe('Sword attack');
      expect(result.stats_update).toHaveLength(1);
      expect(result.stats_update[0].type).toBe('damage');
      expect(result.stats_update[0].value).toEqual({
        result: 15,
        number: 1,
        type: 20,
        modifier: 5,
        rolls: [10]
      });
    });

    it('should handle healing abilities', async () => {
      const healingAction: Action = {
        characterName: 'Cleric',
        text: 'Cast cure light wounds',
        is_possible: true,
        type: 'magic'
      };

      const mockResponse = {
        content: {
          actions: [
            {
              sourceId: 'cleric',
              targetId: 'hero',
              text: 'Cure light wounds',
              explanation: 'Divine healing spell'
            }
          ],
          stats_update: [
            {
              sourceName: 'Cleric',
              targetName: 'Hero',
              value: {
                result: 12,
                number: 2,
                type: 6,
                modifier: 2,
                rolls: [4, 6]
              },
              type: 'healing'
            }
          ]
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      const result = await combatAgent.generateActionsFromContext(
        healingAction,
        samplePlayerResources,
        sampleInventory,
        sampleNPCs,
        '',
        '',
        sampleMessages,
        sampleStory,
        sampleGameSettings,
        'balanced'
      );

      expect(result.actions[0].text).toBe('Cure light wounds');
      expect(result.stats_update[0].type).toBe('healing');
      expect(result.stats_update[0].value).toEqual({
        result: 12,
        number: 2,
        type: 6,
        modifier: 2,
        rolls: [4, 6]
      });
    });

    it('should handle multiple targets in area attacks', async () => {
      const aoeAction: Action = {
        characterName: 'Wizard',
        text: 'Cast fireball',
        is_possible: true,
        type: 'magic'
      };

      const mockResponse = {
        content: {
          actions: [
            {
              sourceId: 'wizard',
              targetId: 'goblin1',
              text: 'Fireball explosion',
              explanation: 'Area of effect spell damage'
            },
            {
              sourceId: 'wizard',
              targetId: 'goblin2',
              text: 'Fireball explosion',
              explanation: 'Area of effect spell damage'
            }
          ],
          stats_update: [
            {
              sourceName: 'Wizard',
              targetName: 'Goblin Warrior',
              value: {
                result: 24,
                number: 8,
                type: 6,
                modifier: 0,
                rolls: [3, 6, 4, 2, 5, 1, 3, 2]
              },
              type: 'fire_damage'
            },
            {
              sourceName: 'Wizard',
              targetName: 'Goblin Archer',
              value: {
                result: 18,
                number: 8,
                type: 6,
                modifier: 0,
                rolls: [2, 4, 1, 6, 3, 2, 1, 4]
              },
              type: 'fire_damage'
            }
          ]
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      const result = await combatAgent.generateActionsFromContext(
        aoeAction,
        samplePlayerResources,
        sampleInventory,
        sampleNPCs,
        '',
        '',
        sampleMessages,
        sampleStory,
        sampleGameSettings,
        'balanced'
      );

      expect(result.stats_update).toHaveLength(2);
      expect(result.actions).toHaveLength(2);
      expect(result.actions[0].text).toBe('Fireball explosion');
    });

    it('should handle LLM errors properly', async () => {
      const error = new Error('LLM generation failed');
      mockLLMInstance.generateContent.mockRejectedValue(error);

      await expect(combatAgent.generateActionsFromContext(
        sampleAction,
        samplePlayerResources,
        sampleInventory,
        sampleNPCs,
        '',
        '',
        sampleMessages,
        sampleStory,
        sampleGameSettings,
        'balanced'
      )).rejects.toThrow('LLM generation failed');
    });
  });

  describe('static helper methods', () => {
    describe('getAdditionalStoryInput', () => {
      it('should generate additional story input for combat context', () => {
        const actions = [
          {
            sourceId: 'hero',
            targetId: 'goblin1',
            text: 'Sword strike',
            explanation: 'Melee attack with weapon'
          }
        ];
        const deadNPCs = ['goblin2'];
        const aliveNPCs = ['goblin1'];

        const result = CombatAgent.getAdditionalStoryInput(
          actions,
          deadNPCs,
          aliveNPCs,
          samplePlayerCharactersGameState
        );

        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });

      it('should handle empty arrays', () => {
        const result = CombatAgent.getAdditionalStoryInput(
          [],
          [],
          [],
          samplePlayerCharactersGameState
        );

        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });
    });

    describe('getNPCsHealthStatePrompt', () => {
      it('should generate NPC health state prompt', () => {
        const deadNPCs = ['goblin2', 'orc1'];
        const aliveNPCs = ['goblin1', 'orc2'];

        const result = CombatAgent.getNPCsHealthStatePrompt(
          deadNPCs,
          aliveNPCs,
          samplePlayerCharactersGameState
        );

        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });

      it('should handle only dead NPCs', () => {
        const deadNPCs = ['goblin1', 'goblin2'];

        const result = CombatAgent.getNPCsHealthStatePrompt(deadNPCs);

        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });
    });

    describe('getCombatPromptAddition', () => {
      it('should return combat prompt addition', () => {
        const result = CombatAgent.getCombatPromptAddition();

        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });
    });
  });

  describe('constructor and initialization', () => {
    it('should initialize with LLM instance', () => {
      expect(combatAgent).toBeDefined();
      expect(combatAgent.llm).toBe(mockLLMInstance);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle malformed LLM responses', async () => {
      const malformedResponse = { content: null };
      mockLLMInstance.generateContent.mockResolvedValue(malformedResponse);

      await expect(combatAgent.generateActionsFromContext(
        sampleAction,
        samplePlayerResources,
        sampleInventory,
        sampleNPCs,
        '',
        '',
        sampleMessages,
        sampleStory,
        sampleGameSettings,
        'balanced'
      )).rejects.toThrow();
    });

    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Network timeout');
      mockLLMInstance.generateContent.mockRejectedValue(timeoutError);

      await expect(combatAgent.generateActionsFromContext(
        sampleAction,
        samplePlayerResources,
        sampleInventory,
        sampleNPCs,
        '',
        '',
        sampleMessages,
        sampleStory,
        sampleGameSettings,
        'balanced'
      )).rejects.toThrow('Network timeout');
    });

    it('should handle different safety levels', async () => {
      const mockResponse = {
        content: {
          actions: [
            {
              sourceId: 'hero',
              targetId: 'goblin1',
              text: 'Careful attack',
              explanation: 'Safe combat action'
            }
          ],
          stats_update: []
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      // Test strict safety
      await combatAgent.generateActionsFromContext(
        sampleAction,
        samplePlayerResources,
        sampleInventory,
        sampleNPCs,
        '',
        '',
        sampleMessages,
        sampleStory,
        sampleGameSettings,
        'strict'
      );

      // Test permissive safety
      await combatAgent.generateActionsFromContext(
        sampleAction,
        samplePlayerResources,
        sampleInventory,
        sampleNPCs,
        '',
        '',
        sampleMessages,
        sampleStory,
        sampleGameSettings,
        'permissive'
      );

      expect(mockLLMInstance.generateContent).toHaveBeenCalledTimes(2);
    });
  });

  describe('dice roll validation', () => {
    it('should validate dice roll structure', async () => {
      const mockResponse = {
        content: {
          narrative: 'Combat occurs!',
          stats_update: [
            {
              sourceName: 'Hero',
              targetName: 'Goblin',
              value: {
                result: 15,
                number: 1,
                type: 20,
                modifier: 3,
                rolls: [12]
              },
              type: 'damage'
            }
          ],
          combat_actions: []
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      const result = await combatAgent.generateActionsFromContext(
        sampleAction,
        samplePlayerResources,
        sampleInventory,
        sampleNPCs,
        '',
        '',
        sampleMessages,
        sampleStory,
        sampleGameSettings,
        'balanced'
      );

      const diceRoll = result.stats_update[0].value;
      expect(diceRoll.result).toBe(15);
      expect(diceRoll.number).toBe(1);
      expect(diceRoll.type).toBe(20);
      expect(diceRoll.modifier).toBe(3);
      expect(diceRoll.rolls).toEqual([12]);
    });
  });

  describe('combat scenarios', () => {
    it('should handle critical hits', async () => {
      const mockResponse = {
        content: {
          actions: [
            {
              sourceId: 'hero',
              targetId: 'goblin1',
              text: 'Critical sword strike',
              explanation: 'Maximum damage critical hit'
            }
          ],
          stats_update: [
            {
              sourceName: 'Hero',
              targetName: 'Goblin Warrior',
              value: {
                result: 32,
                number: 2,
                type: 8,
                modifier: 8,
                rolls: [8, 8]
              },
              type: 'critical_damage'
            }
          ]
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      const result = await combatAgent.generateActionsFromContext(
        sampleAction,
        samplePlayerResources,
        sampleInventory,
        sampleNPCs,
        '',
        '',
        sampleMessages,
        sampleStory,
        sampleGameSettings,
        'balanced'
      );

      expect(result.actions[0].text).toBe('Critical sword strike');
      expect(result.stats_update[0].type).toBe('critical_damage');
      expect(result.stats_update[0].value).toEqual({
        result: 32,
        number: 2,
        type: 8,
        modifier: 8,
        rolls: [8, 8]
      });
    });

    it('should handle misses and failed attacks', async () => {
      const mockResponse = {
        content: {
          actions: [
            {
              sourceId: 'hero',
              targetId: 'goblin1',
              text: 'Missed sword attack',
              explanation: 'Attack avoided by enemy agility'
            }
          ],
          stats_update: []
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      const result = await combatAgent.generateActionsFromContext(
        sampleAction,
        samplePlayerResources,
        sampleInventory,
        sampleNPCs,
        '',
        '',
        sampleMessages,
        sampleStory,
        sampleGameSettings,
        'balanced'
      );

      expect(result.actions[0].text).toBe('Missed sword attack');
      expect(result.stats_update).toHaveLength(0);
      expect(result.actions[0].explanation).toBe('Attack avoided by enemy agility');
    });
  });
});

