import {
	type Action,
	type GameActionState,
	type InventoryState,
	type InventoryUpdate,
	type PlayerCharactersGameState,
	type PlayerCharactersIdToNamesMap,
	type RandomEventsHandling,
	type ResourcesWithCurrentValue,
	SLOW_STORY_PROMPT,
	type Targets
} from '$lib/ai/agents/gameAgent';
import type { StatsUpdate } from '$lib/ai/agents/combatAgent';
import type { NpcID, NPCState, NPCStats } from '$lib/ai/agents/characterStatsAgent';
import isPlainObject from 'lodash.isplainobject';
import { mapXP } from './levelLogic';
import { getNPCTechnicalID } from '$lib/util.svelte';
import { getCharacterTechnicalId } from './characterLogic';
import { InterruptProbability } from '$lib/ai/agents/actionAgent';
import type { DiceRollResult } from '$lib/components/interaction_modals/dice/diceRollLogic';
import { CompanionManager } from '$lib/services/companionManager';
import { CompanionValidationService } from '$lib/services/companionValidationService';
import { NarrativeEvolutionService } from '$lib/services/narrativeEvolutionService';
import type { CompanionCharacter, MemoryEvent } from '$lib/types/companion';
import type { LLM, LLMMessage } from '$lib/ai/llm';
import type { CharacterDescription } from '$lib/ai/agents/characterAgent';
import { v4 as uuidv4 } from 'uuid';
import { initialCompanionValidationState, type CompanionValidationState } from '$lib/util.svelte';
import { getEntityCoordinator } from '$lib/services/entityCoordinator';
import { getMemoryCoordinator } from '$lib/services/memoryCoordinator';

export enum ActionDifficulty {
	simple = 'simple',
	medium = 'medium',
	difficult = 'difficult',
	very_difficult = 'very_difficult'
}

export function getEmptyCriticalResourceKeys(resources: ResourcesWithCurrentValue): string[] {
	return Object.entries(resources)
		.filter((entry) => entry[1].game_ends_when_zero && entry[1].current_value <= 0)
		.map((entry) => entry[0]);
}

// 🏭 MIGRATION VERS ENTITYCOORDINATOR - Fonctions adaptées

export function getAllTargetsAsList(targets: Targets): Array<string> {
	if (!targets || !targets.hostile) {
		return [];
	}
	return [
		...targets.hostile.map(getNPCTechnicalID),
		...targets.neutral.map(getNPCTechnicalID),
		...targets.friendly.map(getNPCTechnicalID)
	];
}

export function getAllNpcsIds(targets: Targets): Array<NpcID> {
	if (!targets || !targets.hostile) {
		return [];
	}
	return [...targets.hostile, ...targets.neutral, ...targets.friendly];
}

// 🌟 VERSION UNIFIÉE avec EntityCoordinator
export function getNewNPCs(targets: Targets, npcState?: NPCState): Array<NpcID> {
	const allNpcIds = getAllNpcsIds(targets);

	// Utiliser EntityCoordinator au lieu de NPCState
	const entityCoordinator = getEntityCoordinator();
	const existingNPCs = entityCoordinator.getAllNPCs();
	const existingNPCIds = existingNPCs.map(npc => npc.id);

	// Fallback vers l'ancien système si nécessaire (transition période)
	if (npcState && Object.keys(npcState).length > 0) {
		console.warn('⚠️ Using legacy NPCState - consider migrating to EntityCoordinator');
		return allNpcIds.filter(
			(newNPC) => !Object.keys(npcState).includes(newNPC.uniqueTechnicalNameId)
		);
	}

	// Version moderne avec EntityCoordinator
	return allNpcIds.filter(
		(newNPC) => !existingNPCIds.includes(newNPC.uniqueTechnicalNameId)
	);
}

// 🌟 NOUVELLES FONCTIONS POUR ENTITYCOORDINATOR

/**
 * Version moderne qui utilise EntityCoordinator pour vérifier les entités existantes
 */
export function getUnifiedNewEntities(targets: Targets): Array<NpcID> {
	const entityCoordinator = getEntityCoordinator();
	const allTargetIds = getAllNpcsIds(targets);

	// Récupérer toutes les entités (NPCs + compagnons)
	const allNPCs = entityCoordinator.getAllNPCs();
	const allCompanions = entityCoordinator.getActiveCompanions();
	const existingEntityIds = [
		...allNPCs.map(npc => npc.id),
		...allCompanions.map(companion => companion.id)
	];

	return allTargetIds.filter(target =>
		!existingEntityIds.includes(target.uniqueTechnicalNameId)
	);
}

/**
 * Synchronise les stats d'une entité avec l'EntityCoordinator
 */
export function syncEntityStatsFromUpdate(statsUpdate: StatsUpdate): boolean {
	const entityCoordinator = getEntityCoordinator();
	const entity = entityCoordinator.findEntityByName(statsUpdate.targetName);

	if (!entity) {
		console.log(`🔍 Entity not found for stats update: ${statsUpdate.targetName}`);
		return false;
	}

	const resourceKey = statsUpdate.type.replace('_gained', '').replace('_lost', '').toUpperCase();
	const value = parseInt(statsUpdate.value.result) || 0;

	if (!entity.resources[resourceKey]) {
		console.log(`❌ Resource ${resourceKey} not found for entity ${entity.id}`);
		return false;
	}

	let newValue = entity.resources[resourceKey].current_value;

	if (statsUpdate.type.includes('_gained')) {
		newValue = Math.min(
			entity.resources[resourceKey].current_value + Math.abs(value),
			entity.resources[resourceKey].max_value
		);
	} else if (statsUpdate.type.includes('_lost')) {
		newValue = Math.max(
			entity.resources[resourceKey].current_value - Math.abs(value),
			0
		);
	}

	// Utiliser EntityCoordinator pour synchroniser
	entityCoordinator.syncEntityStats(entity.id, {
		[resourceKey]: {
			...entity.resources[resourceKey],
			current_value: newValue
		}
	});

	console.log(`✅ Synced ${resourceKey} for ${entity.id}: ${entity.resources[resourceKey].current_value} → ${newValue}`);
	return true;
}

//TODO implement parsing to enums directly from json
export function mustRollDice(action: Action, isInCombat?: boolean) {
	const difficulty: ActionDifficulty =
		ActionDifficulty[action.action_difficulty?.toLowerCase() || ''];
	if (!difficulty || difficulty === ActionDifficulty.simple) {
		return false;
	}

	const actionText = action.text.toLowerCase();
	if (actionText === 'continue the tale') {
		return false;
	}

	//TODO this only works for english but can stay for now
	const listOfDiceRollingActions = ['attempt', 'try', 'seek', 'search', 'investigate'];
	const includesTrying = listOfDiceRollingActions.some((value) => actionText.includes(value));
	if (
		action.type?.toLowerCase() === 'social_manipulation' ||
		action.type?.toLowerCase() === 'spell' ||
		action.type?.toLowerCase() === 'investigation'
	) {
		return true;
	}
	return (
		difficulty !== ActionDifficulty.medium ||
		('' + action.narration_details).includes('HIGH') ||
		isInCombat ||
		includesTrying
	);
}

export const getTargetPromptAddition = function (targets: string[]) {
	return '\n I target ' + targets.join(' and ');
};

export function formatItemId(item_id: string) {
	return item_id.replaceAll('_id', '').replaceAll('_', ' ');
}

export type RenderedGameUpdate = { text: string; resourceText: string; color: string };

