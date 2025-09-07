import { shuffleArray } from '$lib/util.svelte';
import type { LLM, LLMMessage, LLMRequest } from '$lib/ai/llm';
import type { CharacterStats } from '$lib/ai/agents/characterStatsAgent';
import type { CharacterDescription } from '$lib/ai/agents/characterAgent';
import type { Action } from '$lib/types/action';
import type { GameActionState } from '$lib/types/actions';
import type { InventoryState, Item } from '$lib/types/inventory';
import type { Story } from '$lib/ai/agents/storyAgent';
import { GEMINI_MODELS } from '../geminiProvider';
import { CombatAgent } from './combatAgent';
import { actionRules } from '$lib/ai/prompts/system';
import {
	SingleActionResponseSchema,
	ActionsWithThoughtsResponseSchema,
	type SingleActionResponse,
	type ActionsWithThoughtsResponse
} from '$lib/ai/config/ResponseSchemas';
import type { SafetyLevel } from '$lib/types/safetySettings';
import { GeminiProvider } from '$lib/ai/geminiProvider';
import {
	getRestrainingStatePromptTemplate,
	buildSingleActionAgentInstructions,
	buildActionsGeneratorAgentInstructions,
	buildItemActionsAgentInstructions,
	buildSingleActionUserMessage,
	buildActionsGeneratorUserMessage,
	buildItemActionsUserMessage,
	InterruptProbability
} from '$lib/ai/agents/actionAgentPrompts';

export { InterruptProbability };

export class ActionAgent {
	llm: LLM;

	/**
	 * Dynamic generation of action types and difficulty options - no caching
	 * Ensures fresh values on each call to prevent repetitive content
	 */

	constructor(llm: LLM) {
		this.llm = llm;
	}

	/**
	 * Configure safety level on the provider if it's a GeminiProvider
	 */
	private configureSafetyLevel(safetyLevel?: SafetyLevel): void {
		if (safetyLevel && this.llm instanceof GeminiProvider) {
			this.llm.setSafetyLevel(safetyLevel);
		}
	}

	/**
	 * Optimized restraining state prompt generation
	 * Improved performance with string template caching
	 */
	getRestrainingStatePrompt = (restraining_state: string): string =>
		getRestrainingStatePromptTemplate(restraining_state);

	/**
	 * Optimized method to add restraining state to agent
	 * Improved readability and performance with early return
	 */
	addRestrainingStateToAgent = (agent: string[], restrainingState?: string): void => {
		if (!restrainingState || typeof restrainingState !== 'string') {
			return;
		}
		agent.push(this.getRestrainingStatePrompt(restrainingState));
	};

	/**
	 * Optimized method to add additional action input to user message
	 * Improved performance and type safety
	 */
	addAdditionalActionInputToUserMessage = (
		userMessage: string,
		additionalActionInputState?: string
	): string => {
		if (!additionalActionInputState || typeof additionalActionInputState !== 'string') {
			return userMessage;
		}
		return userMessage + '\n' + additionalActionInputState;
	};

	async generateSingleAction(
		action: Action,
		currentGameState: GameActionState,
		historyMessages: Array<LLMMessage>,
		storySettings: Story,
		characterDescription: CharacterDescription,
		characterStats: CharacterStats,
		inventoryState: InventoryState,
		customSystemInstruction?: string,
		customActionAgentInstruction?: string,
		relatedHistory?: string[],
		newSkillsAllowed: boolean = false,
		restrainingState?: string,
		additionalActionInputState?: string,
		safetyLevel?: SafetyLevel
	): Promise<Action> {
		// Configure safety level
		this.configureSafetyLevel(safetyLevel);

		//remove knowledge of story secrets etc
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { ['main_scenario']: _, ...storySettingsMapped } = storySettings;
		const currentGameStateMapped = this.getCurrentGameStateMapped(currentGameState);

		const agent = buildSingleActionAgentInstructions(
			storySettingsMapped,
			characterDescription,
			inventoryState,
			characterStats.resources,
			Object.keys(characterStats.attributes),
			Object.keys(characterStats.skills),
			newSkillsAllowed,
			customSystemInstruction,
			customActionAgentInstruction
		);
		this.addRestrainingStateToAgent(agent, restrainingState);

		let userMessage = buildSingleActionUserMessage(
			action.text,
			currentGameStateMapped,
			restrainingState,
			additionalActionInputState,
			relatedHistory
		);
		console.log('actions prompt: ', userMessage);
		const request: LLMRequest = {
			userMessage,
			historyMessages,
			systemInstruction: agent,
			thinkingConfig: {
				thinkingBudget: 256 // Dynamic value instead of cached constant
			},
			config: {
				responseSchema: SingleActionResponseSchema
			}
		};
		console.log('action generate start time: ', new Date());
		const actionGenerated = (await this.llm.generateContent(request))?.content as SingleActionResponse;
		console.log('action generate end time: ', new Date());
		return actionGenerated as Action;
	}

