import { stringifyPretty, type ThoughtsState } from '$lib/util.svelte';
import type { GameTime } from '$lib/types/gameTime';
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
import { DialogueTrackingAgent } from '$lib/ai/agents/dialogueTrackingAgent';
import type { DiceSimulationMode } from '$lib/utils/webglDetection';
import { 
	GameTimeResponseSchema,
	GameAgentResponseSchema,
	type GameTimeResponse,
	type GameAgentResponse
} from '$lib/ai/config/ResponseSchemas';
import {
	PAST_STORY_PLOT_RULE,
	SLOW_STORY_PROMPT,
	storyWordLimit,
	TIME_DURATION_GUIDELINES,
	DIALOGUE_CONSISTENCY_PROMPT,
	DIALOGUE_MEMORY_CHECK,
	ACTION_DIALOGUE_DISTINCTION_PROMPT,
	USER_DIALOGUE_PATTERNS
} from '$lib/ai/prompts/shared';
import { systemBehaviour, jsonSystemInstructionForGameAgent, jsonSystemInstructionForPlayerQuestion } from '$lib/ai/prompts/system';
// Campaign removed: local helper to extract first numeric PLOT_ID occurrences
function mapPlotStringToIds(input: string): number[] {
	if (!input) return [];
	const matches = Array.from(input.matchAll(/PLOT_ID:\s*(\d+)/g));
	return matches.map((m) => Number.parseInt(m[1], 10)).filter((n) => !Number.isNaN(n));
}
import {
	NPC_TEMPORAL_CONTINUITY_PROMPT,
	NPC_ACTIVITY_DURING_ABSENCE_PROMPT,
	INTEGRATE_NPC_TEMPORAL_CONTEXT,
	NPC_TIME_GAP_EXAMPLES
} from '$lib/ai/prompts/templates/npcTemporalContinuity';

// --- Local time helpers for header formatting (avoid circular import with timeLogic) ---
const __DAY_NAMES = [
	'Sunday',
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday'
] as const;
const __MONTH_NAMES = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
] as const;

function __getTimeOfDay(hour: number): GameTime['timeOfDay'] {
	if (hour >= 5 && hour < 7) return 'dawn';
	if (hour >= 7 && hour < 12) return 'morning';
	if (hour >= 12 && hour < 14) return 'midday';
	if (hour >= 14 && hour < 18) return 'afternoon';
	if (hour >= 18 && hour < 21) return 'evening';
	if (hour >= 21 && hour < 24) return 'night';
	return 'deep_night';
}

function __getSeasonForMonth(month: number): GameTime['season'] {
	switch (month) {
		case 12:
		case 1:
		case 2:
			return 'winter';
		case 3:
		case 4:
		case 5:
			return 'spring';
		case 6:
		case 7:
		case 8:
			return 'summer';
		case 9:
		case 10:
		case 11:
			return 'autumn';
		default:
			return 'spring';
	}
}

// Compute effective time (current + minutes) mirroring timeLogic.addMinutesToGameTime
function __addMinutesToGameTimeForHeader(time: GameTime, minutes: number): GameTime {
	const y = Math.max(0, time.year);
	const mIndex = Math.min(11, Math.max(0, time.month - 1));
	const d = Math.max(1, time.day);
	const date = new Date(Date.UTC(y, mIndex, d, time.hour, time.minute, 0, 0));
	const nd = new Date(date.getTime() + minutes * 60_000);

	const newYear = nd.getUTCFullYear();
	const newMonthIndex = nd.getUTCMonth();
	const newMonth = newMonthIndex + 1;
	const newDay = nd.getUTCDate();
	const newHour = nd.getUTCHours();
	const newMinute = nd.getUTCMinutes();
	const newDayName = __DAY_NAMES[nd.getUTCDay()];
	const newMonthName = __MONTH_NAMES[newMonthIndex];

	return {
		...time,
		year: newYear,
		month: newMonth,
		day: newDay,
		hour: newHour,
		minute: newMinute,
		dayName: newDayName,
		monthName: newMonthName,
		timeOfDay: __getTimeOfDay(newHour),
		season: __getSeasonForMonth(newMonth),
		weather: time.weather
	};
}

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
	generateAmbientDialogue: boolean;
	diceSimulationMode: DiceSimulationMode;
};
export const defaultGameSettings = () => ({
	detailedNarrationLength: true,
	aiIntroducesSkills: false,
	randomEventsHandling: 'probability' as const,
	generateAmbientDialogue: true,
	diceSimulationMode: 'auto' as const
});

