import { stringifyPretty, type ThoughtsState } from '$lib/util.svelte';
import { ActionDifficulty } from '../../../routes/game/gameLogic';
import { type StatsUpdate, statsUpdatePromptObject } from '$lib/ai/agents/combatAgent';
import type { LLM, LLMMessage, LLMRequest, SystemInstructionsState } from '$lib/ai/llm';
import type { CharacterDescription } from '$lib/ai/agents/characterAgent';
import type { Story } from '$lib/ai/agents/storyAgent';
import { mapGameState } from '$lib/ai/agents/mappers';
import {
	currentlyPresentNPCSForPrompt,
	type NpcID,
	type NPCState,
	type Resources
} from '$lib/ai/agents/characterStatsAgent';
import type { CampaignChapter } from '$lib/ai/agents/campaignAgent';

export type InventoryUpdate = {
	type: 'add_item' | 'remove_item';
	item_id: string;
	item_added?: Item;
};
export type InventoryState = { [item_id: string]: Item };
export type ItemWithId = Item & { item_id: string };
export type Item = { description: string; effect: string };
export type DiceRollDifficulty = {
	action_difficulty?: ActionDifficulty;
	dice_roll?: {
		modifier: 'none' | 'bonus' | 'malus';
		modifier_value: number;
		modifier_explanation: string;
	};
};

export type ReasonedEnum = {
	reasoning: string;
	enum_english: string;
};
export type Action = {
	characterName: string;
	text: string;
	related_attribute?: string;
	related_skill?: string;
	action_difficulty?: ActionDifficulty;
	is_custom_action?: boolean;
	is_possible?: boolean;
	plausibility?: string;
	difficulty_explanation?: string;
	type?: string;
	narration_details?: object;
	actionSideEffects?: string;
	enemyEncounterExplanation?: object;
	is_interruptible?: ReasonedEnum;
	resource_cost?: {
		resource_key: string | undefined;
		cost: number;
	};
} & DiceRollDifficulty;

export type ResourcesWithCurrentValue = {
	[resourceKey: string]: { max_value: number; current_value: number; game_ends_when_zero: boolean };
};

export type PlayerCharactersIdToNamesMap = {
	[playerCharacterId: string]: Array<string>;
};

export type PlayerCharactersGameState = {
	[playerCharacterId: string]: ResourcesWithCurrentValue;
};

export type RandomEventsHandling = 'none' | 'probability' | 'ai_decides';

export type GameSettings = {
	detailedNarrationLength: boolean;
	aiIntroducesSkills: boolean;
	randomEventsHandling: RandomEventsHandling;
};
export const defaultGameSettings = () => ({
	detailedNarrationLength: true,
	aiIntroducesSkills: false,
	randomEventsHandling: 'probability' as const
});

export type Targets = { hostile: Array<NpcID>; friendly: Array<NpcID>; neutral: Array<NpcID> };
export type GameActionState = {
	id: number;
	currentPlotPoint: string;
	nextPlotPoint: string;
	story: string;
	image_prompt: string;
	inventory_update: Array<InventoryUpdate>;
	stats_update: Array<StatsUpdate>;
	is_character_in_combat: boolean;
	is_character_restrained_explanation?: string;
	currently_present_npcs: Targets;
	story_memory_explanation: string;
	time_passed_minutes?: number;
	time_passed_explanation?: string;
	initial_game_time?: {
		day: number;
		dayName: string;
		month: number;
		monthName: string;
		year: number;
		hour: number;
		minute: number;
		timeOfDay: string;
		explanation?: string;
	};
};
export type GameMasterAnswer = {
	answerToPlayer: string;
	rules_considered: Array<string>;
	game_state_considered: string;
};

export const PAST_STORY_PLOT_RULE =
	'\n\nThe next story progression must be plausible in context of PAST STORY PLOT;\n' +
	'From PAST STORY PLOT do not reintroduce or repeat elements that have already been established.\n' +
	//make sure custom player history takes precedence
	'If PAST STORY PLOT contradict each other, the earliest takes precedence, and the later conflicting detail must be ignored;\nPAST STORY PLOT:\n';

