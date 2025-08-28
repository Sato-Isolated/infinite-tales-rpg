import { shuffleArray, stringifyPretty } from '$lib/util.svelte';
import { ActionDifficulty } from '$lib/game/logic/gameLogic';
import type { LLM, LLMMessage, LLMRequest } from '$lib/ai/llm';
import type { CharacterStats } from '$lib/ai/agents/characterStatsAgent';
import type { CharacterDescription } from '$lib/ai/agents/characterAgent';
import {
	type Action,
	type GameActionState,
	type InventoryState,
	type Item
} from '$lib/ai/agents/gameAgent';
import type { Story } from '$lib/ai/agents/storyAgent';
import { GEMINI_MODELS } from '../geminiProvider';
import { THINKING_BUDGETS } from '../config/GeminiConfigBuilder';
import { CombatAgent } from './combatAgent';
import { diceRollPrompt } from '$lib/ai/prompts/formats';
import { actionRules } from '$lib/ai/prompts/system';

export enum InterruptProbability {
	NEVER = 'NEVER',
	LOW = 'LOW',
	MEDIUM = 'MEDIUM',
	HIGH = 'HIGH',
	ALWAYS = 'ALWAYS'
}

export class ActionAgent {
	llm: LLM;

	/**
	 * Optimized constants for better performance
	 * Moved inside class to avoid module loading issues
	 */
	private readonly ACTION_DIFFICULTY_OPTIONS = Object.keys(ActionDifficulty).join('|');
	private readonly INTERRUPT_PROBABILITY_OPTIONS = Object.keys(InterruptProbability).join('|');
	private readonly ACTION_TYPES =
		'Misc|Attack|Spell|Conversation|Social_Manipulation|Investigation|Travel|Crafting';

	constructor(llm: LLM) {
		this.llm = llm;
	}

	/**
	 * Get action generation instructions (separate from JSON template)
	 */
	private getActionInstructions = (
		attributes: string[],
		skills: string[],
		newSkillsAllowed: boolean
	): string => {
		const newSkillRule = newSkillsAllowed
			? `Choose or create a single skill that is more specific than the related_attribute but broad enough for multiple actions (e.g. 'Melee Combat' instead of 'Strength'). Use an exact same spelled EXISTING SKILL if applicable; otherwise, add a fitting new one.`
			: `Choose an exact same spelled single skill from EXISTING SKILLS or null if none fits; Never create a new skill;`;

		return `
ACTION GENERATION RULES:
- related_attribute: Must be an exact same spelled attribute from: ${attributes.join(', ')} - never create new Attributes!
- related_skill: ${newSkillRule} EXISTING SKILLS: ${skills.join(', ')}
- resource_cost: Set to null if no cost, otherwise use object with resource_key and cost
- narration_details: Use object format with reasoning and enum_english (LOW|MEDIUM|HIGH). LOW if it involves few steps or can be done quickly; MEDIUM|HIGH if it involves thorough planning or decisions
- enemyEncounterExplanation: Use object format with reasoning and enum_english (LOW|MEDIUM|HIGH). Brief reasoning for the probability of an enemy encounter; if probable describe enemy details; LOW probability if an encounter recently happened
- is_interruptible: Use object format with reasoning and enum_english (${this.INTERRUPT_PROBABILITY_OPTIONS}). Brief reasoning for the probability that this action is interrupted; e.g. travel in dangerous environment is HIGH
- dice_roll: Use dice roll prompt format with modifier details
`;
	};

