import { getRandomInteger, stringifyPretty } from '$lib/util.svelte';
import type { LLM, LLMRequest } from '$lib/ai/llm';
import type { CharacterDescription } from '$lib/ai/agents/characterAgent';
import isEqual from 'fast-deep-equal';
import { TROPES_CLICHE_PROMPT } from '$lib/ai/prompts/shared';
import { StoryGenerationResponseSchema, type StoryGenerationResponse } from '$lib/ai/config/ResponseSchemas';
import { getStyleConstants } from '$lib/ai/prompts/styleAdaptation/styleConstants';
import { getCurrentGameStyle } from '$lib/state/gameStyleState.svelte';

export type Story = typeof storyStateForPrompt;

export const exampleGameSystems = [
	'Pathfinder',
	'Call of Cthulhu',
	'Star Wars',
	'Fate Core',
	'Harry Potter',
	'Discworld',
	'World of Darkness',
	'GURPS',
	'Mutants & Masterminds',
	'Dungeons & Dragons'
];

/**
 * Story creation instructions
 */
const storyInstructions = [
	'STORY CREATION RULES:',
	'- game: Choose any pen & paper system (Pathfinder, Call of Cthulhu, Star Wars, Fate Core, etc.)',
	'- world_details: Key characteristics defining daily life and setting essence',
	'- story_pace: slice-of-life, balanced, adventure-focused, or player-controlled',
	'- main_scenario: Central situation ranging from daily life to epic adventures',
	'- character_simple_description: Character fitting the game system in scenario context',
	'- theme: Overall theme or setting of the story',
	'- tonality: Writing style and mood that fits the game system',
	'- background_context: Background elements matching chosen pace',
	'- social_dynamics: Social environment, relationships, and daily interactions',
	'- locations: 2-3 everyday locations plus one optional special location',
	'- npcs: 2-4 people with simple motivations and relationship dynamics',
	'- story_catalyst: Initial situation fitting desired pace',
	'- potential_developments: Optional plot seeds that can remain dormant or develop',
	'- narrative_flexibility: How story can shift between different paces',
	'- player_agency: How character choices influence immediate and long-term development',
	'- content_rating: safe (family-friendly), mid (mild mature), adult (mature), or uncensored',
	'- tags: 4-6 keywords describing preferred genres, themes, or mood'
].join('\n');

// TROPES_CLICHE_PROMPT moved to prompts/shared/tropesPrompt.ts

// stringifyPretty(storyStateForPrompt) works because no json included in the values
export const storyStateForPrompt = {
	game: 'Any Pen & Paper System e.g. Pathfinder, Call of Cthulhu, Star Wars, Fate Core, World of Darkness, GURPS, Mutants & Masterminds, Dungeons & Dragons',
	world_details:
		"Describe the world's key characteristics, focusing on elements that define daily life and the setting's essence. Include geography, culture, history, or unique elements that inspire storytelling.",
	story_pace:
		'Specify the desired story rhythm: slice-of-life (calm daily events), balanced (mix of routine and events), adventure-focused (frequent dramatic events), or player-controlled (events only when requested)',
	main_scenario:
		'Describe the central situation or context. This can range from mundane daily life to epic adventures, depending on the chosen story pace. Focus on what fits the selected rhythm.',
	character_simple_description:
		'Generate a character fitting the GAME system in the MAIN_SCENARIO context, providing a simple description without excessive detail',
	theme: 'Overall theme or setting of the story',
	tonality: 'Writing style and mood that fits the GAME system',
	background_context:
		'Generate background elements that color the setting (daily routines, festivals, ongoing situations, local rumors, seasonal changes, etc.). These should create atmosphere and context for the story, matching the chosen pace.',
	social_dynamics:
		'Describe the social environment, relationships, and daily interactions that shape character life. Include social circles, casual dynamics, or gentle tensions that influence character interactions.',
	locations:
		'List 2-3 everyday locations where characters spend regular time (home, workplace, social spots, etc.) plus one optional special location. Focus on places that support the chosen story pace.',
	npcs: 'Create 2-4 people the character interacts with regularly (friends, family, colleagues, neighbors) with simple motivations and relationship dynamics. Include their role and typical interactions.',
	story_catalyst:
		'Define the initial situation that fits the desired pace - from "another normal day" to "urgent call to action". This should provide appropriate starting momentum for the chosen rhythm.',
	potential_developments:
		"Describe subtle elements that could develop into events if desired, but don't require immediate action. These serve as optional plot seeds that can remain dormant or bloom based on story needs.",
	narrative_flexibility:
		'Explain how the story can shift between different paces and intensities. Describe how everyday situations can develop or how dramatic events can settle into quieter periods.',
	player_agency:
		'Outline how character choices influence both immediate situations and long-term story development. Describe the scope of impact based on the chosen pace.',
	content_rating:
		'Specify content boundaries: safe (family-friendly), mid (mild mature themes), adult (mature themes and violence), or uncensored (no content restrictions). This sets tone and content limits for story generation.',
	tags: 'Provide 4-6 keywords describing preferred genres, themes, or mood (e.g., slice-of-life, dark fantasy, political intrigue, mystery, romance, comedy, survival, etc.). These guide story tone and content.'
};

export const initialStoryState: Story = {
	game: '',
	world_details: '',
	story_pace: '',
	main_scenario: '',
	character_simple_description: '',
	theme: '',
	tonality: '',
	background_context: '',
	social_dynamics: '',
	locations: '',
	npcs: '',
	story_catalyst: '',
	potential_developments: '',
	narrative_flexibility: '',
	player_agency: '',
	content_rating: 'safe',
	tags: ''
};

export class StoryAgent {
	llm: LLM;

	constructor(llm: LLM) {
		this.llm = llm;
	}

	async generateRandomStorySettings(
		overwrites = {},
		characterDescription: CharacterDescription | undefined = undefined
	): Promise<Story> {
		const currentStyle = getCurrentGameStyle();
		const style = getStyleConstants(currentStyle);
		
		const baseInstructions = [
			`You are ${style.gameType} story agent, crafting captivating, limitless GAME experiences using BOOKS, THEME, TONALITY for CHARACTER.`,
			TROPES_CLICHE_PROMPT,
			'',
			storyInstructions,
			'',
			'Generate structured story settings with all required fields.'
		].join('\n');

		// Style is already applied through template literals above
		const storyAgentInstructions = baseInstructions;

		const storyAgent = storyAgentInstructions;

		const preset = {
			...storyStateForPrompt,
			...overwrites
		};
		if (isEqual(overwrites, {}) && characterDescription === undefined) {
			preset.game = exampleGameSystems[getRandomInteger(0, exampleGameSystems.length - 1)];
		}
		const request: LLMRequest = {
			userMessage:
				'Create a new randomized story considering the following settings: ' +
				stringifyPretty(preset),
			historyMessages: [],
			systemInstruction: storyAgent,
			config: {
				responseSchema: StoryGenerationResponseSchema
			}
		};
		if (characterDescription) {
			request.historyMessages?.push({
				role: 'user',
				content:
					'Set following to character_simple_description; The main_scenario must be based on this;\n' +
					stringifyPretty(characterDescription)
			});
		}
		return (await this.llm.generateContent(request))?.content as StoryGenerationResponse;
	}
}