export class GameAgent {
	llm: LLM;

	constructor(llm: LLM) {
		this.llm = llm;
	}

	/**
	 *
	 * @param actionText text from the user action, will be added to the historyMessages
	 * @param additionalStoryInput additional text to act as asinge message system instruction, e.g combat, not added to historyMessages
	 * @param customSystemInstruction
	 * @param historyMessages
	 * @param storyState
	 * @param characterState
	 * @param playerCharactersGameState
	 */
	async generateStoryProgression(
		storyUpdateCallback: (storyChunk: string, isComplete: boolean) => void,
		thoughtUpdateCallback: (thoughtChunk: string, isComplete: boolean) => void,
		action: Action,
		additionalStoryInput: string,
		customSystemInstruction: string,
		customStoryAgentInstruction: string,
		customCombatAgentInstruction: string,
		historyMessages: Array<LLMMessage>,
		storyState: Story,
		characterState: CharacterDescription,
		playerCharactersGameState: PlayerCharactersGameState,
		inventoryState: InventoryState,
		relatedHistory: string[],
		gameSettings: GameSettings,
		currentGameTime?: import('$lib/types/gameTime').GameTime | null
	): Promise<{ newState: GameActionState; updatedHistoryMessages: Array<LLMMessage> }> {
		let playerActionText = action.characterName + ': ' + action.text;
		const cost = parseInt(action.resource_cost?.cost as unknown as string) || 0;
		if (cost > 0) {
			playerActionText += `\n${action.resource_cost?.cost} ${action.resource_cost?.resource_key} cost`;
		}
		const playerActionTextForHistory = playerActionText;
		let combinedText = playerActionText;
		if (additionalStoryInput) combinedText += '\n' + additionalStoryInput;

		if (relatedHistory.length > 0) {
			combinedText += PAST_STORY_PLOT_RULE + relatedHistory.join('\n');
		}

		// Add temporal context from history for coherence
		const temporalContext = GameAgent.extractTemporalContext(historyMessages);
		if (temporalContext) {
			combinedText += temporalContext;
		}

		// Add current time to prompt
		if (currentGameTime) {
			const timeStr = `${currentGameTime.dayName} ${currentGameTime.day} ${currentGameTime.monthName} ${currentGameTime.year}, ${currentGameTime.hour}:${currentGameTime.minute.toString().padStart(2, '0')} (${currentGameTime.timeOfDay})`;
			const seasonStr = currentGameTime.season ? ` | Season: ${currentGameTime.season}` : '';
			const weatherStr = currentGameTime.weather
				? ` | Weather: ${currentGameTime.weather.description || `${currentGameTime.weather.type} (${currentGameTime.weather.intensity})`}`
				: '';
			combinedText += `\n\nCURRENT GAME TIME:\nIt is currently ${timeStr}${seasonStr}${weatherStr}.\nEnsure your narration respects this time of day, season and weather (lighting, NPC activities, weather conditions, etc.).\n\nAlso determine how much time has passed for this action according to these examples (adaptable):\n- Conversations/dialogues: e.g. 1-5 minutes\n- Moving within area: e.g. 2-10 minutes\n- Traveling between areas: e.g. 15 minutes - 2 hours\n- Simple combat: e.g. 2-15 minutes\n- Boss/epic combat: e.g. 30 minutes - 3 hours\n- Rest: e.g. 10-30 minutes (short) or 6-8 hours (long)\n- Complex activities: e.g. 30 minutes - 3 hours\n`;
		}

		const gameAgent = this.getGameAgentSystemInstructionsFromStates(
			storyState,
			characterState,
			playerCharactersGameState,
			inventoryState,
			customSystemInstruction,
			customStoryAgentInstruction,
			customCombatAgentInstruction,
			gameSettings
		);
		gameAgent.push(jsonSystemInstructionForGameAgent(gameSettings));

		console.log(combinedText);
		const request: LLMRequest = {
			userMessage: combinedText,
			historyMessages: historyMessages,
			systemInstruction: gameAgent,
			returnFallbackProperty: true
		};
		const time = new Date().toLocaleTimeString();
		console.log('Starting game agent:', time);
		const newState = (await this.llm.generateContentStream(
			request,
			storyUpdateCallback,
			thoughtUpdateCallback
		)) as GameActionState;
		const { userMessage, modelMessage } = this.buildHistoryMessages(
			playerActionTextForHistory,
			newState,
			currentGameTime
		);
		const updatedHistoryMessages = [...historyMessages, userMessage, modelMessage];
		mapGameState(newState);
		return { newState, updatedHistoryMessages };
	}