	/**
	 * Optimized JSON format generation with cached constants
	 * Improves performance by avoiding repeated Object.keys() calls
	 */
	private readonly jsonFormatAndRules = (
		attributes: string[],
		skills: string[],
		newSkillsAllowed: boolean
	): string => {
		const newSkillRule = newSkillsAllowed
			? `Choose or create a single skill that is more specific than the related_attribute but broad enough for multiple actions (e.g. 'Melee Combat' instead of 'Strength'). Use an exact same spelled EXISTING SKILL if applicable; otherwise, add a fitting new one.`
			: `Choose an exact same spelled single skill from EXISTING SKILLS or null if none fits; Never create a new skill;`;

		const attributesString = attributes.join(', ');
		const skillsString = skills.join(', ');

		return `{
					"characterName": "Player character name who performs this action",
					"plausibility": "Brief explanation why this action is plausible in the current situation",
					"text": "Keep the text short, max 20 words. Description of the action to display to the player, do not include modifier or difficulty here.",
					"type": "${this.ACTION_TYPES}",
					"related_attribute": "a single attribute the dice is rolled for, must be an exact same spelled attribute from this list: ${attributesString}; never create new Attributes!",
					"existing_related_skill_explanation": "Explanation if an existing skill is used instead of creating a new one",
					"related_skill": "a single skill the dice is rolled for; ${newSkillRule} EXISTING SKILLS: ${skillsString}",
					"difficulty_explanation": "Keep the text short, max 20 words. Explain the reasoning for action_difficulty. Format: Chose {action_difficulty} because {reason}",
					"action_difficulty": "${this.ACTION_DIFFICULTY_OPTIONS}",
					"is_possible": true,
					"resource_cost": null,
					"narration_details": {
						"reasoning": "Brief reasoning how many details the narration should include",
						"enum_english": "LOW"
					},
					"actionSideEffects": "Reasoning whether this action causes any side effects on the environment or reactions from NPCs",
  					"enemyEncounterExplanation": {
						"reasoning": "Brief reasoning for the probability of an enemy encounter",
						"enum_english": "LOW"
					},
					"is_interruptible": {
						"reasoning": "Brief reasoning for the probability that this action is interrupted",
						"enum_english": "NEVER"
					},
					"dice_roll": {
						"required": false,
						"modifier": 0
					}
				}`;
	};