	async generateActions(
		currentGameState: GameActionState,
		historyMessages: Array<LLMMessage>,
		storySettings: Story,
		characterDescription: CharacterDescription,
		characterStats: CharacterStats,
		inventoryState: InventoryState,
		customSystemInstruction?: string,
		customActionAgentInstruction?: string,
		relatedHistory?: string[],
		newSkillsAllowed: boolean = false,
		restrainingState?: string,
		additionalActionInputState?: string,
		safetyLevel?: SafetyLevel
	): Promise<{ thoughts: string; actions: Array<Action> }> {
		// Configure safety level
		this.configureSafetyLevel(safetyLevel);

		//remove knowledge of story secrets etc
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { ['main_scenario']: _, ...storySettingsMapped } = storySettings;

		const currentGameStateMapped = this.getCurrentGameStateMapped(currentGameState);
		const agent = buildActionsGeneratorAgentInstructions(
			actionRules,
			storySettingsMapped,
			characterDescription,
			inventoryState,
			characterStats.resources,
			Object.keys(characterStats.attributes),
			Object.keys(characterStats.skills),
			newSkillsAllowed,
			relatedHistory,
			customSystemInstruction,
			customActionAgentInstruction
		);

		this.addRestrainingStateToAgent(agent, restrainingState);

		let userMessage = buildActionsGeneratorUserMessage(
			currentGameStateMapped,
			currentGameState.is_character_in_combat,
			CombatAgent.getCombatPromptAddition(),
			restrainingState,
			additionalActionInputState
		);

		console.log('actions prompt: ', userMessage);
		const request: LLMRequest = {
			userMessage,
			historyMessages,
			systemInstruction: agent,
			config: {
				responseSchema: ActionsWithThoughtsResponseSchema
			}
		};
		const response = (await this.llm.generateContent(request))?.content as ActionsWithThoughtsResponse;
		console.log('actions response: ', response);

		// Validate and filter actions from structured response
		const validActions = this.validateAndFilterActions(response.actions || []);

		// if actions were adjusted via custom prompt, make sure that they do not have an order
		shuffleArray(validActions);
		return { thoughts: response?.thoughts || '', actions: validActions };
	}

	private validateAndFilterActions(rawActions: any[]): Action[] {
		if (!Array.isArray(rawActions)) {
			console.error('Actions response is not an array:', rawActions);
			return [];
		}

		return rawActions
			.map((action, index) => {
				// Transform incorrect AI format to correct format
				let transformedAction = { ...action };

				// If AI generated 'action' instead of 'text', convert it
				if (action.action && !action.text) {
					transformedAction.text = action.action;
					console.warn(`Converted 'action' to 'text' for action at index ${index}`);
				}

				// If no characterName is provided, try to extract from text or use default
				if (!transformedAction.characterName) {
					// Try to extract character name from the beginning of the text
					const textMatch = transformedAction.text?.match(/^(\w+)\s+(?:pourrait|va|peut|doit)/);
					if (textMatch) {
						transformedAction.characterName = textMatch[1];
					} else {
						transformedAction.characterName = 'Personnage';
					}
					console.warn(
						`Generated characterName for action at index ${index}: ${transformedAction.characterName}`
					);
				}

				return transformedAction;
			})
			.filter((action, index) => {
				// Check required fields after transformation
				if (!action.text || typeof action.text !== 'string') {
					console.warn(
						`Action at index ${index} missing or invalid text after transformation:`,
						action
					);
					return false;
				}
				if (!action.characterName || typeof action.characterName !== 'string') {
					console.warn(
						`Action at index ${index} missing or invalid characterName after transformation:`,
						action
					);
					return false;
				}
				return true;
			});
	}

	async generateActionsForItem(
		item: Item,
		currentGameState: GameActionState,
		historyMessages: Array<LLMMessage>,
		storySettings: Story,
		characterDescription: CharacterDescription,
		characterStats: CharacterStats,
		inventoryState: InventoryState,
		restrainingState?: string,
		customSystemInstruction?: string,
		customActionAgentInstruction?: string,
		newSkillsAllowed: boolean = false,
		additionalActionInputState?: string
	): Promise<{ thoughts: string; actions: Array<Action> }> {
		//remove knowledge of story secrets etc
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { ['main_scenario']: _, ...storySettingsMapped } = storySettings;

		const currentGameStateMapped = this.getCurrentGameStateMapped(currentGameState);
		const agent = buildItemActionsAgentInstructions(
			actionRules,
			storySettingsMapped,
			characterDescription,
			inventoryState,
			characterStats.resources,
			Object.keys(characterStats.attributes),
			Object.keys(characterStats.skills),
			newSkillsAllowed,
			customSystemInstruction,
			customActionAgentInstruction
		);
		this.addRestrainingStateToAgent(agent, restrainingState);

		let userMessage = buildItemActionsUserMessage(
			item,
			currentGameStateMapped,
			restrainingState,
			additionalActionInputState
		);

		console.log('actions prompt: ', userMessage);
		const request: LLMRequest = {
			userMessage,
			historyMessages,
			systemInstruction: agent,
			model: GEMINI_MODELS.FLASH_2_0,
			config: {
				responseSchema: ActionsWithThoughtsResponseSchema
			}
		};
		const response = (await this.llm.generateContent(request))?.content as ActionsWithThoughtsResponse;

		// Validate and filter actions from structured response
		const validActions = this.validateAndFilterActions(response.actions || []);

		// if actions were adjusted via custom prompt, make sure that they do not have an order
		shuffleArray(validActions);
		return { thoughts: response?.thoughts || '', actions: validActions };
	}

	private getCurrentGameStateMapped(currentGameState: GameActionState) {
		return {
			currently_present_npcs_explanation: (currentGameState as any)[
				'currently_present_npcs_explanation'
			],
			currently_present_npcs: currentGameState.currently_present_npcs,
			plotPointAdvancingNudgeExplanation: (currentGameState as any)[
				'plotPointAdvancingNudgeExplanation'
			],
			gradualNarrativeExplanation: (currentGameState as any)['gradualNarrativeExplanation'],
			story: currentGameState.story,
			is_character_in_combat: currentGameState.is_character_in_combat
		};
	}
}