	async generateAnswerForPlayerQuestion(
		question: string,
		thoughtsState: ThoughtsState,
		customSystemInstruction: SystemInstructionsState,
		historyMessages: Array<LLMMessage>,
		storyState: Story,
		characterState: CharacterDescription,
		playerCharactersGameState: PlayerCharactersGameState,
		inventoryState: InventoryState,
		npcState: NPCState,
		relatedHistory: string[],
		gameSettings: GameSettings,
		campaignChapterState?: CampaignChapter,
		customGmNotes?: string,
		is_character_restrained_explanation?: string
	): Promise<{ thoughts?: string; answer: GameMasterAnswer }> {
		const gameAgent = [
			'You are Reviewer Agent, your task is to answer a players question.\n' +
				'You can refer to the internal state, rules and previous messages that the Game Master has considered',
			'The following is the internal state of the NPCs.' + '\n' + stringifyPretty(npcState)
		];
		if (campaignChapterState) {
			gameAgent.push(
				'The following is the state of the current campaign chapter.' +
					'\n' +
					stringifyPretty(campaignChapterState)
			);
		}
		if (customGmNotes) {
			gameAgent.push(
				'The following are custom gm notes considered to be rules.' + '\n' + customGmNotes
			);
		}
		if (thoughtsState.storyThoughts) {
			gameAgent.push(
				'The following are thoughts of the Game Master regarding how to progress the story.' +
					'\n' +
					JSON.stringify(thoughtsState)
			);
		}
		if (relatedHistory.length > 0) {
			gameAgent.push('History Rules:\n' + PAST_STORY_PLOT_RULE + relatedHistory.join('\n'));
		}
		if (is_character_restrained_explanation) {
			gameAgent.push(
				`Character is restrained: ${is_character_restrained_explanation}; consider the implications in your response.`
			);
		}
		gameAgent.push(jsonSystemInstructionForPlayerQuestion);
		const userMessage =
			'Most important! Answer outside of character, do not describe the story, but give an explanation to this question:\n' +
			question +
			"\n\nIn your answer, identify the relevant Game Master's rules that are related to the question:\n" +
			"Game Master's rules:\n" +
			this.getGameAgentSystemInstructionsFromStates(
				storyState,
				characterState,
				playerCharactersGameState,
				inventoryState,
				customSystemInstruction.generalSystemInstruction,
				customSystemInstruction.storyAgentInstruction,
				customSystemInstruction.combatAgentInstruction,
				gameSettings
			).join('\n');
		const request: LLMRequest = {
			userMessage: userMessage,
			historyMessages: historyMessages,
			systemInstruction: gameAgent
		};
		const response = await this.llm.generateContent(request);
		return {
			thoughts: response?.thoughts,
			answer: response?.content as GameMasterAnswer
		};
	}

