/**
 * Action agent prompts
 */

import { diceRollPrompt } from '$lib/ai/prompts/formats';

/**
 * Interrupt probability enum values
 */
export enum InterruptProbability {
	NEVER = 'NEVER',
	LOW = 'LOW',
	MEDIUM = 'MEDIUM',
	HIGH = 'HIGH',
	ALWAYS = 'ALWAYS'
}

/**
 * Action JSON format and rules prompt builder
 */
export const buildActionJsonFormat = (
	attributes: string[],
	skills: string[],
	newSkillsAllowed: boolean
): string => {
	let newSkillRule = '';
	if (newSkillsAllowed) {
		newSkillRule = `Choose or create a single skill that is more specific than the related_attribute but broad enough for multiple actions (e.g. 'Melee Combat' instead of 'Strength'). Use an exact same spelled EXISTING SKILL if applicable; otherwise, add a fitting new one.`;
	} else {
		newSkillRule = `Choose an exact same spelled single skill from EXISTING SKILLS or null if none fits; Never create a new skill;`;
	}
	return `
					"characterName": "Player character name who performs this action",
					"plausibility": "Brief explanation why this action is plausible in the current situation",
					"is_possible": true/false,
					"is_interruptible": {"reasoning": "Explain why this action can or cannot be interrupted (Examples: Can be interrupted: Drawing a sword, casting a complex spell. Cannot be interrupted: Falling, already committed physical motion)", "enum_english": "LOW|MEDIUM|HIGH|NEVER|ALWAYS"},
					"difficulty_explanation": "Brief explanation why this difficulty was chosen",
					"action_difficulty": "TRIVIAL|EASY|NORMAL|HARD|NEARLY_IMPOSSIBLE",
					"related_attribute": attribute from [${attributes.join(', ')}] that is most relevant to the action or null,
					"related_skill": ${newSkillRule}
					"type": "Categorize the action type: COMBAT_ATTACK, COMBAT_DEFENSE, EXPLORATION, INTERACTION, SKILL_USE, MOVEMENT, CRAFTING, MAGIC, or OTHER",
					${diceRollPrompt}
				`;
};