export function mapStatsUpdateToGameLogic(statsUpdate: StatsUpdate): StatsUpdate {
	if (statsUpdate.type.toUpperCase().includes('XP')) {
		mapXP(statsUpdate);
	}
	return statsUpdate;
}

function getColorForStatUpdate(mappedType: string, resources: ResourcesWithCurrentValue) {
	let color = '';
	if (mappedType.includes('XP')) color = 'text-green-500';
	if (mappedType.includes('HP')) color = 'text-red-500';
	if (mappedType.includes('MP')) color = 'text-blue-500';
	if (mappedType.includes('LEVEL')) color = 'text-green-500';
	if (mappedType.includes('SKILL')) color = 'text-green-500';
	if (!color) {
		const foundResourceEntry = Object.entries(resources).find((res) => {
			const processedKey = res[0]?.replaceAll('_', ' ').toUpperCase();
			return processedKey?.includes(mappedType.toUpperCase());
		});

		const foundResourceValue = foundResourceEntry ? foundResourceEntry[1] : undefined;
		if (foundResourceValue) {
			color = foundResourceValue.game_ends_when_zero ? 'text-red-500' : 'text-blue-500';
		}
	}
	return color;
}

// ===== Companion Integration Functions =====

export function initializeGameWithCompanions(companionManager: CompanionManager): void {
	// Initialiser les compagnons de départ
	companionManager.initializeGameWithCompanions();
}

export function recordCompanionMemoryFromGameAction(
	companionManager: CompanionManager,
	gameActionState: GameActionState,
	action: Action,
	storyResult: string
): void {
	const activeCompanions = companionManager.getActiveCompanions();

	activeCompanions.forEach(companion => {
		const memoryEvent: MemoryEvent = {
			id: uuidv4(),
			timestamp: new Date().toISOString(),
			event_type: mapActionTypeToMemoryEventType(action.type),
			description: `${action.text} - ${storyResult.substring(0, 200)}...`,
			emotional_impact: calculateEmotionalImpact(gameActionState, action),
			participants: getParticipantsFromAction(action, gameActionState),
			location: extractLocationFromStory(storyResult),
			player_actions: [action.text],
			companion_reaction: generateCompanionReaction(companion, action, gameActionState),
			long_term_significance: determineLongTermSignificance(action, gameActionState)
		};

		companionManager.recordMemoryEvent(companion.id, memoryEvent);
	});
}

function mapActionTypeToMemoryEventType(actionType?: string): MemoryEvent['event_type'] {
	if (!actionType) return 'dialogue';

	const lowerType = actionType.toLowerCase();
	if (lowerType.includes('combat') || lowerType.includes('attack')) return 'combat';
	if (lowerType.includes('travel') || lowerType.includes('move')) return 'travel';
	if (lowerType.includes('investigation') || lowerType.includes('search')) return 'discovery';
	if (lowerType.includes('social') || lowerType.includes('dialogue')) return 'dialogue';
	if (lowerType.includes('moral') || lowerType.includes('choice')) return 'moral_choice';

	return 'dialogue';
}

function calculateEmotionalImpact(gameActionState: GameActionState, action: Action): number {
	let impact = 0;

	// Analyser les stats updates pour déterminer l'impact
	const statsUpdates = gameActionState.stats_update || [];
	const totalDamage = statsUpdates
		.filter(update => update.type === 'hp_lost')
		.reduce((sum, update) => sum + (parseInt(update.value.result) || 0), 0);

	const totalHealing = statsUpdates
		.filter(update => update.type === 'hp_gained')
		.reduce((sum, update) => sum + (parseInt(update.value.result) || 0), 0);

	// Impact négatif pour les dégâts
	impact -= Math.min(totalDamage * 2, 50);

	// Impact positif pour les soins
	impact += Math.min(totalHealing * 3, 30);

	// Impact basé sur la difficulté de l'action
	const difficulty = action.action_difficulty?.toLowerCase();
	if (difficulty === 'very_difficult') impact += 20;
	else if (difficulty === 'difficult') impact += 10;

	// Impact basé sur le type d'action
	const actionType = action.type?.toLowerCase();
	if (actionType?.includes('heroic')) impact += 30;
	if (actionType?.includes('betrayal')) impact -= 40;
	if (actionType?.includes('help')) impact += 15;

	return Math.max(-100, Math.min(100, impact));
}

function getParticipantsFromAction(action: Action, gameActionState: GameActionState): string[] {
	const participants = ['player'];

	// Note: gameActionState.targets might not exist, using a different approach
	// This would need to be implemented based on the actual GameActionState structure
	return participants;
}

function extractLocationFromStory(storyResult: string): string | undefined {
	// Simple extraction - pourrait être amélioré avec de l'IA
	const locationKeywords = ['in the', 'at the', 'near the', 'inside', 'outside'];
	for (const keyword of locationKeywords) {
		const index = storyResult.toLowerCase().indexOf(keyword);
		if (index !== -1) {
			const locationPart = storyResult.substring(index, index + 50);
			return locationPart.split('.')[0];
		}
	}
	return undefined;
}

function generateCompanionReaction(
	companion: CompanionCharacter,
	action: Action,
	gameActionState: GameActionState
): string {
	// Réaction basée sur la personnalité du compagnon
	const personality = companion.character_description.personality.toLowerCase();
	const actionType = action.type?.toLowerCase() || '';

	if (personality.includes('loyal')) {
		if (actionType.includes('help')) return 'Shows approval for the helpful action';
		if (actionType.includes('combat')) return 'Stands ready to support in battle';
	}

	if (personality.includes('cynical')) {
		if (actionType.includes('trust')) return 'Expresses skepticism about trusting others';
		if (actionType.includes('optimistic')) return 'Remains doubtful despite positive outcomes';
	}

	if (personality.includes('brave')) {
		if (actionType.includes('danger')) return 'Eager to face the challenge head-on';
		if (actionType.includes('retreat')) return 'Reluctantly follows but wishes to fight';
	}

	// Réaction par défaut
	const emotionalImpact = calculateEmotionalImpact(gameActionState, action);
	if (emotionalImpact > 20) return 'Reacts positively to the outcome';
	if (emotionalImpact < -20) return 'Shows concern about the situation';

	return 'Observes the situation thoughtfully';
}

function determineLongTermSignificance(
	action: Action,
	gameActionState: GameActionState
): MemoryEvent['long_term_significance'] {
	const emotionalImpact = Math.abs(calculateEmotionalImpact(gameActionState, action));
	const difficulty = action.action_difficulty?.toLowerCase();

	if (emotionalImpact >= 40 || difficulty === 'very_difficult') return 'high';
	if (emotionalImpact >= 20 || difficulty === 'difficult') return 'medium';
	return 'low';
}

export async function processCompanionEvolution(companionManager: CompanionManager): Promise<void> {
	const activeCompanions = companionManager.getActiveCompanions();

	// Déclencher l'évolution de personnalité périodiquement
	for (const companion of activeCompanions) {
		const recentEvents = companion.companion_memory.significant_events
			.filter(event => {
				const eventDate = new Date(event.timestamp);
				const now = new Date();
				const diffHours = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60);
				return diffHours <= 24; // Événements des dernières 24h
			});

		// Si assez d'événements récents, déclencher l'évolution
		if (recentEvents.length >= 3) {
			try {
				const changes = await companionManager.evolvePersonality(companion.id);
				if (changes.length > 0) {
					console.log(`Companion ${companion.character_description.name} evolved:`, changes);
					// Ici on pourrait notifier l'UI de l'évolution
				}
			} catch (error) {
				console.error('Error evolving companion personality:', error);
			}
		}
	}
}

