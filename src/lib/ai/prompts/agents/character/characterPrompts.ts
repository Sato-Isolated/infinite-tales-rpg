import { TROPES_CLICHE_PROMPT } from '../../shared';

/**
 * Character agent base instruction
 */
export const characterAgentInstruction = [
	'You are RPG character agent, describing a single character according to game system, adventure and character description.\n' +
		TROPES_CLICHE_PROMPT
];

/**
 * Character transformation instruction
 */
export const characterTransformationInstruction = (transformInto: string) => [
	'Determine if following transformation completely changes or just adapts the character; ' +
		'Describe how the character changed based on already existing values;\nTransform into:\n' +
		transformInto
];

/**
 * Character description JSON format instruction
 */
export const characterDescriptionJsonInstruction = 
	'Create a detailed character description with personality traits, appearance, and image generation prompt.';