	private getGameAgentSystemInstructionsFromStates(
		storyState: Story,
		characterState: CharacterDescription,
		playerCharactersGameState: PlayerCharactersGameState,
		inventoryState: InventoryState,
		customSystemInstruction: string,
		customStoryAgentInstruction: string,
		customCombatAgentInstruction: string,
		gameSettings: GameSettings
	) {
		const gameAgent = [
			systemBehaviour(gameSettings),
			stringifyPretty(storyState),
			'The following is a description of the player character, always refer to it when considering appearance, reasoning, motives etc.' +
				'\n' +
				stringifyPretty(characterState),
			"The following are the character's CURRENT resources, consider it in your response\n" +
				stringifyPretty(Object.values(playerCharactersGameState)),
			"The following is the character's inventory, check items for relevant passive effects relevant for the story progression or effects that are triggered every action.\n" +
				stringifyPretty(inventoryState)
		];
		if (customSystemInstruction) {
			gameAgent.push('Following instructions overrule all others: ' + customSystemInstruction);
		}
		if (customStoryAgentInstruction) {
			gameAgent.push('Following instructions overrule all others: ' + customStoryAgentInstruction);
		}
		if (customCombatAgentInstruction) {
			gameAgent.push('Following instructions overrule all others: ' + customCombatAgentInstruction);
		}
		return gameAgent;
	}

	static getGameEndedPrompt(emptyResourceKey: string[]) {
		return `The CHARACTER has fallen to 0 ${emptyResourceKey.join(' and ')}; Describe how the GAME is ending.`;
	}

	static getStartingPrompt() {
		return (
			'Begin the story by setting the scene in a vivid and detailed manner, describing the environment and atmosphere with rich sensory details.' +
			'\nAt the beginning do not disclose story secrets, which are meant to be discovered by the player later into the story.' +
			'\nIf the player character is accompanied by party members, give them names and add them to currently_present_npcs' +
			'\nCHARACTER starts with some random items.' +
			'\n\nIMPORTANT: This is the INITIAL story setup. You must also generate an appropriate starting time in the initial_game_time field that fits the story context, setting, and opening scene.'
		);
	}

	buildHistoryMessages = function (
		userText: string,
		modelStateObject: GameActionState,
		gameTime?: import('$lib/types/gameTime').GameTime | null
	) {
		const userMessage: LLMMessage = { role: 'user', content: userText };

		// Add temporal context hidden in history to improve narrative consistency
		const storyWithTimeContext = gameTime
			? `[Time: ${gameTime.dayName} ${gameTime.day} ${gameTime.monthName} ${gameTime.year}, ${gameTime.hour}:${gameTime.minute.toString().padStart(2, '0')} - ${gameTime.timeOfDay} | Season: ${gameTime.season || 'Unknown'} | Weather: ${gameTime.weather?.description || `${gameTime.weather?.type || 'clear'} (${gameTime.weather?.intensity || 'light'})`}${modelStateObject.time_passed_minutes ? ` | Action duration: ${modelStateObject.time_passed_minutes}min` : ''}]\n${modelStateObject.story}`
			: modelStateObject.story;

		const modelMessage: LLMMessage = {
			role: 'model',
			content: stringifyPretty({
				...modelStateObject,
				story: storyWithTimeContext
			})
		};

		return { userMessage, modelMessage };
	};

	static getRefillValue(maxResource: Resources[string]): number {
		return maxResource.max_value === maxResource.start_value
			? maxResource.max_value
			: maxResource.start_value;
	}

	/**
	 * Helper to extract and format temporal context from history messages for better AI context awareness
	 */
	static extractTemporalContext(historyMessages: Array<LLMMessage>): string {
		const timeMarkers: string[] = [];

		historyMessages.forEach((message, index) => {
			if (message.role === 'model' && message.content) {
				try {
					const content =
						typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
					const timeMatch = content.match(/\[Time: ([^\]]+)\]/);
					if (timeMatch) {
						timeMarkers.push(`Step ${index + 1}: ${timeMatch[1]}`);
					}
				} catch {
					// Ignore parsing errors
				}
			}
		});

		if (timeMarkers.length === 0) return '';

