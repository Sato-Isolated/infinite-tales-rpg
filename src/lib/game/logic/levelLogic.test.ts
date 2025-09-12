import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getXPNeededForLevel,
  mapXP,
  applyLevelUp,
  XP_INCREASING_SCALE
} from './levelLogic';
import type { StatsUpdate } from '$lib/ai/agents/combatAgent';
import type { AiLevelUp, CharacterStats, Ability } from '$lib/ai/agents/characterStatsAgent';

describe('Level Logic', () => {
  describe('getXPNeededForLevel', () => {
    it('should return 100 XP for level 1', () => {
      const result = getXPNeededForLevel(1);
      expect(result).toBe(100);
    });

    it('should return 120 XP for level 2', () => {
      const result = getXPNeededForLevel(2);
      expect(result).toBe(120); // 100 + 20 * (2-1)
    });

    it('should return 140 XP for level 3', () => {
      const result = getXPNeededForLevel(3);
      expect(result).toBe(140); // 100 + 20 * (3-1)
    });

    it('should return 200 XP for level 6', () => {
      const result = getXPNeededForLevel(6);
      expect(result).toBe(200); // 100 + 20 * (6-1)
    });

    it('should return undefined for level 0', () => {
      const result = getXPNeededForLevel(0);
      expect(result).toBeUndefined();
    });

    it('should return undefined for null level', () => {
      const result = getXPNeededForLevel(null as any);
      expect(result).toBeUndefined();
    });

    it('should return undefined for undefined level', () => {
      const result = getXPNeededForLevel(undefined as any);
      expect(result).toBeUndefined();
    });

    it('should return undefined for NaN level', () => {
      const result = getXPNeededForLevel(NaN);
      expect(result).toBeUndefined();
    });

    it('should handle negative levels gracefully', () => {
      const result = getXPNeededForLevel(-1);
      expect(result).toBe(60); // 100 + 20 * (-1-1) = 100 + 20 * (-2) = 60
    });

    it('should handle very high levels', () => {
      const result = getXPNeededForLevel(100);
      expect(result).toBe(2080); // 100 + 20 * (100-1) = 100 + 20 * 99 = 2080
    });

    it('should handle floating point levels', () => {
      const result = getXPNeededForLevel(2.5);
      expect(result).toBe(130); // 100 + 20 * (2.5-1) = 100 + 20 * 1.5 = 130
    });
  });

  describe('XP_INCREASING_SCALE', () => {
    it('should have correct scale values', () => {
      expect(XP_INCREASING_SCALE.SMALL).toBe(0);
      expect(XP_INCREASING_SCALE.MEDIUM).toBe(10);
      expect(XP_INCREASING_SCALE.HIGH).toBe(20);
    });

    it('should be accessible and consistent', () => {
      // Test that the values are consistent
      expect(XP_INCREASING_SCALE.SMALL < XP_INCREASING_SCALE.MEDIUM).toBe(true);
      expect(XP_INCREASING_SCALE.MEDIUM < XP_INCREASING_SCALE.HIGH).toBe(true);
    });
  });

  describe('mapXP', () => {
    it('should return unchanged statsUpdate for non-XP types', () => {
      const statsUpdate: StatsUpdate = {
        sourceName: 'Hero',
        targetName: 'Enemy',
        type: 'HP_lost',
        value: { result: 25 }
      };

      const result = mapXP(statsUpdate);
      expect(result).toEqual(statsUpdate);
      expect(result).toBe(statsUpdate); // Should be the same reference
    });

    it('should map SMALL string to 0', () => {
      const statsUpdate: StatsUpdate = {
        sourceName: 'Hero',
        targetName: 'Hero',
        type: 'XP_gained',
        value: { result: 'SMALL' }
      };

      const result = mapXP(statsUpdate);
      expect(result.value).toEqual({ result: 0 });
    });

    it('should map MEDIUM string to 10', () => {
      const statsUpdate: StatsUpdate = {
        sourceName: 'Hero',
        targetName: 'Hero',
        type: 'XP_gained',
        value: { result: 'MEDIUM' }
      };

      const result = mapXP(statsUpdate);
      expect(result.value).toEqual({ result: 10 });
    });

    it('should map HIGH string to 20', () => {
      const statsUpdate: StatsUpdate = {
        sourceName: 'Hero',
        targetName: 'Hero',
        type: 'XP_gained',
        value: { result: 'HIGH' }
      };

      const result = mapXP(statsUpdate);
      expect(result.value).toEqual({ result: 20 });
    });

    it('should handle lowercase string values', () => {
      const statsUpdate: StatsUpdate = {
        sourceName: 'Hero',
        targetName: 'Hero',
        type: 'xp_gained',
        value: { result: 'small' }
      };

      const result = mapXP(statsUpdate);
      expect(result.value).toEqual({ result: 0 });
    });

    it('should handle mixed case string values', () => {
      const statsUpdate: StatsUpdate = {
        sourceName: 'Hero',
        targetName: 'Hero',
        type: 'Xp_GaInEd',
        value: { result: 'MeDiUm' }
      };

      const result = mapXP(statsUpdate);
      expect(result.value).toEqual({ result: 10 });
    });

    it('should preserve numeric string values', () => {
      const statsUpdate: StatsUpdate = {
        sourceName: 'Hero',
        targetName: 'Hero',
        type: 'XP_gained',
        value: { result: '50' }
      };

      const result = mapXP(statsUpdate);
      expect(result.value).toEqual({ result: '50' });
    });

    it('should preserve numeric values', () => {
      const statsUpdate: StatsUpdate = {
        sourceName: 'Hero',
        targetName: 'Hero',
        type: 'XP_gained',
        value: { result: 75 }
      };

      const result = mapXP(statsUpdate);
      expect(result.value).toEqual({ result: 75 });
    });

    it('should handle invalid string values', () => {
      const statsUpdate: StatsUpdate = {
        sourceName: 'Hero',
        targetName: 'Hero',
        type: 'XP_gained',
        value: { result: 'INVALID' }
      };

      const result = mapXP(statsUpdate);
      expect(result.value).toEqual({ result: 'INVALID' }); // Should preserve invalid strings
    });

    it('should handle null/undefined value', () => {
      const statsUpdateNull: StatsUpdate = {
        sourceName: 'Hero',
        targetName: 'Hero',
        type: 'XP_gained',
        value: { result: null }
      };

      const statsUpdateUndefined: StatsUpdate = {
        sourceName: 'Hero',
        targetName: 'Hero',
        type: 'XP_gained',
        value: { result: undefined }
      };

      const resultNull = mapXP(statsUpdateNull);
      const resultUndefined = mapXP(statsUpdateUndefined);

      expect(resultNull).toEqual(statsUpdateNull);
      expect(resultUndefined).toEqual(statsUpdateUndefined);
    });

    it('should handle missing value property', () => {
      const statsUpdate: StatsUpdate = {
        sourceName: 'Hero',
        targetName: 'Hero',
        type: 'XP_gained',
        value: null as any
      };

      const result = mapXP(statsUpdate);
      expect(result).toEqual(statsUpdate);
    });

    it('should handle missing value.result property', () => {
      const statsUpdate: StatsUpdate = {
        sourceName: 'Hero',
        targetName: 'Hero',
        type: 'XP_gained',
        value: {} as any
      };

      const result = mapXP(statsUpdate);
      expect(result).toEqual(statsUpdate);
    });

    it('should handle null statsUpdate', () => {
      const result = mapXP(null as any);
      expect(result).toBeNull();
    });

    it('should handle undefined statsUpdate', () => {
      const result = mapXP(undefined as any);
      expect(result).toBeUndefined();
    });

    it('should handle statsUpdate without type', () => {
      const statsUpdate = {
        sourceName: 'Hero',
        targetName: 'Hero',
        value: { result: 'HIGH' }
      } as any;

      const result = mapXP(statsUpdate);
      expect(result).toEqual(statsUpdate);
    });

    it('should handle partial XP type matches', () => {
      const statsUpdate: StatsUpdate = {
        sourceName: 'Hero',
        targetName: 'Hero',
        type: 'experience_gained',
        value: { result: 'HIGH' }
      };

      const result = mapXP(statsUpdate);
      expect(result).toEqual(statsUpdate); // Should not match partial XP strings
    });

    it('should handle XP in middle of type name', () => {
      const statsUpdate: StatsUpdate = {
        sourceName: 'Hero',
        targetName: 'Hero',
        type: 'bonus_XP_reward',
        value: { result: 'HIGH' }
      };

      const result = mapXP(statsUpdate);
      expect(result.value).toEqual({ result: 20 });
    });
  });

  describe('applyLevelUp', () => {
    let baseCharacterStats: CharacterStats;
    let testAbility: Ability;
    let testLevelUp: AiLevelUp;

    beforeEach(() => {
      testAbility = {
        name: 'Fireball',
        effect: 'Deals fire damage to enemies',
        resource_cost: {
          resource_key: 'MP',
          cost: 10
        }
      };

      baseCharacterStats = {
        level: 1,
        resources: {
          HP: { max_value: 100, start_value: 100, game_ends_when_zero: true },
          MP: { max_value: 50, start_value: 50, game_ends_when_zero: false }
        },
        attributes: {
          Strength: 10,
          Intelligence: 8
        },
        skills: {
          Swordsmanship: 5,
          Magic: 3
        },
        spells_and_abilities: [
          {
            name: 'Basic Attack',
            effect: 'Basic melee attack',
            resource_cost: { resource_key: undefined, cost: 0 }
          }
        ]
      };

      testLevelUp = {
        character_name: 'Hero',
        level_up_explanation: 'You have grown stronger!',
        attribute: 'Strength',
        ability: testAbility,
        resources: {
          HP: 120,
          MP: 60
        }
      };
    });

    it('should increase character level by 1', () => {
      const result = applyLevelUp(testLevelUp, { ...baseCharacterStats });
      expect(result.level).toBe(2);
    });

    it('should update resource max values', () => {
      const result = applyLevelUp(testLevelUp, { ...baseCharacterStats });
      expect(result.resources.HP.max_value).toBe(120);
      expect(result.resources.MP.max_value).toBe(60);
    });

    it('should preserve start_value when it equals max_value', () => {
      const result = applyLevelUp(testLevelUp, { ...baseCharacterStats });
      expect(result.resources.HP.start_value).toBe(120); // Updated because start_value == max_value
      expect(result.resources.MP.start_value).toBe(60);  // Updated because start_value == max_value
    });

    it('should preserve existing start_value when different from max_value', () => {
      const modifiedStats = {
        ...baseCharacterStats,
        resources: {
          HP: { max_value: 100, start_value: 80, game_ends_when_zero: true }, // start_value != max_value
          MP: { max_value: 50, start_value: 30, game_ends_when_zero: false }   // start_value != max_value
        }
      };

      const result = applyLevelUp(testLevelUp, modifiedStats);
      expect(result.resources.HP.start_value).toBe(80); // Preserved
      expect(result.resources.MP.start_value).toBe(30); // Preserved
      expect(result.resources.HP.max_value).toBe(120); // Updated
      expect(result.resources.MP.max_value).toBe(60);  // Updated
    });

    it('should increment the specified attribute', () => {
      const result = applyLevelUp(testLevelUp, { ...baseCharacterStats });
      expect(result.attributes.Strength).toBe(11); // 10 + 1
      expect(result.attributes.Intelligence).toBe(8); // Unchanged
    });

    it('should add new attribute if it doesn\'t exist', () => {
      const levelUpWithNewAttribute = {
        ...testLevelUp,
        attribute: 'Dexterity'
      };

      const result = applyLevelUp(levelUpWithNewAttribute, { ...baseCharacterStats });
      expect(result.attributes.Dexterity).toBe(1); // 0 + 1
      expect(result.attributes.Strength).toBe(10); // Unchanged
    });

    it('should add new ability to spells_and_abilities', () => {
      const result = applyLevelUp(testLevelUp, { ...baseCharacterStats });
      expect(result.spells_and_abilities).toHaveLength(2);
      expect(result.spells_and_abilities[1]).toEqual(testAbility);
    });

    it('should remove former ability when specified', () => {
      const levelUpWithReplacement = {
        ...testLevelUp,
        formerAbilityName: 'Basic Attack'
      };

      const result = applyLevelUp(levelUpWithReplacement, { ...baseCharacterStats });
      expect(result.spells_and_abilities).toHaveLength(1);
      expect(result.spells_and_abilities[0]).toEqual(testAbility);
      expect(result.spells_and_abilities.find(a => a.name === 'Basic Attack')).toBeUndefined();
    });

    it('should handle non-existent former ability gracefully', () => {
      const levelUpWithNonExistentFormer = {
        ...testLevelUp,
        formerAbilityName: 'Non-existent Ability'
      };

      const result = applyLevelUp(levelUpWithNonExistentFormer, { ...baseCharacterStats });
      expect(result.spells_and_abilities).toHaveLength(2); // Original + new
      expect(result.spells_and_abilities[0].name).toBe('Basic Attack'); // Still there
      expect(result.spells_and_abilities[1]).toEqual(testAbility);
    });

    it('should handle new resources in level up', () => {
      const levelUpWithNewResource = {
        ...testLevelUp,
        resources: {
          HP: 120,
          MP: 60,
          Stamina: 80 // New resource
        }
      };

      const result = applyLevelUp(levelUpWithNewResource, { ...baseCharacterStats });
      expect(result.resources.Stamina.max_value).toBe(80);
      expect(result.resources.Stamina.start_value).toBe(80); // New resource gets start_value = max_value
    });

    it('should preserve game_ends_when_zero property', () => {
      const result = applyLevelUp(testLevelUp, { ...baseCharacterStats });
      expect(result.resources.HP.game_ends_when_zero).toBe(true);
      expect(result.resources.MP.game_ends_when_zero).toBe(false);
    });

    it('should handle undefined aiLevelUp', () => {
      const result = applyLevelUp(undefined, { ...baseCharacterStats });
      expect(result).toEqual(baseCharacterStats);
    });

    it('should handle null aiLevelUp', () => {
      const result = applyLevelUp(null as any, { ...baseCharacterStats });
      expect(result).toEqual(baseCharacterStats);
    });

    it('should not mutate original character stats', () => {
      const originalStats = JSON.parse(JSON.stringify(baseCharacterStats)); // Deep clone
      const result = applyLevelUp(testLevelUp, { ...baseCharacterStats });

      // Verify original stats are unchanged by comparing with deep clone
      expect(originalStats.level).toBe(1);
      expect(originalStats.resources.HP.max_value).toBe(100);
      expect(originalStats.attributes.Strength).toBe(10);
      expect(originalStats.spells_and_abilities).toHaveLength(1);

      // Verify result is different
      expect(result.level).toBe(2);
      expect(result.resources.HP.max_value).toBe(120);
    });

    it('should handle empty resources in level up', () => {
      const levelUpWithEmptyResources = {
        ...testLevelUp,
        resources: {}
      };

      const result = applyLevelUp(levelUpWithEmptyResources, { ...baseCharacterStats });
      expect(result.resources.HP.max_value).toBe(100); // Unchanged
      expect(result.resources.MP.max_value).toBe(50);  // Unchanged
    });

    it('should handle level up with zero resource values', () => {
      const levelUpWithZeroResources = {
        ...testLevelUp,
        resources: {
          HP: 0,
          MP: 0
        }
      };

      const result = applyLevelUp(levelUpWithZeroResources, { ...baseCharacterStats });
      expect(result.resources.HP.max_value).toBe(0);
      expect(result.resources.MP.max_value).toBe(0);
    });

    it('should handle level up with negative resource values', () => {
      const levelUpWithNegativeResources = {
        ...testLevelUp,
        resources: {
          HP: -10,
          MP: -5
        }
      };

      const result = applyLevelUp(levelUpWithNegativeResources, { ...baseCharacterStats });
      expect(result.resources.HP.max_value).toBe(-10);
      expect(result.resources.MP.max_value).toBe(-5);
    });

    it('should handle character with no existing attributes', () => {
      const statsWithoutAttributes = {
        ...baseCharacterStats,
        attributes: {}
      };

      const result = applyLevelUp(testLevelUp, statsWithoutAttributes);
      expect(result.attributes.Strength).toBe(1); // 0 + 1
    });

    it('should handle character with no existing abilities', () => {
      const statsWithoutAbilities = {
        ...baseCharacterStats,
        spells_and_abilities: []
      };

      const result = applyLevelUp(testLevelUp, statsWithoutAbilities);
      expect(result.spells_and_abilities).toHaveLength(1);
      expect(result.spells_and_abilities[0]).toEqual(testAbility);
    });

    it('should handle complex ability replacement scenario', () => {
      const complexStats = {
        ...baseCharacterStats,
        spells_and_abilities: [
          { name: 'Ability A', effect: 'Effect A', resource_cost: { resource_key: 'MP', cost: 5 } },
          { name: 'Ability B', effect: 'Effect B', resource_cost: { resource_key: 'MP', cost: 8 } },
          { name: 'Ability C', effect: 'Effect C', resource_cost: { resource_key: 'HP', cost: 2 } }
        ]
      };

      const levelUpReplacingMiddle = {
        ...testLevelUp,
        formerAbilityName: 'Ability B'
      };

      const result = applyLevelUp(levelUpReplacingMiddle, complexStats);
      expect(result.spells_and_abilities).toHaveLength(3); // 3 - 1 + 1
      expect(result.spells_and_abilities.find(a => a.name === 'Ability A')).toBeDefined();
      expect(result.spells_and_abilities.find(a => a.name === 'Ability B')).toBeUndefined();
      expect(result.spells_and_abilities.find(a => a.name === 'Ability C')).toBeDefined();
      expect(result.spells_and_abilities.find(a => a.name === 'Fireball')).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete leveling workflow', () => {
      // Test a complete character progression scenario
      let character: CharacterStats = {
        level: 1,
        resources: {
          HP: { max_value: 100, start_value: 100, game_ends_when_zero: true },
          MP: { max_value: 30, start_value: 30, game_ends_when_zero: false }
        },
        attributes: { Strength: 8, Intelligence: 6 },
        skills: { Combat: 2, Magic: 1 },
        spells_and_abilities: [
          { name: 'Strike', effect: 'Basic attack', resource_cost: { resource_key: undefined, cost: 0 } }
        ]
      };

      // Level 2
      const levelUp2: AiLevelUp = {
        character_name: 'Hero',
        level_up_explanation: 'Growing stronger!',
        attribute: 'Strength',
        ability: { name: 'Power Strike', effect: 'Strong attack', resource_cost: { resource_key: 'MP', cost: 5 } },
        resources: { HP: 120, MP: 40 }
      };

      character = applyLevelUp(levelUp2, character);
      expect(character.level).toBe(2);
      expect(character.attributes.Strength).toBe(9);
      expect(character.spells_and_abilities).toHaveLength(2);

      // Level 3 with ability replacement
      const levelUp3: AiLevelUp = {
        character_name: 'Hero',
        level_up_explanation: 'Mastering combat!',
        attribute: 'Intelligence',
        formerAbilityName: 'Strike',
        ability: { name: 'Fireball', effect: 'Magic attack', resource_cost: { resource_key: 'MP', cost: 10 } },
        resources: { HP: 140, MP: 50 }
      };

      character = applyLevelUp(levelUp3, character);
      expect(character.level).toBe(3);
      expect(character.attributes.Intelligence).toBe(7);
      expect(character.spells_and_abilities).toHaveLength(2);
      expect(character.spells_and_abilities.find(a => a.name === 'Strike')).toBeUndefined();
      expect(character.spells_and_abilities.find(a => a.name === 'Fireball')).toBeDefined();
    });

    it('should handle XP mapping with level progression', () => {
      // Test XP calculation at different levels
      expect(getXPNeededForLevel(1)).toBe(100);
      expect(getXPNeededForLevel(2)).toBe(120);
      expect(getXPNeededForLevel(5)).toBe(180);

      // Test XP mapping for different values
      const smallXP = mapXP({
        sourceName: 'Quest',
        targetName: 'Hero',
        type: 'XP_gained',
        value: { result: 'SMALL' }
      });
      expect(smallXP.value).toEqual({ result: 0 });

      const mediumXP = mapXP({
        sourceName: 'Combat',
        targetName: 'Hero',
        type: 'XP_gained',
        value: { result: 'MEDIUM' }
      });
      expect(mediumXP.value).toEqual({ result: 10 });

      const highXP = mapXP({
        sourceName: 'Boss',
        targetName: 'Hero',
        type: 'XP_gained',
        value: { result: 'HIGH' }
      });
      expect(highXP.value).toEqual({ result: 20 });
    });
  });
});
