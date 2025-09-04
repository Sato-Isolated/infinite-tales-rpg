import { stringifyPretty } from '$lib/util.svelte';
import type { LLM, LLMMessage, LLMRequest } from '$lib/ai/llm';
import type {
	Action,
	InventoryState,
	PlayerCharactersGameState,
	ResourcesWithCurrentValue
} from '$lib/ai/agents/gameAgent';
import { ActionDifficulty, getEmptyCriticalResourceKeys } from '$lib/game/logic/gameLogic';
import type { Story } from '$lib/ai/agents/storyAgent';
import { mapStatsUpdates } from '$lib/ai/agents/mappers';
import { CombatResponseSchema, type CombatResponse } from '$lib/ai/config/ResponseSchemas';
import type { SafetyLevel } from '$lib/types/safetySettings';
import { GeminiProvider } from '$lib/ai/geminiProvider';

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
		safetyLevel: 'strict' | 'balanced' | 'permissive'
	): Promise<CombatResponse> {
		const agent = [
			"You are RPG combat agent, you decide which actions the NPCs take in response to the player character's action " +
			'and what the consequences of these actions are. ' +
			'\n You must not apply self damage to player character because of a failed action unless explicitly stated!' +
			'\n You must include an action for each NPC from the list. You must also describe one action for player character, even if the action is a failure.' +
			'\n You must include the results of the actions as stats_update for each action. NPCs can never be finished off with a single attack!',
			`Only for the player character ${action.characterName} use the following resources:\n ${stringifyPretty(playerCharResources)}\n\nFor stats_update regarding NPC, you must exactly use resourceKey "hp" or "mp", and no deviations of that.`,
			"The following is the character's inventory, if an item is relevant in the current situation then apply it's effect." +
			'\n' +
			stringifyPretty(inventoryState),
			'The following is a description of the story setting to keep the actions consistent on.' +
			'\n' +
			stringifyPretty(storyState),
			'Generate structured combat resolution with actions and stat updates for all participants.'
		];
		if (customSystemInstruction) {
			agent.push('Following instructions overrule all others: ' + customSystemInstruction);
		}
		if (customCombatAgentInstruction) {
			agent.push('Following instructions overrule all others: ' + customCombatAgentInstruction);
		}
		const actionToSend =
			'player character named ' +
			action.characterName +
			' takes following action: ' +
			action.text +
			'\n' +
			'Decide the action and consequences for each of the following NPCs. It can be a spell, ability or any other action. Important: You must reuse the exact nameIds that are given!' +
			'\n' +
			stringifyPretty(npcsList);
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
		// let bossFightPrompt = allNpcsDetailsAsList.some(npc => npc.rank === 'Boss' || npc.rank === 'Legendary')
		//     ? '\nFor now only use following difficulties: ' + bossDifficulties.join('|'): ''
		return (
			'\nNPCs can never be finished off with a single attack!' +
			'\nYou must not apply stats_update for following actions, as this was already done!' +
			'\nDescribe the following actions in the story progression:\n' +
			stringifyPretty(actions) +
			'\n\nMost important! ' +
			this.getNPCsHealthStatePrompt(deadNPCs, aliveNPCs, playerCharactersGameState)
		);
	}

	static getNPCsHealthStatePrompt(
		deadNPCs: Array<string>,
		aliveNPCs?: Array<string>,
		playerCharactersGameState?: PlayerCharactersGameState
	) {
		let text = '';
		if (aliveNPCs && aliveNPCs.length > 0) {
			text +=
				'\n ' +
				'Following NPCs are still alive after the attacks!' +
				'\n' +
				stringifyPretty(aliveNPCs);
		}
		if (deadNPCs && deadNPCs.length > 0) {
			text +=
				'\n ' +
				'Following NPCs have died, describe their death in the story progression.' +
				'\n' +
				stringifyPretty(deadNPCs);
		}
		if (playerCharactersGameState) {
			const aliveChars = Object.keys(playerCharactersGameState).filter(
				(playerName) =>
					getEmptyCriticalResourceKeys(playerCharactersGameState[playerName]).length === 0
			);
			text += '\n Player Characters ' + aliveChars.join(', ') + ' are alive after the attacks!';
		}

		return text;
	}

	static getCombatPromptAddition() {
		const combatDifficulties = [
			ActionDifficulty.simple,
			ActionDifficulty.medium,
			ActionDifficulty.difficult
		];
		return (
			'\nOnly suggest combat actions given the situation' +
			'\nOnly use following difficulties: ' +
			combatDifficulties.join('|') +
			'\nOnly apply bonus to dice_roll'
		);
	}
}
