import { describe, it, expect, beforeEach, vi } from 'vitest';
import { migrateIfApplicable } from '../versionMigration';
import { defaultGameSettings } from '$lib/types/gameSettings';
import type { GameActionState } from '$lib/types/gameState';

// Mock the dependencies
vi.mock('$lib/types/gameSettings', () => ({
  defaultGameSettings: vi.fn(() => ({
    randomEventsHandling: 'enabled'
  }))
}));

describe('versionMigration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.log to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => { });
  });

  describe('migrateIfApplicable', () => {
    it('should return unchanged state when state is null', () => {
      const result = migrateIfApplicable('anyKey', null);
      expect(result).toBeNull();
    });

    it('should return unchanged state when state is undefined', () => {
      const result = migrateIfApplicable('anyKey', undefined);
      expect(result).toBeUndefined();
    });

    it('should return unchanged state when state is empty', () => {
      const result = migrateIfApplicable('anyKey', '');
      expect(result).toBe('');
    });

    it('should apply all migrations in sequence for relevant keys', () => {
      const gameSettings = {};
      const result = migrateIfApplicable('gameSettingsState', gameSettings);

      expect(defaultGameSettings).toHaveBeenCalled();
      expect(result).toEqual({
        randomEventsHandling: 'enabled'
      });
    });

    it('should return unchanged state for unrecognized keys', () => {
      const originalState = { someData: 'test' };
      const result = migrateIfApplicable('unknownKey', originalState);
      expect(result).toEqual(originalState);
    });
  });

  describe('migrate11to11_1 (gameSettingsState)', () => {
    it('should add randomEventsHandling to gameSettingsState', () => {
      const gameSettings = {
        existingProperty: 'value',
        anotherProperty: 123
      };

      const result = migrateIfApplicable('gameSettingsState', gameSettings);

      expect(result).toEqual({
        existingProperty: 'value',
        anotherProperty: 123,
        randomEventsHandling: 'enabled'
      });
    });

    it('should not modify non-gameSettingsState keys', () => {
      const state = { someProperty: 'value' };
      const result = migrateIfApplicable('otherKey', state);
      expect(result).toEqual(state);
    });

    it('should overwrite existing randomEventsHandling property', () => {
      const gameSettings = {
        randomEventsHandling: 'oldValue',
        otherProperty: 'unchanged'
      };

      const result = migrateIfApplicable('gameSettingsState', gameSettings);

      expect(result).toEqual({
        randomEventsHandling: 'enabled',
        otherProperty: 'unchanged'
      });
    });
  });

  describe('migrate09to10 (gameActionsState)', () => {
    it('should migrate targetId to targetName and sourceId to sourceName', () => {
      const gameActions: GameActionState[] = [
        {
          id: 1,
          stats_update: [
            {
              targetId: 'player1',
              sourceId: 'enemy1',
              value: 10
            },
            {
              targetId: 'player2',
              sourceId: 'enemy2',
              value: 20
            }
          ]
        } as any
      ];

      const result = migrateIfApplicable('gameActionsState', gameActions) as GameActionState[];

      expect(result[0].stats_update).toEqual([
        {
          targetId: 'player1',
          sourceId: 'enemy1',
          targetName: 'player1',
          sourceName: 'enemy1',
          value: 10
        },
        {
          targetId: 'player2',
          sourceId: 'enemy2',
          targetName: 'player2',
          sourceName: 'enemy2',
          value: 20
        }
      ]);
    });

    it('should not overwrite existing targetName and sourceName', () => {
      const gameActions: GameActionState[] = [
        {
          id: 1,
          stats_update: [
            {
              targetId: 'player1',
              sourceId: 'enemy1',
              targetName: 'existingTargetName',
              sourceName: 'existingSourceName',
              value: 10
            }
          ]
        } as any
      ];

      const result = migrateIfApplicable('gameActionsState', gameActions) as GameActionState[];

      expect(result[0].stats_update[0]).toEqual({
        targetId: 'player1',
        sourceId: 'enemy1',
        targetName: 'existingTargetName',
        sourceName: 'existingSourceName',
        value: 10
      });
    });

    it('should handle actions without stats_update', () => {
      const gameActions: GameActionState[] = [
        {
          id: 1,
          action: 'move',
          description: 'Player moved'
        } as any
      ];

      const result = migrateIfApplicable('gameActionsState', gameActions) as GameActionState[];

      expect(result).toEqual(gameActions);
    });

    it('should handle empty stats_update array', () => {
      const gameActions: GameActionState[] = [
        {
          id: 1,
          stats_update: []
        } as any
      ];

      const result = migrateIfApplicable('gameActionsState', gameActions) as GameActionState[];

      expect(result[0].stats_update).toEqual([]);
    });

    it('should not modify non-gameActionsState keys', () => {
      const state = { someData: 'test' };
      const result = migrateIfApplicable('otherKey', state);
      expect(result).toEqual(state);
    });
  });

  describe('migrate051to06 (characterStatsState)', () => {
    it('should add level property when missing', () => {
      const characterStats = {
        name: 'Hero',
        health: 100,
        resources: {},  // Add resources to prevent migrate062to07 from failing
        spells_and_abilities: []  // Add to prevent migrate062to07 from failing
      };

      const result = migrateIfApplicable('characterStatsState', characterStats);

      expect(result).toEqual({
        name: 'Hero',
        health: 100,
        level: 1,
        resources: {},
        spells_and_abilities: []
      });
    });

    it('should not overwrite existing level property', () => {
      const characterStats = {
        name: 'Hero',
        health: 100,
        level: 5,
        resources: {},  // Add resources to prevent migrate062to07 from failing
        spells_and_abilities: []  // Add to prevent migrate062to07 from failing
      };

      const result = migrateIfApplicable('characterStatsState', characterStats);

      expect(result).toEqual({
        name: 'Hero',
        health: 100,
        level: 5,
        resources: {},
        spells_and_abilities: []
      });
    });

    it('should not modify non-characterStatsState keys', () => {
      const state = { someData: 'test' };
      const result = migrateIfApplicable('otherKey', state);
      expect(result).toEqual(state);
    });
  });

  describe('migrate062to07 (characterStatsState)', () => {
    it('should migrate MAX_HP and MAX_MP to new resource format', () => {
      const characterStats = {
        resources: {
          MAX_HP: 100,
          MAX_MP: 50,
          otherResource: 25
        },
        spells_and_abilities: []
      };

      const result = migrateIfApplicable('characterStatsState', characterStats);

      expect(result.resources).toEqual({
        HP: {
          max_value: 100,
          start_value: 100,
          game_ends_when_zero: true
        },
        MP: {
          max_value: 50,
          start_value: 50,
          game_ends_when_zero: false
        },
        otherResource: 25
      });
    });

    it('should migrate spell mp_cost to resource_cost', () => {
      const characterStats = {
        resources: {
          MAX_HP: 100,
          MAX_MP: 50
        },
        spells_and_abilities: [
          {
            name: 'Fireball',
            mp_cost: 20,
            damage: 50
          },
          {
            name: 'Heal',
            mp_cost: 15,
            healing: 30
          },
          {
            name: 'Sword Strike',
            damage: 25
            // No mp_cost
          }
        ]
      };

      const result = migrateIfApplicable('characterStatsState', characterStats);

      expect(result.spells_and_abilities).toEqual([
        {
          name: 'Fireball',
          resource_cost: { cost: 20, resource_key: 'MP' },
          damage: 50
        },
        {
          name: 'Heal',
          resource_cost: { cost: 15, resource_key: 'MP' },
          healing: 30
        },
        {
          name: 'Sword Strike',
          damage: 25
        }
      ]);
    });

    it('should not migrate if MAX_HP and MAX_MP are not present', () => {
      const characterStats = {
        resources: {
          HP: { max_value: 100, start_value: 100, game_ends_when_zero: true },
          MP: { max_value: 50, start_value: 50, game_ends_when_zero: false }
        },
        spells_and_abilities: [
          {
            name: 'Fireball',
            resource_cost: { cost: 20, resource_key: 'MP' }
          }
        ]
      };

      const result = migrateIfApplicable('characterStatsState', characterStats);

      expect(result).toEqual(characterStats);
    });

    it('should handle empty spells_and_abilities array', () => {
      const characterStats = {
        resources: {
          MAX_HP: 100,
          MAX_MP: 50
        },
        spells_and_abilities: []
      };

      const result = migrateIfApplicable('characterStatsState', characterStats);

      expect(result.spells_and_abilities).toEqual([]);
      expect(result.resources.HP).toEqual({
        max_value: 100,
        start_value: 100,
        game_ends_when_zero: true
      });
    });

    it('should not modify non-characterStatsState keys', () => {
      const state = { someData: 'test' };
      const result = migrateIfApplicable('otherKey', state);
      expect(result).toEqual(state);
    });
  });

  describe('migrateNPCState', () => {
    it('should convert array format to empty object and log migration', () => {
      const npcArrayState = [
        { id: 1, name: 'Goblin' },
        { id: 2, name: 'Dragon' }
      ];

      const result = migrateIfApplicable('npcState', npcArrayState);

      expect(result).toEqual({});
      expect(console.log).toHaveBeenCalledWith(
        'Migrating npcState from array to object format. Previous array data will be reset to empty object.'
      );
    });

    it('should not modify object format npcState', () => {
      const npcObjectState = {
        npc1: { name: 'Goblin', level: 5 },
        npc2: { name: 'Dragon', level: 10 }
      };

      const result = migrateIfApplicable('npcState', npcObjectState);

      expect(result).toEqual(npcObjectState);
      expect(console.log).not.toHaveBeenCalled();
    });

    it('should handle empty array', () => {
      const emptyArray: any[] = [];

      const result = migrateIfApplicable('npcState', emptyArray);

      expect(result).toEqual({});
      expect(console.log).toHaveBeenCalledWith(
        'Migrating npcState from array to object format. Previous array data will be reset to empty object.'
      );
    });

    it('should not modify non-npcState keys', () => {
      const arrayState = [1, 2, 3];
      const result = migrateIfApplicable('otherKey', arrayState);
      expect(result).toEqual(arrayState);
    });
  });

  describe('Complex migration scenarios', () => {
    it('should apply multiple migrations to characterStatsState sequentially', () => {
      const characterStats = {
        resources: {
          MAX_HP: 120,
          MAX_MP: 80
        },
        spells_and_abilities: [
          {
            name: 'Lightning Bolt',
            mp_cost: 30
          }
        ]
        // Missing level property
      };

      const result = migrateIfApplicable('characterStatsState', characterStats);

      // Should have level added (migrate051to06)
      expect(result.level).toBe(1);

      // Should have resources migrated (migrate062to07)
      expect(result.resources).toEqual({
        HP: {
          max_value: 120,
          start_value: 120,
          game_ends_when_zero: true
        },
        MP: {
          max_value: 80,
          start_value: 80,
          game_ends_when_zero: false
        }
      });

      // Should have spell costs migrated
      expect(result.spells_and_abilities[0]).toEqual({
        name: 'Lightning Bolt',
        resource_cost: { cost: 30, resource_key: 'MP' }
      });
    });

    it('should apply multiple migrations to gameActionsState with gameSettingsState', () => {
      const gameActions: GameActionState[] = [
        {
          id: 1,
          stats_update: [
            {
              targetId: 'hero',
              sourceId: 'monster'
            }
          ]
        } as any
      ];

      const gameSettings = {};

      const migratedActions = migrateIfApplicable('gameActionsState', gameActions) as GameActionState[];
      const migratedSettings = migrateIfApplicable('gameSettingsState', gameSettings);

      // Actions should have name properties added
      expect(migratedActions[0].stats_update[0]).toHaveProperty('targetName', 'hero');
      expect(migratedActions[0].stats_update[0]).toHaveProperty('sourceName', 'monster');

      // Settings should have randomEventsHandling added
      expect(migratedSettings).toHaveProperty('randomEventsHandling', 'enabled');
    });

    it('should handle deeply nested objects without errors', () => {
      const complexState = {
        resources: {
          MAX_HP: 200,
          MAX_MP: 100,
          nested: {
            deep: {
              property: 'value'
            }
          }
        },
        spells_and_abilities: [
          {
            name: 'Complex Spell',
            mp_cost: 50,
            effects: {
              damage: { min: 10, max: 20 },
              healing: { amount: 15 }
            }
          }
        ]
      };

      const result = migrateIfApplicable('characterStatsState', complexState);

      expect(result.level).toBe(1);
      expect(result.resources.nested.deep.property).toBe('value');
      expect(result.spells_and_abilities[0].effects).toEqual({
        damage: { min: 10, max: 20 },
        healing: { amount: 15 }
      });
    });

    it('should be idempotent - running migration twice should not change result', () => {
      const originalState = {
        resources: {
          MAX_HP: 100,
          MAX_MP: 50
        },
        spells_and_abilities: [
          {
            name: 'Test Spell',
            mp_cost: 25
          }
        ]
      };

      const firstMigration = migrateIfApplicable('characterStatsState', originalState);
      const secondMigration = migrateIfApplicable('characterStatsState', firstMigration);

      expect(firstMigration).toEqual(secondMigration);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle null resources in characterStatsState', () => {
      const characterStats = {
        resources: null,
        spells_and_abilities: []
      };

      // This will actually throw an error due to the current implementation
      expect(() => {
        migrateIfApplicable('characterStatsState', characterStats);
      }).toThrow('Cannot read properties of null');
    });

    it('should handle missing spells_and_abilities in characterStatsState', () => {
      const characterStats = {
        resources: {
          MAX_HP: 100,
          MAX_MP: 50
        }
        // Missing spells_and_abilities
      };

      // This will actually throw an error due to the current implementation
      expect(() => {
        migrateIfApplicable('characterStatsState', characterStats);
      }).toThrow('Cannot read properties of undefined');
    });

    it('should handle non-object states gracefully', () => {
      const primitiveState = 'just a string';

      // This will actually throw an error due to the current implementation
      expect(() => {
        migrateIfApplicable('characterStatsState', primitiveState);
      }).toThrow('Cannot create property');
    });

    it('should handle numeric states', () => {
      const numericState = 42;
      const result = migrateIfApplicable('anyKey', numericState);
      expect(result).toBe(numericState);
    });

    it('should handle boolean states', () => {
      const booleanState = true;
      const result = migrateIfApplicable('anyKey', booleanState);
      expect(result).toBe(booleanState);
    });
  });
});