export type Targets = { hostile: Array<NpcID>; friendly: Array<NpcID>; neutral: Array<NpcID> };
export type GameActionState = {
	id: number;
	currentPlotPoint: string;
	nextPlotPoint: string;
	story: string;
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
	dialogueTracker: DialogueTrackingAgent;

	constructor(llm: LLM) {
		this.llm = llm;
		this.dialogueTracker = new DialogueTrackingAgent(llm);
	}

	/**
	 * Génère un contexte enrichi pour les NPCs incluant leurs relations et la continuité temporelle
	 */
	private generateEnrichedNPCContext(npcState: NPCState, playerName: string = "CHARACTER"): string {
		let enrichedContext = "The following is the internal state of the NPCs.\n";
		enrichedContext += stringifyPretty(npcState);

		// Ajouter les règles de continuité temporelle pour les NPCs
		enrichedContext += `\n${NPC_TEMPORAL_CONTINUITY_PROMPT}\n`;
		enrichedContext += `\n${NPC_ACTIVITY_DURING_ABSENCE_PROMPT}\n`;
		enrichedContext += `\n${INTEGRATE_NPC_TEMPORAL_CONTEXT}\n`;
		enrichedContext += `\n${NPC_TIME_GAP_EXAMPLES}\n`;

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

		// Add dialogue consistency check to prevent repetitive conversations
		combinedText += '\n' + DIALOGUE_CONSISTENCY_PROMPT;
		combinedText += '\n' + DIALOGUE_MEMORY_CHECK;

		// Add temporal context from history for coherence
		const temporalContext = GameAgent.extractTemporalContext(historyMessages);
		if (temporalContext) {
			combinedText += temporalContext;
		}

		// Add plot context from history for narrative coherence
		// This provides the AI with context about recent plot developments to maintain story consistency
		const plotContext = GameAgent.extractPlotContext(historyMessages);
		if (plotContext) {
			combinedText += plotContext;
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

		// 🗣️ DIALOGUE DEDUPLICATION CHECK
		// Extract recent story history to check for dialogue similarities
		const recentStories = historyMessages
			.filter(msg => msg.role === 'model' && msg.content)
			.slice(-10) // Check last 10 story entries
			.map(msg => {
				try {
					// Parse the structured JSON response from previous game actions
					const parsed = JSON.parse(msg.content);
					return parsed.story || '';
				} catch {
					// Fallback for any malformed content - just use as-is
					return msg.content || '';
				}
			})
			.filter(story => story.trim().length > 0);

		// Check if current action might lead to repetitive dialogue
		const currentConversationContext = `${action.characterName}: ${action.text}`;
		if (recentStories.length > 0) {
			try {
				// Convert recent stories to conversation summaries for similarity checking
				const conversationHistory = recentStories.map((story, index) => ({
					conversation_id: `recent_${Date.now()}_${index}`,
					participants: [action.characterName], // We'll simplify to current character
					topics: [action.text.substring(0, 100)], // Extract first part as topic
					key_points: [story.substring(0, 150)], // Use story excerpt as key points
					outcome: 'ongoing', // Default outcome
					game_state_id: historyMessages.length - recentStories.length + index, // Approximate game state ID
					summary: story.substring(0, 200), // Use first part of story as summary
					timestamp: Date.now() - (index * 60000), // Fake timestamps
					temporal_context: `Recent conversation ${index + 1}`
				}));

				const similarityCheck = await this.dialogueTracker.checkConversationSimilarity(
					currentConversationContext,
					conversationHistory,
					[action.characterName]
				);

				if (similarityCheck.is_similar_conversation && similarityCheck.similarity_score > 0.7) {
					console.log('🚨 Dialogue repetition detected! Adding stronger anti-repetition prompt.');
					console.log('Similarity details:', stringifyPretty(similarityCheck));

					// Add stronger anti-repetition guidance
					combinedText += '\n\n🚨 CRITICAL ANTI-REPETITION ALERT:\n';
					combinedText += `Previous similar interaction detected (score: ${similarityCheck.similarity_score})\n`;
					combinedText += `Similarity explanation: ${similarityCheck.similarity_explanation}\n`;
					combinedText += 'You MUST create a completely different conversation approach.\n';

					if (similarityCheck.alternative_approach_suggestion) {
						combinedText += `Suggested alternative: ${similarityCheck.alternative_approach_suggestion}\n`;
					}

					combinedText += 'If characters need to interact, have them:\n';
					combinedText += '- Reference the previous conversation ("As we discussed earlier...")\n';
					combinedText += '- Approach the topic from a new angle\n';
					combinedText += '- Focus on progression or new developments\n';
					combinedText += '- Show character growth or changed perspectives\n';
					combinedText += 'NEVER repeat the same dialogue patterns or information delivery.\n';
				}
			} catch (error) {
				console.warn('Error during dialogue similarity check:', error);
				// Continue without blocking the story generation
			}
		}

		//  ADD ACTION/DIALOGUE DISTINCTION INSTRUCTIONS
		// This critical instruction helps LLM distinguish between physical actions and spoken dialogue
		combinedText += '\n\n' + ACTION_DIALOGUE_DISTINCTION_PROMPT;
		
		// Add user's specific dialogue patterns
		combinedText += '\n\n' + USER_DIALOGUE_PATTERNS;
		
		console.log('🎭 Added action/dialogue distinction instructions');

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
			returnFallbackProperty: true,
			config: {
				responseSchema: GameAgentResponseSchema
			}
		};
		const time = new Date().toLocaleTimeString();
		console.log('Starting game agent:', time);
		const newState = (await this.llm.generateContentStream(
			request,
			storyUpdateCallback,
			thoughtUpdateCallback
		)) as GameAgentResponse;

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
		customGmNotes?: string,
		is_character_restrained_explanation?: string
	): Promise<{ thoughts?: string; answer: GameMasterAnswer }> {
		const gameAgent = [
			'You are Reviewer Agent, your task is to answer a players question.\n' +
			'You can refer to the internal state, rules and previous messages that the Game Master has considered',
			this.generateEnrichedNPCContext(npcState, characterState?.name || "CHARACTER")
		];
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
			gameAgent.push('Dialogue Consistency:\n' + DIALOGUE_CONSISTENCY_PROMPT);
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
		const timePassedMinutes = Number(modelStateObject?.time_passed_minutes || 0) || 0;
		const timePassedText = timePassedMinutes ? ` | Action duration: ${timePassedMinutes}min` : '';

		// Compute effective time (current + time_passed_minutes) for the header so it matches UI state
		const effectiveTime = gameTime && timePassedMinutes
			? __addMinutesToGameTimeForHeader(gameTime as GameTime, timePassedMinutes)
			: gameTime || null;

		const storyWithTimeContext = effectiveTime
			? `[Time: ${effectiveTime.dayName} ${effectiveTime.day} ${effectiveTime.monthName} ${effectiveTime.year}, ${effectiveTime.hour}:${effectiveTime.minute.toString().padStart(2, '0')} - ${effectiveTime.timeOfDay} | Season: ${effectiveTime.season || 'Unknown'} | Weather: ${effectiveTime.weather?.description || `${effectiveTime.weather?.type || 'clear'} (${effectiveTime.weather?.intensity || 'light'})`}${timePassedText}]\n${modelStateObject?.story || '[No story content]'}`
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

		return `\n\nTEMPORAL CONTEXT FROM RECENT HISTORY:\n${timeMarkers.slice(-5).join('\n')}\n\n⚠️ MANDATORY TEMPORAL ANALYSIS:
You MUST analyze the time gaps between each interaction above. If CHARACTER returns to NPCs after significant time (30+ minutes), those NPCs MUST:
- Acknowledge the time that passed
- Reference what they did meanwhile  
- Show appropriate emotional responses to reunion
- Have potentially changed status/mood/location
\n🚫 NEVER ignore time passage in NPC interactions!\nMaintain chronological consistency with this timeline.`;
	}

	/**
	 * Helper to extract and format plot context from history messages for better narrative coherence
	 * 
	 * This function extracts plot IDs and story content from recent story progressions to provide the AI with context
	 * about recent narrative developments. It helps maintain story consistency by showing the AI
	 * what plot points have been recently covered and what actually happened in the story.
	 * 
	 * @param historyMessages Array of LLM messages from the conversation history
	 * @returns Formatted string containing recent plot IDs, story content and context, or empty string if none found
	 * 
	 * Example output:
	 * ```
	 * PLOT CONTEXT FROM RECENT HISTORY:
	 * Step 1: PLOT_ID: 45 - Character enters village
	 * Story: Character walked through the village gates, observing the bustling marketplace...
	 * Step 3: PLOT_ID: 46 - Character meets merchant
	 * Story: The merchant approached with a sly smile, offering rare goods...
	 * Step 5: PLOT_ID: 48 - Character arrives at academy
	 * Story: Character walked through the academy gates, feeling nervous about their first day...
	 * Step 7: PLOT_ID: 49 - Character meets director
	 * Story: The director welcomed the character warmly, explaining the academy's traditions...
	 * Maintain narrative coherence with these plot developments throughout the story.
	 * ```
	 */
	static extractPlotContext(historyMessages: Array<LLMMessage>): string {
		const plotMarkers: { step: number; plotIds: number[]; context: string; story?: string }[] = [];

		historyMessages.forEach((message, index) => {
			if (message.role === 'model' && message.content) {
				try {
					const content =
						typeof message.content === 'string' ? message.content : JSON.stringify(message.content);

					let plotIds: number[] = [];
					let context = '';
					let story = '';

					// Extract currentPlotPoint if it exists in the JSON response
					const plotPointMatch = content.match(/"currentPlotPoint":\s*"([^"]+)"/);
					if (plotPointMatch) {
						plotIds = mapPlotStringToIds(plotPointMatch[1]);
						context = plotPointMatch[1].split(' - PLOT_ID:')[0];
					}

					// Also extract from plotPointAdvancingNudgeExplanation for additional context
					const nudgeMatch = content.match(/"plotPointAdvancingNudgeExplanation":\s*"([^"]+)"/);
					if (nudgeMatch && !plotPointMatch) {
						plotIds = mapPlotStringToIds(nudgeMatch[1]);
						context = 'Plot advancement context';
					}

					// Extract story content (full content for rich context)
					const storyMatch = content.match(/"story":\s*"([^"]+)"/);
					if (storyMatch) {
						story = storyMatch[1];
						// Clean up escaped characters for readability
						story = story.replace(/\\n/g, ' ').replace(/\\"/g, '"');
					}

					// Only add to markers if we have plot IDs or story content
					if ((plotIds.length > 0 && plotIds[0] > 0) || story) {
						plotMarkers.push({
							step: index + 1,
							plotIds: plotIds,
							context: context || 'Story progression',
							story: story || undefined
						});
					}
				} catch {
					// Ignore parsing errors
				}
			}
		});

		if (plotMarkers.length === 0) return '';

		// Use all plot markers for complete context
		const allPlotMarkers = plotMarkers;
		const formattedMarkers = allPlotMarkers.map(marker => {
			let formatted = '';
			if (marker.plotIds.length > 0 && marker.plotIds[0] > 0) {
				formatted = `Step ${marker.step}: PLOT_ID: ${marker.plotIds[0]} - ${marker.context}`;
			} else {
				formatted = `Step ${marker.step}: ${marker.context}`;
			}
			if (marker.story) {
				formatted += `\nStory: ${marker.story}`;
			}
			return formatted;
		});

		return `\n\nPLOT CONTEXT FROM RECENT HISTORY:\n${formattedMarkers.join('\n')}\n\n🚨 CRITICAL ANALYSIS REQUIRED: 
BEFORE writing ANY NPC dialogue or interaction, you MUST:
1. ⏰ ANALYZE each previous interaction with NPCs shown above
2. 🕵️ IDENTIFY which NPCs the CHARACTER last interacted with and WHEN
3. ⏱️ CALCULATE the time gap since each NPC was last seen
4. 💭 DETERMINE what each NPC likely did during the CHARACTER's absence
5. 🎭 ADAPT their emotional state and knowledge based on time passed
6. 🗣️ WRITE dialogue that ACKNOWLEDGES the time separation appropriately

❌ FORBIDDEN: NPCs acting like no time has passed when hours/days have elapsed
✅ REQUIRED: NPCs referencing what happened since they last met the CHARACTER

Maintain narrative coherence with these plot developments throughout the story.`;
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
		stringifyPretty(characterState)
	];

	const request: LLMRequest = {
		userMessage:
			'Generate an appropriate initial game time for this story and character. Consider what time would create the most dramatic and engaging opening scene.',
		systemInstruction: agent,
		temperature: 0.8,
		config: {
			responseSchema: GameTimeResponseSchema
		}
	};

	console.log('Making LLM request for time generation...');
	try {
		const response = await llm.generateContent(request);
		console.log('LLM response received:', response);
		const timeData = response?.content as GameTimeResponse;

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
