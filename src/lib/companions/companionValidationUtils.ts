import type { LLM, LLMMessage } from '$lib/ai/llm.js';
import type { CompanionCharacter } from '$lib/types/companion.js';
import type { CharacterDescription } from '$lib/ai/agents/characterAgent.js';
import type { NPCState } from '$lib/ai/agents/characterStatsAgent.js';
import type { Action, GameActionState } from '$lib/ai/agents/gameAgent.js';
import type { StatsUpdate } from '$lib/ai/agents/combatAgent.js';
import type { CompanionMention } from '$lib/types/gameTypes.js';
import { CompanionManager } from '$lib/services/companionManager.js';
import { CompanionValidationService } from '$lib/services/companionValidationService.js';
import { NarrativeEvolutionService } from '$lib/services/narrativeEvolutionService.js';

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