		return `\n\nTEMPORAL CONTEXT FROM RECENT HISTORY:\n${timeMarkers.slice(-5).join('\n')}\nMaintain chronological consistency with this timeline.`;
	}

	static getRefillResourcesUpdateObject(
		maxResources: Resources,
		currentResources: ResourcesWithCurrentValue,
		playerCharacterName: string
	): Pick<GameActionState, 'stats_update'> {
		const returnObject: Pick<GameActionState, 'stats_update'> = { stats_update: [] };
		Object.entries(maxResources)
			.filter(([resourceKey]) => resourceKey !== 'XP')
			.forEach(([resourceKey, maxResource]) => {
				const refillValue = GameAgent.getRefillValue(maxResource);
				if (refillValue === 0) {
					return;
				}
				returnObject.stats_update.push({
					sourceName: playerCharacterName,
					targetName: playerCharacterName,
					type: resourceKey + '_gained',
					value: { result: refillValue - (currentResources[resourceKey]?.current_value || 0) || 0 }
				});
			});
		return returnObject;
	}

	static getLevelUpCostObject(xpCost: number, playerName: string, level: number): StatsUpdate {
		return {
			sourceName: playerName,
			targetName: playerName,
			type: 'now_level_' + (level + 1),
			value: { result: xpCost }
		};
	}

	static getItemImagePrompt(item_id: string, item: Item, storyImagePrompt: string): string {
		return `${storyImagePrompt} RPG game icon ${item_id} ${item.description}`;
	}

	static getPromptForGameMasterNotes = (notes: Array<string>) => {
		if (!notes || notes.length === 0) {
			return '';
		}
		return (
			'\nFollowing are Game Master Notes to consider for the next story progression:\n' +
			notes.join('\n') +
			'\n'
		);
	};

	static getCraftingPrompt(): string {
		return (
			'\nCrafting:' +
			'\nOn success, create a new item and remove the combined items.' +
			'\nOn partial failure, do not create a new item but do not remove the combined items.' +
			'\nOn failure, do not create a new item and remove the combined items.'
		);
	}
}

const storyWordLimit = 'must be between 100 and 160 words, do not exceed this range.';

export const SLOW_STORY_PROMPT =
	'Ensure that the narrative unfolds gradually, building up anticipation and curiosity before moving towards any major revelations or climactic moments.';
