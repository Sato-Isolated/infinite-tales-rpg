import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mapGameState, mapStatsUpdates, mapStatsUpdate } from './mappers';
import type { GameActionState } from '$lib/types/actions';
import type { DiceRoll, StatsUpdate } from './combatAgent';
import Dice from 'dice-notation-js';

// Mock dice-notation-js to avoid external dependencies in tests
vi.mock('dice-notation-js', () => ({
  default: {
    detailed: vi.fn()
  }
}));

const mockDice = vi.mocked(Dice);

describe('Mappers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mapStatsUpdate', () => {
    it('should preserve already parsed DiceRoll objects without double-wrapping', () => {
      // This test validates the fix for the double-wrapping issue
      const existingDiceRoll: DiceRoll = {
        result: 15,
        number: 1,
        type: 20,
        modifier: 5,
        rolls: [10]
      };

      const statsUpdate = {
        sourceName: 'Hero',
        targetName: 'Goblin',
        value: existingDiceRoll,
        type: 'damage'
      };

      const result = mapStatsUpdate(statsUpdate);

      // Should preserve the original DiceRoll structure
      expect(result.value).toEqual(existingDiceRoll);
      expect(result.value.result).toBe(15);
      expect(result.value.number).toBe(1);
      expect(result.value.type).toBe(20);
      expect(result.value.modifier).toBe(5);
      expect(result.value.rolls).toEqual([10]);
    });

    it('should handle string values by parsing them into DiceRoll format', () => {
      const mockDiceResult: DiceRoll = {
        result: 8,
        number: 1,
        type: 6,
        modifier: 2,
        rolls: [6]
      };

      mockDice.detailed.mockReturnValue(mockDiceResult);

      const statsUpdate = {
        sourceName: 'Hero',
        targetName: 'Goblin',
        value: '1d6+2',
        type: 'damage'
      };

      const result = mapStatsUpdate(statsUpdate);

      expect(mockDice.detailed).toHaveBeenCalledWith('1d6+2');
      expect(result.value).toEqual(mockDiceResult);
    });

    it('should handle parsing errors gracefully with number fallback', () => {
      mockDice.detailed.mockImplementation(() => {
        throw new Error('Invalid dice notation');
      });

      const statsUpdate = {
        sourceName: 'Hero',
        targetName: 'Goblin',
        value: '15',
        type: 'damage'
      };

      const result = mapStatsUpdate(statsUpdate);

      expect(result.value.result).toBe(15);
      expect(result.sourceName).toBe('Hero');
      expect(result.targetName).toBe('Goblin');
      expect(result.type).toBe('damage');
    });

    it('should handle invalid number strings with fallback', () => {
      mockDice.detailed.mockImplementation(() => {
        throw new Error('Invalid dice notation');
      });

      const statsUpdate = {
        sourceName: 'Hero',
        targetName: 'Goblin',
        value: 'invalid',
        type: 'damage'
      };

      const result = mapStatsUpdate(statsUpdate);

      expect(result.value.result).toBe('invalid');
      expect(result.sourceName).toBe('Hero');
      expect(result.targetName).toBe('Goblin');
      expect(result.type).toBe('damage');
    });

    it('should preserve all properties from input stats_update', () => {
      const statsUpdate = {
        sourceName: 'Hero',
        targetName: 'Goblin',
        value: { result: 10 },
        type: 'damage',
        customProperty: 'test'
      };

      const result = mapStatsUpdate(statsUpdate);

      expect(result.sourceName).toBe('Hero');
      expect(result.targetName).toBe('Goblin');
      expect(result.type).toBe('damage');
      expect((result as any).customProperty).toBe('test');
    });
  });

  describe('mapStatsUpdates', () => {
    it('should map an array of stats updates', () => {
      const gameActionState: Pick<GameActionState, 'stats_update'> = {
        stats_update: [
          {
            sourceName: 'Hero',
            targetName: 'Goblin1',
            value: { result: 10 },
            type: 'damage'
          },
          {
            sourceName: 'Hero',
            targetName: 'Goblin2',
            value: { result: 15 },
            type: 'damage'
          }
        ]
      };

      mapStatsUpdates(gameActionState);

      expect(gameActionState.stats_update).toHaveLength(2);
      expect(gameActionState.stats_update![0].value).toEqual({ result: 10 });
      expect(gameActionState.stats_update![1].value).toEqual({ result: 15 });
    });

    it('should handle undefined stats_update gracefully', () => {
      const gameActionState: Pick<GameActionState, 'stats_update'> = {
        stats_update: undefined as any
      };

      expect(() => mapStatsUpdates(gameActionState)).not.toThrow();
      expect(gameActionState.stats_update).toBeUndefined();
    });

    it('should handle empty stats_update array', () => {
      const gameActionState: Pick<GameActionState, 'stats_update'> = {
        stats_update: []
      };

      mapStatsUpdates(gameActionState);

      expect(gameActionState.stats_update).toEqual([]);
    });
  });

  describe('mapGameState', () => {
    it('should call mapStatsUpdates when state is provided', () => {
      const gameState: GameActionState = {
        id: 1,
        story: 'Test story',
        stats_update: [
          {
            sourceName: 'Hero',
            targetName: 'Goblin',
            value: { result: 10 },
            type: 'damage'
          }
        ]
      } as GameActionState;

      expect(() => mapGameState(gameState)).not.toThrow();
      // After mapping, the stats_update should be processed
      expect(gameState.stats_update![0].value).toEqual({ result: 10 });
    });

    it('should handle undefined state gracefully', () => {
      expect(() => mapGameState(undefined as any)).not.toThrow();
    });

    it('should handle null state gracefully', () => {
      expect(() => mapGameState(null as any)).not.toThrow();
    });
  });

  describe('Regression tests for combat agent fixes', () => {
    it('should not create nested DiceRoll structures (regression test)', () => {
      // This specific test ensures the fix for the combat agent nesting issue
      const existingDiceRoll: DiceRoll = {
        result: 15,
        number: 1,
        type: 20,
        modifier: 5,
        rolls: [10]
      };

      const statsUpdate = {
        sourceName: 'Hero',
        targetName: 'Goblin Warrior',
        value: existingDiceRoll,
        type: 'damage'
      };

      const result = mapStatsUpdate(statsUpdate);

      // The critical assertion: result should NOT be { result: { result: 15 } }
      // but should be { result: 15 }
      expect(result.value.result).toBe(15);
      expect(typeof result.value.result).toBe('number');

      // Ensure we don't have nested result objects
      expect((result.value.result as any).result).toBeUndefined();
    });

    it('should handle mixed array of pre-parsed and string values', () => {
      const mockDiceResult: DiceRoll = {
        result: 12,
        number: 2,
        type: 6,
        modifier: 0,
        rolls: [4, 8]
      };

      mockDice.detailed.mockReturnValue(mockDiceResult);

      const gameActionState: Pick<GameActionState, 'stats_update'> = {
        stats_update: [
          {
            sourceName: 'Hero',
            targetName: 'Goblin1',
            value: { result: 10, rolls: [10] }, // Pre-parsed
            type: 'damage'
          },
          {
            sourceName: 'Hero',
            targetName: 'Goblin2',
            value: '2d6' as any, // String to be parsed (mapStatsUpdate accepts any)
            type: 'damage'
          }
        ]
      };

      mapStatsUpdates(gameActionState);

      // First update should preserve existing DiceRoll
      expect(gameActionState.stats_update![0].value.result).toBe(10);
      expect(gameActionState.stats_update![0].value.rolls).toEqual([10]);

      // Second update should be parsed
      expect(gameActionState.stats_update![1].value).toEqual(mockDiceResult);
      expect(mockDice.detailed).toHaveBeenCalledWith('2d6');
    });
  });
});