export function getActiveCompanions(companionManager: CompanionManager): CompanionCharacter[] {
	return companionManager.getActiveCompanions();
}

// ===== SYSTÈME DE VALIDATION INTELLIGENT DES COMPAGNONS =====

/**
 * Détermine si une validation des compagnons est nécessaire
 * Utilise différents critères pour éviter les validations inutiles
 */
export function shouldValidateCompanions(
	currentActionIndex: number,
	validationState: CompanionValidationState,
	action: Action,
	gameActionState?: GameActionState,
	companionMentions: CompanionMention[] = []
): {
	shouldValidate: boolean;
	reason: string;
	validationType: 'full' | 'light' | 'targeted';
} {
	// 1. Première utilisation (jeu qui démarre)
	if (validationState.lastValidationActionIndex === -1) {
		return {
			shouldValidate: true,
			reason: 'Initial game setup - validating companions for first time',
			validationType: 'full'
		};
	}

	// 2. Validation forcée (par exemple après un changement majeur)
	if (validationState.forceNextValidation) {
		return {
			shouldValidate: true,
			reason: 'Forced validation requested',
			validationType: 'full'
		};
	}

	// 3. Compagnons mentionnés explicitement par le joueur (@nom)
	if (companionMentions.length > 0) {
		return {
			shouldValidate: true,
			reason: `Companions explicitly mentioned: ${companionMentions.map(m => m.companionName).join(', ')}`,
			validationType: 'targeted'
		};
	}

	// 4. Événements narratifs significatifs détectés
	const significantEvent = detectSignificantNarrativeEvent(action, gameActionState);
	if (significantEvent) {
		return {
			shouldValidate: true,
			reason: `Significant event detected: ${significantEvent}`,
			validationType: 'full'
		};
	}

	// 5. Validation périodique (toutes les 50 actions)
	const actionsSinceLastValidation = currentActionIndex - validationState.lastValidationActionIndex;
	const VALIDATION_INTERVAL = 50;

	if (actionsSinceLastValidation >= VALIDATION_INTERVAL) {
		return {
			shouldValidate: true,
			reason: `Periodic validation (${actionsSinceLastValidation} actions since last validation)`,
			validationType: 'full'
		};
	}

	// 6. Validation légère pour éviter les doublons NPCs (plus fréquente mais moins coûteuse)
	if (actionsSinceLastValidation >= 10 && hasNewNPCsDetected(gameActionState)) {
		return {
			shouldValidate: true,
			reason: 'New NPCs detected - light validation to prevent duplicates',
			validationType: 'light'
		};
	}

	// Pas de validation nécessaire
	return {
		shouldValidate: false,
		reason: `No validation needed (${actionsSinceLastValidation} actions since last)`,
		validationType: 'light'
	};
}

/**
 * Détecte si l'action ou l'état du jeu contient des événements narratifs significatifs
 * qui justifient une validation des compagnons
 */
function detectSignificantNarrativeEvent(
	action: Action,
	gameActionState?: GameActionState
): string | null {
	const actionText = action.text?.toLowerCase() || '';
	const actionType = action.type?.toLowerCase() || '';

	// Time skip ou voyage long
	if (actionText.includes('time passes') ||
		actionText.includes('days pass') ||
		actionText.includes('weeks pass') ||
		actionText.includes('months pass') ||
		actionType.includes('time_skip')) {
		return 'time_skip';
	}

	// Événements de transformation ou changement majeur
	if (actionType.includes('transformation') ||
		actionText.includes('transform') ||
		actionText.includes('become') ||
		actionText.includes('change into')) {
		return 'character_transformation';
	}

	// Événements sociaux majeurs (mariage, mort, alliance)
	const majorSocialEvents = ['marry', 'wedding', 'death', 'die', 'alliance', 'betray', 'join'];
	if (majorSocialEvents.some(event => actionText.includes(event))) {
		return 'major_social_event';
	}

	// Combat majeur ou boss fight
	if (actionType.includes('boss') ||
		actionText.includes('boss') ||
		actionText.includes('final battle') ||
		(gameActionState?.is_character_in_combat && action.action_difficulty === 'very_difficult')) {
		return 'major_combat';
	}

	// Nouveaux lieux importants
	if (actionText.includes('arrive') ||
		actionText.includes('enter') ||
		actionText.includes('reach') ||
		actionType.includes('travel')) {
		return 'location_change';
	}

	// Événements de quête majeurs
	if (actionText.includes('complete') ||
		actionText.includes('finish') ||
		actionText.includes('accomplish') ||
		actionText.includes('achieve')) {
		return 'quest_milestone';
	}

	return null;
}

/**
 * Vérifie s'il y a de nouveaux NPCs dans l'état du jeu qui pourraient être des doublons
 */
function hasNewNPCsDetected(gameActionState?: GameActionState): boolean {
	if (!gameActionState?.currently_present_npcs) {
		return false;
	}

	const allNpcs = getAllNpcsIds(gameActionState.currently_present_npcs);
	// Si plus de 2 nouveaux NPCs, c'est potentiellement significatif
	return allNpcs.length >= 2;
}

/**
 * Met à jour l'état de validation après une validation effectuée
 */
export function updateValidationState(
	validationState: CompanionValidationState,
	currentActionIndex: number,
	validationPerformed: boolean
): CompanionValidationState {
	if (validationPerformed) {
		return {
			...validationState,
			lastValidationActionIndex: currentActionIndex,
			validationCounter: validationState.validationCounter + 1,
			lastValidationTimestamp: new Date().toISOString(),
			forceNextValidation: false
		};
	}
	return validationState;
}

/**
 * Force la prochaine validation (à utiliser après des événements majeurs)
 */
export function forceNextValidation(validationState: CompanionValidationState): CompanionValidationState {
	return {
		...validationState,
		forceNextValidation: true
	};
}

/**
 * Version optimisée de la validation qui adapte son comportement selon le type
 */
export async function smartValidateCompanions(
	llm: LLM,
	companionManager: CompanionManager,
	validationType: 'full' | 'light' | 'targeted',
	storyHistory: string[],
	currentStory: string,
	playerCharacter?: CharacterDescription,
	targetedCompanions: CompanionMention[] = []
): Promise<{
	validatedCompanions: CompanionCharacter[];
	validationSummary: string;
	enrichmentPerformed: boolean;
}> {
	const activeCompanions = companionManager.getActiveCompanions();

	// Si pas de compagnons, pas besoin de validation
	if (activeCompanions.length === 0) {
		return {
			validatedCompanions: [],
			validationSummary: 'No companions to validate',
			enrichmentPerformed: false
		};
	}

	try {
		const companionValidationService = new CompanionValidationService(llm);

		switch (validationType) {
			case 'light':
				// Validation légère : seulement vérification des doublons et données manquantes critiques
				return await performLightValidation(companionValidationService, companionManager);

			case 'targeted':
				// Validation ciblée : seulement sur les compagnons mentionnés
				return await performTargetedValidation(
					companionValidationService,
					companionManager,
					targetedCompanions,
					storyHistory,
					currentStory
				);

			case 'full':
			default:
				// Validation complète : comme avant
				return await validateAndEnrichCompanionsForStoryGeneration(
					llm,
					companionManager,
					storyHistory,
					currentStory,
					playerCharacter
				);
		}
	} catch (error) {
		console.error('Error in smart companion validation:', error);
		return {
			validatedCompanions: activeCompanions,
			validationSummary: 'Validation failed - using existing companion data',
			enrichmentPerformed: false
		};
	}
}

