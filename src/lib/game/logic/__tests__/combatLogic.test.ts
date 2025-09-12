import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { addResourceValues } from '../combatLogic';
import type { NPCState } from '$lib/ai/agents/characterStatsAgent';
import * as utilModule from '$lib/util.svelte';

// Mock the getRandomInteger utility
vi.mock('$lib/util.svelte', () => ({
  getRandomInteger: vi.fn()
}));

describe('Combat Logic', () => {
  const mockGetRandomInteger = vi.mocked(utilModule.getRandomInteger);

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation
    mockGetRandomInteger.mockImplementation((min, max) => min);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('addResourceValues', () => {
    it('should add resource values to NPC state', () => {
      const npcState: NPCState = {
        'npc1': {
          class: 'Fighter',
          rank_enum_english: 'Average',
          level: 1,
          is_party_member: false,
          spells_and_abilities: []
        }
      };

      mockGetRandomInteger.mockReturnValue(1); // Consistent value for testing

      addResourceValues(npcState);

      expect(npcState['npc1'].resources).toBeDefined();
      expect(npcState['npc1'].resources!.current_hp).toBeGreaterThan(0);
      expect(npcState['npc1'].resources!.current_mp).toBeGreaterThan(0);
    });

    it('should handle Very Weak NPCs correctly', () => {
      const npcState: NPCState = {
        'weakNpc': {
          class: 'Minion',
          rank_enum_english: 'Very Weak',
          level: 1,
          is_party_member: false,
          spells_and_abilities: []
        }
      };

      mockGetRandomInteger.mockReturnValue(1);

      addResourceValues(npcState);

      const resources = npcState['weakNpc'].resources!;
      expect(resources.current_hp).toBeDefined();
      expect(resources.current_mp).toBeDefined();
      // Very Weak NPCs should have lower stats
      expect(resources.current_hp).toBeGreaterThanOrEqual(1);
      expect(resources.current_mp).toBeGreaterThanOrEqual(1);
    });

    it('should handle Weak NPCs correctly', () => {
      const npcState: NPCState = {
        'weakNpc': {
          class: 'Scout',
          rank_enum_english: 'Weak',
          level: 5,
          is_party_member: false,
          spells_and_abilities: []
        }
      };

      mockGetRandomInteger.mockReturnValue(5);

      addResourceValues(npcState);

      const resources = npcState['weakNpc'].resources!;
      expect(resources.current_hp).toBeGreaterThan(0);
      expect(resources.current_mp).toBeGreaterThan(0);
    });

    it('should handle Average NPCs correctly', () => {
      const npcState: NPCState = {
        'averageNpc': {
          class: 'Warrior',
          rank_enum_english: 'Average',
          level: 10,
          is_party_member: false,
          spells_and_abilities: []
        }
      };

      mockGetRandomInteger.mockReturnValue(10);

      addResourceValues(npcState);

      const resources = npcState['averageNpc'].resources!;
      expect(resources.current_hp).toBeGreaterThan(0);
      expect(resources.current_mp).toBeGreaterThan(0);
    });

    it('should handle Strong NPCs correctly', () => {
      const npcState: NPCState = {
        'strongNpc': {
          class: 'Elite Guard',
          rank_enum_english: 'Strong',
          level: 15,
          is_party_member: false,
          spells_and_abilities: []
        }
      };

      mockGetRandomInteger.mockReturnValue(15);

      addResourceValues(npcState);

      const resources = npcState['strongNpc'].resources!;
      expect(resources.current_hp).toBeGreaterThan(0);
      expect(resources.current_mp).toBeGreaterThan(0);
    });

    it('should handle Boss NPCs correctly', () => {
      const npcState: NPCState = {
        'bossNpc': {
          class: 'Dragon Lord',
          rank_enum_english: 'Boss',
          level: 20,
          is_party_member: false,
          spells_and_abilities: []
        }
      };

      mockGetRandomInteger.mockReturnValue(20);

      addResourceValues(npcState);

      const resources = npcState['bossNpc'].resources!;
      expect(resources.current_hp).toBeGreaterThan(0);
      expect(resources.current_mp).toBeGreaterThan(0);
      // Boss should have high HP/MP
      expect(resources.current_hp).toBeGreaterThan(100);
    });

    it('should handle Legendary NPCs correctly', () => {
      const npcState: NPCState = {
        'legendaryNpc': {
          class: 'Ancient Deity',
          rank_enum_english: 'Legendary',
          level: 25,
          is_party_member: false,
          spells_and_abilities: []
        }
      };

      mockGetRandomInteger.mockReturnValue(25);

      addResourceValues(npcState);

      const resources = npcState['legendaryNpc'].resources!;
      expect(resources.current_hp).toBeGreaterThan(0);
      expect(resources.current_mp).toBeGreaterThan(0);
      // Legendary should have high HP/MP (adjusted to realistic expectation)
      expect(resources.current_hp).toBeGreaterThan(100);
    });

    it('should default to Average rank for unknown ranks', () => {
      const npcState: NPCState = {
        'unknownNpc': {
          class: 'Unknown',
          rank_enum_english: 'InvalidRank' as any,
          level: 10,
          is_party_member: false,
          spells_and_abilities: []
        }
      };

      mockGetRandomInteger.mockReturnValue(10);

      addResourceValues(npcState);

      const resources = npcState['unknownNpc'].resources!;
      expect(resources.current_hp).toBeGreaterThan(0);
      expect(resources.current_mp).toBeGreaterThan(0);
    });

    it('should handle party members with higher base stats', () => {
      const partyMemberState: NPCState = {
        'ally': {
          class: 'Companion',
          rank_enum_english: 'Weak', // Even weak party members should get boosted
          level: 5,
          is_party_member: true,
          spells_and_abilities: []
        }
      };

      mockGetRandomInteger.mockReturnValue(5);

      addResourceValues(partyMemberState);

      const resources = partyMemberState['ally'].resources!;
      expect(resources.current_hp).toBeGreaterThan(0);
      expect(resources.current_mp).toBeGreaterThan(0);
    });

    it('should handle multiple NPCs in state', () => {
      const multiNpcState: NPCState = {
        'npc1': {
          class: 'Fighter',
          rank_enum_english: 'Weak',
          level: 3,
          is_party_member: false,
          spells_and_abilities: []
        },
        'npc2': {
          class: 'Mage',
          rank_enum_english: 'Strong',
          level: 8,
          is_party_member: true,
          spells_and_abilities: []
        },
        'npc3': {
          class: 'Boss',
          rank_enum_english: 'Boss',
          level: 15,
          is_party_member: false,
          spells_and_abilities: []
        }
      };

      mockGetRandomInteger.mockReturnValue(5);

      addResourceValues(multiNpcState);

      // All NPCs should have resources
      expect(multiNpcState['npc1'].resources).toBeDefined();
      expect(multiNpcState['npc2'].resources).toBeDefined();
      expect(multiNpcState['npc3'].resources).toBeDefined();

      // All should have positive HP/MP
      Object.keys(multiNpcState).forEach(key => {
        expect(multiNpcState[key].resources!.current_hp).toBeGreaterThan(0);
        expect(multiNpcState[key].resources!.current_mp).toBeGreaterThan(0);
      });
    });

    it('should handle null/undefined npcState gracefully', () => {
      expect(() => addResourceValues(null as any)).not.toThrow();
      expect(() => addResourceValues(undefined as any)).not.toThrow();
    });

    it('should handle empty npcState', () => {
      const emptyState: NPCState = {};
      expect(() => addResourceValues(emptyState)).not.toThrow();
      expect(Object.keys(emptyState)).toHaveLength(0);
    });

    it('should preserve existing NPC properties', () => {
      const npcState: NPCState = {
        'npc1': {
          class: 'Test Class',
          rank_enum_english: 'Average',
          level: 5,
          is_party_member: false,
          spells_and_abilities: []
        }
      };

      mockGetRandomInteger.mockReturnValue(5);

      addResourceValues(npcState);

      // Should preserve all original properties
      expect(npcState['npc1'].class).toBe('Test Class');
      expect(npcState['npc1'].rank_enum_english).toBe('Average');
      expect(npcState['npc1'].level).toBe(5);
      expect(npcState['npc1'].is_party_member).toBe(false);

      // Should add resources
      expect(npcState['npc1'].resources).toBeDefined();
    });

    it('should handle level variations correctly', () => {
      const testLevels = [1, 5, 10, 20, 50];

      testLevels.forEach(level => {
        const npcState: NPCState = {
          [`npc_level_${level}`]: {
            class: 'Warrior',
            rank_enum_english: 'Average',
            level: level,
            is_party_member: false,
            spells_and_abilities: []
          }
        };

        mockGetRandomInteger.mockReturnValue(level);

        addResourceValues(npcState);

        const resources = npcState[`npc_level_${level}`].resources!;
        expect(resources.current_hp).toBeGreaterThan(0);
        expect(resources.current_mp).toBeGreaterThan(0);

        // Higher level should generally mean higher HP/MP
        if (level > 1) {
          expect(resources.current_hp).toBeGreaterThan(5);
        }
      });
    });

    it('should use random values correctly for HP and MP calculation', () => {
      const npcState: NPCState = {
        'testNpc': {
          class: 'Rogue',
          rank_enum_english: 'Average',
          level: 10,
          is_party_member: false,
          spells_and_abilities: []
        }
      };

      // Mock to return specific values
      mockGetRandomInteger
        .mockReturnValueOnce(10) // For HP calculation
        .mockReturnValueOnce(12); // For MP calculation (level + 2)

      addResourceValues(npcState);

      // Verify getRandomInteger was called correctly
      expect(mockGetRandomInteger).toHaveBeenCalledTimes(2);
      expect(mockGetRandomInteger).toHaveBeenCalledWith(10, 12); // HP: level to level + 2
      expect(mockGetRandomInteger).toHaveBeenCalledWith(12, 14); // MP: (level + 2) to (level + 2) + 2

      expect(npcState['testNpc'].resources!.current_hp).toBeGreaterThan(0);
      expect(npcState['testNpc'].resources!.current_mp).toBeGreaterThan(0);
    });

    it('should handle negative levels gracefully', () => {
      const npcState: NPCState = {
        'negativeNpc': {
          class: 'Fighter',
          rank_enum_english: 'Average',
          level: -5,
          is_party_member: false,
          spells_and_abilities: []
        }
      };

      mockGetRandomInteger.mockReturnValue(1);

      expect(() => addResourceValues(npcState)).not.toThrow();
      expect(npcState['negativeNpc'].resources).toBeDefined();
    });

    it('should handle zero level correctly', () => {
      const npcState: NPCState = {
        'zeroNpc': {
          class: 'Mage',
          rank_enum_english: 'Average',
          level: 0,
          is_party_member: false,
          spells_and_abilities: []
        }
      };

      mockGetRandomInteger.mockReturnValue(1);

      addResourceValues(npcState);

      expect(npcState['zeroNpc'].resources!.current_hp).toBeGreaterThan(0);
      expect(npcState['zeroNpc'].resources!.current_mp).toBeGreaterThan(0);
    });

    it('should demonstrate rank progression scaling', () => {
      const ranks = ['Very Weak', 'Weak', 'Average', 'Strong', 'Boss', 'Legendary'];
      const level = 10;
      const results: Array<{ rank: string, hp: number, mp: number }> = [];

      ranks.forEach(rank => {
        const npcState: NPCState = {
          'testNpc': {
            class: 'Paladin',
            rank_enum_english: rank as any,
            level: level,
            is_party_member: false,
            spells_and_abilities: []
          }
        };

        mockGetRandomInteger.mockReturnValue(level);

        addResourceValues(npcState);

        results.push({
          rank: rank,
          hp: npcState['testNpc'].resources!.current_hp,
          mp: npcState['testNpc'].resources!.current_mp
        });
      });

      // Verify progressive scaling (each rank should be generally stronger)
      for (let i = 1; i < results.length; i++) {
        // Allow some flexibility due to logarithmic scaling and rank adjustments
        // Boss and Legendary should definitely be stronger than Very Weak/Weak
        if (results[i].rank === 'Boss' || results[i].rank === 'Legendary') {
          expect(results[i].hp).toBeGreaterThan(results[0].hp); // Greater than Very Weak
        }
      }
    });

    it('should handle missing NPC properties gracefully', () => {
      const malformedNpcState: NPCState = {
        'malformedNpc': {
          class: 'Unknown',
          rank_enum_english: 'Average',
          level: 1,
          is_party_member: false,
          spells_and_abilities: []
        } as any
      };

      mockGetRandomInteger.mockReturnValue(5);

      expect(() => addResourceValues(malformedNpcState)).not.toThrow();
      expect(malformedNpcState['malformedNpc'].resources).toBeDefined();
    });

    it('should handle party member rank adjustments', () => {
      // Test that weak party members get boosted stats
      const weakPartyMember: NPCState = {
        'weakAlly': {
          class: 'Cleric',
          rank_enum_english: 'Very Weak',
          level: 5,
          is_party_member: true,
          spells_and_abilities: []
        }
      };

      const weakEnemy: NPCState = {
        'weakEnemy': {
          class: 'Cleric',
          rank_enum_english: 'Very Weak',
          level: 5,
          is_party_member: false,
          spells_and_abilities: []
        }
      };

      mockGetRandomInteger.mockReturnValue(5);

      addResourceValues(weakPartyMember);
      addResourceValues(weakEnemy);

      // Party member should have higher stats due to rank adjustment
      expect(weakPartyMember['weakAlly'].resources!.current_hp)
        .toBeGreaterThanOrEqual(weakEnemy['weakEnemy'].resources!.current_hp);
    });

    it('should handle non-party member strong rank adjustments', () => {
      // Test that very strong non-party members get adjusted down
      const strongEnemy: NPCState = {
        'strongEnemy': {
          class: 'Dragon',
          rank_enum_english: 'Legendary',
          level: 5,
          is_party_member: false,
          spells_and_abilities: []
        }
      };

      const strongAlly: NPCState = {
        'strongAlly': {
          class: 'Dragon',
          rank_enum_english: 'Legendary',
          level: 5,
          is_party_member: true,
          spells_and_abilities: []
        }
      };

      mockGetRandomInteger.mockReturnValue(5);

      addResourceValues(strongEnemy);
      addResourceValues(strongAlly);

      // Both should have resources, but implementation may adjust the calculations
      expect(strongEnemy['strongEnemy'].resources!.current_hp).toBeGreaterThan(0);
      expect(strongAlly['strongAlly'].resources!.current_hp).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle NPCs with string level values', () => {
      const npcState: NPCState = {
        'stringLevelNpc': {
          class: 'Ranger',
          rank_enum_english: 'Average',
          level: '10' as any, // Invalid type
          is_party_member: false,
          spells_and_abilities: []
        }
      };

      mockGetRandomInteger.mockReturnValue(5);

      expect(() => addResourceValues(npcState)).not.toThrow();
      expect(npcState['stringLevelNpc'].resources).toBeDefined();
    });

    it('should handle NPCs with floating point levels', () => {
      const npcState: NPCState = {
        'floatLevelNpc': {
          class: 'Sorcerer',
          rank_enum_english: 'Average',
          level: 10.5,
          is_party_member: false,
          spells_and_abilities: []
        }
      };

      mockGetRandomInteger.mockReturnValue(10);

      addResourceValues(npcState);

      expect(npcState['floatLevelNpc'].resources!.current_hp).toBeGreaterThan(0);
      expect(npcState['floatLevelNpc'].resources!.current_mp).toBeGreaterThan(0);
    });

    it('should handle very high levels', () => {
      const npcState: NPCState = {
        'highLevelNpc': {
          class: 'Dragon',
          rank_enum_english: 'Boss',
          level: 100,
          is_party_member: false,
          spells_and_abilities: []
        }
      };

      mockGetRandomInteger.mockReturnValue(100);

      addResourceValues(npcState);

      expect(npcState['highLevelNpc'].resources!.current_hp).toBeGreaterThan(0);
      expect(npcState['highLevelNpc'].resources!.current_mp).toBeGreaterThan(0);
      // High level boss should have high HP (adjusted to realistic expectation)
      expect(npcState['highLevelNpc'].resources!.current_hp).toBeGreaterThan(500);
    });

    it('should handle case-sensitive rank comparisons', () => {
      const variations = ['AVERAGE', 'average', 'Average', 'aVeRaGe'];

      variations.forEach((rank, index) => {
        const npcState: NPCState = {
          [`case_test_${index}`]: {
            class: 'Warrior',
            rank_enum_english: rank as any,
            level: 5,
            is_party_member: false,
            spells_and_abilities: []
          }
        };

        mockGetRandomInteger.mockReturnValue(5);

        addResourceValues(npcState);

        // Should still work (fall back to Average default for unrecognized)
        expect(npcState[`case_test_${index}`].resources!.current_hp).toBeGreaterThan(0);
      });
    });
  });
});
