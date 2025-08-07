import type { LLM } from '$lib/ai/llm';
import { CompanionValidationAgent, type CompanionEnrichmentContext } from '$lib/ai/agents/companionValidationAgent';
import type { CompanionCharacter } from '$lib/types/companion';
import type { CompanionManager } from './companionManager';

export class CompanionValidationService {
	private validationAgent: CompanionValidationAgent;

	constructor(llm: LLM) {
		this.validationAgent = new CompanionValidationAgent(llm);
	}

	/**
	 * Valide et enrichit automatiquement tous les compagnons actifs
	 */
	async validateAndEnrichActiveCompanions(
		companionManager: CompanionManager,
		context: CompanionEnrichmentContext
	): Promise<{
		updatedCompanions: CompanionCharacter[];
		validationResults: Array<{
			companionId: string;
			wasEnriched: boolean;
			issues: string[];
		}>;
	}> {
		const activeCompanions = companionManager.getActiveCompanions();
		const results: Array<{
			companionId: string;
			wasEnriched: boolean;
			issues: string[];
		}> = [];
		const updatedCompanions: CompanionCharacter[] = [];

		for (const companion of activeCompanions) {
			try {
				// Valider les données existantes
				const validation = await this.validationAgent.validateCompanionData(companion, context);
				
				let updatedCompanion = companion;
				let wasEnriched = false;

				// Si validation échoue ou enrichissement nécessaire, enrichir les données
				if (!validation.isValid || validation.missingFields.length > 0) {
					const enrichedData = await this.validationAgent.enrichCompanionData(companion, context);
					
					// Fusionner les données enrichies avec les données existantes
					updatedCompanion = this.mergeCompanionData(companion, enrichedData);
					wasEnriched = true;

					// Mettre à jour dans le manager
					companionManager.updateCompanion(companion.id, updatedCompanion);
				}

				// Vérifier la cohérence avec l'histoire
				const consistencyCheck = await this.validationAgent.checkCompanionConsistency(
					updatedCompanion,
					context.storyHistory,
					context.currentStory
				);

				// Si incohérences détectées, appliquer les corrections suggérées
				if (!consistencyCheck.isConsistent && consistencyCheck.suggestedUpdates) {
					updatedCompanion = this.mergeCompanionData(updatedCompanion, consistencyCheck.suggestedUpdates);
					companionManager.updateCompanion(companion.id, updatedCompanion);
					wasEnriched = true;
				}

				updatedCompanions.push(updatedCompanion);
				results.push({
					companionId: companion.id,
					wasEnriched,
					issues: [
						...validation.missingFields,
						...consistencyCheck.inconsistencies
					]
				});

			} catch (error) {
				console.error(`Error validating companion ${companion.id}:`, error);
				updatedCompanions.push(companion);
				results.push({
					companionId: companion.id,
					wasEnriched: false,
					issues: ['Validation failed due to error']
				});
			}
		}

		return { updatedCompanions, validationResults: results };
	}

	/**
	 * Génère une liste de noms de compagnons pour éviter les doublons
	 */
	generateCompanionBlacklist(companions: CompanionCharacter[]): string[] {
		const blacklist: string[] = [];
		
		for (const companion of companions) {
			// Nom principal
			if (companion.character_description?.name) {
				blacklist.push(companion.character_description.name.toLowerCase());
			}

			// Variations du nom (prénom seulement, etc.)
			if (companion.character_description?.name) {
				const nameParts = companion.character_description.name.split(' ');
				blacklist.push(...nameParts.map(part => part.toLowerCase()));
			}

			// Note: Les alias/noms alternatifs pourraient être ajoutés ici si nécessaire
			// Pour l'instant, on se base uniquement sur le nom principal et ses variations
		}

		return [...new Set(blacklist)]; // Supprimer les doublons
	}

	/**
	 * Vérifie si un nom d'NPC est en conflit avec les compagnons existants
	 */
	isNpcNameConflictingWithCompanions(npcName: string, companions: CompanionCharacter[]): boolean {
		const blacklist = this.generateCompanionBlacklist(companions);
		const npcNameLower = npcName.toLowerCase();
		
		// Vérification exacte
		if (blacklist.includes(npcNameLower)) {
			return true;
		}

		// Vérification de similarité (pour éviter "Y'shtola" vs "Yshtola")
		return blacklist.some(blacklistedName => {
			// Supprimer apostrophes et espaces pour comparaison
			const cleanNpc = npcNameLower.replace(/[''\s-]/g, '');
			const cleanBlacklisted = blacklistedName.replace(/[''\s-]/g, '');
			
			return cleanNpc === cleanBlacklisted || 
				   cleanNpc.includes(cleanBlacklisted) || 
				   cleanBlacklisted.includes(cleanNpc);
		});
	}

	/**
	 * Fusionne les données enrichies avec les données existantes du compagnon
	 */
	private mergeCompanionData(
		existing: CompanionCharacter, 
		enriched: Partial<CompanionCharacter>
	): CompanionCharacter {
		const merged = { ...existing };

		// Fusionner character_description
		if (enriched.character_description) {
			merged.character_description = {
				...merged.character_description,
				...enriched.character_description
			};
			
			// Ne pas écraser des descriptions détaillées avec des vagues
			if (existing.character_description?.appearance && 
				existing.character_description.appearance.length > 50 &&
				enriched.character_description.appearance &&
				enriched.character_description.appearance.length < 30) {
				merged.character_description.appearance = existing.character_description.appearance;
			}
		}

		// Fusionner character_stats
		if (enriched.character_stats) {
			merged.character_stats = {
				...merged.character_stats,
				...enriched.character_stats
			};

			// Fusionner les abilities sans doublons
			if (enriched.character_stats.spells_and_abilities) {
				const existingAbilities = merged.character_stats.spells_and_abilities || [];
				const newAbilities = enriched.character_stats.spells_and_abilities.filter(
					newAbility => !existingAbilities.some(existing => existing.name === newAbility.name)
				);
				merged.character_stats.spells_and_abilities = [...existingAbilities, ...newAbilities];
			}
		}

		return merged;
	}

	/**
	 * Valide un compagnon unique de manière synchrone (pour les vérifications rapides)
	 */
	isCompanionDataComplete(companion: CompanionCharacter): boolean {
		const desc = companion.character_description;
		if (!desc) return false;

		// Vérifications basiques
		return !!(
			desc.name && desc.name.length > 1 &&
			desc.appearance && desc.appearance.length > 20 && // Description détaillée requise
			desc.personality && desc.personality.length > 15 &&
			desc.background && desc.background.length > 10
		);
	}

	/**
	 * Génère une description rapide des compagnons pour les prompts IA
	 */
	generateCompanionPromptContext(companions: CompanionCharacter[]): string {
		if (!companions.length) return '';

		const companionDescriptions = companions.map(companion => {
			return {
				name: companion.character_description?.name || 'Unnamed',
				brief_description: companion.character_description?.appearance?.substring(0, 100) || 'No description',
				personality_summary: companion.character_description?.personality?.substring(0, 80) || 'No personality defined',
				key_abilities: companion.character_stats?.spells_and_abilities?.slice(0, 3).map(a => a.name) || []
			};
		});

		return `ACTIVE COMPANIONS - These characters are already established companions and should NOT be duplicated as NPCs:
${JSON.stringify(companionDescriptions, null, 2)}

CRITICAL: Never create NPCs with names matching these companions. Always include these companions in currently_present_npcs as friendly characters when they should be present in the scene.`;
	}
}
