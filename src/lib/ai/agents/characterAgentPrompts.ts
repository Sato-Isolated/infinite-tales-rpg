import { stringifyPretty } from '$lib/util.svelte';
import type { GameSettings } from '$lib/types/gameSettings';
import { TROPES_CLICHE_PROMPT } from '$lib/ai/prompts/shared';
import { getCharacterNarrationPrompt } from '$lib/ai/prompts/shared/narrationSystem';

// =============================================================================
// CHARACTER AGENT PROMPT CONSTANTS
// =============================================================================

/**
 * Base system instruction for character description generation
 */
export const BASE_CHARACTER_DESCRIPTION_INSTRUCTION = 
	'You are RPG character agent, describing a single character according to game system, adventure and character description.\n' +
	TROPES_CLICHE_PROMPT;

/**
 * Template for character transformation instruction
 */
export const getCharacterTransformationInstructionTemplate = (transformInto: string): string =>
	'Determine if following transformation completely changes or just adapts the character; ' +
	'Describe how the character changed based on already existing values;\nTransform into:\n' +
	transformInto;

/**
 * Instruction for generating structured character description
 */
export const CHARACTER_DESCRIPTION_GENERATION_INSTRUCTION = 
	'Generate structured character description with all required fields.';

/**
 * Template for user message in character generation
 */
export const getCharacterGenerationUserMessageTemplate = (preset: object): string =>
	'Create the character: ' + stringifyPretty(preset);

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Builds the complete agent instruction array for character description generation
 */
export const buildCharacterDescriptionAgentInstructions = (
	gameSettings: GameSettings,
	transformInto?: string
): string[] => {
	const instructions = [
		BASE_CHARACTER_DESCRIPTION_INSTRUCTION,
		getCharacterNarrationPrompt(gameSettings)
	];

	if (transformInto) {
		instructions.push(getCharacterTransformationInstructionTemplate(transformInto));
	}

	instructions.push(CHARACTER_DESCRIPTION_GENERATION_INSTRUCTION);

	return instructions;
};

/**
 * Builds user message for character generation
 */
export const buildCharacterGenerationUserMessage = (preset: object): string => {
	return getCharacterGenerationUserMessageTemplate(preset);
};