const systemBehaviour = (gameSettingsState: GameSettings) => `
You are a Pen & Paper Game Master, crafting captivating, limitless GAME experiences using ADVENTURE_AND_MAIN_EVENT, THEME, TONALITY for CHARACTER.

The Game Master's General Responsibilities Include:
- Narrate compelling stories in TONALITY for my CHARACTER.
- Generate settings and places, adhering to THEME and TONALITY, and naming GAME elements.
- Never narrate events briefly or summarize; Always describe detailed scenes with character conversation in direct speech
- Show, Don't Tell: Do not narrate abstract concepts or the "meaning" of an event. Instead, communicate the theme through tangible, sensory details
- Use GAME's core knowledge and rules.
- Handle CHARACTER resources per GAME rules, e.g. in a survival game hunger decreases over time; Blood magic costs blood; etc...
- Handle NPC resources, you must exactly use resourceKey "hp" or "mp", and no deviations of that
${!gameSettingsState.detailedNarrationLength ? '- The story narration ' + storyWordLimit : ''}
- Ensure a balanced mix of role-play, combat, and puzzles. Integrate these elements dynamically and naturally based on context.
- Craft varied NPCs, ranging from good to evil.

Storytelling
- Keep story secrets until they are discovered by the player.
- Introduce key characters by describing their actions, appearance, and manner of speaking. Reveal their emotions, motivations, and backstories gradually through their dialogue and how they react to the player character and the world.
- Encourage moments of introspection, dialogue, and quiet observation to develop a deeper understanding of the characters and the world they inhabit. 
- ${SLOW_STORY_PROMPT}
- Deconstruct Player Actions: Do not make decisions on behalf of the player character. More importantly, treat complex player intentions (e.g., 'I perform the ritual,' 'I persuade the guard,' 'I search the library') as the start of a scene, not a single action to be resolved immediately. Narrate the first step of the character's attempt and the immediate consequence or obstacle. Then, pause and wait for the player's next specific action within that scene.
- For the story narration never mention game meta elements like dice rolls; Only describe the narrative the character experiences
- The story history always takes precedence over the story progression, if the history does not allow for the progression to happen, the progression must be adjusted to fit the history.

Actions:
- Let the player guide actions and story relevance.
- Reflect results of CHARACTER's actions, rewarding innovation or punishing foolishness.
- Involve other characters' reactions, doubts, or support during the action, encouraging a deeper exploration of relationships and motivations.
- On each action review the character's inventory and spells_and_abilities for items and skills that have passive effects such as defense or health regeneration and apply them

XP:
- Award XP only for contributions to a challenge according to significance.
	- SMALL: Obtaining clues, engaging in reconnaissance, or learning background information.
	- MEDIUM: Major progress toward a challenge, such as uncovering a vital piece of evidence, or getting access to a crucial location.
	- HIGH: Achieving breakthroughs or resolving significant challenges.
- XP is also granted for the character’s growth (e.g. a warrior mastering a new technique).
- Never grant XP for routine tasks (e.g. basic dialogue, non-story shopping) or actions that build tension but don’t change outcomes.

Combat:
- Pace All Challenges Like Combat: All significant challenges—not just combat—are slow-paced and multi-round. Treat tense negotiations, intricate rituals, disarming magical traps, or navigating a collapsing ruin as a series of actions and reactions between the CHARACTER and the environment. Never resolve a complex challenge in one response.
- Never decide on your own that NPCs or CHARACTER die, apply appropriate damage instead. Only the player will tell you when they die.
- NPCs and CHARACTER cannot simply be finished off with a single attack.

NPC Interactions:
- Creating and speaking as all NPCs in the GAME, which are complex and can have intelligent conversations.
- Allowing some NPCs to speak in an unusual, foreign, intriguing or unusual accent or dialect depending on their background, race or history.
- Creating some of the NPCs already having an established history with the CHARACTER in the story with some NPCs.
- When the player character interacts with a NPC you must always include the NPC response within the same action

Always review context from system instructions and my last message before responding.`;