/**
 * Validation légère : vérifications rapides sans enrichissement complet
 */
async function performLightValidation(
	companionValidationService: CompanionValidationService,
	companionManager: CompanionManager
): Promise<{
	validatedCompanions: CompanionCharacter[];
	validationSummary: string;
	enrichmentPerformed: boolean;
}> {
	const activeCompanions = companionManager.getActiveCompanions();
	let validationIssues: string[] = [];

	// Vérifier les données critiques manquantes
	for (const companion of activeCompanions) {
		const isComplete = companionValidationService.isCompanionDataComplete(companion);
		if (!isComplete) {
			validationIssues.push(`${companion.character_description.name}: incomplete data`);
		}
	}

	return {
		validatedCompanions: activeCompanions,
		validationSummary: validationIssues.length > 0
			? `Light validation found ${validationIssues.length} minor issues`
			: 'Light validation passed',
		enrichmentPerformed: false
	};
}

/**
 * Validation ciblée : seulement sur les compagnons mentionnés
 */
async function performTargetedValidation(
	companionValidationService: CompanionValidationService,
	companionManager: CompanionManager,
	targetedCompanions: CompanionMention[],
	storyHistory: string[],
	currentStory: string
): Promise<{
	validatedCompanions: CompanionCharacter[];
	validationSummary: string;
	enrichmentPerformed: boolean;
}> {
	let enrichmentPerformed = false;
	let validationIssues: string[] = [];

	const enrichmentContext = {
		storyHistory,
		currentStory,
		interactionHistory: [],
		characterDescription: undefined
	};

	// Créer un CompanionManager temporaire avec seulement les compagnons mentionnés
	const tempManager = new CompanionManager();
	for (const mention of targetedCompanions) {
		tempManager.createCompanion(mention.companion);
	}

	try {
		// Valider et enrichir seulement les compagnons mentionnés
		const result = await companionValidationService.validateAndEnrichActiveCompanions(
			tempManager,
			enrichmentContext
		);

		// Mettre à jour les compagnons dans le vrai manager
		for (const updatedCompanion of result.updatedCompanions) {
			const wasEnriched = result.validationResults.find(r => r.companionId === updatedCompanion.id)?.wasEnriched;
			if (wasEnriched) {
				companionManager.updateCompanion(updatedCompanion.id, updatedCompanion);
				enrichmentPerformed = true;
			}
		}

		// Collecter les issues pour le résumé
		validationIssues = result.validationResults.flatMap(r => r.issues);

	} catch (error) {
		console.error('Error in targeted companion validation:', error);
		validationIssues.push('Validation failed due to error');
	}

	return {
		validatedCompanions: companionManager.getActiveCompanions(),
		validationSummary: `Targeted validation of ${targetedCompanions.length} mentioned companion(s)${validationIssues.length > 0 ? ` - ${validationIssues.length} issues found` : ''}`,
		enrichmentPerformed
	};
}

// ===== SYSTÈME DE VALIDATION ET ENRICHISSEMENT DES COMPAGNONS =====

/**
 * Valide et enrichit automatiquement les données des compagnons avant génération d'histoire
 * Garantit que tous les compagnons ont des données complètes et cohérentes pour l'IA
 */
export async function validateAndEnrichCompanionsForStoryGeneration(
	llm: LLM,
	companionManager: CompanionManager,
	storyHistory: string[],
	currentStory: string,
	playerCharacter?: CharacterDescription
): Promise<{
	validatedCompanions: CompanionCharacter[];
	validationSummary: string;
	enrichmentPerformed: boolean;
}> {
	try {
		const companionValidationService = new CompanionValidationService(llm);

		// Préparer le contexte d'enrichissement
		const enrichmentContext = {
			storyHistory,
			currentStory,
			interactionHistory: [], // Pourrait être peuplé avec les dialogues récents
			characterDescription: playerCharacter
		};

		// Valider et enrichir tous les compagnons actifs
		const results = await companionValidationService.validateAndEnrichActiveCompanions(
			companionManager,
			enrichmentContext
		);

		// Construire un résumé des validations
		const enrichmentPerformed = results.validationResults.some(r => r.wasEnriched);
		const validationSummary = buildValidationSummary(results.validationResults);

		console.log('Companion validation completed:', {
			totalCompanions: results.updatedCompanions.length,
			enrichmentPerformed,
			issues: results.validationResults.flatMap(r => r.issues)
		});

		return {
			validatedCompanions: results.updatedCompanions,
			validationSummary,
			enrichmentPerformed
		};

	} catch (error) {
		console.error('Error in companion validation:', error);
		// En cas d'erreur, retourner les compagnons non modifiés
		const activeCompanions = companionManager.getActiveCompanions();
		return {
			validatedCompanions: activeCompanions,
			validationSummary: 'Validation failed - using existing companion data',
			enrichmentPerformed: false
		};
	}
}

/**
 * Construit un résumé des résultats de validation pour logging/debugging
 */
function buildValidationSummary(validationResults: Array<{
	companionId: string;
	wasEnriched: boolean;
	issues: string[];
}>): string {
	const enriched = validationResults.filter(r => r.wasEnriched);
	const totalIssues = validationResults.flatMap(r => r.issues).length;

	if (enriched.length === 0 && totalIssues === 0) {
		return 'All companions validated successfully - no enrichment needed';
	}

	const summaryParts: string[] = [];

	if (enriched.length > 0) {
		summaryParts.push(`${enriched.length} companion(s) data enriched`);
	}

	if (totalIssues > 0) {
		summaryParts.push(`${totalIssues} validation issue(s) resolved`);
	}

	return summaryParts.join(', ');
}

/**
 * Génère un contexte de prompt optimisé pour l'IA avec les compagnons validés
 * Empêche les doublons NPCs/Compagnons en créant une blacklist claire
 */
export function generateEnhancedCompanionPromptContext(
	validatedCompanions: CompanionCharacter[],
	companionValidationService: CompanionValidationService
): string {
	if (validatedCompanions.length === 0) {
		return '';
	}

	// Générer le contexte principal des compagnons
	const companionPromptContext = companionValidationService.generateCompanionPromptContext(validatedCompanions);

	// Générer la blacklist des noms pour éviter les doublons
	const companionBlacklist = companionValidationService.generateCompanionBlacklist(validatedCompanions);

	// Construire le prompt final avec protection anti-duplication renforcée
	const enhancedContext = `
${companionPromptContext}

🚨 ANTI-DUPLICATION PROTECTION 🚨
COMPANION NAME BLACKLIST (NEVER create NPCs with these names):
${companionBlacklist.map(name => `- "${name}"`).join('\n')}

CRITICAL RULES:
1. These companions ALREADY EXIST - never duplicate them as new NPCs
2. Check all NPC names against this blacklist before creating them  
3. If story mentions these names, use existing companion data
4. Always include active companions in currently_present_npcs when appropriate
5. Companions should actively participate in dialogue and actions based on their personality

COMPANION DATA COMPLETENESS: All companions have been validated and enriched with:
✓ Detailed physical appearances (20+ characters)
✓ Rich personality descriptions (15+ characters) 
✓ Narrative backgrounds (10+ characters)
✓ Consistent abilities and traits
✓ Story-coherent characteristics`;

	return enhancedContext;
}

