import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CharacterAgent, type CharacterDescription } from './characterAgent';
import type { LLM } from '$lib/ai/llm';
import type { Story } from './storyAgent';
import type { GameSettings } from '$lib/types/gameSettings';

// Mock the dependencies
vi.mock('$lib/ai/llmProvider');
vi.mock('$lib/ai/geminiProvider');

// Mock LLM instance
const mockLLMInstance = {
  generateContent: vi.fn()
};

describe('CharacterAgent', () => {
  let characterAgent: CharacterAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    characterAgent = new CharacterAgent(mockLLMInstance as unknown as LLM);
  });

  // Sample test data
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

  describe('generateCharacterDescription', () => {
    it('should generate a complete character description', async () => {
      const mockResponse = {
        content: {
          name: 'Aeliana Dawnbringer',
          class: 'Paladin',
          race: 'Human',
          gender: 'Female',
          appearance: 'A tall woman with golden hair and bright blue eyes, wearing shining armor',
          alignment: 'Lawful Good',
          personality: 'Brave, compassionate, and unwavering in her convictions',
          background: 'Former noble who dedicated her life to protecting the innocent',
          motivation: 'To bring light to dark places and defend those who cannot defend themselves'
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      const result = await characterAgent.generateCharacterDescription(
        sampleStory,
        sampleGameSettings
      );

      expect(mockLLMInstance.generateContent).toHaveBeenCalledOnce();
      expect(result.name).toBe('Aeliana Dawnbringer');
      expect(result.class).toBe('Paladin');
      expect(result.race).toBe('Human');
      expect(result.gender).toBe('Female');
      expect(result.alignment).toBe('Lawful Good');
    });

    it('should handle character overwrites', async () => {
      const characterOverwrites: Partial<CharacterDescription> = {
        name: 'Custom Hero',
        class: 'Wizard',
        race: 'Elf'
      };

      const mockResponse = {
        content: {
          name: 'Custom Hero',
          class: 'Wizard',
          race: 'Elf',
          gender: 'Male',
          appearance: 'A wise elf with silver robes and a staff',
          alignment: 'Neutral Good',
          personality: 'Studious and thoughtful',
          background: 'Scholar of ancient magic',
          motivation: 'To expand knowledge of the arcane arts'
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      const result = await characterAgent.generateCharacterDescription(
        sampleStory,
        sampleGameSettings,
        characterOverwrites
      );

      expect(result.name).toBe('Custom Hero');
      expect(result.class).toBe('Wizard');
      expect(result.race).toBe('Elf');
    });

    it('should handle transformation instructions', async () => {
      const transformInto = 'a werewolf';

      const mockResponse = {
        content: {
          name: 'Gareth Moonhowl',
          class: 'Ranger',
          race: 'Human (Lycanthrope)',
          gender: 'Male',
          appearance: 'A rugged man with wolf-like features and amber eyes',
          alignment: 'Chaotic Neutral',
          personality: 'Wild, instinctive, struggles with dual nature',
          background: 'Former hunter cursed with lycanthropy',
          motivation: 'To control the beast within and protect others from his curse'
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      const result = await characterAgent.generateCharacterDescription(
        sampleStory,
        sampleGameSettings,
        undefined,
        transformInto
      );

      expect(result.race).toContain('Lycanthrope');
      expect(result.appearance).toContain('wolf-like');
      expect(result.background).toContain('cursed');
    });

    it('should handle different fantasy races', async () => {
      const elvishOverwrites: Partial<CharacterDescription> = {
        race: 'Elf'
      };

      const elvishResponse = {
        content: {
          name: 'Erevan Silverleaf',
          class: 'Ranger',
          race: 'Elf',
          gender: 'Male',
          appearance: 'A graceful elf with silver hair and green eyes',
          alignment: 'Chaotic Good',
          personality: 'Wise, patient, and connected to nature',
          background: 'Guardian of the ancient forests',
          motivation: 'To protect the balance between civilization and nature'
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(elvishResponse);

      const result = await characterAgent.generateCharacterDescription(
        sampleStory,
        sampleGameSettings,
        elvishOverwrites
      );

      expect(result.race).toBe('Elf');
      expect(result.class).toBe('Ranger');
      expect(result.alignment).toBe('Chaotic Good');
    });

    it('should generate appropriate character for story theme', async () => {
      const darkStory: Story = {
        ...sampleStory,
        theme: 'Dark Fantasy',
        tonality: 'Grim',
        background_context: 'A world plagued by undead and corruption'
      };

      const darkResponse = {
        content: {
          name: 'Mordecai Grimward',
          class: 'Warlock',
          race: 'Human',
          gender: 'Male',
          appearance: 'A pale man with dark circles under his eyes and black robes',
          alignment: 'Chaotic Neutral',
          personality: 'Brooding, mysterious, haunted by his past',
          background: 'Former scholar who made a pact with dark forces',
          motivation: 'To find redemption for his past mistakes'
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(darkResponse);

      const result = await characterAgent.generateCharacterDescription(
        darkStory,
        sampleGameSettings
      );

      expect(result.class).toBe('Warlock');
      expect(result.alignment).toBe('Chaotic Neutral');
      expect(result.personality).toContain('Brooding');
    });

    it('should handle LLM errors properly', async () => {
      const error = new Error('LLM generation failed');
      mockLLMInstance.generateContent.mockRejectedValue(error);

      await expect(characterAgent.generateCharacterDescription(
        sampleStory,
        sampleGameSettings
      )).rejects.toThrow('LLM generation failed');
    });
  });

  describe('constructor and initialization', () => {
    it('should initialize with LLM instance', () => {
      expect(characterAgent).toBeDefined();
      expect(characterAgent.llm).toBe(mockLLMInstance);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle malformed LLM responses for character description', async () => {
      const malformedResponse = { content: null };
      mockLLMInstance.generateContent.mockResolvedValue(malformedResponse);

      const result = await characterAgent.generateCharacterDescription(
        sampleStory,
        sampleGameSettings
      );

      expect(result).toBeNull();
    });

    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Network timeout');
      mockLLMInstance.generateContent.mockRejectedValue(timeoutError);

      await expect(characterAgent.generateCharacterDescription(
        sampleStory,
        sampleGameSettings
      )).rejects.toThrow('Network timeout');
    });

    it('should handle empty story state', async () => {
      const emptyStory = {};

      const mockResponse = {
        content: {
          name: 'Generic Hero',
          class: 'Fighter',
          race: 'Human',
          gender: 'Male',
          appearance: 'A standard adventurer',
          alignment: 'Neutral',
          personality: 'Determined',
          background: 'Unknown origins',
          motivation: 'To find their purpose'
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      const result = await characterAgent.generateCharacterDescription(
        emptyStory,
        sampleGameSettings
      );

      expect(result.name).toBe('Generic Hero');
      expect(result.class).toBe('Fighter');
    });
  });

  describe('character consistency', () => {
    it('should generate consistent character traits', async () => {
      const mockResponse = {
        content: {
          name: 'Sir Gareth the Bold',
          class: 'Knight',
          race: 'Human',
          gender: 'Male',
          appearance: 'A noble-looking man in polished armor',
          alignment: 'Lawful Good',
          personality: 'Honorable, brave, and dedicated to justice',
          background: 'Son of a lord who chose the path of knighthood',
          motivation: 'To uphold the code of chivalry and protect the realm'
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      const result = await characterAgent.generateCharacterDescription(
        sampleStory,
        sampleGameSettings
      );

      // Check that alignment matches personality and background
      expect(result.alignment).toBe('Lawful Good');
      expect(result.personality).toContain('Honorable');
      expect(result.background).toContain('lord');
      expect(result.motivation).toContain('protect');
    });

    it('should create characters appropriate for game setting', async () => {
      const modernStory: Story = {
        ...sampleStory,
        game: 'Cyberpunk',
        theme: 'Cyberpunk',
        world_details: 'A futuristic city dominated by mega-corporations',
        background_context: 'High technology, low life in a dystopian future'
      };

      const cyberpunkResponse = {
        content: {
          name: 'Zara "Ghost" Chen',
          class: 'Netrunner',
          race: 'Human',
          gender: 'Female',
          appearance: 'A young woman with cybernetic implants and neon-blue hair',
          alignment: 'Chaotic Neutral',
          personality: 'Rebellious, tech-savvy, distrustful of authority',
          background: 'Former corporate programmer turned underground hacker',
          motivation: 'To expose corporate corruption and fight for digital freedom'
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(cyberpunkResponse);

      const result = await characterAgent.generateCharacterDescription(
        modernStory,
        sampleGameSettings
      );

      expect(result.class).toBe('Netrunner');
      expect(result.background).toContain('programmer');
      expect(result.appearance).toContain('cybernetic');
    });
  });

  describe('character diversity', () => {
    it('should support multiple character archetypes', async () => {
      const responses = [
        {
          content: {
            name: 'Kira Stormwind',
            class: 'Wizard',
            race: 'Elf',
            gender: 'Female',
            appearance: 'An elegant elf with silver hair and violet eyes',
            alignment: 'Neutral Good',
            personality: 'Studious, curious, and wise beyond her years',
            background: 'Academy-trained scholar of ancient magic',
            motivation: 'To unlock the secrets of forgotten spells'
          }
        },
        {
          content: {
            name: 'Thorin Ironbeard',
            class: 'Barbarian',
            race: 'Dwarf',
            gender: 'Male',
            appearance: 'A stocky dwarf with a magnificent braided beard',
            alignment: 'Chaotic Good',
            personality: 'Hot-tempered but loyal, loves a good fight',
            background: 'Exile from his mountain clan seeking redemption',
            motivation: 'To prove his worth and reclaim his honor'
          }
        }
      ];

      for (const response of responses) {
        mockLLMInstance.generateContent.mockResolvedValueOnce(response);

        const result = await characterAgent.generateCharacterDescription(
          sampleStory,
          sampleGameSettings
        );

        expect(result.name).toBeDefined();
        expect(result.class).toBeDefined();
        expect(result.race).toBeDefined();
        expect(result.name.length).toBeGreaterThan(0);
      }
    });

    it('should handle partial character overwrites', async () => {
      const partialOverwrites: Partial<CharacterDescription> = {
        class: 'Cleric',
        alignment: 'Lawful Good'
      };

      const mockResponse = {
        content: {
          name: 'Sister Elara',
          class: 'Cleric',
          race: 'Human',
          gender: 'Female',
          appearance: 'A kind-faced woman in white robes',
          alignment: 'Lawful Good',
          personality: 'Compassionate, devout, peaceful',
          background: 'Raised in a temple of healing',
          motivation: 'To bring divine healing to those in need'
        }
      };

      mockLLMInstance.generateContent.mockResolvedValue(mockResponse);

      const result = await characterAgent.generateCharacterDescription(
        sampleStory,
        sampleGameSettings,
        partialOverwrites
      );

      expect(result.class).toBe('Cleric');
      expect(result.alignment).toBe('Lawful Good');
      expect(result.personality).toContain('Compassionate');
    });
  });
});
