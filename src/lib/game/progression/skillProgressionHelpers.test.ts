import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  addSkillProgression,
  advanceSkillIfApplicable,
  addSkillsIfApplicable,
  determineProgressionForAction
} from './skillProgressionHelpers';
import type { Action } from '$lib/types/playerAction';
import type { CharacterStats, SkillsProgression } from '$lib/ai/agents/characterStatsAgent';
import { ActionDifficulty } from '$lib/game/logic/gameLogic';

// Mock the character logic dependencies
vi.mock('../logic/characterLogic', () => ({
  getRequiredSkillProgression: vi.fn(),
  getSkillProgressionForDifficulty: vi.fn(),
  isNewSkill: vi.fn()
}));

import {
  getRequiredSkillProgression,
  getSkillProgressionForDifficulty,
  isNewSkill
} from '../logic/characterLogic';

describe('skillProgressionHelpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('addSkillProgression', () => {
    it('should add skill progression to existing skill', () => {
      const skillsProgressionState = {
        value: {
          swordplay: 5,
          magic: 10
        } as SkillsProgression
      };

      addSkillProgression(skillsProgressionState, 'swordplay', 3);

      expect(skillsProgressionState.value.swordplay).toBe(8);
      expect(skillsProgressionState.value.magic).toBe(10); // Unchanged
    });

    it('should initialize new skill when it does not exist', () => {
      const skillsProgressionState = {
        value: {
          swordplay: 5
        } as SkillsProgression
      };

      addSkillProgression(skillsProgressionState, 'archery', 7);

      expect(skillsProgressionState.value.archery).toBe(7);
      expect(skillsProgressionState.value.swordplay).toBe(5); // Unchanged
    });

    it('should not modify state when skillProgression is 0', () => {
      const skillsProgressionState = {
        value: {
          swordplay: 5
        } as SkillsProgression
      };

      addSkillProgression(skillsProgressionState, 'swordplay', 0);

      expect(skillsProgressionState.value.swordplay).toBe(5); // Unchanged
    });

    it('should not modify state when skillProgression is falsy', () => {
      const skillsProgressionState = {
        value: {
          swordplay: 5
        } as SkillsProgression
      };

      addSkillProgression(skillsProgressionState, 'swordplay', undefined as any);

      expect(skillsProgressionState.value.swordplay).toBe(5); // Unchanged
    });

    it('should handle negative skill progression', () => {
      const skillsProgressionState = {
        value: {
          swordplay: 10
        } as SkillsProgression
      };

      addSkillProgression(skillsProgressionState, 'swordplay', -3);

      expect(skillsProgressionState.value.swordplay).toBe(7);
    });
  });

  describe('advanceSkillIfApplicable', () => {
    let characterStatsState: { value: CharacterStats };
    let skillsProgressionState: { value: SkillsProgression };
    let gameActionsState: { value: Array<any> };

    beforeEach(() => {
      characterStatsState = {
        value: {
          level: 1,
          resources: {},
          attributes: {},
          skills: {
            swordplay: 2,
            magic: 1
          },
          spells_and_abilities: []
        }
      };

      skillsProgressionState = {
        value: {
          swordplay: 25,
          magic: 15
        }
      };

      gameActionsState = {
        value: [
          {
            id: 1,
            story: 'Previous action',
            stats_update: []
          }
        ]
      };
    });

    it('should advance skill when progression requirement is met', () => {
      vi.mocked(getRequiredSkillProgression).mockReturnValue(20);

      advanceSkillIfApplicable(
        'swordplay',
        characterStatsState,
        skillsProgressionState,
        'TestCharacter',
        gameActionsState
      );

      expect(characterStatsState.value.skills.swordplay).toBe(3); // Increased from 2
      expect(skillsProgressionState.value.swordplay).toBe(0); // Reset to 0
      expect(gameActionsState.value[0].stats_update).toHaveLength(1);
      expect(gameActionsState.value[0].stats_update[0]).toEqual({
        sourceName: 'TestCharacter',
        targetName: 'TestCharacter',
        value: { result: 'swordplay' },
        type: 'skill_increased'
      });
    });

    it('should not advance skill when progression requirement is not met', () => {
      vi.mocked(getRequiredSkillProgression).mockReturnValue(30);

      advanceSkillIfApplicable(
        'swordplay',
        characterStatsState,
        skillsProgressionState,
        'TestCharacter',
        gameActionsState
      );

      expect(characterStatsState.value.skills.swordplay).toBe(2); // Unchanged
      expect(skillsProgressionState.value.swordplay).toBe(25); // Unchanged
      expect(gameActionsState.value[0].stats_update).toHaveLength(0);
    });

    it('should not advance skill when getRequiredSkillProgression returns undefined', () => {
      vi.mocked(getRequiredSkillProgression).mockReturnValue(undefined);

      advanceSkillIfApplicable(
        'swordplay',
        characterStatsState,
        skillsProgressionState,
        'TestCharacter',
        gameActionsState
      );

      expect(characterStatsState.value.skills.swordplay).toBe(2); // Unchanged
      expect(skillsProgressionState.value.swordplay).toBe(25); // Unchanged
    });

    it('should handle skill that does not exist in progression state', () => {
      vi.mocked(getRequiredSkillProgression).mockReturnValue(10);

      advanceSkillIfApplicable(
        'newSkill',
        characterStatsState,
        skillsProgressionState,
        'TestCharacter',
        gameActionsState
      );

      // Should treat undefined progression as 0, which is less than 10
      expect(characterStatsState.value.skills.newSkill).toBeUndefined(); // Not advanced
    });

    it('should advance skill when progression equals requirement exactly', () => {
      vi.mocked(getRequiredSkillProgression).mockReturnValue(25);

      advanceSkillIfApplicable(
        'swordplay',
        characterStatsState,
        skillsProgressionState,
        'TestCharacter',
        gameActionsState
      );

      expect(characterStatsState.value.skills.swordplay).toBe(3);
      expect(skillsProgressionState.value.swordplay).toBe(0);
    });

    it('should handle empty gameActionsState gracefully', () => {
      vi.mocked(getRequiredSkillProgression).mockReturnValue(20);
      gameActionsState.value = [];

      advanceSkillIfApplicable(
        'swordplay',
        characterStatsState,
        skillsProgressionState,
        'TestCharacter',
        gameActionsState
      );

      expect(characterStatsState.value.skills.swordplay).toBe(3);
      expect(skillsProgressionState.value.swordplay).toBe(0);
      // Should not crash when no last action exists
    });

    it('should create stats_update array if it does not exist', () => {
      vi.mocked(getRequiredSkillProgression).mockReturnValue(20);
      gameActionsState.value[0].stats_update = undefined;

      advanceSkillIfApplicable(
        'swordplay',
        characterStatsState,
        skillsProgressionState,
        'TestCharacter',
        gameActionsState
      );

      expect(gameActionsState.value[0].stats_update).toHaveLength(1);
    });
  });

  describe('addSkillsIfApplicable', () => {
    let characterStatsState: { value: CharacterStats };
    let actions: Action[];

    beforeEach(() => {
      characterStatsState = {
        value: {
          level: 1,
          resources: {},
          attributes: {},
          skills: {
            swordplay: 2,
            magic: 1
          },
          spells_and_abilities: []
        }
      };

      actions = [
        {
          characterName: 'TestCharacter',
          text: 'Attack with sword',
          related_skill: 'swordplay',
          action_difficulty: ActionDifficulty.medium,
          is_possible: true
        },
        {
          characterName: 'TestCharacter',
          text: 'Cast fireball',
          related_skill: 'fire_magic',
          action_difficulty: ActionDifficulty.difficult,
          is_possible: true
        },
        {
          characterName: 'TestCharacter',
          text: 'Sneak around',
          related_skill: 'stealth',
          action_difficulty: ActionDifficulty.medium,
          is_possible: true
        }
      ];
    });

    it('should add new skills when gameSettingsIntroduces is true', () => {
      vi.mocked(isNewSkill)
        .mockReturnValueOnce(undefined) // swordplay is existing
        .mockReturnValueOnce('fire_magic') // fire_magic is new
        .mockReturnValueOnce('stealth'); // stealth is new

      addSkillsIfApplicable(actions, true, characterStatsState);

      expect(characterStatsState.value.skills.swordplay).toBe(2); // Unchanged
      expect(characterStatsState.value.skills.fire_magic).toBe(0); // Added
      expect(characterStatsState.value.skills.stealth).toBe(0); // Added
    });

    it('should not add skills when gameSettingsIntroduces is false', () => {
      vi.mocked(isNewSkill)
        .mockReturnValueOnce('fire_magic')
        .mockReturnValueOnce('stealth');

      addSkillsIfApplicable(actions, false, characterStatsState);

      expect(characterStatsState.value.skills.fire_magic).toBeUndefined(); // Not added
      expect(characterStatsState.value.skills.stealth).toBeUndefined(); // Not added
    });

    it('should not overwrite existing skills', () => {
      characterStatsState.value.skills.fire_magic = 3; // Already exists

      vi.mocked(isNewSkill)
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce('fire_magic') // This should not overwrite
        .mockReturnValueOnce('stealth');

      addSkillsIfApplicable(actions, true, characterStatsState);

      expect(characterStatsState.value.skills.fire_magic).toBe(3); // Unchanged
      expect(characterStatsState.value.skills.stealth).toBe(0); // Added
    });

    it('should handle empty actions array', () => {
      const originalSkills = { ...characterStatsState.value.skills };

      addSkillsIfApplicable([], true, characterStatsState);

      expect(characterStatsState.value.skills).toEqual(originalSkills);
      expect(vi.mocked(isNewSkill)).not.toHaveBeenCalled();
    });

    it('should handle actions where isNewSkill returns undefined', () => {
      vi.mocked(isNewSkill).mockReturnValue(undefined); // All actions return no new skill

      const originalSkills = { ...characterStatsState.value.skills };

      addSkillsIfApplicable(actions, true, characterStatsState);

      expect(characterStatsState.value.skills).toEqual(originalSkills);
    });
  });

  describe('determineProgressionForAction', () => {
    let action: Action;

    beforeEach(() => {
      action = {
        characterName: 'TestCharacter',
        text: 'Test action',
        action_difficulty: ActionDifficulty.medium,
        is_possible: true
      };
    });

    it('should return existing progression when provided', () => {
      const existingProgression = 5;

      const result = determineProgressionForAction(action, existingProgression);

      expect(result).toBe(5);
      expect(vi.mocked(getSkillProgressionForDifficulty)).not.toHaveBeenCalled();
    });

    it('should return progression from difficulty when no existing progression', () => {
      vi.mocked(getSkillProgressionForDifficulty).mockReturnValue(2);

      const result = determineProgressionForAction(action, undefined);

      expect(result).toBe(2);
      expect(vi.mocked(getSkillProgressionForDifficulty)).toHaveBeenCalledWith(ActionDifficulty.medium);
    });

    it('should handle action without difficulty', () => {
      action.action_difficulty = undefined;
      vi.mocked(getSkillProgressionForDifficulty).mockReturnValue(0);

      const result = determineProgressionForAction(action, undefined);

      expect(result).toBe(0);
      expect(vi.mocked(getSkillProgressionForDifficulty)).toHaveBeenCalledWith(undefined);
    });

    it('should prioritize existing progression over difficulty calculation', () => {
      vi.mocked(getSkillProgressionForDifficulty).mockReturnValue(3);

      const result = determineProgressionForAction(action, 7);

      expect(result).toBe(7); // Should use existing progression
      expect(vi.mocked(getSkillProgressionForDifficulty)).not.toHaveBeenCalled();
    });

    it('should handle zero as valid existing progression', () => {
      const result = determineProgressionForAction(action, 0);

      expect(result).toBe(0);
      expect(vi.mocked(getSkillProgressionForDifficulty)).not.toHaveBeenCalled();
    });

    it('should handle different action difficulties', () => {
      const testCases = [
        { difficulty: ActionDifficulty.medium, expectedCalls: 1 },
        { difficulty: ActionDifficulty.difficult, expectedCalls: 1 },
        { difficulty: ActionDifficulty.very_difficult, expectedCalls: 1 }
      ];

      testCases.forEach(({ difficulty }, index) => {
        vi.clearAllMocks();
        action.action_difficulty = difficulty;
        vi.mocked(getSkillProgressionForDifficulty).mockReturnValue(index + 1);

        determineProgressionForAction(action, undefined);

        expect(vi.mocked(getSkillProgressionForDifficulty)).toHaveBeenCalledWith(difficulty);
      });
    });
  });
});

