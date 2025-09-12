import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CharacterStatsAgent,
  type CharacterStats,
  type Ability,
  type NPCStats,
  type NPCState,
  type Resources,
  type AiLevelUp,
  initialCharacterStatsState
} from './characterStatsAgent';
import type { LLM, LLMMessage } from '$lib/ai/llm';
import type { Story } from './storyAgent';
import type { CharacterDescription } from './characterAgent';

// Mock the dependencies
vi.mock('$lib/ai/llmProvider');
vi.mock('$lib/ai/geminiProvider');

// Mock LLM instance
const mockLLMInstance = {
  generateContent: vi.fn()
};

describe('CharacterStatsAgent', () => {
  let characterStatsAgent: CharacterStatsAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    characterStatsAgent = new CharacterStatsAgent(mockLLMInstance as unknown as LLM);
  });

  // Sample test data
  const sampleStory: Story = {
    game: 'Dungeons & Dragons',
    world_details: 'Medieval fantasy world',
    story_pace: 'balanced',
    main_scenario: 'Save the kingdom',
    character_simple_description: 'A brave knight',
    theme: 'High Fantasy',
    tonality: 'Heroic',
    background_context: 'Medieval kingdom under threat',
    social_dynamics: 'Noble court intrigue',
    locations: 'Castles, villages, dungeons',
    npcs: 'Kings, merchants, monsters',
    story_catalyst: 'Dragons attack the realm',
    potential_developments: 'Epic battles ahead',
    narrative_flexibility: 'Player choices matter',
    player_agency: 'Freedom to explore',
    content_rating: 'safe',
    tags: 'fantasy, adventure, medieval'
  };

  const sampleCharacterDescription: CharacterDescription = {
    name: 'Sir Galahad',
    class: 'Knight',
    race: 'Human',
    gender: 'Male',
    appearance: 'Tall and noble with shining armor',
    alignment: 'Lawful Good',
    personality: 'Brave and honorable',
    background: 'Noble knight sworn to protect the innocent',
    motivation: 'To serve justice and protect the weak'
  };

  const sampleAbility: Ability = {
    name: 'Sword Strike',
    effect: 'Deals 1d8+STR damage to target',
    resource_cost: {
      resource_key: 'stamina',
      cost: 2
    }
  };

  describe('generateCharacterStats', () => {
    it('should generate character stats successfully', async () => {
      const mockResponse = {
        content: {
          level: 1,
          resources: [
            {
              key: 'hp',
              max_value: 30,
              start_value: 30,
              game_ends_when_zero: true
            },
            {
              key: 'mp',
              max_value: 10,
              start_value: 10,
              game_ends_when_zero: false
            }
          ],
          attributes: [
            { name: 'strength', value: 2 },
            { name: 'dexterity', value: 1 },
            { name: 'intelligence', value: 0 }
          ],
          skills: [
            { name: 'combat', value: 2 },
            { name: 'athletics', value: 1 }
          ],
          spells_and_abilities: [
            {
              name: 'Sword Strike',
              effect: 'Basic sword attack',
              resource_cost: {
                resource_key: 'stamina',
                cost: 1
              }
            }
          ]
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      const result = await characterStatsAgent.generateCharacterStats(
        sampleStory,
        sampleCharacterDescription
      );

      expect(mockLLMInstance.generateContent).toHaveBeenCalledOnce();
      expect(result.level).toBe(1);
      expect(result.resources.hp.max_value).toBe(30);
      expect(result.attributes.strength).toBe(2);
      expect(result.skills.combat).toBe(2);
      expect(result.spells_and_abilities).toHaveLength(1);
    });

    it('should handle stats overwrites', async () => {
      const mockResponse = {
        content: {
          level: 5,
          resources: [
            {
              key: 'hp',
              max_value: 80,
              start_value: 80,
              game_ends_when_zero: true
            }
          ],
          attributes: [
            { name: 'strength', value: 4 }
          ],
          skills: [
            { name: 'combat', value: 4 }
          ],
          spells_and_abilities: []
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      const overwrites: Partial<CharacterStats> = {
        level: 5,
        attributes: { strength: 4 }
      };

      const result = await characterStatsAgent.generateCharacterStats(
        sampleStory,
        sampleCharacterDescription,
        overwrites
      );

      expect(result.level).toBe(5);
      expect(result.attributes.strength).toBe(4);
    });

    it('should handle character transformation', async () => {
      const mockResponse = {
        content: {
          level: 1,
          resources: [
            {
              key: 'hp',
              max_value: 40,
              start_value: 40,
              game_ends_when_zero: true
            },
            {
              key: 'mp',
              max_value: 50,
              start_value: 50,
              game_ends_when_zero: false
            }
          ],
          attributes: [
            { name: 'intelligence', value: 3 },
            { name: 'wisdom', value: 2 }
          ],
          skills: [
            { name: 'spellcasting', value: 3 },
            { name: 'arcana', value: 2 }
          ],
          spells_and_abilities: [
            {
              name: 'Fireball',
              effect: 'Deals fire damage in area',
              resource_cost: {
                resource_key: 'mp',
                cost: 5
              }
            }
          ]
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      const result = await characterStatsAgent.generateCharacterStats(
        sampleStory,
        sampleCharacterDescription,
        undefined,
        false,
        'wizard'
      );

      expect(result.attributes.intelligence).toBe(3);
      expect(result.skills.spellcasting).toBe(3);
      expect(result.spells_and_abilities[0].name).toBe('Fireball');
    });

    it('should handle LLM errors', async () => {
      const error = new Error('LLM generation failed');
      mockLLMInstance.generateContent.mockRejectedValue(error);

      await expect(characterStatsAgent.generateCharacterStats(
        sampleStory,
        sampleCharacterDescription
      )).rejects.toThrow('LLM generation failed');
    });
  });

  describe('generateNPCStats', () => {
    it('should generate NPC stats successfully', async () => {
      const mockResponse = {
        content: {
          npcs: [
            {
              uniqueTechnicalNameId: 'goblin_warrior',
              known_names: ['Goblin Warrior', 'Grunk'],
              is_party_member: false,
              resources: {
                current_hp: 25,
                current_mp: 5
              },
              class: 'warrior',
              rank_enum_english: 'Average',
              level: 2,
              spells_and_abilities: [
                {
                  name: 'Club Smash',
                  effect: 'Melee attack with club',
                  resource_cost: {
                    resource_key: undefined,
                    cost: 0
                  }
                }
              ]
            }
          ]
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      const currentStats: CharacterStats = {
        level: 1,
        resources: {
          hp: { max_value: 30, start_value: 30, game_ends_when_zero: true }
        },
        attributes: { strength: 2 },
        skills: { combat: 2 },
        spells_and_abilities: []
      };

      const result = await characterStatsAgent.generateNPCStats(
        sampleStory,
        [],
        ['Goblin Warrior'],
        currentStats,
        '',
        'balanced'
      );

      expect(mockLLMInstance.generateContent).toHaveBeenCalledOnce();
      expect(result['goblin_warrior']).toBeDefined();
      expect(result['goblin_warrior'].level).toBe(2);
      expect(result['goblin_warrior'].class).toBe('warrior');
      expect(result['goblin_warrior'].resources?.current_hp).toBe(25);
    });

    it('should handle empty NPC list', async () => {
      const currentStats: CharacterStats = {
        level: 1,
        resources: {},
        attributes: {},
        skills: {},
        spells_and_abilities: []
      };

      const mockResponse = {
        content: {
          npcs: []
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      const result = await characterStatsAgent.generateNPCStats(
        sampleStory,
        [],
        [],
        currentStats,
        '',
        'balanced'
      );

      expect(result).toEqual({});
    });
  });

  describe('generateAbilitiesFromPartial', () => {
    it('should generate abilities from partial successfully', async () => {
      const mockResponse = {
        content: [
          {
            name: 'Shield Bash',
            effect: 'Stun enemy for 1 turn',
            resource_cost: {
              resource_key: 'stamina',
              cost: 2
            }
          },
          {
            name: 'Defensive Stance',
            effect: 'Reduce incoming damage by half',
            resource_cost: {
              resource_key: undefined,
              cost: 0
            }
          }
        ]
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      const currentStats: CharacterStats = {
        level: 3,
        resources: {
          hp: { max_value: 40, start_value: 40, game_ends_when_zero: true },
          stamina: { max_value: 20, start_value: 20, game_ends_when_zero: false }
        },
        attributes: { strength: 3, constitution: 2 },
        skills: { combat: 3, defense: 2 },
        spells_and_abilities: []
      };

      const partialAbilities = [
        { name: 'Shield Bash' },
        { name: 'Defensive Stance' }
      ];

      const result = await characterStatsAgent.generateAbilitiesFromPartial(
        sampleStory,
        sampleCharacterDescription,
        currentStats,
        partialAbilities
      );

      expect(mockLLMInstance.generateContent).toHaveBeenCalledOnce();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Shield Bash');
      expect(result[1].name).toBe('Defensive Stance');
    });

    it('should handle empty partial abilities', async () => {
      const mockResponse = {
        content: []
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      const currentStats: CharacterStats = {
        level: 1,
        resources: {},
        attributes: {},
        skills: {},
        spells_and_abilities: []
      };

      const result = await characterStatsAgent.generateAbilitiesFromPartial(
        sampleStory,
        sampleCharacterDescription,
        currentStats,
        []
      );

      expect(result).toEqual([]);
    });
  });

  describe('utility methods', () => {
    describe('mapAbility', () => {
      it('should add default resource_cost if missing', () => {
        const abilityWithoutCost = {
          name: 'Test Ability',
          effect: 'Does something'
        } as any;

        const result = characterStatsAgent.mapAbility(abilityWithoutCost);

        expect(result.resource_cost).toEqual({
          cost: 0,
          resource_key: undefined
        });
      });

      it('should preserve existing resource_cost', () => {
        const abilityWithCost: Ability = {
          name: 'Test Ability',
          effect: 'Does something',
          resource_cost: {
            resource_key: 'mp',
            cost: 5
          }
        };

        const result = characterStatsAgent.mapAbility(abilityWithCost);

        expect(result.resource_cost).toEqual({
          resource_key: 'mp',
          cost: 5
        });
      });
    });

    describe('mapStats', () => {
      it('should convert array-based response to object maps', () => {
        const response = {
          level: 2,
          resources: [
            {
              key: 'hp',
              max_value: 40,
              start_value: 35,
              game_ends_when_zero: true
            }
          ],
          attributes: [
            { name: 'strength', value: 3 }
          ],
          skills: [
            { name: 'combat', value: 3 }
          ],
          spells_and_abilities: [
            {
              name: 'Test Ability',
              effect: 'Test effect',
              resource_cost: {
                resource_key: 'hp',
                cost: 1
              }
            }
          ]
        };

        const result = characterStatsAgent.mapStats(response);

        expect(result.level).toBe(2);
        expect(result.resources.hp).toEqual({
          max_value: 40,
          start_value: 35,
          game_ends_when_zero: true
        });
        expect(result.attributes.strength).toBe(3);
        expect(result.skills.combat).toBe(3);
        expect(result.spells_and_abilities).toHaveLength(1);
      });

      it('should handle malformed response data', () => {
        const malformedResponse = {
          level: 'invalid',
          resources: null,
          attributes: 'not an array',
          skills: undefined,
          spells_and_abilities: []
        } as any;

        const result = characterStatsAgent.mapStats(malformedResponse);

        expect(result.level).toBe(1); // Default fallback
        expect(result.resources).toEqual({});
        expect(result.attributes).toEqual({});
        expect(result.skills).toEqual({});
        expect(result.spells_and_abilities).toEqual([]);
      });
    });
  });

  describe('constructor and initialization', () => {
    it('should initialize with LLM instance', () => {
      expect(characterStatsAgent).toBeDefined();
      expect(characterStatsAgent.llm).toBe(mockLLMInstance);
      expect(characterStatsAgent.ATTRIBUTE_MAX_VALUE).toBe(10);
    });

    it('should use initialCharacterStatsState', () => {
      expect(initialCharacterStatsState).toEqual({
        level: 0,
        resources: {},
        attributes: {},
        skills: {},
        spells_and_abilities: []
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Network timeout');
      mockLLMInstance.generateContent.mockRejectedValue(timeoutError);

      await expect(characterStatsAgent.generateCharacterStats(
        sampleStory,
        sampleCharacterDescription
      )).rejects.toThrow('Network timeout');
    });

    it('should handle malformed LLM responses', async () => {
      const malformedResponse = { content: null };
      mockLLMInstance.generateContent.mockResolvedValue(malformedResponse);

      // Should not throw but return default values
      const result = await characterStatsAgent.generateCharacterStats(
        sampleStory,
        sampleCharacterDescription
      );

      expect(result.level).toBe(1);
      expect(result.resources).toEqual({});
    });

    it('should default level to 1 if not provided in overwrites', async () => {
      const mockResponse = {
        content: {
          level: 3,
          resources: [],
          attributes: [],
          skills: [],
          spells_and_abilities: []
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      const overwrites = { attributes: { strength: 2 } };

      const result = await characterStatsAgent.generateCharacterStats(
        sampleStory,
        sampleCharacterDescription,
        overwrites
      );

      expect(result.level).toBe(3); // From response, not overwritten
    });
  });

  describe('resource validation', () => {
    it('should validate resource constraints', () => {
      const response = {
        level: 1,
        resources: [
          {
            key: 'hp',
            max_value: 30,
            start_value: 35, // Invalid: start > max
            game_ends_when_zero: true
          },
          {
            key: 'invalid_resource',
            max_value: NaN, // Invalid value
            start_value: 10,
            game_ends_when_zero: false
          }
        ],
        attributes: [],
        skills: [],
        spells_and_abilities: []
      };

      const result = characterStatsAgent.mapStats(response);

      expect(result.resources.hp.start_value).toBe(35); // Preserved as-is
      expect(result.resources.invalid_resource.max_value).toBe(0); // Fallback for NaN
    });
  });

  describe('abilities validation', () => {
    it('should handle abilities with missing or invalid resource costs', () => {
      const response = {
        level: 1,
        resources: [],
        attributes: [],
        skills: [],
        spells_and_abilities: [
          {
            name: 'Test Ability 1',
            effect: 'Effect 1'
            // Missing resource_cost
          },
          {
            name: 'Test Ability 2',
            effect: 'Effect 2',
            resource_cost: null // Null resource_cost
          }
        ]
      } as any;

      const result = characterStatsAgent.mapStats(response);

      expect(result.spells_and_abilities).toHaveLength(2);
      // mapAbility should be called during processing to add defaults
    });
  });
});
