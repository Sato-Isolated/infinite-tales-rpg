import type { Action } from '$lib/types/playerAction';
import type { CharacterStats, SkillsProgression } from '$lib/ai/agents/characterStatsAgent';
import {
	getRequiredSkillProgression,
	getSkillProgressionForDifficulty,
	isNewSkill
} from '../logic/characterLogic';

export const addSkillProgression = (
	skillsProgressionState: { value: SkillsProgression },
	skillName: string,
	skillProgression: number
) => {
	if (!skillProgression) return;
	if (!skillsProgressionState.value[skillName]) {
		skillsProgressionState.value[skillName] = 0;
	}
	skillsProgressionState.value[skillName] += skillProgression;
};

export const advanceSkillIfApplicable = (
	skillName: string,
	characterStatsState: { value: CharacterStats },
	skillsProgressionState: { value: SkillsProgression },
	characterName: string,
	gameActionsState: { value: Array<any> }
) => {
	const required = getRequiredSkillProgression(skillName, characterStatsState.value);
	if (!required) return;
	if ((skillsProgressionState.value[skillName] || 0) >= required) {
		characterStatsState.value.skills[skillName] += 1;
		skillsProgressionState.value[skillName] = 0;
		const last = gameActionsState.value[gameActionsState.value.length - 1];
		if (last) {
			last.stats_update = last.stats_update || [];
			last.stats_update.push({
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
	characterStatsState: { value: CharacterStats }
) => {
	if (!gameSettingsIntroduces) return;
	actions.forEach((action: Action) => {
		const skill = isNewSkill(characterStatsState.value, action);
		if (skill && characterStatsState.value.skills[skill] === undefined) {
			characterStatsState.value.skills[skill] = 0;
		}
	});
};

export const determineProgressionForAction = (
	action: Action,
	existingProgression: number | undefined
) => {
	if (existingProgression !== undefined) return existingProgression;
	return getSkillProgressionForDifficulty(action.action_difficulty);
};