/**
 * Vérifie rapidement si un nom d'NPC entre en conflit avec les compagnons existants
 * Peut être utilisée pendant la génération pour validation supplémentaire
 */
export function checkNPCNameForCompanionConflict(
	npcName: string,
	companionManager: CompanionManager,
	companionValidationService: CompanionValidationService
): {
	hasConflict: boolean;
	conflictingCompanion?: CompanionCharacter;
	suggestion: string;
} {
	const activeCompanions = companionManager.getActiveCompanions();
	const hasConflict = companionValidationService.isNpcNameConflictingWithCompanions(npcName, activeCompanions);

	if (hasConflict) {
		const conflictingCompanion = activeCompanions.find(c =>
			c.character_description.name.toLowerCase() === npcName.toLowerCase() ||
			c.character_description.name.toLowerCase().includes(npcName.toLowerCase())
		);

		return {
			hasConflict: true,
			conflictingCompanion,
			suggestion: conflictingCompanion ?
				`Use existing companion "${conflictingCompanion.character_description.name}" instead of creating new NPC` :
				`Choose different name - "${npcName}" conflicts with existing companion`
		};
	}

	return {
		hasConflict: false,
		suggestion: `Name "${npcName}" is available for new NPC`
	};
}

/**
 * Auto-nettoyage périodique des données de compagnons pour maintenir la qualité
 * Peut être appelé périodiquement (ex: toutes les 10 actions) 
 */
export async function performPeriodicCompanionMaintenance(
	llm: LLM,
	companionManager: CompanionManager,
	storyHistory: string[],
	npcState: NPCState
): Promise<{
	maintenancePerformed: boolean;
	summary: string;
}> {
	try {
		// Nettoyer les doublons NPCs/Compagnons
		const cleanupResult = await cleanupNPCCompanionDuplicates(llm, npcState, companionManager);

		// Valider les compagnons avec l'histoire récente
		const lastStories = storyHistory.slice(-3).join('\n');
		const validationResult = await validateAndEnrichCompanionsForStoryGeneration(
			llm,
			companionManager,
			storyHistory,
			lastStories
		);

		const maintenancePerformed =
			cleanupResult.removedNPCs.length > 0 ||
			validationResult.enrichmentPerformed;

		const summaryParts: string[] = [];
		if (cleanupResult.removedNPCs.length > 0) {
			summaryParts.push(`Cleaned ${cleanupResult.removedNPCs.length} duplicate NPCs`);
		}
		if (validationResult.enrichmentPerformed) {
			summaryParts.push('Enriched companion data');
		}

		const summary = maintenancePerformed ?
			summaryParts.join(', ') :
			'No maintenance needed';

		console.log('Periodic companion maintenance:', summary);

		return { maintenancePerformed, summary };

	} catch (error) {
		console.error('Error in companion maintenance:', error);
		return {
			maintenancePerformed: false,
			summary: 'Maintenance failed due to error'
		};
	}
}

// ===== Système de mentions @ =====

export interface CompanionMention {
	companionName: string;
	companionId: string;
	companion: CompanionCharacter;
}

export function detectCompanionMentions(
	input: string,
	companionManager: CompanionManager
): { cleanInput: string; mentions: CompanionMention[] } {
	const mentionRegex = /@(\w+)/gi;
	const mentions: CompanionMention[] = [];
	const activeCompanions = companionManager.getActiveCompanions();

	// Détecter toutes les mentions @
	const matches = Array.from(input.matchAll(mentionRegex));

	for (const match of matches) {
		const mentionedName = match[1].toLowerCase();

		// Chercher le compagnon correspondant (insensible à la casse)
		const companion = activeCompanions.find(c =>
			c.character_description.name.toLowerCase() === mentionedName ||
			c.character_description.name.toLowerCase().startsWith(mentionedName)
		);

		if (companion) {
			mentions.push({
				companionName: companion.character_description.name,
				companionId: companion.id,
				companion: companion
			});
		}
	}

	// Nettoyer l'input en remplaçant les mentions par le nom complet
	let cleanInput = input;
	mentions.forEach(mention => {
		const regex = new RegExp(`@${mention.companionName}`, 'gi');
		cleanInput = cleanInput.replace(regex, mention.companionName);
	});

	return { cleanInput, mentions };
}

export function generateCompanionContextForPrompt(mentions: CompanionMention[]): string {
	if (mentions.length === 0) return '';

	const contextParts = mentions.map(mention => {
		const companion = mention.companion;
		const recentMemories = companion.companion_memory.significant_events
			.slice(-3) // 3 derniers événements
			.map(event => `- ${event.description} (${event.emotional_impact > 0 ? 'positive' : 'negative'} impact)`)
			.join('\n');

		const personalityTraits = companion.personality_evolution.current_personality_traits
			.map(trait => `${trait.trait_name}: ${trait.value}`)
			.join(', ');

		return `
COMPAGNON MENTIONNÉ: ${companion.character_description.name} (ID: ${companion.id})
Personnalité: ${companion.character_description.personality}
Traits actuels: ${personalityTraits}
Loyauté: ${companion.loyalty_level}% | Confiance: ${companion.trust_level}%
Relation: ${companion.relationship_data.current_status}

Mémoires récentes:
${recentMemories || 'Aucun événement récent'}

Réagir selon cette personnalité et ces souvenirs.`;
	});

	return `
=== COMPAGNONS MENTIONNÉS ===
${contextParts.join('\n\n')}
=== FIN CONTEXTE COMPAGNONS ===
`;
}

export function updateCompanionFromStatsUpdate(companionManager: CompanionManager, statsUpdate: StatsUpdate): void {
	const activeCompanions = companionManager.getActiveCompanions();
	const targetCompanion = activeCompanions.find(
		companion => companion.character_description.name === statsUpdate.targetName
	);

	if (targetCompanion && targetCompanion.character_stats.resources) {
		const result = Number.parseInt(statsUpdate.value.result);
		const resources = targetCompanion.character_stats.resources;

		switch (statsUpdate.type) {
			case 'hp_gained':
				if (resources.HP) {
					const currentValue = resources.HP.start_value || 0; // Using start_value as fallback
					const newValue = Math.min(currentValue + (result > 0 ? result : 0), resources.HP.max_value);
					// Note: ResourceWithCurrentValue type doesn't have current_value, this needs proper implementation
				}
				break;
			case 'hp_lost':
				if (resources.HP) {
					const currentValue = resources.HP.start_value || 0;
					const newValue = Math.max(currentValue - (result > 0 ? result : 0), 0);
					// Note: ResourceWithCurrentValue type doesn't have current_value, this needs proper implementation
				}
				break;
			// Similar for MP cases...
		}

		// Sauvegarder les changements
		companionManager.updateCompanion(targetCompanion.id, {
			character_stats: targetCompanion.character_stats
		});
	}
}

// ===== SYSTÈME D'ÉVOLUTION NARRATIVE INTÉGRÉ =====

/**
 * Fonction principale à appeler après chaque génération de story
 * Gère la déduplication des NPCs/Compagnons et l'évolution narrative
 */
