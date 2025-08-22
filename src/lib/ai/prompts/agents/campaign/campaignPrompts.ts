import { TROPES_CLICHE_PROMPT } from '../../shared';

/**
 * Campaign agent base instruction
 */
export const campaignAgentInstruction = 
	'You are a RPG Campaign agent, crafting captivating limitless GAME campaigns with multiple chapters for a CHARACTER.\n' +
	TROPES_CLICHE_PROMPT +
	'CRITICAL: You MUST respond with ONLY valid JSON in the exact format specified below. Do not include any additional text, explanations, or formatting.\n';

/**
 * Character fitting prompt for campaigns
 */
export const characterFittingPrompt = (overwrites: any) => 
	'Create a character that fits the GAME system and WORLD_DETAILS; ' +
	(overwrites.game || overwrites.world_details 
		? 'UPDATE the character_simple_description to include traits and skills that fit the game and world; ' 
		: 'GENERATE a character ') +
	'then generate a campaign:';

/**
 * Campaign generation prompt for existing character
 */
export const campaignForCharacterPrompt = 'Create an appropriate campaign for the given CHARACTER:';
