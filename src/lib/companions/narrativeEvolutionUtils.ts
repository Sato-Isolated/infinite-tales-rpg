import type { LLM, LLMMessage } from '$lib/ai/llm.js';
import type { CompanionCharacter } from '$lib/types/companion.js';
import type { CharacterDescription } from '$lib/ai/agents/characterAgent.js';
import type { NPCState } from '$lib/ai/agents/characterStatsAgent.js';
import type { Action } from '$lib/ai/agents/gameAgent.js';
import { CompanionManager } from '$lib/services/companionManager.js';
import { NarrativeEvolutionService } from '$lib/services/narrativeEvolutionService.js';

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
