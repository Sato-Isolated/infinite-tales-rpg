import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  difficultyDiceRollModifier,
  getRequiredValue,
  getKarmaModifier,
  determineDiceRollResult,
  getDiceRollPromptAddition,
  type DiceRollResult
} from './diceRollLogic';
import { ActionDifficulty } from './gameLogic';
import * as utilModule from '$lib/util.svelte';

// Mock the getRandomInteger function for deterministic testing
vi.mock('$lib/util.svelte', () => ({
  getRandomInteger: vi.fn()
}));

describe('Dice Roll Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('difficultyDiceRollModifier', () => {
    it('should have correct difficulty modifiers', () => {
      expect(difficultyDiceRollModifier).toEqual({
        Easy: 4,
        Default: 0
      });
    });

    it('should have numeric values for all modifiers', () => {
      Object.values(difficultyDiceRollModifier).forEach(modifier => {
        expect(typeof modifier).toBe('number');
      });
    });
  });

  describe('getRequiredValue', () => {
    const mockGetRandomInteger = vi.mocked(utilModule.getRandomInteger);

    beforeEach(() => {
      mockGetRandomInteger.mockClear();
    });

    it('should return 0 for simple difficulty', () => {
      const result = getRequiredValue('simple', 'Default');
      expect(result).toBe(0);
      expect(mockGetRandomInteger).not.toHaveBeenCalled();
    });

    it('should generate random value for medium difficulty', () => {
      mockGetRandomInteger.mockReturnValue(10);

      const result = getRequiredValue('medium', 'Default');

      expect(mockGetRandomInteger).toHaveBeenCalledWith(8, 13);
      expect(result).toBe(10);
    });

    it('should generate random value for difficult difficulty', () => {
      mockGetRandomInteger.mockReturnValue(15);

      const result = getRequiredValue('difficult', 'Default');

      expect(mockGetRandomInteger).toHaveBeenCalledWith(14, 17);
      expect(result).toBe(15);
    });

    it('should generate random value for very_difficult difficulty', () => {
      mockGetRandomInteger.mockReturnValue(18);

      const result = getRequiredValue('very_difficult', 'Default');

      expect(mockGetRandomInteger).toHaveBeenCalledWith(17, 20);
      expect(result).toBe(18);
    });

    it('should apply Easy game difficulty modifier', () => {
      mockGetRandomInteger.mockReturnValue(12);

      const result = getRequiredValue('medium', 'Easy');

      expect(result).toBe(8); // 12 - 4 = 8
    });

    it('should not apply Default game difficulty modifier', () => {
      mockGetRandomInteger.mockReturnValue(12);

      const result = getRequiredValue('medium', 'Default');

      expect(result).toBe(12); // 12 - 0 = 12
    });

    it('should handle undefined action_difficulty as medium', () => {
      mockGetRandomInteger.mockReturnValue(11);

      const result = getRequiredValue(undefined, 'Default');

      expect(mockGetRandomInteger).toHaveBeenCalledWith(8, 13);
      expect(result).toBe(11);
    });

    it('should handle lowercase difficulty strings', () => {
      mockGetRandomInteger.mockReturnValue(16);

      const result = getRequiredValue('DIFFICULT', 'Default');

      expect(mockGetRandomInteger).toHaveBeenCalledWith(14, 17);
      expect(result).toBe(16);
    });

    it('should handle unknown difficulty as simple (returns 0)', () => {
      const result = getRequiredValue('unknown_difficulty', 'Default');

      expect(result).toBe(0);
      expect(mockGetRandomInteger).not.toHaveBeenCalled();
    });

    it('should handle null game difficulty gracefully', () => {
      mockGetRandomInteger.mockReturnValue(10);

      const result = getRequiredValue('medium', null as any);

      expect(result).toBe(10); // No modifier applied
    });
  });

  describe('getKarmaModifier', () => {
    it('should return 0 when history is undefined', () => {
      const result = getKarmaModifier(undefined as any, 10);
      expect(result).toBe(0);
    });

    it('should return 0 when history is null', () => {
      const result = getKarmaModifier(null as any, 10);
      expect(result).toBe(0);
    });

    it('should return 0 when history has less than 3 entries', () => {
      const result = getKarmaModifier([-1, -2], 10);
      expect(result).toBe(0);
    });

    it('should return 0 when last 3 rolls were not all negative', () => {
      const history = [-1, -2, 1, -3]; // Last 3: [-2, 1, -3] - not all negative
      const result = getKarmaModifier(history, 10);
      expect(result).toBe(0);
    });

    it('should return karma modifier when last 3 rolls were negative', () => {
      const history = [1, -1, -2, -3]; // Last 3: [-1, -2, -3] - all negative
      const result = getKarmaModifier(history, 10);
      expect(result).toBe(5); // Math.ceil(10 / 2) = 5
    });

    it('should calculate karma modifier correctly for different required values', () => {
      const history = [-1, -2, -3];

      expect(getKarmaModifier(history, 8)).toBe(4); // Math.ceil(8 / 2) = 4
      expect(getKarmaModifier(history, 15)).toBe(8); // Math.ceil(15 / 2) = 8
      expect(getKarmaModifier(history, 1)).toBe(1); // Math.ceil(1 / 2) = 1
    });

    it('should handle exactly 3 negative rolls', () => {
      const history = [-1, -2, -5];
      const result = getKarmaModifier(history, 12);
      expect(result).toBe(6); // Math.ceil(12 / 2) = 6
    });

    it('should handle mixed positive and negative in longer history', () => {
      const history = [2, 3, -1, 5, -2, -3, -4]; // Last 3: [-2, -3, -4] - all negative
      const result = getKarmaModifier(history, 14);
      expect(result).toBe(7); // Math.ceil(14 / 2) = 7
    });

    it('should handle zeros in history', () => {
      const history = [0, -1, -2]; // Last 3: [0, -1, -2] - not all negative (0 is not < 0)
      const result = getKarmaModifier(history, 10);
      expect(result).toBe(0);
    });
  });

  describe('determineDiceRollResult', () => {
    it('should return undefined for missing required_value', () => {
      const result = determineDiceRollResult(0, 10, 0);
      expect(result).toBeUndefined();
    });

    it('should return undefined for missing rolledValue', () => {
      const result = determineDiceRollResult(10, 0, 0);
      expect(result).toBeUndefined();
    });

    it('should return undefined for null values', () => {
      expect(determineDiceRollResult(null as any, 10, 0)).toBeUndefined();
      expect(determineDiceRollResult(10, null as any, 0)).toBeUndefined();
    });

    it('should return critical_failure for rolled 1', () => {
      const result = determineDiceRollResult(10, 1, 5);
      expect(result).toBe('critical_failure');
    });

    it('should return critical_success for rolled 20', () => {
      const result = determineDiceRollResult(10, 20, -5);
      expect(result).toBe('critical_success');
    });

    it('should handle NaN modifier as 0', () => {
      const result = determineDiceRollResult(10, 10, NaN);
      expect(result).toBe('regular_success'); // 10 + 0 - 10 = 0, which is >= 0
    });

    it('should handle NaN rolledValue as 0', () => {
      const result = determineDiceRollResult(5, NaN, 0);
      expect(result).toBeUndefined(); // NaN becomes 0, which triggers early return
    });

    it('should handle string modifier correctly', () => {
      const result = determineDiceRollResult(10, 8, '3' as any);
      expect(result).toBe('regular_success'); // 8 + 3 - 10 = 1 >= 0
    });

    describe('success and failure thresholds', () => {
      it('should return major_failure for diff <= -6', () => {
        // Required: 15, Rolled: 5, Modifier: 0 -> Diff: 5 - 15 = -10
        const result = determineDiceRollResult(15, 5, 0);
        expect(result).toBe('major_failure');
      });

      it('should return regular_failure for diff <= -3 (but > -6)', () => {
        // Required: 10, Rolled: 5, Modifier: 0 -> Diff: 5 - 10 = -5
        const result = determineDiceRollResult(10, 5, 0);
        expect(result).toBe('regular_failure');
      });

      it('should return partial_failure for diff <= -1 (but > -3)', () => {
        // Required: 10, Rolled: 8, Modifier: 0 -> Diff: 8 - 10 = -2
        const result = determineDiceRollResult(10, 8, 0);
        expect(result).toBe('partial_failure');
      });

      it('should return regular_success for diff >= 0 (but < 6)', () => {
        // Required: 10, Rolled: 12, Modifier: 0 -> Diff: 12 - 10 = 2
        const result = determineDiceRollResult(10, 12, 0);
        expect(result).toBe('regular_success');
      });

      it('should return major_success for diff >= 6', () => {
        // Required: 10, Rolled: 18, Modifier: 0 -> Diff: 18 - 10 = 8
        const result = determineDiceRollResult(10, 18, 0);
        expect(result).toBe('major_success');
      });

      it('should handle exact boundary conditions', () => {
        // Test exact -6 diff (major_failure boundary)
        expect(determineDiceRollResult(15, 9, 0)).toBe('major_failure'); // 9 - 15 = -6

        // Test exact -3 diff (regular_failure boundary)
        expect(determineDiceRollResult(10, 7, 0)).toBe('regular_failure'); // 7 - 10 = -3

        // Test exact -1 diff (partial_failure boundary)
        expect(determineDiceRollResult(10, 9, 0)).toBe('partial_failure'); // 9 - 10 = -1

        // Test exact 0 diff (regular_success boundary)
        expect(determineDiceRollResult(10, 10, 0)).toBe('regular_success'); // 10 - 10 = 0

        // Test exact 6 diff (major_success boundary)
        expect(determineDiceRollResult(10, 16, 0)).toBe('major_success'); // 16 - 10 = 6
      });
    });

    describe('modifier effects', () => {
      it('should apply positive modifier correctly', () => {
        // Required: 10, Rolled: 8, Modifier: 5 -> Total: 13, Diff: 3
        const result = determineDiceRollResult(10, 8, 5);
        expect(result).toBe('regular_success');
      });

      it('should apply negative modifier correctly', () => {
        // Required: 10, Rolled: 12, Modifier: -5 -> Total: 7, Diff: -3
        const result = determineDiceRollResult(10, 12, -5);
        expect(result).toBe('regular_failure');
      });

      it('should not affect critical rolls with modifier', () => {
        expect(determineDiceRollResult(10, 1, 10)).toBe('critical_failure');
        expect(determineDiceRollResult(10, 20, -10)).toBe('critical_success');
      });
    });
  });

  describe('getDiceRollPromptAddition', () => {
    it('should return correct message for critical_failure', () => {
      const result = getDiceRollPromptAddition('critical_failure');
      expect(result).toBe('The action is a critical failure!');
    });

    it('should return correct message for critical_success', () => {
      const result = getDiceRollPromptAddition('critical_success');
      expect(result).toBe('The action is a critical success!');
    });

    it('should return correct message for major_failure', () => {
      const result = getDiceRollPromptAddition('major_failure');
      expect(result).toBe('The action is a major failure.');
    });

    it('should return correct message for regular_failure', () => {
      const result = getDiceRollPromptAddition('regular_failure');
      expect(result).toBe('The action is a regular failure.');
    });

    it('should return correct message for partial_failure', () => {
      const result = getDiceRollPromptAddition('partial_failure');
      expect(result).toBe('The action is a partial failure.');
    });

    it('should return correct message for major_success', () => {
      const result = getDiceRollPromptAddition('major_success');
      expect(result).toBe('The action is a major success.');
    });

    it('should return correct message for regular_success', () => {
      const result = getDiceRollPromptAddition('regular_success');
      expect(result).toBe('The action is a regular success.');
    });

    it('should return empty string for undefined', () => {
      const result = getDiceRollPromptAddition(undefined);
      expect(result).toBe('');
    });

    it('should return empty string for null', () => {
      const result = getDiceRollPromptAddition(null as any);
      expect(result).toBe('');
    });

    it('should return empty string for invalid result type', () => {
      const result = getDiceRollPromptAddition('invalid_result' as any);
      expect(result).toBe('');
    });
  });

  describe('Integration Tests', () => {
    const mockGetRandomInteger = vi.mocked(utilModule.getRandomInteger);

    it('should handle complete dice roll workflow', () => {
      // Mock a medium difficulty roll
      mockGetRandomInteger.mockReturnValue(10);

      // Get required value for medium difficulty
      const requiredValue = getRequiredValue('medium', 'Default');
      expect(requiredValue).toBe(10);

      // Test various roll outcomes
      expect(determineDiceRollResult(requiredValue, 1, 0)).toBe('critical_failure');
      expect(determineDiceRollResult(requiredValue, 20, 0)).toBe('critical_success');
      expect(determineDiceRollResult(requiredValue, 16, 0)).toBe('major_success'); // 16 - 10 = 6
      expect(determineDiceRollResult(requiredValue, 12, 0)).toBe('regular_success'); // 12 - 10 = 2
      expect(determineDiceRollResult(requiredValue, 9, 0)).toBe('partial_failure'); // 9 - 10 = -1
    });

    it('should handle karma system integration', () => {
      const badLuckHistory = [-2, -3, -1]; // 3 consecutive failures
      const requiredValue = 12;
      const karmaBonus = getKarmaModifier(badLuckHistory, requiredValue);

      expect(karmaBonus).toBe(6); // Math.ceil(12/2) = 6

      // With karma, a roll of 7 should succeed (7 + 6 = 13 > 12)
      const result = determineDiceRollResult(requiredValue, 7, karmaBonus);
      expect(result).toBe('regular_success');
    });

    it('should handle easy game difficulty workflow', () => {
      mockGetRandomInteger.mockReturnValue(15);

      const requiredValue = getRequiredValue('difficult', 'Easy');
      expect(requiredValue).toBe(11); // 15 - 4 = 11

      // Roll should be easier to succeed
      const result = determineDiceRollResult(requiredValue, 12, 0);
      expect(result).toBe('regular_success'); // 12 - 11 = 1
    });

    it('should validate all DiceRollResult types work with prompt addition', () => {
      const allResults: DiceRollResult[] = [
        'critical_failure',
        'critical_success',
        'major_failure',
        'regular_failure',
        'partial_failure',
        'major_success',
        'regular_success'
      ];

      allResults.forEach(result => {
        const prompt = getDiceRollPromptAddition(result);
        expect(prompt).toBeTruthy();
        expect(typeof prompt).toBe('string');
        expect(prompt.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle extreme modifier values', () => {
      const result1 = determineDiceRollResult(10, 10, 1000);
      expect(result1).toBe('major_success');

      const result2 = determineDiceRollResult(10, 10, -1000);
      expect(result2).toBe('major_failure');
    });

    it('should handle extreme required values', () => {
      expect(determineDiceRollResult(1, 10, 0)).toBe('major_success');
      expect(determineDiceRollResult(100, 10, 0)).toBe('major_failure');
    });

    it('should handle negative required values', () => {
      const result = determineDiceRollResult(-5, 10, 0);
      expect(result).toBe('major_success'); // 10 - (-5) = 15 >= 6
    });

    it('should handle karma with extreme history', () => {
      const extremeHistory = new Array(100).fill(-1);
      const result = getKarmaModifier(extremeHistory, 20);
      expect(result).toBe(10); // Math.ceil(20/2) = 10
    });

    it('should handle zero required value in karma calculation', () => {
      const history = [-1, -2, -3];
      const result = getKarmaModifier(history, 0);
      expect(result).toBe(0); // Math.ceil(0/2) = 0
    });

    it('should handle fractional values in calculations', () => {
      const result = determineDiceRollResult(10.5, 11.7, 0.3);
      // Should work with fractional numbers
      expect(result).toBeDefined();
    });
  });
});
