import { stringifyPretty, type ThoughtsState } from '$lib/util.svelte';
import { ActionDifficulty } from '$lib/game/logic/gameLogic';
import { type StatsUpdate } from '$lib/ai/agents/combatAgent';
import type { LLM, LLMMessage, LLMRequest, SystemInstructionsState } from '$lib/ai/llm';
import type { CharacterDescription } from '$lib/ai/agents/characterAgent';
import type { Story } from '$lib/ai/agents/storyAgent';
import { mapGameState } from '$lib/ai/agents/mappers';
import {
	type NpcID,
	type NPCState,
	type Resources
} from '$lib/ai/agents/characterStatsAgent';
import type { CampaignChapter } from '$lib/ai/agents/campaignAgent';
import { PAST_STORY_PLOT_RULE, SLOW_STORY_PROMPT, storyWordLimit, TIME_DURATION_GUIDELINES } from '$lib/ai/prompts/shared';
import { systemBehaviour, jsonSystemInstructionForGameAgent, jsonSystemInstructionForPlayerQuestion } from '$lib/ai/prompts/system';
import { statsUpdatePromptObject, currentlyPresentNPCSForPrompt } from '$lib/ai/prompts/formats';

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

export class GameAgent {
	llm: LLM;

	constructor(llm: LLM) {
		this.llm = llm;
	}

	/**
	 * Génère un contexte enrichi pour les NPCs incluant leurs relations
	 */
	private generateEnrichedNPCContext(npcState: NPCState, playerName: string = "CHARACTER"): string {
		let enrichedContext = "The following is the internal state of the NPCs.\n";
		enrichedContext += stringifyPretty(npcState);
		
		// Ajouter le contexte relationnel pour chaque NPC
		Object.keys(npcState).forEach(npcId => {
			const npc = npcState[npcId];
			if (npc?.relationships && npc.relationships.length > 0) {
				enrichedContext += `\n=== CONTEXTE RELATIONNEL POUR ${npcId} ===\n`;
				
				npc.relationships.forEach(rel => {
					const emotionalTone = {
						'very_negative': 'déteste profondément',
						'negative': 'n\'aime pas',
						'neutral': 'a une relation neutre avec',
						'positive': 'apprécie',
						'very_positive': 'adore'
					}[rel.emotional_bond];
					
					if (rel.target_npc_id) {
						enrichedContext += `• ${rel.specific_role || rel.relationship_type} de ${rel.target_name} - ${emotionalTone} cette personne\n`;
					} else {
						enrichedContext += `• Relation avec ${playerName}: ${rel.specific_role || rel.relationship_type} - ${emotionalTone} le joueur\n`;
					}
					
					if (rel.description) {
						enrichedContext += `  └─ ${rel.description}\n`;
					}
				});
				
				if (npc.speech_patterns) {
					enrichedContext += `• Façon de parler: ${npc.speech_patterns}\n`;
				}
				
				if (npc.personality_traits && npc.personality_traits.length > 0) {
					enrichedContext += `• Traits de personnalité: ${npc.personality_traits.join(', ')}\n`;
				}
				
				if (npc.background_notes) {
					enrichedContext += `• Contexte personnel: ${npc.background_notes}\n`;
				}
				
				enrichedContext += "=== FIN CONTEXTE RELATIONNEL ===\n";
			}
		});
		
		return enrichedContext;
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
		npcState: NPCState,
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
			combinedText += `\n\nCURRENT GAME TIME:\nIt is currently ${timeStr}${seasonStr}${weatherStr}.\nEnsure your narration respects this time of day, season and weather (lighting, NPC activities, weather conditions, etc.).\n\n${TIME_DURATION_GUIDELINES}\n`;
		}

		const gameAgent = this.getGameAgentSystemInstructionsFromStates(
			storyState,
			characterState,
			playerCharactersGameState,
			inventoryState,
			npcState,
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

		// Validate that we got a valid response from the LLM
		if (!newState) {
			console.error('GameAgent: LLM generateContentStream returned undefined/null');
			throw new Error('Game generation failed: No response from AI model');
		}

		console.log('GameAgent: Successfully generated new state, building history messages...');
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
			this.generateEnrichedNPCContext(npcState, characterState?.name || "CHARACTER")
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
				npcState,
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
		npcState: NPCState,
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
				stringifyPretty(inventoryState),
			this.generateEnrichedNPCContext(npcState, characterState?.name || "CHARACTER")
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

		// Secure access to modelStateObject properties with null safety
		if (!modelStateObject) {
			console.warn('GameAgent: modelStateObject is undefined, using fallback');
			return {
				userMessage,
				modelMessage: {
					role: 'model' as const,
					content: stringifyPretty({
						story: '[No previous story available]',
						error: 'Model state object was undefined'
					})
				}
			};
		}

		// Add temporal context hidden in history to improve narrative consistency
		const timePassedText = modelStateObject?.time_passed_minutes
			? ` | Action duration: ${modelStateObject.time_passed_minutes}min`
			: '';

		const storyWithTimeContext = gameTime
			? `[Time: ${gameTime.dayName} ${gameTime.day} ${gameTime.monthName} ${gameTime.year}, ${gameTime.hour}:${gameTime.minute.toString().padStart(2, '0')} - ${gameTime.timeOfDay} | Season: ${gameTime.season || 'Unknown'} | Weather: ${gameTime.weather?.description || `${gameTime.weather?.type || 'clear'} (${gameTime.weather?.intensity || 'light'})`}${timePassedText}]\n${modelStateObject?.story || '[No story content]'}`
			: (modelStateObject?.story || '[No story content]');

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
		'CRITICAL: You MUST respond with ONLY valid JSON in the exact format specified below. Do not include any additional text, explanations, or formatting.',
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
