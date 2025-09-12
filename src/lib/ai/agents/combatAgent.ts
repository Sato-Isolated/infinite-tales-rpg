import { stringifyPretty } from '$lib/util.svelte';
import type { LLM, LLMMessage, LLMRequest } from '$lib/ai/llm';
import type { Action } from '$lib/types/playerAction';
import type { InventoryState } from '$lib/types/inventory';
import type { PlayerCharactersGameState } from '$lib/types/players';
import type { ResourcesWithCurrentValue } from '$lib/types/resources';
import type { GameSettings } from '$lib/types/gameSettings';
import { ActionDifficulty, getEmptyCriticalResourceKeys } from '$lib/game/logic/gameLogic';
import type { Story } from '$lib/ai/agents/storyAgent';
import { mapStatsUpdates } from '$lib/ai/agents/mappers';
import { CombatResponseSchema, type CombatResponse } from '$lib/ai/config/ResponseSchemas';
import type { SafetyLevel } from '$lib/types/safetySettings';
import { GeminiProvider } from '$lib/ai/geminiProvider';
import {
	buildCombatAgentInstructions,
	buildCombatActionMessage,
	buildAdditionalStoryInput,
	buildNPCsHealthStatePrompt,
	buildCombatPromptAddition
} from './combatAgentPrompts';

export type DiceRoll = {
	result: any;
	number?: number;
	type?: number;
	modifier?: number;
	rolls?: number[];
};
export type StatsUpdate = {
	sourceName?: string;
	targetName: string;
	value: DiceRoll;
	type: string;
};

export class CombatAgent {
	llm: LLM;

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

	async generateActionsFromContext(
		action: Action,
		playerCharResources: ResourcesWithCurrentValue,
		inventoryState: InventoryState,
		npcsList: Array<object>,
		customSystemInstruction: string,
		customCombatAgentInstruction: string,
		historyMessages: Array<LLMMessage>,
		storyState: Story,
		gameSettings: GameSettings,
		safetyLevel: 'strict' | 'balanced' | 'permissive'
	): Promise<CombatResponse> {
		const agent = buildCombatAgentInstructions(
			action,
			playerCharResources,
			inventoryState,
			storyState,
			gameSettings,
			customSystemInstruction,
			customCombatAgentInstruction
		);

		const actionToSend = buildCombatActionMessage(action, npcsList);
		console.log('combat', actionToSend);

		// Configure provider with safety level before making request
		this.configureSafetyLevel(safetyLevel);

		const request: LLMRequest = {
			userMessage: actionToSend,
			historyMessages: historyMessages,
			systemInstruction: agent,
			config: {
				responseSchema: CombatResponseSchema
			}
		};

		const state = (await this.llm.generateContent(request))?.content as CombatResponse;
		mapStatsUpdates(state);
		return state;
	}

	static getAdditionalStoryInput(
		actions: Array<{
			sourceId: string;
			targetId: string;
			text: string;
			explanation: string;
		}>,
		deadNPCs: string[],
		aliveNPCs: string[],
		playerCharactersGameState: PlayerCharactersGameState
	) {
		return buildAdditionalStoryInput(actions, deadNPCs, aliveNPCs, playerCharactersGameState);
	}

	static getNPCsHealthStatePrompt(
		deadNPCs: Array<string>,
		aliveNPCs?: Array<string>,
		playerCharactersGameState?: PlayerCharactersGameState
	) {
		return buildNPCsHealthStatePrompt(deadNPCs, aliveNPCs, playerCharactersGameState);
	}

	static getCombatPromptAddition() {
		return buildCombatPromptAddition();
	}
}

