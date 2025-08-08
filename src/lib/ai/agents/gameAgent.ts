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
import { getEntityCoordinator } from '$lib/services/entityCoordinator';
import { getMemoryCoordinator } from '$lib/services/memoryCoordinator';
import { getCoherenceMetricsService } from '$lib/services/coherenceMetrics';

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
	// Optional concise bullets describing concrete changes this turn
	state_change_summary?: string[];
	image_prompt: string;
	inventory_update: Array<InventoryUpdate>;
	stats_update: Array<StatsUpdate>;
	is_character_in_combat: boolean;
	is_character_restrained_explanation?: string;
	currently_present_npcs: Targets;
	story_memory_explanation: string;
	// New: LLM-driven memory capture (optional)
	memory_capture?: {
		should_record: boolean;
		moment_type?: 'action' | 'dialogue' | 'discovery' | 'relationship_change' | 'story_progression' | 'combat' | 'other';
		title?: string;
		summary?: string;
		importance?: 'low' | 'medium' | 'high' | 'critical';
		entities_involved_names?: string[]; // LLM-provided names; will be resolved to IDs
		tags?: string[];
	};
	// Optional feedback describing how guardrails were applied
	coherence_feedback?: string;
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
		activeCompanions?: any[] // DEPRECATED: Use EntityCoordinator instead
	): Promise<{ newState: GameActionState; updatedHistoryMessages: Array<LLMMessage> }> {
		// 🌟 INTEGRATION ENTITYCOORDINATOR & MEMORYCOORDINATOR 🌟
		const entityCoordinator = getEntityCoordinator();
		const memoryCoordinator = getMemoryCoordinator();

		// 1. Obtenir les entités depuis EntityCoordinator au lieu du paramètre deprecated
		const unifiedCompanions = entityCoordinator.getActiveCompanions();
		const allEntities = entityCoordinator.getEntitiesForGameAgent();

		// 2. Générer contexte mémoire intelligent
		const currentStoryId = historyMessages.length;
		const playerEntityId = entityCoordinator.getPlayerEntity()?.id;
		// Inclure toutes les entités connues (hostiles, neutres, amicales) pour éviter l'oubli de contexte
		const presentEntityIds: string[] = [
			...(allEntities?.hostile?.map((e) => e.uniqueTechnicalNameId) || []),
			...(allEntities?.friendly?.map((e) => e.uniqueTechnicalNameId) || []),
			...(allEntities?.neutral?.map((e) => e.uniqueTechnicalNameId) || [])
		];
		const entityIds = playerEntityId ? [playerEntityId, ...presentEntityIds] : presentEntityIds;
		// Dédupliquer
		const focusEntityIds = Array.from(new Set(entityIds));
		const memoryContext = memoryCoordinator.generateContextForStory(
			currentStoryId,
			focusEntityIds,
			10 // contexte depth
		);

		let playerActionText = action.characterName + ': ' + action.text;
		const cost = parseInt(action.resource_cost?.cost as unknown as string) || 0;
		if (cost > 0) {
			playerActionText += `\n${action.resource_cost?.cost} ${action.resource_cost?.resource_key} cost`;
		}
		const playerActionTextForHistory = playerActionText;
		let combinedText = playerActionText;
		if (additionalStoryInput) combinedText += '\n' + additionalStoryInput;

		// 3. Utiliser contexte mémoire intelligent au lieu de relatedHistory basic
		if (memoryContext.relevant_events.length > 0) {
			const intelligentHistory = memoryContext.relevant_events
				.map(event => `${event.title}: ${event.description}`)
				.join('\n');
			combinedText += PAST_STORY_PLOT_RULE + intelligentHistory;
		} else if (relatedHistory.length > 0) {
			// Fallback vers ancien système
			combinedText += PAST_STORY_PLOT_RULE + relatedHistory.join('\n');
		}

		// 4. Instructions système enrichies avec entités unifiées
		const gameAgent = this.getGameAgentSystemInstructionsFromStates(
			storyState,
			characterState,
			playerCharactersGameState,
			inventoryState,
			customSystemInstruction,
			customStoryAgentInstruction,
			customCombatAgentInstruction,
			gameSettings,
			unifiedCompanions, // Utiliser entités unifiées
			memoryContext
		);
		gameAgent.push(jsonSystemInstructionForGameAgent(gameSettings));

		// 4b. Injecter des guardrails de cohérence si nécessaire
		try {
			const coherenceService = getCoherenceMetricsService();
			// Construire validations synthétiques depuis les coordinateurs
			const entityValidation = getEntityCoordinator().detectAndResolveDuplicates();
			const memoryValidation = await getMemoryCoordinator().validateOverallCoherence();
			const metrics = coherenceService.calculateDetailedMetrics(
				entityValidation,
				memoryValidation,
				currentStoryId,
				`Action: ${action.text.substring(0, 60)}`
			);
			const insights = coherenceService.generatePredictiveInsights(entityValidation, memoryValidation);
			if (coherenceService.shouldApplyGuardrails(metrics)) {
				const guard = coherenceService.buildGuardrailsInstructions(entityValidation, memoryValidation, metrics, insights);
				gameAgent.unshift(guard.instruction_block);
			}
		} catch (e) {
			console.warn('Coherence guardrails skipped:', e);
		}

		console.log('🧠 Memory Context Events:', memoryContext.relevant_events.length);
		console.log('🏭 Unified Entities:', allEntities);
		console.log(combinedText);

		const request: LLMRequest = {
			userMessage: combinedText,
			historyMessages: historyMessages,
			systemInstruction: gameAgent,
			returnFallbackProperty: true
		};
		const time = new Date().toLocaleTimeString();
		console.log('Starting game agent with unified systems:', time);

		const newState = (await this.llm.generateContentStream(
			request,
			storyUpdateCallback,
			thoughtUpdateCallback
		)) as GameActionState;

		// 5. Utiliser EntityCoordinator pour currently_present_npcs au lieu de l'ancien système
		if (newState.currently_present_npcs) {
			newState.currently_present_npcs = allEntities;
		}

		// 6. Synchroniser les entités après génération
		if (newState.stats_update) {
			newState.stats_update.forEach(statsUpdate => {
				const entity = entityCoordinator.findEntityByName(statsUpdate.targetName);
				if (entity) {
					const resourceKey = statsUpdate.type.replace('_gained', '').replace('_lost', '');
					const value = parseInt(statsUpdate.value.result) || 0;

					if (entity.resources[resourceKey]) {
						if (statsUpdate.type.includes('_gained')) {
							const newValue = Math.min(
								entity.resources[resourceKey].current_value + Math.abs(value),
								entity.resources[resourceKey].max_value
							);
							entityCoordinator.syncEntityStats(entity.id, {
								[resourceKey]: { ...entity.resources[resourceKey], current_value: newValue }
							});
						} else if (statsUpdate.type.includes('_lost')) {
							const newValue = Math.max(
								entity.resources[resourceKey].current_value - Math.abs(value),
								0
							);
							entityCoordinator.syncEntityStats(entity.id, {
								[resourceKey]: { ...entity.resources[resourceKey], current_value: newValue }
							});
						}
					}
				}
			});
		}

		// 7. Enregistrer l'événement dans MemoryCoordinator (LLM-driven when provided)
		const playerEntity = entityCoordinator.getPlayerEntity();
		if (playerEntity && newState.story) {
			// Inclure toutes les entités pertinentes (joueur, compagnons, NPCs présents)
			const baseInvolvedIds = new Set<string>();
			baseInvolvedIds.add(playerEntity.id);
			unifiedCompanions.forEach((c) => baseInvolvedIds.add(c.id));
			presentEntityIds.forEach((id) => baseInvolvedIds.add(id));

			// Si le LLM propose un enregistrement mémoire, l'utiliser
			const capture = newState.memory_capture;
			if (capture?.should_record) {
				// Résoudre les noms en IDs quand possible
				const resolvedIds = new Set<string>(baseInvolvedIds);
				(capture.entities_involved_names || []).forEach((name) => {
					const ent = entityCoordinator.findEntityByName(name);
					if (ent) resolvedIds.add(ent.id);
				});

				await memoryCoordinator.recordEvent({
					story_id: currentStoryId,
					event_type: capture.moment_type || this.mapActionToEventType(action),
					title: capture.title || `${action.characterName}: ${action.text.substring(0, 50)}...`,
					description: (capture.summary || newState.story.substring(0, 200)) + '...',
					entities_involved: Array.from(resolvedIds),
					emotional_impact: this.calculateEmotionalImpact(action, newState),
					importance_level: capture.importance || this.determineImportanceLevel(action, newState),
					tags: capture.tags && capture.tags.length > 0 ? capture.tags : this.generateEventTags(action, newState),
					narrative_metadata: {
						plot_advancement: !!newState.nextPlotPoint,
						character_development: newState.stats_update?.some(u => u.type.includes('level')) || false,
						world_building: action.type?.includes('exploration') || false,
						mystery_revelation: newState.story.toLowerCase().includes('reveal') || newState.story.toLowerCase().includes('discover')
					}
				});
			} else {
				// Fallback: enregistrement basique comme avant
				await memoryCoordinator.recordEvent({
					story_id: currentStoryId,
					event_type: this.mapActionToEventType(action),
					title: `${action.characterName}: ${action.text.substring(0, 50)}...`,
					description: newState.story.substring(0, 200) + '...',
					entities_involved: Array.from(baseInvolvedIds),
					emotional_impact: this.calculateEmotionalImpact(action, newState),
					importance_level: this.determineImportanceLevel(action, newState),
					tags: this.generateEventTags(action, newState),
					narrative_metadata: {
						plot_advancement: !!newState.nextPlotPoint,
						character_development: newState.stats_update?.some(u => u.type.includes('level')) || false,
						world_building: action.type?.includes('exploration') || false,
						mystery_revelation: newState.story.toLowerCase().includes('reveal') || newState.story.toLowerCase().includes('discover')
					}
				});
			}
		}

		const { userMessage, modelMessage } = this.buildHistoryMessages(
			playerActionTextForHistory,
			newState
		);
		const updatedHistoryMessages = [...historyMessages, userMessage, modelMessage];
		mapGameState(newState);

		console.log('✅ Story generation complete with unified systems');
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
		gameSettings: GameSettings,
		activeCompanions?: any[],
		memoryContext?: any
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

		// Ajouter les compagnons actifs au contexte avec protection contre les doublons
		if (activeCompanions && activeCompanions.length > 0) {
			const companionContexts = activeCompanions.map(companion => {
				return {
					name: companion.character_description.name,
					description: companion.character_description.description,
					personality: companion.character_description.personality,
					background: companion.character_description.background,
					appearance: companion.character_description.appearance,
					abilities: companion.character_stats.spells_and_abilities?.map(ability => ({
						name: ability.name,
						effect: ability.effect
					})) || [],
					loyalty_level: companion.loyalty_level || 50,
					trust_level: companion.trust_level || 30,
					recent_memories: companion.companion_memory.significant_events.slice(-3).map(event => ({
						event_type: event.event_type,
						description: event.description,
						emotional_impact: event.emotional_impact
					}))
				};
			}).filter(companion => companion);

			if (companionContexts.length > 0) {
				// Créer une blacklist des noms de compagnons
				const companionNames = activeCompanions.map(c => c.character_description.name).filter(Boolean);
				const companionNamesLower = companionNames.map(name => name.toLowerCase());

				gameAgent.push(
					'ACTIVE COMPANIONS: The following companions are present and part of the story. They should be included in the narrative, react to events based on their personalities and memories, and be added to currently_present_npcs as friendly:\n' +
					stringifyPretty(companionContexts) +
					'\nCompanions should:\n' +
					'- React authentically based on their personality and recent memories\n' +
					'- Participate in conversations and events\n' +
					'- Show emotional responses consistent with their loyalty/trust levels\n' +
					'- Use their abilities when appropriate\n' +
					'- Be treated as important NPCs, not background elements\n\n' +
					'CRITICAL ANTI-DUPLICATION RULES:\n' +
					`- NEVER create new NPCs with these names: ${companionNames.join(', ')}\n` +
					'- NEVER create NPCs with similar names or variations of companion names\n' +
					'- These companions already exist and should not be duplicated\n' +
					'- Always include existing companions in currently_present_npcs when they should be present\n' +
					'- If a companion is mentioned in the story, use their existing data, do not create a new NPC'
				);
			}
		}

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
			'\nCHARACTER starts with some random items.'
		);
	}

	buildHistoryMessages = function (userText: string, modelStateObject: GameActionState) {
		const userMessage: LLMMessage = { role: 'user', content: userText };
		const modelMessage: LLMMessage = { role: 'model', content: stringifyPretty(modelStateObject) };
		return { userMessage, modelMessage };
	};

	// 🌟 MÉTHODES D'INTEGRATION MEMORYCOORDINATOR 🌟

	/**
	 * Mappe un type d'action vers un type d'événement mémoire
	 */
	mapActionToEventType(action: Action): "discovery" | "action" | "dialogue" | "relationship_change" | "story_progression" | "combat" | "other" {
		const actionType = action.type?.toLowerCase() || '';

		if (actionType.includes('combat') || actionType.includes('attack') || actionType.includes('fight')) {
			return 'combat';
		}
		if (actionType.includes('travel') || actionType.includes('move') || actionType.includes('journey')) {
			return 'story_progression';
		}
		if (actionType.includes('social') || actionType.includes('dialogue') || actionType.includes('conversation')) {
			return 'dialogue';
		}
		if (actionType.includes('investigation') || actionType.includes('search') || actionType.includes('explore')) {
			return 'discovery';
		}
		if (actionType.includes('moral') || actionType.includes('choice') || actionType.includes('decision')) {
			return 'relationship_change';
		}
		if (actionType.includes('magic') || actionType.includes('spell') || actionType.includes('ritual')) {
			return 'action';
		}

		// Type par défaut basé sur le texte de l'action
		const actionText = action.text.toLowerCase();
		if (actionText.includes('help') || actionText.includes('save') || actionText.includes('protect')) {
			return 'action';
		}
		if (actionText.includes('talk') || actionText.includes('speak') || actionText.includes('say')) {
			return 'dialogue';
		}
		if (actionText.includes('discover') || actionText.includes('find') || actionText.includes('reveal')) {
			return 'discovery';
		}

		return 'action';
	}

	/**
	 * Calcule l'impact émotionnel d'une action
	 */
	calculateEmotionalImpact(action: Action, gameState: GameActionState): number {
		let impact = 0;

		// Impact basé sur les stats updates
		if (gameState.stats_update) {
			for (const statsUpdate of gameState.stats_update) {
				const value = parseInt(statsUpdate.value.result) || 0;

				if (statsUpdate.type.includes('hp_lost')) {
					impact -= Math.min(value * 2, 30); // Impact négatif pour dégâts
				}
				if (statsUpdate.type.includes('hp_gained')) {
					impact += Math.min(value * 3, 20); // Impact positif pour soins
				}
				if (statsUpdate.type.includes('xp_gained')) {
					impact += Math.min(value, 15); // Impact positif pour progression
				}
			}
		}

		// Impact basé sur la difficulté
		switch (action.action_difficulty) {
			case 'very_difficult':
				impact += 25;
				break;
			case 'difficult':
				impact += 15;
				break;
			case 'medium':
				impact += 5;
				break;
		}

		// Impact basé sur le type d'action
		const actionType = action.type?.toLowerCase() || '';
		if (actionType.includes('heroic') || action.text.toLowerCase().includes('save')) {
			impact += 20;
		}
		if (actionType.includes('betrayal') || action.text.toLowerCase().includes('betray')) {
			impact -= 30;
		}
		if (gameState.is_character_in_combat) {
			impact += 10; // Combat ajoute du stress
		}

		// Impact basé sur le contenu narratif
		const story = gameState.story?.toLowerCase() || '';
		if (story.includes('success') || story.includes('victory')) {
			impact += 10;
		}
		if (story.includes('failure') || story.includes('defeat')) {
			impact -= 15;
		}
		if (story.includes('discover') || story.includes('reveal')) {
			impact += 8;
		}

		return Math.max(-100, Math.min(100, impact));
	}

	/**
	 * Détermine le niveau d'importance d'un événement
	 */
	determineImportanceLevel(action: Action, gameState: GameActionState): 'low' | 'medium' | 'high' {
		let importanceScore = 0;

		// Score basé sur l'impact émotionnel
		const emotionalImpact = Math.abs(this.calculateEmotionalImpact(action, gameState));
		importanceScore += emotionalImpact / 10;

		// Score basé sur la difficulté
		switch (action.action_difficulty) {
			case 'very_difficult':
				importanceScore += 30;
				break;
			case 'difficult':
				importanceScore += 20;
				break;
			case 'medium':
				importanceScore += 10;
				break;
		}

		// Score basé sur la progression de l'intrigue
		if (gameState.nextPlotPoint !== gameState.currentPlotPoint) {
			importanceScore += 25; // Avancement d'intrigue significatif
		}

		// Score basé sur les conséquences
		if (gameState.stats_update && gameState.stats_update.length > 0) {
			importanceScore += gameState.stats_update.length * 5;
		}
		if (gameState.inventory_update && gameState.inventory_update.length > 0) {
			importanceScore += gameState.inventory_update.length * 3;
		}

		// Score basé sur le contenu narratif
		const storyMemoryExplanation = gameState.story_memory_explanation?.toLowerCase() || '';
		if (storyMemoryExplanation.includes('high')) {
			importanceScore += 20;
		} else if (storyMemoryExplanation.includes('medium')) {
			importanceScore += 10;
		}

		// Combat et événements spéciaux
		if (gameState.is_character_in_combat) {
			importanceScore += 15;
		}

		// Classification finale
		if (importanceScore >= 50) return 'high';
		if (importanceScore >= 25) return 'medium';
		return 'low';
	}

	/**
	 * Génère des tags pour un événement
	 */
	generateEventTags(action: Action, gameState: GameActionState): string[] {
		const tags: string[] = [];

		// Tags basés sur le type d'action
		if (action.type) {
			tags.push(action.type.toLowerCase().replace(' ', '_'));
		}

		// Tags basés sur la difficulté
		if (action.action_difficulty) {
			tags.push(`difficulty_${action.action_difficulty}`);
		}

		// Tags basés sur l'état du jeu
		if (gameState.is_character_in_combat) {
			tags.push('combat');
		}

		// Tags basés sur les stats updates
		if (gameState.stats_update) {
			for (const update of gameState.stats_update) {
				if (update.type.includes('hp_lost')) {
					tags.push('damage_taken');
				}
				if (update.type.includes('hp_gained')) {
					tags.push('healing');
				}
				if (update.type.includes('xp_gained')) {
					tags.push('character_growth');
				}
				if (update.type.includes('level')) {
					tags.push('level_up');
				}
			}
		}

		// Tags basés sur l'inventaire
		if (gameState.inventory_update) {
			for (const update of gameState.inventory_update) {
				if (update.type === 'add_item') {
					tags.push('item_gained');
				}
				if (update.type === 'remove_item') {
					tags.push('item_lost');
				}
			}
		}

		// Tags basés sur le contenu narratif
		const story = gameState.story?.toLowerCase() || '';
		const actionText = action.text.toLowerCase();

		if (story.includes('discover') || actionText.includes('discover')) {
			tags.push('discovery');
		}
		if (story.includes('secret') || actionText.includes('secret')) {
			tags.push('mystery');
		}
		if (story.includes('magic') || actionText.includes('magic')) {
			tags.push('magic');
		}
		if (story.includes('travel') || actionText.includes('travel')) {
			tags.push('travel');
		}
		if (story.includes('npc') || story.includes('character')) {
			tags.push('npc_interaction');
		}

		// Tags basés sur l'avancement de l'intrigue
		if (gameState.nextPlotPoint !== gameState.currentPlotPoint) {
			tags.push('plot_advancement');
		}

		return [...new Set(tags)]; // Supprimer les doublons
	}

	static getRefillValue(maxResource: Resources[string]): number {
		return maxResource.max_value === maxResource.start_value
			? maxResource.max_value
			: maxResource.start_value;
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
- Strict anti-looping and continuity rules:
	- Do not restate or paraphrase the last scene; move the situation forward with new beats.
	- If the previous output ended mid-conversation or mid-action, continue it naturally instead of restarting it.
	- Use PAST STORY PLOT and Memory Context to maintain continuity; never contradict established facts from earlier messages.
	- If the player succeeds on a roll, reflect tangible forward progress or new consequences; avoid resetting the same obstacle.
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
  "story": "depending on If The Action Is A Success Or Failure progress the story further with appropriate consequences. ${!gameSettingsState.detailedNarrationLength ? storyWordLimit : ''} For character speech use single quotes. Format the narration using HTML tags for easier reading.",
	"state_change_summary": ["Bullet points of concrete changes this turn (new clue, moved location, updated resource, NPC reaction, thread advanced)"],
  "story_memory_explanation": "Explanation if story progression has Long-term Impact: Remember events that significantly influence character arcs, plot direction, or the game world in ways that persist or resurface later; Format: {explanation} LONG_TERM_IMPACT: LOW, MEDIUM, HIGH",
  "image_prompt": "Create a prompt for an image generating ai that describes the scene of the story progression, do not use character names but appearance description. Always include the gender. Keep the prompt similar to previous prompts to maintain image consistency. When describing CHARACTER, always refer to appearance variable. Always use the format: {sceneDetailed} {adjective} {charactersDetailed}",
  "xpGainedExplanation": "Explain why or why nor the CHARACTER gains xp in this situation",
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
	,"memory_capture": {
		"should_record": true | false,
		"moment_type": "action" | "dialogue" | "discovery" | "relationship_change" | "story_progression" | "combat" | "other",
		"title": "Short, 5-12 words, summarizing the moment",
		"summary": "1-2 sentences capturing what matters long-term without spoilers",
		"importance": "low" | "medium" | "high" | "critical",
		"entities_involved_names": ["CHARACTER", "Companion Name", "NPC Name"],
		"tags": ["plot_advancement", "clue", "relationship", "combat", "mystery", "worldbuilding"]
	}
		,"coherence_feedback": "If COHERENCE GUARDRAILS were present, briefly explain how continuity/anti-loop rules were applied in this turn."
}`;

const jsonSystemInstructionForPlayerQuestion = `Important Instruction! You must always respond with valid JSON in the following format:
{
  "game_state_considered": Brief explanation on how the game state is involved in the answer; mention relevant variables explicitly,
  "rules_considered": String Array; Identify the relevant Game Master's rules that are related to the question; Include the exact text of a rule,
  "answerToPlayer": Answer outside of character, do not describe the story, but give an explanation
}`;