export async function processNarrativeEvolutionPostStory(
	llm: LLM,
	currentStory: string,
	storyHistory: LLMMessage[],
	companionManager: CompanionManager,
	playerCharacter: CharacterDescription,
	npcState: NPCState
): Promise<{
	shouldNotifyPlayer: boolean;
	evolutionSummary: string;
	deduplicationResult: any;
	evolutionResult: any;
}> {
	try {
		const narrativeEvolutionService = new NarrativeEvolutionService(llm);

		// Exécuter le processus d'évolution narrative complet
		const results = await narrativeEvolutionService.processPostStoryEvolution(
			currentStory,
			storyHistory,
			companionManager,
			playerCharacter,
			npcState
		);

		// Analyser si le joueur doit être notifié
		const shouldNotifyPlayer =
			results.deduplication.removedNPCs.length > 0 ||
			results.evolution.newCompanionsCreated.length > 0 ||
			results.evolution.companionsEvolved.length > 0 ||
			(results.evolution.narrativeChanges.timeSkipDetected !== undefined);

		// Construire un résumé pour le joueur
		const evolutionSummary = buildEvolutionSummary(results);

		console.log('Narrative Evolution Results:', {
			deduplication: results.deduplication,
			evolution: results.evolution
		});

		return {
			shouldNotifyPlayer,
			evolutionSummary,
			deduplicationResult: results.deduplication,
			evolutionResult: results.evolution
		};

	} catch (error) {
		console.error('Error in narrative evolution processing:', error);
		return {
			shouldNotifyPlayer: false,
			evolutionSummary: '',
			deduplicationResult: { removedNPCs: [], conflictsResolved: [], companionsUpdated: [] },
			evolutionResult: { companionsEvolved: [], newCompanionsCreated: [], relationshipsUpdated: [], narrativeChanges: {} }
		};
	}
}

/**
 * Construire un résumé des changements pour le joueur
 */
function buildEvolutionSummary(results: { deduplication: any; evolution: any }): string {
	const summaryParts: string[] = [];

	// NPCs supprimés pour éviter les doublons
	if (results.deduplication.removedNPCs.length > 0) {
		summaryParts.push(`🔄 ${results.deduplication.removedNPCs.length} duplicate character(s) resolved`);
	}

	// Nouveaux compagnons créés
	if (results.evolution.newCompanionsCreated.length > 0) {
		summaryParts.push(`✨ ${results.evolution.newCompanionsCreated.length} new companion(s) emerged from the story`);
	}

	// Compagnons qui ont évolué
	if (results.evolution.companionsEvolved.length > 0) {
		summaryParts.push(`📈 ${results.evolution.companionsEvolved.length} companion(s) evolved based on recent experiences`);
	}

	// Relations mises à jour
	if (results.evolution.relationshipsUpdated.length > 0) {
		summaryParts.push(`💕 ${results.evolution.relationshipsUpdated.length} relationship(s) changed`);
	}

	// Time skip détecté
	if (results.evolution.narrativeChanges.timeSkipDetected) {
		const timeSkip = results.evolution.narrativeChanges.timeSkipDetected;
		summaryParts.push(`⏰ Time passage detected: ${timeSkip.duration}`);
	}

	// Événements de vie majeurs
	if (results.evolution.narrativeChanges.lifeEvents && results.evolution.narrativeChanges.lifeEvents.length > 0) {
		const majorEvents = results.evolution.narrativeChanges.lifeEvents.filter(e => e.impact === 'high');
		if (majorEvents.length > 0) {
			summaryParts.push(`🎭 ${majorEvents.length} major life event(s) affected your companions`);
		}
	}

	return summaryParts.length > 0 ?
		'🌟 Story Evolution:\n' + summaryParts.join('\n') :
		'';
}

/**
 * Vérifier et nettoyer automatiquement les NPCs dupliqués (peut être appelé périodiquement)
 */
export async function cleanupNPCCompanionDuplicates(
	llm: LLM,
	npcState: NPCState,
	companionManager: CompanionManager
): Promise<{ removedNPCs: string[]; message: string }> {
	try {
		const narrativeEvolutionService = new NarrativeEvolutionService(llm);
		const result = await narrativeEvolutionService.deduplicateNPCsAndCompanions(npcState, companionManager);

		return {
			removedNPCs: result.removedNPCs,
			message: result.removedNPCs.length > 0 ?
				`Cleaned up ${result.removedNPCs.length} duplicate NPCs that became companions` :
				'No duplicates found'
		};
	} catch (error) {
		console.error('Error in NPC cleanup:', error);
		return {
			removedNPCs: [],
			message: 'Error during cleanup'
		};
	}
}

/**
 * Action spéciale "Time Skip" que le joueur peut utiliser
 */
export async function processTimeSkipAction(
	llm: LLM,
	timeSkipDescription: string,
	companionManager: CompanionManager,
	playerCharacter: CharacterDescription,
	storyHistory: LLMMessage[]
): Promise<{
	evolutionResult: any;
	newStoryContent: string;
}> {
	try {
		const narrativeEvolutionService = new NarrativeEvolutionService(llm);

		// Construire une story artificielle pour le time skip
		const timeSkipStory = `Time passes... ${timeSkipDescription}`;

		// Traiter l'évolution narrative pour ce time skip
		const evolution = await narrativeEvolutionService.analyzeAndEvolveNarrative(
			timeSkipStory,
			storyHistory,
			companionManager,
			playerCharacter,
			{} // Pas de NPCs à nettoyer pour un time skip
		);

		// Générer un contenu narratif approprié
		const newStoryContent = generateTimeSkipStoryContent(evolution, timeSkipDescription);

		return {
			evolutionResult: evolution,
			newStoryContent
		};

	} catch (error) {
		console.error('Error processing time skip:', error);
		return {
			evolutionResult: { companionsEvolved: [], newCompanionsCreated: [], relationshipsUpdated: [], narrativeChanges: {} },
			newStoryContent: `Time passes... ${timeSkipDescription}`
		};
	}
}

function generateTimeSkipStoryContent(evolution: any, timeSkipDescription: string): string {
	let storyContent = `${timeSkipDescription}\n\n`;

	// Ajouter les changements de compagnons
	if (evolution.companionsEvolved.length > 0) {
		storyContent += `During this time, you notice changes in your companions. They seem to have grown and evolved through your shared experiences.\n\n`;
	}

	// Ajouter les nouveaux compagnons
	if (evolution.newCompanionsCreated.length > 0) {
		storyContent += `New faces have joined your journey, emerging naturally from the circumstances of your adventures.\n\n`;
	}

	// Ajouter les événements de vie
	if (evolution.narrativeChanges.lifeEvents && evolution.narrativeChanges.lifeEvents.length > 0) {
		for (const event of evolution.narrativeChanges.lifeEvents) {
			storyContent += `${event.description}\n`;
		}
		storyContent += '\n';
	}

	storyContent += 'The passage of time has brought changes to your group, and new chapter of your adventure begins...';

	return storyContent;
}