	/**
	 * Optimized restraining state prompt generation
	 * Improved performance with string template caching
	 */
	getRestrainingStatePrompt = (restraining_state: string): string =>
		`The character is currently affected by a restraining state: ${restraining_state}. Only suggest actions that are possible while under this effect.`;

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
		additionalActionInputState?: string
	): Promise<Action> {
		//remove knowledge of story secrets etc
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { ['main_scenario']: _, ...storySettingsMapped } = storySettings;
		const currentGameStateMapped = this.getCurrentGameStateMapped(currentGameState);

		const agent = [
			`You are RPG action agent, you are given a RPG story and one action the player wants to perform; Determine difficulty, resource cost etc. for this action; Consider the story, currently_present_npcs and character stats.
				Action Rules:
				- Review the character's spells_and_abilities and inventory for passive attributes that could alter the dice_roll
				- For puzzles, the player —not the character— must solve them. Offer a set of possible actions, including both correct and incorrect choices.
				- Any action is allowed to target anything per game rules.`,
			'The suggested action must fit to the setting of the story:' +
			'\n' +
			stringifyPretty(storySettingsMapped),
			'dice_roll can be modified by following description of the character, e.g. acting smart or with force, ...' +
			'\n' +
			stringifyPretty(characterDescription),
			'dice_roll can be modified by items from the inventory:' +
			'\n' +
			stringifyPretty(inventoryState),
			'dice_roll modifier can be applied based on high or low resources:' +
			'\n' +
			stringifyPretty(characterStats.resources),
			this.getActionInstructions(Object.keys(characterStats.attributes), Object.keys(characterStats.skills), newSkillsAllowed),
			`CRITICAL: You MUST respond with ONLY valid JSON in the exact format specified below. Do not include any additional text, explanations, or formatting. 
				${this.jsonFormatAndRules(Object.keys(characterStats.attributes), Object.keys(characterStats.skills), newSkillsAllowed)}`
		];
		this.addRestrainingStateToAgent(agent, restrainingState);
		if (customSystemInstruction) {
			agent.push('Following instructions overrule all others: ' + customSystemInstruction);
		}
		if (customActionAgentInstruction) {
			agent.push('Following instructions overrule all others: ' + customActionAgentInstruction);
		}

		let userMessage =
			'The player wants to perform following action, you must use these exact words as action text: ' +
			action.text +
			'\nDetermine the difficulty and resource cost with considering their personality, skills, items, story summary and following game state\n' +
			stringifyPretty(currentGameStateMapped);

		if (restrainingState) {
			userMessage += '\n' + this.getRestrainingStatePrompt(restrainingState) + '\n';
		}

		userMessage = this.addAdditionalActionInputToUserMessage(
			userMessage,
			additionalActionInputState
		);

		if (relatedHistory && relatedHistory.length > 0) {
			userMessage +=
				'\n\nFollowing is related past story plot, check if the action is possible in this context, it must be plausible in this moment and not just hypothetically;\n' +
				'If no history detail directly contradicts the action, it is possible.\n' +
				'Avoid actions that would lead to repeating dialogues or conversations that have already occurred.\n' +
				relatedHistory.join('\n');
		}
		console.log('actions prompt: ', userMessage);
		const request: LLMRequest = {
			userMessage,
			historyMessages,
			systemInstruction: agent,
			thinkingConfig: {
				thinkingBudget: THINKING_BUDGETS.FAST
			}
		};
		console.log('action generate start time: ', new Date());
		const actionGenerated = (await this.llm.generateContent(request))?.content as Action;
		console.log('action generate end time: ', new Date());
		return actionGenerated;
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
		additionalActionInputState?: string
	): Promise<{ thoughts: string; actions: Array<Action> }> {
		//remove knowledge of story secrets etc
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { ['main_scenario']: _, ...storySettingsMapped } = storySettings;

		const currentGameStateMapped = this.getCurrentGameStateMapped(currentGameState);
		const agent = [
			'You are RPG action agent, you are given a RPG story and then suggest actions the player character can take, considering the story, currently_present_npcs and character stats.',
			actionRules,
			'The suggested actions must fit to the setting of the story:' +
			'\n' +
			stringifyPretty(storySettingsMapped),
			'Suggest actions according to the following description of the character temper, e.g. acting smart or with force, ...' +
			'\n' +
			stringifyPretty(characterDescription),
			'As an action, the character can make use of items from the inventory:' +
			'\n' +
			stringifyPretty(inventoryState),
			'dice_roll modifier can be applied based on high or low resources:' +
			'\n' +
			stringifyPretty(characterStats.resources),
			this.getActionInstructions(Object.keys(characterStats.attributes), Object.keys(characterStats.skills), newSkillsAllowed),
			`CRITICAL: You MUST respond with ONLY valid JSON in the exact format specified below. Do not include any additional text, explanations, or formatting. 
      [
				${this.jsonFormatAndRules(Object.keys(characterStats.attributes), Object.keys(characterStats.skills), newSkillsAllowed)},
				...
  		]`
		];

		this.addRestrainingStateToAgent(agent, restrainingState);
		if (relatedHistory && relatedHistory.length > 0) {
			agent.push(
				'The actions must be plausible with PAST STORY PLOT;\n' +
				'Never suggest actions to investigate PAST STORY PLOT as they are already known;\n' +
				'Avoid suggesting actions that would lead to repeating dialogues or conversations that have already occurred;\n' +
				//make sure custom player history takes precedence
				'If PAST STORY PLOT contradict each other, the earliest takes precedence, and the later conflicting detail must be ignored;\nPAST STORY PLOT:\n' +
				relatedHistory.join('\n')
			);
		}
		if (customSystemInstruction) {
			agent.push('Following instructions overrule all others: ' + customSystemInstruction);
		}
		if (customActionAgentInstruction) {
			agent.push('Following instructions overrule all others: ' + customActionAgentInstruction);
		}
		let userMessage =
			'Suggest specific actions the CHARACTER can take, considering their personality, skills and items.\n' +
			'Each action must clearly outline-solid what the character does and how they do it. \n The actions must be directly related to the current story: ' +
			stringifyPretty(currentGameStateMapped) +
			'\nThe actions must be plausible in the current situation, e.g. before investigating, a tense situation must be resolved.';
		if (currentGameState.is_character_in_combat) {
			userMessage += CombatAgent.getCombatPromptAddition();
		}
		if (restrainingState) {
			userMessage += '\n' + this.getRestrainingStatePrompt(restrainingState) + '\n';
		}
		userMessage = this.addAdditionalActionInputToUserMessage(
			userMessage,
			additionalActionInputState
		);

		console.log('actions prompt: ', userMessage);
		const request: LLMRequest = {
			userMessage,
			historyMessages,
			systemInstruction: agent
		};
		const response = (await this.llm.generateContent(request)) as any;
		console.log('actions response: ', response);
		//can get not directly arrays but wrapped responses from ai sometimes...
		const rawActions = response?.content.actions || response?.content.jsonArray || response.content;

		// Validate and filter actions
		const validActions = this.validateAndFilterActions(rawActions);

		// if actions were adjusted via custom prompt, make sure that they do not have an order
		shuffleArray(validActions);
		return { thoughts: response?.thoughts, actions: validActions };
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
		const agent = [
			'You are RPG action agent, you are given an item description and then suggest the actions the player character can take with that item, considering the story, currently_present_npcs and character stats.',
			actionRules,
			'The suggested actions must fit to the setting of the story:' +
			'\n' +
			stringifyPretty(storySettingsMapped),
			'Suggest actions according to the following description of the character temper, e.g. acting smart or with force, ...' +
			'\n' +
			stringifyPretty(characterDescription),
			'As an action, the character could also combine the item with other items from the inventory:' +
			'\n' +
			stringifyPretty(inventoryState),
			'dice_roll modifier can be applied based on high or low resources:' +
			'\n' +
			stringifyPretty(characterStats.resources),
			this.getActionInstructions(Object.keys(characterStats.attributes), Object.keys(characterStats.skills), newSkillsAllowed),
			`CRITICAL: You MUST respond with ONLY valid JSON in the exact format specified below. Do not include any additional text, explanations, or formatting. 
      [
				${this.jsonFormatAndRules(Object.keys(characterStats.attributes), Object.keys(characterStats.skills), newSkillsAllowed)},
				...
  		]`
		];
		this.addRestrainingStateToAgent(agent, restrainingState);
		if (customSystemInstruction) {
			agent.push('Following instructions overrule all others: ' + customSystemInstruction);
		}
		if (customActionAgentInstruction) {
			agent.push('Following instructions overrule all others: ' + customActionAgentInstruction);
		}
		let userMessage =
			'Suggest specific actions the CHARACTER can take with the item:\n' +
			stringifyPretty(item) +
			'\nEach action must clearly outline-solid what the character does and how they do it. \n The actions must be directly related to the current story: ' +
			stringifyPretty(currentGameStateMapped) +
			'\nThe actions must be plausible in the current situation, e.g. before investigating, a combat or tense situation must be resolved.';

		if (restrainingState) {
			userMessage += '\n' + this.getRestrainingStatePrompt(restrainingState) + '\n';
		}
		userMessage = this.addAdditionalActionInputToUserMessage(
			userMessage,
			additionalActionInputState
		);

		console.log('actions prompt: ', userMessage);
		const request: LLMRequest = {
			userMessage,
			historyMessages,
			systemInstruction: agent,
			model: GEMINI_MODELS.FLASH_THINKING_2_0
		};
		const response = (await this.llm.generateContent(request)) as any;

		//can get not directly arrays but wrapped responses from ai sometimes...
		const rawActions = response?.content.actions || response?.content.jsonArray || response.content;

		// Validate and filter actions
		const validActions = this.validateAndFilterActions(rawActions);

		// if actions were adjusted via custom prompt, make sure that they do not have an order
		shuffleArray(validActions);
		return { thoughts: response?.thoughts, actions: validActions };
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
