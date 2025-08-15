import type { Action, GameActionState } from '$lib/ai/agents/gameAgent';
import type { CharacterStats, SkillsProgression } from '$lib/ai/agents/characterStatsAgent';
import { getRequiredSkillProgression, isNewSkill, getSkillProgressionForDifficulty, getSkillIfApplicable } from './characterLogic';

export const addSkillProgression = (skillsProgressionState: any, skillName: string, skillProgression: number) => {
  if (skillProgression) {
    if (!skillsProgressionState.value[skillName]) {
      skillsProgressionState.value[skillName] = 0;
    }
    skillsProgressionState.value[skillName] += skillProgression;
  }
};

export const advanceSkillIfApplicable = (
  skillName: string,
  characterStatsState: any,
  skillsProgressionState: any,
  characterName: string,
  gameActionsState: any
) => {
  const requiredSkillProgression = getRequiredSkillProgression(skillName, characterStatsState.value);
  if (requiredSkillProgression) {
    if (skillsProgressionState.value[skillName] >= requiredSkillProgression) {
      characterStatsState.value.skills[skillName] += 1;
      skillsProgressionState.value[skillName] = 0;
      gameActionsState.value[gameActionsState.value.length].stats_update.push({
        sourceName: characterName,
        targetName: characterName,
        value: { result: skillName },
        type: 'skill_increased'
      });
    }
  }
};

export const addSkillsIfApplicable = (
  actions: Action[],
  gameSettingsIntroduces: boolean,
  characterStatsState: any
) => {
  if (gameSettingsIntroduces) {
    actions.forEach((action: Action) => {
      const skill = isNewSkill(characterStatsState.value, action);
      if (skill) {
        characterStatsState.value.skills[skill] = 0;
      }
    });
  }
};

export const determineProgressionForAction = (action: Action, existingProgression: number | undefined) => {
  if (existingProgression !== undefined) return existingProgression;
  return getSkillProgressionForDifficulty(action.action_difficulty);
};

export const getSkillNameForAction = (characterStats: CharacterStats, action: Action) => getSkillIfApplicable(characterStats, action);
