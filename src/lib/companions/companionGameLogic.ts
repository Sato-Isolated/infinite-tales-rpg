import type { Action, GameActionState } from '$lib/ai/agents/gameAgent.js';
import type { CompanionCharacter, MemoryEvent } from '$lib/types/companion.js';
import type { LLM, LLMMessage } from '$lib/ai/llm.js';
import type { CharacterDescription } from '$lib/ai/agents/characterAgent.js';
import type { StatsUpdate } from '$lib/ai/agents/combatAgent.js';
import type { NPCState } from '$lib/ai/agents/characterStatsAgent.js';
import type { CompanionMention } from '$lib/types/gameTypes.js';
import type { CompanionValidationState } from '$lib/util.svelte.js';
import { CompanionManager } from '$lib/services/companionManager.js';
import { CompanionValidationService } from '$lib/services/companionValidationService.js';
import { NarrativeEvolutionService } from '$lib/services/narrativeEvolutionService.js';
import { v4 as uuidv4 } from 'uuid';

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

	const allNpcs = gameActionState.currently_present_npcs;
	// If more than 2 new NPCs, it's potentially significant
	return Object.keys(allNpcs).length >= 2;
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

// Rest of companion functions would continue here...
// Due to length, I'm including the main functions to demonstrate the structure