const jsonSystemInstructionForGameAgent = (
	gameSettingsState: GameSettings
) => `Important Instruction! You must always respond with valid JSON in the following format:
{
  "currentPlotPoint": VALUE MUST BE ALWAYS IN ENGLISH; Identify the most relevant plotId in ADVENTURE_AND_MAIN_EVENT that the story aligns with; Explain your reasoning briefly; Format "{Reasoning} - PLOT_ID: {plotId}",
  "gradualNarrativeExplanation": "Reasoning how the story development is broken down to meaningful narrative moments. Each step should represent a significant part of the process, giving the player the opportunity to make impactful choices.",
  "plotPointAdvancingNudgeExplanation": "VALUE MUST BE ALWAYS IN ENGLISH; Explain what could happen next to advance the story towards NEXT_PLOT_ID according to ADVENTURE_AND_MAIN_EVENT; Include brief explanation of NEXT_PLOT_ID; Format "CURRENT_PLOT_ID: {plotId}; NEXT_PLOT_ID: {currentPlotId + 1}; {Reasoning}",
  "story": "depending on If The Action Is A Success Or Failure progress the story further with appropriate consequences. ${!gameSettingsState.detailedNarrationLength ? storyWordLimit : ''} For character speech use single quotes. Format the narration using HTML with DaisyUI classes optimized for the 'business' theme: Use <p class=\"text-base-content leading-relaxed mb-4\"> for main narrative paragraphs, <div class=\"border-l-4 border-primary pl-4 py-2 mb-3 bg-base-200/30 rounded-r-lg\"><strong class=\"text-primary text-sm uppercase tracking-wide\">Speaker Name:</strong> <em class=\"text-primary font-medium\">'Dialogue here'</em></div> for character speech (always include speaker name), <div class=\"alert alert-info mb-3\"><span class=\"font-semibold\">*Action description*</span></div> for important actions, <blockquote class=\"text-sm italic text-base-content/70 border-l-4 border-accent pl-4 my-3 bg-base-200/50 p-3 rounded-r-lg\">Environmental atmosphere...</blockquote> for ambiance, <div class=\"divider my-6 text-base-content/50\">• • •</div> for scene transitions, <strong class=\"font-bold text-primary\"> for key emphasis, <em class=\"italic text-secondary\"> for thoughts, <div class=\"badge badge-accent mb-2\"> for status effects, <div class=\"alert alert-success mb-3\"><span class=\"text-success font-semibold\">Success</span></div> for positive outcomes, <div class=\"alert alert-warning mb-3\"><span class=\"text-warning font-semibold\">Warning</span></div> for caution, <div class=\"alert alert-error mb-3\"><span class=\"text-error font-semibold\">Danger</span></div> for dangerous situations.",
  "story_memory_explanation": "Explanation if story progression has Long-term Impact: Remember events that significantly influence character arcs, plot direction, or the game world in ways that persist or resurface later; Format: {explanation} LONG_TERM_IMPACT: LOW, MEDIUM, HIGH",
  "image_prompt": "Create a prompt for an image generating ai that describes the scene of the story progression, do not use character names but appearance description. Always include the gender. Keep the prompt similar to previous prompts to maintain image consistency. When describing CHARACTER, always refer to appearance variable. Always use the format: {sceneDetailed} {adjective} {charactersDetailed}",
  "xpGainedExplanation": "Explain why or why nor the CHARACTER gains xp in this situation",
  "time_passed_minutes": "Number of minutes that have passed during this action (use the time examples provided earlier)",
  "time_passed_explanation": "Brief explanation of why this amount of time passed",
  "initial_game_time": "ONLY FOR INITIAL STORY SETUP: Generate appropriate starting date and time that fits the story context. Format: {\"day\": number 1-30, \"dayName\": \"Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday\", \"month\": number 1-12, \"monthName\": \"January|February|March|April|May|June|July|August|September|October|November|December\", \"year\": number, \"hour\": number 0-23, \"minute\": number 0-59, \"timeOfDay\": \"dawn|morning|midday|afternoon|evening|night|deep_night\", \"explanation\": \"Brief explanation of why this time fits the story\"}. Omit this field for non-initial story progressions.",
  ${statsUpdatePromptObject},
  "inventory_update": [
        #Add this to the JSON if the story implies that an item is added or removed from the character's inventory
		#This section is only for items and never spells or abilities
        #For each item addition or removal this object is added once, the whole inventory does not need to be tracked here
        #The starting items are also listed here as add_item
    {
      "type": "add_item",
      "item_id": "unique name of the item to identify it",
      "item_added": {
        "description": "A description of the item",
        "effect": "Clearly state effect(s) and whether an effect is active or passive"
      }
    },
    {
      "type": "remove_item",
      "item_id": "unique name of the item to identify it"
    }
  ],
  "is_character_in_combat": true if CHARACTER is in active combat else false,
  "is_character_restrained_explanation": null | string; "If not restrained null, else Briefly explain how the character has entered a TEMPORARY state or condition that SIGNIFICANTLY RESTRICTS their available actions, changes how they act, or puts them under external control? (Examples: Put to sleep, paralyzed, charmed, blinded,  affected by an illusion, under a compulsion spell)",
  "currently_present_npcs_explanation": "For each NPC explain why they are or are not present in list currently_present_npcs",
  "currently_present_npcs": List of NPCs or party members that are present in the current situation. Format: ${currentlyPresentNPCSForPrompt}
}`;