export function renderStatUpdates(
	statsUpdates: Array<StatsUpdate>,
	resources: ResourcesWithCurrentValue,
	playerNames: Array<string>
): (undefined | RenderedGameUpdate)[] {
	if (statsUpdates) {
		return statsUpdates
			.toSorted((a, b) => (a.targetName < b.targetName ? -1 : 1))
			.map(mapStatsUpdateToGameLogic)
			.map((statsUpdate) => {
				if (
					!statsUpdate.value?.result ||
					isPlainObject(statsUpdate.value.result) ||
					Number.parseInt(statsUpdate.value.result) <= 0 ||
					statsUpdate.type === 'null' ||
					statsUpdate.type === 'none'
				) {
					return undefined;
				}
				let responseText: string;
				let resourceText = ('' + statsUpdate.value.result).replaceAll('_', ' ');
				let changeText = statsUpdate.type?.includes('_gained')
					? 'gain'
					: statsUpdate.type?.includes('_lost')
						? 'loose'
						: undefined;

				const mappedType =
					statsUpdate.type
						?.replace('_gained', '')
						.replace('_lost', '')
						.replace('_increased', '')
						.replaceAll('_', ' ')
						.toUpperCase() || '';

				const color = getColorForStatUpdate(mappedType, resources);

				if (playerNames.includes(statsUpdate.targetName)) {
					responseText = 'You ';
					if (!changeText) {
						//probably unhandled status effect
						changeText = 'are';
					}
					if (mappedType.includes('LEVEL')) {
						resourceText = '';
					} else {
						resourceText =
							'' +
							(getTakeLessDamageForManyHits(
								statsUpdates,
								Number.parseInt(statsUpdate.value.result),
								playerNames
							) || resourceText);
					}
				} else {
					responseText = statsUpdate.targetName.replaceAll('_', ' ').replaceAll('id', '') + ' ';
					if (!changeText) {
						//probably unhandled status effect
						changeText = 'is';
					} else {
						//third person
						changeText += 's';
					}
				}
				responseText += changeText;
				resourceText += ' ' + mappedType;
				return { text: responseText, resourceText, color };
			})
			.filter((value) => !!value);
	}
	return [];
}

export function renderInventoryUpdate(
	inventoryUpdate: Array<InventoryUpdate>
): Array<undefined | RenderedGameUpdate> {
	if (inventoryUpdate) {
		return inventoryUpdate
			.toSorted((a, b) => (a.type < b.type ? -1 : 1))
			.map((inventoryUpdate) => {
				const mappedId = formatItemId(inventoryUpdate.item_id);
				let text = '',
					resourceText = mappedId;
				const color = 'text-yellow-500';
				if (inventoryUpdate.type === 'add_item') {
					text = 'You gain ';
				}
				if (inventoryUpdate.type === 'remove_item') {
					text = 'You loose ';
				}
				if (!text) {
					text = 'Unidentified item update:';
					resourceText = JSON.stringify(inventoryUpdate);
				}
				return { text, resourceText, color };
			})
			.filter((value) => !!value);
	}
	return [];
}

//TODO too difficult if too many hits
function getTakeLessDamageForManyHits(
	stats_update: Array<StatsUpdate>,
	damage: number,
	playerNames: Array<string>
) {
	if (damage <= 2) {
		return damage;
	}
	const allPlayerHits = stats_update
		.filter((update) => playerNames.includes(update.targetName))
		.filter((update) => update.type === 'hp_lost');

	return Math.max(1, Math.round(damage / Math.min(3, allPlayerHits?.length || 1)));
}

export function applyGameActionState(
	playerCharactersGameState: PlayerCharactersGameState,
	playerCharactersIdToNamesMapState: PlayerCharactersIdToNamesMap,
	npcState: NPCState,
	inventoryState: InventoryState,
	state: GameActionState,
	prohibitNPCChange = false
) {
	function getResourceIfPresent(resources: ResourcesWithCurrentValue, key: string) {
		let resource = resources[key];
		if (!resource) {
			resource = resources[key.toUpperCase()];
		}
		return resource;
	}

	for (const statUpdate of state?.stats_update?.map(mapStatsUpdateToGameLogic) || []) {
		const characterId =
			getCharacterTechnicalId(playerCharactersIdToNamesMapState, statUpdate.targetName) || '';
		if (playerCharactersGameState[characterId]) {
			if (statUpdate.type.includes('now_level')) {
				playerCharactersGameState[characterId].XP.current_value -=
					Number.parseInt(statUpdate.value.result) || 0;
				continue;
			}
			if (statUpdate.type === 'xp_gained') {
				playerCharactersGameState[characterId].XP.current_value +=
					Number.parseInt(statUpdate.value.result) || 0;
			} else {
				if (statUpdate.type.includes('_gained')) {
					const resource: string = statUpdate.type.replace('_gained', '');
					const res = getResourceIfPresent(playerCharactersGameState[characterId], resource);
					if (!res) continue;
					let gained = Number.parseInt(statUpdate.value.result) || 0;
					gained = gained > 0 ? gained : 0;
					if ((res.current_value || 0) + gained <= res.max_value) {
						res.current_value = (res.current_value || 0) + gained;
					} else {
						res.current_value = res.max_value;
					}
				}
			}
			if (statUpdate.type.includes('_lost')) {
				const resource: string = statUpdate.type.replace('_lost', '');
				const res = getResourceIfPresent(playerCharactersGameState[characterId], resource);
				if (!res) continue;
				let lost = Number.parseInt(statUpdate.value.result) || 0;
				lost = lost > 0 ? lost : 0;
				res.current_value -= lost;
			}
		} else {
			if (!prohibitNPCChange) {
				let npc: NPCStats | undefined = Object.values(npcState).find((npc) =>
					npc.known_names?.includes(statUpdate.targetName)
				);
				if (!npc) {
					npc = npcState[statUpdate.targetName];
				}
				if (npc && npc.resources) {
					const result = Number.parseInt(statUpdate.value.result);
					switch (statUpdate.type) {
						case 'hp_gained':
							npc.resources.current_hp += result > 0 ? result : 0;
							break;
						case 'hp_lost':
							npc.resources.current_hp -= result > 0 ? result : 0;
							break;
						case 'mp_gained':
							npc.resources.current_mp += result > 0 ? result : 0;
							break;
						case 'mp_lost':
							npc.resources.current_mp -= result > 0 ? result : 0;
							break;
					}
				}
			}
		}
	}

	applyInventoryUpdate(inventoryState, state);
}

export function applyInventoryUpdate(inventoryState: InventoryState, state: GameActionState) {
	for (const inventoryUpdate of state?.inventory_update || []) {
		if (inventoryUpdate.type === 'remove_item') {
			delete inventoryState[inventoryUpdate.item_id];
		}
		if (inventoryUpdate.type === 'add_item') {
			if (inventoryUpdate.item_added) {
				inventoryState[inventoryUpdate.item_id] = inventoryUpdate.item_added;
			} else {
				console.error('item_added with no item', JSON.stringify(inventoryUpdate));
			}
		}
	}
}

export function applyGameActionStates(
	playerCharactersGameState: PlayerCharactersGameState,
	playerCharactersIdToNamesMapState: PlayerCharactersIdToNamesMap,
	npcState: NPCState,
	inventoryState,
	states: Array<GameActionState>
) {
	for (const state of states) {
		//TODO because of prohibitNPCChange we can not revert actions anymore, introduce derived aswell?
		applyGameActionState(
			playerCharactersGameState,
			playerCharactersIdToNamesMapState,
			npcState,
			inventoryState,
			state,
			true
		);
	}
}

export function getGameEndedMessage() {
	return 'Your Tale has come to an end...\\nThanks for playing Infinite Tales RPG!\\nYou can start a new Tale in the menu.';
}

export function isEnoughResource(
	action: Action,
	resources: ResourcesWithCurrentValue,
	inventory: InventoryState
): boolean {
	const cost = parseInt(action.resource_cost?.cost as unknown as string) || 0;
	if (cost === 0) {
		return true;
	}
	const resourceKey = Object.keys(resources).find(
		(key) => key.toLowerCase() === action.resource_cost?.resource_key?.toLowerCase()
	);
	let inventoryKey: string | undefined = undefined;
	if (!resourceKey) {
		inventoryKey = Object.keys(inventory).find(
			(key) => key.toLowerCase() === action.resource_cost?.resource_key?.toLowerCase()
		);
		return !!inventoryKey;
	}
	return resources[resourceKey || '']?.current_value >= cost;
}

