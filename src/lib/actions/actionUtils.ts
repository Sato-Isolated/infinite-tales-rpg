import type { Action, GameActionState, RandomEventsHandling } from '$lib/ai/agents/gameAgent.js';
import type { DiceRollResult } from '$lib/components/interaction_modals/dice/diceRollLogic.js';
import { ActionDifficulty, InterruptProbability } from '$lib/types/gameTypes.js';
import { SLOW_STORY_PROMPT } from '$lib/ai/agents/gameAgent.js';

export function mustRollDice(action: Action, isInCombat?: boolean): boolean {
	const difficulty: ActionDifficulty =
		ActionDifficulty[action.action_difficulty?.toLowerCase() || ''];
	if (!difficulty || difficulty === ActionDifficulty.simple) {
		return false;
	}

	const actionText = action.text.toLowerCase();
	if (actionText === 'continue the tale') {
		return false;
	}

	//TODO this only works for english but can stay for now
	const listOfDiceRollingActions = ['attempt', 'try', 'seek', 'search', 'investigate'];
	const includesTrying = listOfDiceRollingActions.some((value) => actionText.includes(value));
	if (
		action.type?.toLowerCase() === 'social_manipulation' ||
		action.type?.toLowerCase() === 'spell' ||
		action.type?.toLowerCase() === 'investigation'
	) {
		return true;
	}
	return (
		difficulty !== ActionDifficulty.medium ||
		('' + action.narration_details).includes('HIGH') ||
		isInCombat ||
		includesTrying
	);
}

export function getTargetPromptAddition(targets: string[]): string {
	return '\n I target ' + targets.join(' and ');
}

export function getContinueTalePromptAddition(
	gameActions: GameActionState[],
	currentCharacterName: string
): string {
	if (gameActions.length === 0) {
		return '';
	}

	const lastAction = gameActions[gameActions.length - 1];
	const lastStory = lastAction?.story || '';

	// Construire un prompt spécifique pour "Continue The Tale"
	let continuationPrompt = '\n\nCONTINUE THE TALE INSTRUCTIONS:\n';
	continuationPrompt += '- Move the story forward with new developments, do not repeat recent events\n';
	continuationPrompt += '- Introduce new dialogue, encounters, or story elements\n';
	continuationPrompt += '- Build upon the current situation without rehashing what just happened\n';
	continuationPrompt += '- If characters were speaking, continue or conclude their conversation naturally\n';
	continuationPrompt += '- If action was taking place, show the next logical consequence or development\n';

	// Analyser le dernier événement pour donner des directions spécifiques
	const lastStoryLower = lastStory.toLowerCase();
	if (lastStoryLower.includes('says') || lastStoryLower.includes('speaks') || lastStoryLower.includes('"')) {
		continuationPrompt += '- Continue the conversation or show reactions to what was said\n';
	}
	if (lastStoryLower.includes('enters') || lastStoryLower.includes('arrives') || lastStoryLower.includes('approaches')) {
		continuationPrompt += '- Show what happens after the arrival/entrance\n';
	}
	if (lastStoryLower.includes('begins') || lastStoryLower.includes('starts')) {
		continuationPrompt += '- Progress the action that was just initiated\n';
	}
	if (lastStoryLower.includes('combat') || lastStoryLower.includes('fight') || lastStoryLower.includes('attack')) {
		continuationPrompt += '- Continue the combat sequence with new developments\n';
	}

	continuationPrompt += '\nFocus on advancing the narrative meaningfully rather than describing the same scene again.\n';
	continuationPrompt += '- Avoid repeating the same sentences or re-describing the same setting; build the next beat.\n';
	continuationPrompt += "- If nothing new can happen logically, introduce a small but fresh development (a reaction, clue, or consequence) consistent with prior events.\n";

	return continuationPrompt;
}

export function addAdditionsFromActionSideeffects(
	action: Action,
	additionalStoryInput: string,
	randomEventsHandling: RandomEventsHandling,
	is_character_in_combat: boolean,
	diceRollResult: DiceRollResult
): string {
	const is_travel = action.type?.toLowerCase().includes('travel');
	const narration_details = JSON.stringify(action.narration_details) || '';
	if (is_travel || narration_details.includes('HIGH') || narration_details.includes('MEDIUM')) {
		additionalStoryInput += '\n' + SLOW_STORY_PROMPT;
	}
	const encounterString = JSON.stringify(action.enemyEncounterExplanation) || '';
	if (encounterString.includes('HIGH') && !encounterString.includes('LOW')) {
		additionalStoryInput += '\nenemyEncounter: ' + encounterString;
	}

	// Respect player success more: avoid random interruptions on any success unless explicitly ALWAYS
	const isSuccess = diceRollResult === 'critical_success' || diceRollResult === 'major_success' || diceRollResult === 'regular_success';
	if (randomEventsHandling !== 'none' && !isSuccess) {
		const is_interruptible = JSON.stringify(action.is_interruptible) || '';
		const probabilityEnum = getProbabilityEnum(is_interruptible);
		const directly_interrupted =
			probabilityEnum === InterruptProbability.ALWAYS || probabilityEnum === InterruptProbability.HIGH;
		const travel_interrupted = is_travel && probabilityEnum === InterruptProbability.MEDIUM;

		if (randomEventsHandling === 'ai_decides') {
			if (directly_interrupted || travel_interrupted) {
				additionalStoryInput += `\naction is possibly interrupted: ${is_interruptible} probability.`;
			}
		}
		if (randomEventsHandling === 'probability') {
			//combat is already long enough, dont interrupt often
			let modifier = is_character_in_combat ? 0.5 : 1;
			// Reduce chance further on partial failure (player still made progress)
			if (diceRollResult === 'partial_failure') modifier *= 0.7;
			const randomEventCreated = isRandomEventCreated(probabilityEnum, modifier);
			console.log('randomEventCreated', randomEventCreated);
			if (randomEventCreated) {
				additionalStoryInput += `\naction definitely must be interrupted: ${action.is_interruptible?.reasoning}`;
			}
		}
	}
	return additionalStoryInput;
}

function getProbabilityEnum(probability: string): InterruptProbability {
	if (probability.includes('ALWAYS')) {
		return InterruptProbability.ALWAYS;
	}
	if (probability.includes('LOW')) {
		return InterruptProbability.LOW;
	}
	if (probability.includes('MEDIUM')) {
		return InterruptProbability.MEDIUM;
	}
	if (probability.includes('HIGH')) {
		return InterruptProbability.HIGH;
	}
	return InterruptProbability.NEVER;
}

export function isRandomEventCreated(probEnum: InterruptProbability, modifier = 1): boolean {
	const randomEventValue = Math.random();
	console.log('randomEventValue', randomEventValue, probEnum, 'modifier', modifier);
	switch (probEnum) {
		case InterruptProbability.NEVER:
			return false;
		case InterruptProbability.LOW:
			return randomEventValue < 0.05 * modifier;
		case InterruptProbability.MEDIUM:
			return randomEventValue < 0.2 * modifier;
		case InterruptProbability.HIGH:
			return randomEventValue < 0.35 * modifier;
		case InterruptProbability.ALWAYS:
			return true;
		default:
			return false;
	}
}
