import { stringifyPretty, type ThoughtsState } from '$lib/util.svelte';
import type { GameTime } from '$lib/types/gameTime';
import { ActionDifficulty } from '$lib/game/logic/gameLogic';
import type { Action, DiceRollDifficulty, ReasonedEnum, ReasonedLevelEnum } from '$lib/types/playerAction';
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
import type { InventoryUpdate, InventoryState, ItemWithId, Item } from '$lib/types/inventory';
import type { ResourcesWithCurrentValue } from '$lib/types/resources';
import type { PlayerCharactersIdToNamesMap, PlayerCharactersGameState } from '$lib/types/players';
import type { GameSettings, RandomEventsHandling, defaultGameSettings } from '$lib/types/gameSettings';
import type { Targets, GameActionState, GameMasterAnswer } from '$lib/types/gameState';
import { getRefillValue, getRefillResourcesUpdateObject, getLevelUpCostObject } from '$lib/game/resourceUtils';
import { generateEnrichedNPCContext as generateEnrichedNPCContextFromUtils } from '$lib/game/npc/contextUtils';
import { buildHistoryMessages } from '$lib/game/messaging/historyBuilder';
import {
	GameTimeResponseSchema,
	GameAgentResponseSchema,
	GameMasterAnswerResponseSchema,
	type GameTimeResponse,
	type GameAgentResponse,
	type GameMasterAnswerResponse
} from '$lib/ai/config/ResponseSchemas';
import {
	PAST_STORY_PLOT_RULE,
	SLOW_STORY_PROMPT,
	TIME_DURATION_GUIDELINES,
	DIALOGUE_CONSISTENCY_PROMPT,
	DIALOGUE_MEMORY_CHECK
} from '$lib/ai/prompts/shared';
import { getStoryNarrationPrompt } from '$lib/ai/prompts/shared/narrationSystem';
import { systemBehaviour, jsonSystemInstructionForGameAgent, jsonSystemInstructionForPlayerQuestion } from '$lib/ai/prompts/system';
import type { SafetyLevel } from '$lib/types/safetySettings';
import { GeminiProvider } from '$lib/ai/geminiProvider';
import {
	buildDialoguePreservationInstructions,
	buildAntiRepetitionAlert,
	extractTemporalContext,
	extractPlotContext,
	mapPlotStringToIds,
	buildGameMasterSystemInstructions,
	buildGameMasterUserMessage,
	buildGameAgentSystemInstructions,
	buildInitialGameTimeInstructions,
	getGameEndedPrompt,
	getStartingPrompt,
	getCraftingPrompt,
	getPromptForGameMasterNotes,
	getInitialGameTimeUserMessage
} from './gameAgentPrompts';
import {
	NPC_TEMPORAL_CONTINUITY_PROMPT,
	NPC_ACTIVITY_DURING_ABSENCE_PROMPT,
	INTEGRATE_NPC_TEMPORAL_CONTEXT,
	NPC_TIME_GAP_EXAMPLES
} from '$lib/ai/prompts/templates/npcTemporalContinuity';
import { addMinutesToGameTime } from '$lib/game/logic/timeLogic';

export class GameAgent {
	llm: LLM;
	dialogueTracker: DialogueTrackingAgent;