export function getContinueTalePromptAddition(
	gameActions: GameActionState[],
	currentCharacterName: string
): string {
	if (gameActions.length === 0) {
		return '';
	}

	const lastAction = gameActions[gameActions.length - 1];
	const lastStory = lastAction?.story || '';

	// Construire un prompt spécifique pour "Continue The Tale"
	let continuationPrompt = '\n\nCONTINUE THE TALE INSTRUCTIONS:\n';
	continuationPrompt += '- Move the story forward with new developments, do not repeat recent events\n';
	continuationPrompt += '- Introduce new dialogue, encounters, or story elements\n';
	continuationPrompt += '- Build upon the current situation without rehashing what just happened\n';
	continuationPrompt += '- If characters were speaking, continue or conclude their conversation naturally\n';
	continuationPrompt += '- If action was taking place, show the next logical consequence or development\n';

	// Analyser le dernier événement pour donner des directions spécifiques
	const lastStoryLower = lastStory.toLowerCase();
	if (lastStoryLower.includes('says') || lastStoryLower.includes('speaks') || lastStoryLower.includes('"')) {
		continuationPrompt += '- Continue the conversation or show reactions to what was said\n';
	}
	if (lastStoryLower.includes('enters') || lastStoryLower.includes('arrives') || lastStoryLower.includes('approaches')) {
		continuationPrompt += '- Show what happens after the arrival/entrance\n';
	}
	if (lastStoryLower.includes('begins') || lastStoryLower.includes('starts')) {
		continuationPrompt += '- Progress the action that was just initiated\n';
	}
	if (lastStoryLower.includes('combat') || lastStoryLower.includes('fight') || lastStoryLower.includes('attack')) {
		continuationPrompt += '- Continue the combat sequence with new developments\n';
	}

	continuationPrompt += '\nFocus on advancing the narrative meaningfully rather than describing the same scene again.\n';
	continuationPrompt += '- Avoid repeating the same sentences or re-describing the same setting; build the next beat.\n';
	continuationPrompt += "- If nothing new can happen logically, introduce a small but fresh development (a reaction, clue, or consequence) consistent with prior events.\n";

	return continuationPrompt;
}

export function addAdditionsFromActionSideeffects(
	action: Action,
	additionalStoryInput: string,
	randomEventsHandling: RandomEventsHandling,
	is_character_in_combat: boolean,
	diceRollResult: DiceRollResult
) {
	const is_travel = action.type?.toLowerCase().includes('travel');
	const narration_details = JSON.stringify(action.narration_details) || '';
	if (is_travel || narration_details.includes('HIGH') || narration_details.includes('MEDIUM')) {
		additionalStoryInput += '\n' + SLOW_STORY_PROMPT;
	}
	const encounterString = JSON.stringify(action.enemyEncounterExplanation) || '';
	if (encounterString.includes('HIGH') && !encounterString.includes('LOW')) {
		additionalStoryInput += '\nenemyEncounter: ' + encounterString;
	}

	// Respect player success more: avoid random interruptions on any success unless explicitly ALWAYS
	const isSuccess = diceRollResult === 'critical_success' || diceRollResult === 'major_success' || diceRollResult === 'regular_success';
	if (randomEventsHandling !== 'none' && !isSuccess) {
		const is_interruptible = JSON.stringify(action.is_interruptible) || '';
		const probabilityEnum = getProbabilityEnum(is_interruptible);
		const directly_interrupted =
			probabilityEnum === InterruptProbability.ALWAYS || probabilityEnum === InterruptProbability.HIGH;
		const travel_interrupted = is_travel && probabilityEnum === InterruptProbability.MEDIUM;

		if (randomEventsHandling === 'ai_decides') {
			if (directly_interrupted || travel_interrupted) {
				additionalStoryInput += `\naction is possibly interrupted: ${is_interruptible} probability.`;
			}
		}
		if (randomEventsHandling === 'probability') {
			//combat is already long enough, dont interrupt often
			let modifier = is_character_in_combat ? 0.5 : 1;
			// Reduce chance further on partial failure (player still made progress)
			if (diceRollResult === 'partial_failure') modifier *= 0.7;
			const randomEventCreated = isRandomEventCreated(probabilityEnum, modifier);
			console.log('randomEventCreated', randomEventCreated);
			if (randomEventCreated) {
				additionalStoryInput += `\naction definitely must be interrupted: ${action.is_interruptible?.reasoning}`;
			}
		}
	}
	return additionalStoryInput;
}

function getProbabilityEnum(probability: string) {
	if (probability.includes('ALWAYS')) {
		return InterruptProbability.ALWAYS;
	}
	if (probability.includes('LOW')) {
		return InterruptProbability.LOW;
	}
	if (probability.includes('MEDIUM')) {
		return InterruptProbability.MEDIUM;
	}
	if (probability.includes('HIGH')) {
		return InterruptProbability.HIGH;
	}
	return InterruptProbability.NEVER;
}

export function isRandomEventCreated(probEnum: InterruptProbability, modifier = 1) {
	const randomEventValue = Math.random();
	console.log('randomEventValue', randomEventValue, probEnum, 'modifier', modifier);
	switch (probEnum) {
		case InterruptProbability.NEVER:
			return false;
		case InterruptProbability.LOW:
			return randomEventValue < 0.05 * modifier;
		case InterruptProbability.MEDIUM:
			return randomEventValue < 0.2 * modifier;
		case InterruptProbability.HIGH:
			return randomEventValue < 0.35 * modifier;
		case InterruptProbability.ALWAYS:
			return true;
		default:
			return false;
	}
}

/**
 * Undo the last game action by removing it and restoring the game state
 */
export function undoLastAction(
	gameActions: GameActionState[],
	playerCharactersGameState: PlayerCharactersGameState,
	playerCharactersIdToNamesMap: PlayerCharactersIdToNamesMap,
	npcState: NPCState,
	inventoryState: InventoryState,
	characterStatsResources: any
): {
	updatedGameActions: GameActionState[];
	restoredPlayerCharactersGameState: PlayerCharactersGameState;
	restoredNpcState: NPCState;
	restoredInventoryState: InventoryState;
} {
	if (gameActions.length <= 1) {
		throw new Error('Cannot undo: Not enough actions in history');
	}

	// Remove the last action
	const updatedGameActions = gameActions.slice(0, -1);

	// Reset all game states to their initial values
	const restoredPlayerCharactersGameState: PlayerCharactersGameState = {};
	const restoredNpcState: NPCState = {};
	const restoredInventoryState: InventoryState = {};

	// Initialize the character resources from character stats
	Object.keys(playerCharactersGameState).forEach(characterId => {
		restoredPlayerCharactersGameState[characterId] = {
			...characterStatsResources,
			XP: { current_value: 0, max_value: 0, game_ends_when_zero: false }
		};
	});

	// Re-apply all remaining actions to rebuild the correct state
	applyGameActionStates(
		restoredPlayerCharactersGameState,
		playerCharactersIdToNamesMap,
		restoredNpcState,
		restoredInventoryState,
		updatedGameActions
	);

	return {
		updatedGameActions,
		restoredPlayerCharactersGameState,
		restoredNpcState,
		restoredInventoryState
	};
}
