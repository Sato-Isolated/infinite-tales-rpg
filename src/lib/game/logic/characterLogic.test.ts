import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isNewSkill,
  getSkillIfApplicable,
  getCharacterTechnicalId,
  getCharacterTechnicalIdOrThrow,
  getFreeCharacterTechnicalId,
  addCharacterToPlayerCharactersIdToNamesMap
} from './characterLogic';
import type { CharacterStats } from '$lib/ai/agents/characterStatsAgent';
import type { Action } from '$lib/types/action';
import type { PlayerCharactersIdToNamesMap } from '$lib/types/players';
import { ActionDifficulty } from './gameLogic';

describe('characterLogic', () => {
  let mockCharacterStats: CharacterStats;
  let mockAction: Action;
  let mockPlayerCharactersMap: PlayerCharactersIdToNamesMap;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCharacterStats = {
      level: 5,
      attributes: {
        strength: 15,
        dexterity: 12,
        intelligence: 10,
        constitution: 14,
        wisdom: 11,
        charisma: 13
      },
      skills: {
        'sword fighting': 5,
        'spell casting': 3,
        'stealth': 4
      },
      resources: {
        health: { max_value: 100, start_value: 100, game_ends_when_zero: true },
        mana: { max_value: 50, start_value: 50, game_ends_when_zero: false },
        stamina: { max_value: 75, start_value: 75, game_ends_when_zero: false }
      },
      spells_and_abilities: [
        {
          name: 'Power Strike',
          effect: 'A powerful sword attack',
          resource_cost: {
            resource_key: 'stamina',
            cost: 10
          }
        }
      ]
    };

    mockAction = {
      characterName: 'Test Hero',
      text: 'Attack with sword',
      related_skill: 'sword fighting',
      action_difficulty: ActionDifficulty.medium
    };

    mockPlayerCharactersMap = {};
  });

  describe('isNewSkill', () => {
    it('should return skill name if it is new (not in attributes or skills)', () => {
      const newSkillAction = { ...mockAction, related_skill: 'archery' };
      const result = isNewSkill(mockCharacterStats, newSkillAction);
      expect(result).toBe('archery');
    });

    it('should return undefined if skill is an existing attribute', () => {
      const attributeAction = { ...mockAction, related_skill: 'strength' };
      const result = isNewSkill(mockCharacterStats, attributeAction);
      expect(result).toBeUndefined();
    });

    it('should return undefined if skill already exists', () => {
      const existingSkillAction = { ...mockAction, related_skill: 'sword fighting' };
      const result = isNewSkill(mockCharacterStats, existingSkillAction);
      expect(result).toBeUndefined();
    });

    it('should return undefined for invalid skill names', () => {
      const invalidAction1 = { ...mockAction, related_skill: 'n/a' };
      const invalidAction2 = { ...mockAction, related_skill: 'none' };
      const invalidAction3 = { ...mockAction, related_skill: '' };

      expect(isNewSkill(mockCharacterStats, invalidAction1)).toBeUndefined();
      expect(isNewSkill(mockCharacterStats, invalidAction2)).toBeUndefined();
      expect(isNewSkill(mockCharacterStats, invalidAction3)).toBeUndefined();
    });

    it('should handle case-insensitive skill matching', () => {
      const upperCaseAction = { ...mockAction, related_skill: 'SWORD FIGHTING' };
      const result = isNewSkill(mockCharacterStats, upperCaseAction);
      expect(result).toBeUndefined();
    });
  });

  describe('getSkillIfApplicable', () => {
    it('should return undefined for attributes (not applicable for skill checks)', () => {
      const attributeAction = { ...mockAction, related_skill: 'strength' };
      const result = getSkillIfApplicable(mockCharacterStats, attributeAction);
      expect(result).toBeUndefined();
    });

    it('should return skill name if it exists in skills and is not an attribute', () => {
      const skillAction = { ...mockAction, related_skill: 'sword fighting' };
      const result = getSkillIfApplicable(mockCharacterStats, skillAction);
      expect(result).toBe('sword fighting');
    });

    it('should return skill name for new skills (they are applicable)', () => {
      const newSkillAction = { ...mockAction, related_skill: 'archery' };
      const result = getSkillIfApplicable(mockCharacterStats, newSkillAction);
      expect(result).toBe('archery');
    });

    it('should handle case-insensitive attribute matching (should return undefined for attributes)', () => {
      const upperCaseAction = { ...mockAction, related_skill: 'STRENGTH' };
      const result = getSkillIfApplicable(mockCharacterStats, upperCaseAction);
      expect(result).toBeUndefined();
    });
  });

  describe('getCharacterTechnicalId', () => {
    it('should return existing character ID if found', () => {
      const characterName = 'Test Hero';
      const mapWithCharacter: PlayerCharactersIdToNamesMap = { 'player_character_1': [characterName] };

      const result = getCharacterTechnicalId(mapWithCharacter, characterName);
      expect(result).toBe('player_character_1');
    });

    it('should return undefined if character not found', () => {
      const characterName = 'Unknown Hero';
      const emptyMap: PlayerCharactersIdToNamesMap = {};

      const result = getCharacterTechnicalId(emptyMap, characterName);
      expect(result).toBeUndefined();
    });

    it('should handle multiple characters in same ID', () => {
      const characterName = 'Test Hero';
      const mapWithMultiple: PlayerCharactersIdToNamesMap = {
        'player_character_1': ['Other Hero', characterName, 'Another Hero']
      };

      const result = getCharacterTechnicalId(mapWithMultiple, characterName);
      expect(result).toBe('player_character_1');
    });

    it('should handle character not in list', () => {
      const characterName = 'Test Hero';
      const mapWithDifferent: PlayerCharactersIdToNamesMap = {
        'player_character_1': ['Other Hero']
      };

      const result = getCharacterTechnicalId(mapWithDifferent, characterName);
      expect(result).toBeUndefined();
    });
  });

  describe('getCharacterTechnicalIdOrThrow', () => {
    it('should return character ID if found', () => {
      const characterName = 'Test Hero';
      const mapWithCharacter: PlayerCharactersIdToNamesMap = { 'player_character_1': [characterName] };

      const result = getCharacterTechnicalIdOrThrow(mapWithCharacter, characterName);
      expect(result).toBe('player_character_1');
    });

    it('should throw error if character not found', () => {
      const characterName = 'Unknown Hero';
      const emptyMap: PlayerCharactersIdToNamesMap = {};

      expect(() => {
        getCharacterTechnicalIdOrThrow(emptyMap, characterName);
      }).toThrow('Character not found Unknown Hero');
    });
  });

  describe('getFreeCharacterTechnicalId', () => {
    it('should return player_character_1 for empty map', () => {
      const emptyMap: PlayerCharactersIdToNamesMap = {};
      const result = getFreeCharacterTechnicalId(emptyMap);

      expect(result).toBe('player_character_1');
    });

    it('should return next available ID when some are used', () => {
      const usedMap: PlayerCharactersIdToNamesMap = {
        'player_character_1': ['Hero 1'],
        'player_character_2': ['Hero 2']
      };
      const result = getFreeCharacterTechnicalId(usedMap);

      expect(result).toBe('player_character_3');
    });

    it('should handle gaps in ID sequence', () => {
      const gappedMap: PlayerCharactersIdToNamesMap = {
        'player_character_1': ['Hero 1'],
        'player_character_3': ['Hero 3']
      };
      const result = getFreeCharacterTechnicalId(gappedMap);

      expect(result).toBe('player_character_2');
    });
  });

  describe('addCharacterToPlayerCharactersIdToNamesMap', () => {
    it('should add character to new ID', () => {
      const characterName = 'New Hero';
      const characterId = 'player_character_1';
      const emptyMap: PlayerCharactersIdToNamesMap = {};

      addCharacterToPlayerCharactersIdToNamesMap(emptyMap, characterId, characterName);

      expect(emptyMap[characterId]).toContain(characterName);
      expect(emptyMap[characterId]).toHaveLength(1);
    });

    it('should add character to existing ID without duplicates', () => {
      const characterName = 'New Hero';
      const characterId = 'player_character_1';
      const existingMap: PlayerCharactersIdToNamesMap = {
        [characterId]: ['Existing Hero']
      };

      addCharacterToPlayerCharactersIdToNamesMap(existingMap, characterId, characterName);

      expect(existingMap[characterId]).toContain('Existing Hero');
      expect(existingMap[characterId]).toContain(characterName);
      expect(existingMap[characterId]).toHaveLength(2);
    });

    it('should not add duplicate character to same ID', () => {
      const characterName = 'Duplicate Hero';
      const characterId = 'player_character_1';
      const mapWithCharacter: PlayerCharactersIdToNamesMap = {
        [characterId]: [characterName]
      };

      addCharacterToPlayerCharactersIdToNamesMap(mapWithCharacter, characterId, characterName);

      expect(mapWithCharacter[characterId]).toContain(characterName);
      expect(mapWithCharacter[characterId]).toHaveLength(1);
    });

    it('should modify the original map object', () => {
      const characterName = 'Test Hero';
      const characterId = 'player_character_1';
      const originalMap: PlayerCharactersIdToNamesMap = {};

      addCharacterToPlayerCharactersIdToNamesMap(originalMap, characterId, characterName);

      expect(originalMap[characterId]).toContain(characterName);
    });
  });
});