	constructor(llm: LLM) {
		this.llm = llm;
		this.dialogueTracker = new DialogueTrackingAgent(llm);
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
	 * @param safetyLevel safety level to use for content generation (from tale's content rating)
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
		currentGameTime?: import('$lib/types/gameTime').GameTime | null,
		safetyLevel?: SafetyLevel
	): Promise<{ newState: GameActionState; updatedHistoryMessages: Array<LLMMessage> }> {
		// Configure safety level on the provider if specified
		if (safetyLevel && this.llm instanceof GeminiProvider) {
			this.llm.setSafetyLevel(safetyLevel);
		}
		let playerActionText = action.characterName + ': ' + action.text;
		const cost = parseInt(action.resource_cost?.cost as unknown as string) || 0;
		if (cost > 0) {
			playerActionText += `\n${action.resource_cost?.cost} ${action.resource_cost?.resource_key} cost`;
		}
		const playerActionTextForHistory = playerActionText;
		let combinedText = playerActionText;

		// 🎭 QUOTED DIALOGUE PRESERVATION (robust detection)
		// Detect any quoted segments within the action text that must be reproduced verbatim in the story
		const actionText = action.text.trim();
		const doubleQuoteMatches = Array.from(actionText.matchAll(/"([^"\n]+)"/g));
		const guillemetsMatches = Array.from(actionText.matchAll(/«\s*([^»\n]+)\s*»/g));
		// Intentionally skip single quotes to avoid false positives with contractions (e.g., c'est)
		const quotedSegments = [...doubleQuoteMatches, ...guillemetsMatches]
			.map((m) => (m[1] || '').trim())
			.filter((s) => s.length > 0);

		const dialogueInstructions = buildDialoguePreservationInstructions(quotedSegments, action.characterName);
		if (dialogueInstructions) {
			combinedText += dialogueInstructions;
		}

		if (additionalStoryInput) combinedText += '\n' + additionalStoryInput;

		if (relatedHistory.length > 0) {
			combinedText += PAST_STORY_PLOT_RULE + relatedHistory.join('\n');
		}

		// Add dialogue consistency check to prevent repetitive conversations
		combinedText += '\n' + DIALOGUE_CONSISTENCY_PROMPT;
		combinedText += '\n' + DIALOGUE_MEMORY_CHECK;

		// Add temporal context from history for coherence
		const temporalContext = extractTemporalContext(historyMessages);
		if (temporalContext) {
			combinedText += temporalContext;
		}

		// Add plot context from history for narrative coherence
		// This provides the AI with context about recent plot developments to maintain story consistency
		const plotContext = extractPlotContext(historyMessages);
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
					const antiRepetitionAlert = buildAntiRepetitionAlert(
						similarityCheck.similarity_score,
						similarityCheck.similarity_explanation,
						similarityCheck.alternative_approach_suggestion
					);
					combinedText += antiRepetitionAlert;
				}
			} catch (error) {
				console.warn('Error during dialogue similarity check:', error);
				// Continue without blocking the story generation
			}
		}

		console.log('🎭 Dialogue analysis completed');

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

		// Insert JSON formatting instructions at the beginning for maximum priority
		gameAgent.unshift(jsonSystemInstructionForGameAgent(gameSettings));

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

		// 🔍 Post-generation dialogue validation: detect and fix internal repetition
		try {
			if (typeof newState.story === 'string') {
				let storyText = newState.story || '';
				
				// Extract all dialogue segments from the story using regex
				const speakerTagMatches = Array.from(storyText.matchAll(/\[speaker:([^\]]+)\]([^[]+)\[\/speaker\]/g));
				const colonFormatMatches = Array.from(storyText.matchAll(/(\w+):\s*[""]([^""]+)[""]|(\w+):\s*([^.\n]+)/g));
				
				// Track dialogue content to detect duplicates
				const dialogueContents = new Set<string>();
				const duplicatedDialogue: string[] = [];
				
				// Check speaker tag format duplicates
				speakerTagMatches.forEach(match => {
					const content = match[2]?.trim();
					if (content && content.length > 10) { // Only check substantial dialogue
						if (dialogueContents.has(content.toLowerCase())) {
							duplicatedDialogue.push(content);
						} else {
							dialogueContents.add(content.toLowerCase());
						}
					}
				});
				
				// Check colon format duplicates
				colonFormatMatches.forEach(match => {
					const content = (match[2] || match[4])?.trim();
					if (content && content.length > 10) { // Only check substantial dialogue
						if (dialogueContents.has(content.toLowerCase())) {
							duplicatedDialogue.push(content);
						} else {
							dialogueContents.add(content.toLowerCase());
						}
					}
				});
				
				// Report duplicated dialogue
				if (duplicatedDialogue.length > 0) {
					console.warn('🚨 Detected duplicated dialogue in generated story:', duplicatedDialogue);
					console.warn('Full story text:', storyText);
					
					// Simple fix: remove duplicate speaker tag segments
					for (const duplicate of duplicatedDialogue) {
						const duplicateRegex = new RegExp(`\\[speaker:[^\\]]+\\]${duplicate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\[\\/speaker\\]\\s*`, 'gi');
						const matches = storyText.match(duplicateRegex);
						if (matches && matches.length > 1) {
							// Remove all but the first occurrence
							let count = 0;
							storyText = storyText.replace(duplicateRegex, (match) => {
								count++;
								return count === 1 ? match : '';
							});
							console.log(`🔧 Removed ${matches.length - 1} duplicate occurrence(s) of: "${duplicate}"`);
						}
					}
					
					newState.story = storyText;
				}
			}
		} catch (e) {
			console.warn('Post-generation dialogue validation failed (non-fatal):', e);
		}

		// 🔒 Post-generation enforcement: ensure verbatim quoted segments appear in the story
		try {
			if (quotedSegments.length > 0 && typeof newState.story === 'string') {
				let storyText = newState.story || '';
				let injected = false;
				for (const q of quotedSegments) {
					// Improved dialogue detection - check for multiple formats:
					// 1. Exact text match (basic case)
					// 2. Speaker tag format: [speaker:Name]text[/speaker]
					// 3. Character colon format: Character: "text" or Character: text
					const hasExactText = storyText.includes(q);
					const hasSpeakerTag = storyText.includes(`[speaker:${action.characterName}]${q}[/speaker]`);
					const hasColonFormat = storyText.includes(`${action.characterName}: "${q}"`) || 
						storyText.includes(`${action.characterName}: ${q}`) ||
						storyText.includes(`${action.characterName}:"${q}"`);
					
					// Only inject if dialogue is truly missing in any recognizable format
					if (!hasExactText && !hasSpeakerTag && !hasColonFormat) {
						console.log(`🔧 Injecting missing dialogue segment: "${q}"`);
						const injectedLine = `[speaker:${action.characterName}]${q}[/speaker]\n`;
						storyText = injectedLine + storyText;
						injected = true;
					} else {
						console.log(`✅ Dialogue segment found in story: "${q}"`);
					}
				}
				if (injected) {
					newState.story = storyText;
					console.log('🔧 Dialogue preservation: injected missing segments');
				}
			}
		} catch (e) {
			console.warn('Dialogue preservation enforcement failed (non-fatal):', e);
		}
		const { userMessage, modelMessage } = buildHistoryMessages(
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
		// Enhanced fallback response generator
		const createFallbackResponse = (error?: string): { thoughts?: string; answer: GameMasterAnswer } => {
			return {
				thoughts: undefined,
				answer: {
					answerToPlayer: error
						? `I encountered an issue while processing your question: ${error}. Please try rephrasing your question or check your API configuration.`
						: "I apologize, but I'm unable to provide an answer to your question at the moment. This could be due to a technical issue or connectivity problem. Please try asking your question again.",
					answerType: 'general' as const,
					confidence: 0,
					rules_considered: [error ? `System Error: ${error}` : "System Error: Unable to process request"],
					game_state_considered: "Unable to analyze current game state due to technical difficulties.",
					relatedQuestions: ["Try asking a simpler question", "Check your API configuration"],
					sources: ["System Error Log"]
				}
			};
		};

		const gameAgent = [
			'You are an intelligent Game Master Assistant designed to help players understand the game world, rules, and current situation.\n' +
			'Analyze the question type and provide helpful, contextual responses with appropriate confidence levels.',
			generateEnrichedNPCContextFromUtils(npcState, characterState?.name || "CHARACTER")
		];

		if (customGmNotes) {
			gameAgent.push(
				'Custom GM Notes (considered as additional rules):\n' + customGmNotes
			);
		}

		if (thoughtsState.storyThoughts) {
			gameAgent.push(
				'Game Master\'s Current Thoughts about Story Progression:\n' +
				JSON.stringify(thoughtsState)
			);
		}

		if (relatedHistory.length > 0) {
			gameAgent.push('Historical Context:\n' + PAST_STORY_PLOT_RULE + relatedHistory.join('\n'));
			gameAgent.push('Dialogue Consistency Rules:\n' + DIALOGUE_CONSISTENCY_PROMPT);
		}

		if (is_character_restrained_explanation) {
			gameAgent.push(
				`Current Character Constraint: ${is_character_restrained_explanation} - Consider this in your response.`
			);
		}

		gameAgent.push(jsonSystemInstructionForPlayerQuestion);

		const userMessage =
			'IMPORTANT: Answer this player question out-of-character as a helpful Game Master assistant.\n\n' +
			'PLAYER QUESTION: ' + question + '\n\n' +
			'GAME MASTER RULES AND CONTEXT:\n' +
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
			systemInstruction: gameAgent,
			config: {
				responseSchema: GameMasterAnswerResponseSchema
			}
		};

		// Enhanced retry logic with multiple attempts
		const maxRetries = 3;
		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				const response = await this.llm.generateContent(request);

				if (!response || !response.content) {
					console.warn(`⚠️ GameAgent.generateAnswerForPlayerQuestion: No response from LLM (attempt ${attempt}/${maxRetries})`);
					if (attempt === maxRetries) {
						return createFallbackResponse("No response received from AI after multiple attempts");
					}
					continue;
				}

				// Validate and enhance the response
				const parsedResponse = response.content as GameMasterAnswerResponse;

				// Check required fields and provide intelligent defaults
				const enhancedResponse: GameMasterAnswerResponse = {
					answerToPlayer: parsedResponse.answerToPlayer || "I'm having trouble formulating a complete answer to your question.",
					answerType: parsedResponse.answerType || 'general',
					confidence: parsedResponse.confidence ?? 50,
					rules_considered: parsedResponse.rules_considered || ["No specific rules identified"],
					game_state_considered: parsedResponse.game_state_considered || "Current game state not fully analyzed",
					relatedQuestions: parsedResponse.relatedQuestions || [],
					sources: parsedResponse.sources || [],
					followUpSuggestions: parsedResponse.followUpSuggestions,
					requiresClarification: parsedResponse.requiresClarification,
					suggestedActions: parsedResponse.suggestedActions
				};

				// Quality check - ensure we have a meaningful answer
				if (enhancedResponse.answerToPlayer.length < 10) {
					console.warn(`⚠️ GameAgent.generateAnswerForPlayerQuestion: Answer too short (attempt ${attempt}/${maxRetries})`);
					if (attempt === maxRetries) {
						return createFallbackResponse("Received incomplete response");
					}
					continue;
				}

				console.log(`✅ GameAgent.generateAnswerForPlayerQuestion: Success on attempt ${attempt}`);
				return {
					thoughts: response.thoughts,
					answer: enhancedResponse
				};

			} catch (error) {
				console.error(`❌ GameAgent.generateAnswerForPlayerQuestion: Error on attempt ${attempt}/${maxRetries}:`, error);

				if (attempt === maxRetries) {
					return createFallbackResponse(error instanceof Error ? error.message : 'Unknown error');
				}

				// Wait briefly before retry
				await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
			}
		}

		// This should never be reached, but TypeScript safety
		return createFallbackResponse("Unexpected error in retry logic");
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
			'=== CORE BEHAVIOR INSTRUCTIONS ===',
			systemBehaviour(gameSettings),
			'',
			'=== NARRATION INSTRUCTIONS ===',
			getStoryNarrationPrompt(gameSettings),
			'',
			'=== CURRENT STORY STATE ===',
			stringifyPretty(storyState),
			'',
			'=== CHARACTER DESCRIPTION ===',
			'The following is a description of the player character, always refer to it when considering appearance, reasoning, motives etc.',
			stringifyPretty(characterState),
			'',
			'=== CHARACTER RESOURCES ===',
			"The following are the character's CURRENT resources, consider it in your response",
			stringifyPretty(Object.values(playerCharactersGameState)),
			'',
			'=== CHARACTER INVENTORY ===',
			"The following is the character's inventory, check items for relevant passive effects relevant for the story progression or effects that are triggered every action.",
			stringifyPretty(inventoryState),
			'',
			'=== NPC CONTEXT ===',
			generateEnrichedNPCContextFromUtils(npcState, characterState?.name || "CHARACTER")
		];

		if (customSystemInstruction) {
			gameAgent.push('', '=== OVERRIDE INSTRUCTIONS (HIGHEST PRIORITY) ===');
			gameAgent.push('Following instructions overrule all others: ' + customSystemInstruction);
		}
		if (customStoryAgentInstruction) {
			gameAgent.push('', '=== STORY AGENT OVERRIDES ===');
			gameAgent.push('Following instructions overrule all others: ' + customStoryAgentInstruction);
		}
		if (customCombatAgentInstruction) {
			gameAgent.push('', '=== COMBAT AGENT OVERRIDES ===');
			gameAgent.push('Following instructions overrule all others: ' + customCombatAgentInstruction);
		}
		return gameAgent;
	}

}