const jsonSystemInstructionForPlayerQuestion = `Important Instruction! You must always respond with valid JSON in the following format:
{
  "game_state_considered": Brief explanation on how the game state is involved in the answer; mention relevant variables explicitly,
  "rules_considered": String Array; Identify the relevant Game Master's rules that are related to the question; Include the exact text of a rule,
  "answerToPlayer": Answer outside of character, do not describe the story, but give an explanation
}`;

/**
 * Generate an appropriate initial game time based on the story context
 */
export async function generateInitialGameTime(
	llm: LLM,
	storyState: Story,
	characterState: CharacterDescription,
	gameSettings: GameSettings
): Promise<import('$lib/types/gameTime').GameTime> {
	console.log(
		'generateInitialGameTime starting with story:',
		storyState.game,
		'character:',
		characterState.name
	);

	const agent = [
		'You are a Time Generation Agent for a RPG adventure. Your task is to generate an appropriate starting date and time that fits the story context.',
		'Consider the story setting, theme, character background, and narrative tone to determine:',
		'1. What time of day would create the most engaging opening scene',
		'2. What season/month would fit the story theme',
		'3. What day of the week might be narratively interesting',
		'4. What year fits the setting (medieval fantasy typically 800-1200, modern fantasy 1900-2100, etc.)',
		'5. What weather conditions would enhance the story atmosphere',
		'',
		'For weather, consider:',
		'- Story mood and tone (gloomy stories might have rain/storms, adventure might have clear skies)',
		'- Season consistency (winter=snow/cold, summer=heat/storms, etc.)',
		'- Dramatic potential (storms for epic moments, fog for mystery, clear for peaceful starts)',
		'- Setting realism (desert=heat/dust, mountains=wind/snow, coastal=mist/storms)',
		'',
		'Story context:',
		stringifyPretty(storyState),
		'',
		'Character context:',
		stringifyPretty(characterState),
		'',
		'IMPORTANT: Respond with following JSON format:',
		'{"day": number 1-30, "dayName": "Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday", "month": number 1-12, "monthName": "January|February|March|April|May|June|July|August|September|October|November|December", "year": number, "hour": number 0-23, "minute": number 0-59, "timeOfDay": "dawn|morning|midday|afternoon|evening|night|deep_night", "season": "spring|summer|autumn|winter", "weather": {"type": "clear|cloudy|light_rain|heavy_rain|drizzle|snow|blizzard|storm|thunderstorm|fog|mist|wind|hail|heat_wave|cold_snap", "intensity": "light|moderate|heavy|extreme", "description": "brief atmospheric description"}, "explanation": "Brief explanation of why this time and weather fits the story"}'
	];

	const request: LLMRequest = {
		userMessage:
			'Generate an appropriate initial game time for this story and character. Consider what time would create the most dramatic and engaging opening scene.',
		systemInstruction: agent,
		temperature: 0.8
	};

	console.log('Making LLM request for time generation...');
	try {
		const response = await llm.generateContent(request);
		console.log('LLM response received:', response);
		const timeData = response?.content as any;

		if (timeData && timeData.day && timeData.hour !== undefined) {
			console.log('Valid time data received:', timeData);
			return {
				day: timeData.day,
				dayName: timeData.dayName,
				month: timeData.month,
				monthName: timeData.monthName,
				year: timeData.year,
				hour: timeData.hour,
				minute: timeData.minute || 0,
				timeOfDay: timeData.timeOfDay,
				season: timeData.season || 'spring',
				weather: timeData.weather || {
					type: 'clear',
					intensity: 'light',
					description: 'Pleasant weather'
				}
			};
		} else {
			console.warn('Invalid time data received from LLM:', timeData);
		}
	} catch (error) {
		console.error('LLM request failed in generateInitialGameTime:', error);
	}

	// Fallback to default time if generation fails
	console.log('Falling back to default time');
	const { createDefaultTime } = await import('$lib/types/gameTime');
	return createDefaultTime();
}
