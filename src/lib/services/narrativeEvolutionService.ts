import type { LLM, LLMMessage } from '$lib/ai/llm';
import type { CharacterDescription } from '$lib/ai/agents/characterAgent';
import type { NPCState } from '$lib/ai/agents/characterStatsAgent';
import type { CompanionCharacter } from '$lib/types/companion';
import { CompanionManager } from './companionManager';
import { 
	NarrativeEvolutionAgent, 
	type NarrativeContext, 
	type CharacterEvolutionChanges 
} from '$lib/ai/agents/narrativeEvolutionAgent';
import { v4 as uuidv4 } from 'uuid';

export interface NPCDeduplicationResult {
	removedNPCs: string[];
	conflictsResolved: string[];
	companionsUpdated: string[];
}

export interface NarrativeEvolutionResult {
	companionsEvolved: string[];
	newCompanionsCreated: string[];
	relationshipsUpdated: string[];
	narrativeChanges: NarrativeContext;
}

export class NarrativeEvolutionService {
	private narrativeAgent: NarrativeEvolutionAgent;

	constructor(private llm: LLM) {
		this.narrativeAgent = new NarrativeEvolutionAgent(llm);
	}

	/**
	 * PARTIE 1: Déduplication NPCs/Compagnons
	 * Supprime les NPCs qui sont devenus compagnons pour éviter les doublons
	 */
	async deduplicateNPCsAndCompanions(
		npcState: NPCState,
		companionManager: CompanionManager
	): Promise<NPCDeduplicationResult> {
		const result: NPCDeduplicationResult = {
			removedNPCs: [],
			conflictsResolved: [],
			companionsUpdated: []
		};

		const activeCompanions = companionManager.getActiveCompanions();
		const allCompanions = companionManager.getAllCompanions();

		// 1. Identifier les NPCs qui correspondent à des compagnons
		const npcKeys = Object.keys(npcState);
		
		for (const npcKey of npcKeys) {
			const npc = npcState[npcKey];
			if (!npc?.known_names || npc.known_names.length === 0) continue;

			// Vérifier si ce NPC correspond à un compagnon existant
			const matchingCompanion = allCompanions.find(companion => 
				this.namesMatch(companion.character_description.name, npc.known_names!)
			);

			if (matchingCompanion) {
				// Conflikt détecté : même personnage existe comme NPC ET compagnon
				console.log(`Conflict detected: ${npcKey} exists as both NPC and companion ${matchingCompanion.character_description.name}`);

				// PRIORITÉ AUX COMPAGNONS : Supprimer le NPC
				delete npcState[npcKey];
				result.removedNPCs.push(npcKey);
				result.conflictsResolved.push(`${npcKey} -> ${matchingCompanion.character_description.name}`);

				// Mettre à jour les stats du compagnon si le NPC avait des données intéressantes
				await this.mergeNPCDataIntoCompanion(matchingCompanion, npc, companionManager);
				result.companionsUpdated.push(matchingCompanion.id);
			}
		}

		return result;
	}

	/**
	 * PARTIE 2: Analyse et évolution narrative
	 * Analyse l'histoire pour détecter les changements et faire évoluer les compagnons
	 */
	async analyzeAndEvolveNarrative(
		currentStory: string,
		storyHistory: LLMMessage[],
		companionManager: CompanionManager,
		playerCharacter: CharacterDescription,
		npcState: NPCState
	): Promise<NarrativeEvolutionResult> {
		const result: NarrativeEvolutionResult = {
			companionsEvolved: [],
			newCompanionsCreated: [],
			relationshipsUpdated: [],
			narrativeChanges: {}
		};

		const currentCompanions = companionManager.getActiveCompanions();

		// 1. Analyser le contexte narratif
		const narrativeContext = await this.narrativeAgent.analyzeNarrativeContext(
			currentStory,
			storyHistory,
			currentCompanions,
			playerCharacter
		);

		result.narrativeChanges = narrativeContext;

		// 2. Traiter l'évolution des compagnons existants
		if (narrativeContext.characterEvolutions) {
			for (const evolution of narrativeContext.characterEvolutions) {
				const companion = currentCompanions.find(
					c => c.id === evolution.companionId || 
					c.character_description.name === evolution.companionId
				);

				if (companion) {
					await this.evolveCompanion(
						companion, 
						evolution.changes, 
						currentStory, 
						companionManager
					);
					result.companionsEvolved.push(companion.id);
				}
			}
		}

		// 3. Traiter les changements de relations
		if (narrativeContext.relationshipChanges && narrativeContext.relationshipChanges.length > 0) {
			for (const relationChange of narrativeContext.relationshipChanges) {
				const companion = currentCompanions.find(
					c => c.character_description.name === relationChange.companionName
				);

				if (companion) {
					await this.updateCompanionRelationship(
						companion,
						relationChange,
						companionManager
					);
					result.relationshipsUpdated.push(companion.id);
				}
			}
		}

		// 4. Créer de nouveaux compagnons si nécessaire
		if (narrativeContext.newCompanions && narrativeContext.newCompanions.length > 0) {
			for (const newCompanionInfo of narrativeContext.newCompanions) {
				// D'abord, vérifier si ce personnage existe comme NPC et le supprimer
				await this.removeNPCByName(newCompanionInfo.name, npcState);

				const newCompanion = await this.createNewCompanionFromNarrative(
					newCompanionInfo,
					currentCompanions,
					currentStory,
					playerCharacter,
					companionManager
				);

				if (newCompanion) {
					result.newCompanionsCreated.push(newCompanion);
				}
			}
		}

		// 5. Traiter les événements de vie majeurs
		if (narrativeContext.lifeEvents && narrativeContext.lifeEvents.length > 0) {
			await this.processLifeEvents(
				narrativeContext.lifeEvents,
				companionManager
			);
		}

		return result;
	}

	/**
	 * Fonction principale à appeler après chaque story
	 */
	async processPostStoryEvolution(
		currentStory: string,
		storyHistory: LLMMessage[],
		companionManager: CompanionManager,
		playerCharacter: CharacterDescription,
		npcState: NPCState
	): Promise<{
		deduplication: NPCDeduplicationResult;
		evolution: NarrativeEvolutionResult;
	}> {
		// 1. D'abord dédupliquer les NPCs/Compagnons
		const deduplication = await this.deduplicateNPCsAndCompanions(npcState, companionManager);

		// 2. Ensuite analyser et faire évoluer la narrative
		const evolution = await this.analyzeAndEvolveNarrative(
			currentStory,
			storyHistory,
			companionManager,
			playerCharacter,
			npcState
		);

		return { deduplication, evolution };
	}

	// ===== MÉTHODES PRIVÉES =====

	private namesMatch(companionName: string, npcNames: string[]): boolean {
		const normalizedCompanionName = companionName.toLowerCase().trim();
		return npcNames.some(npcName => 
			npcName.toLowerCase().trim() === normalizedCompanionName ||
			npcName.toLowerCase().includes(normalizedCompanionName) ||
			normalizedCompanionName.includes(npcName.toLowerCase().trim())
		);
	}

	private async mergeNPCDataIntoCompanion(
		companion: CompanionCharacter,
		npcData: any,
		companionManager: CompanionManager
	): Promise<void> {
		// Si le NPC avait des stats plus récentes, les intégrer
		if (npcData.resources && companion.character_stats.resources) {
			// Synchroniser les HP/MP actuels si le NPC a des valeurs différentes
			if (npcData.resources.current_hp !== undefined) {
				// Note: Il faut adapter selon la structure exacte de ResourceWithCurrentValue
				// Ici je suppose qu'il faut synchroniser les valeurs actuelles
			}
		}

		// Ajouter une mémoire de la résolution du conflit
		companionManager.recordMemoryEvent(companion.id, {
			id: uuidv4(),
			timestamp: new Date().toISOString(),
			event_type: 'discovery',
			description: `Identity clarified - no longer appearing as separate NPC`,
			emotional_impact: 5,
			participants: ['system'],
			player_actions: ['system deduplication'],
			companion_reaction: 'Continues journey with clarity of identity',
			long_term_significance: 'low'
		});
	}

	private async evolveCompanion(
		companion: CompanionCharacter,
		changes: CharacterEvolutionChanges,
		narrativeContext: string,
		companionManager: CompanionManager
	): Promise<void> {
		const updatedData = await this.narrativeAgent.updateCharacterFromEvolution(
			companion,
			changes,
			narrativeContext
		);

		if (updatedData.character_description) {
			// Fusionner les changements dans la description du personnage
			const updatedCompanion = {
				...companion,
				character_description: {
					...companion.character_description,
					...updatedData.character_description
				}
			};

			companionManager.updateCompanion(companion.id, updatedCompanion);

			// Enregistrer l'évolution comme événement de mémoire
			companionManager.recordMemoryEvent(companion.id, {
				id: uuidv4(),
				timestamp: new Date().toISOString(),
				event_type: 'discovery',
				description: `Personal growth and evolution based on recent experiences`,
				emotional_impact: 30,
				participants: ['player'],
				player_actions: ['shared experiences leading to growth'],
				companion_reaction: 'Feels changed by recent experiences',
				long_term_significance: 'high'
			});
		}
	}

	private async updateCompanionRelationship(
		companion: CompanionCharacter,
		relationChange: NonNullable<NarrativeContext['relationshipChanges']>[0],
		companionManager: CompanionManager
	): Promise<void> {

		// Mettre à jour le statut de relation
		const updatedRelationship = {
			...companion.relationship_data,
			current_status: relationChange.newRelationship as any // Cast nécessaire
		};

		companionManager.updateCompanion(companion.id, {
			relationship_data: updatedRelationship
		});

		// Enregistrer l'événement relationnel
		companionManager.recordMemoryEvent(companion.id, {
			id: uuidv4(),
			timestamp: new Date().toISOString(),
			event_type: 'dialogue',
			description: `Relationship evolved: ${relationChange.evidence}`,
			emotional_impact: relationChange.newRelationship.includes('romantic') ? 50 : 25,
			participants: ['player'],
			player_actions: [relationChange.evidence],
			companion_reaction: `Relationship status updated to ${relationChange.newRelationship}`,
			long_term_significance: 'high'
		});
	}

	private async createNewCompanionFromNarrative(
		newCompanionInfo: NonNullable<NarrativeContext['newCompanions']>[0],
		existingCompanions: CompanionCharacter[],
		narrativeContext: string,
		playerCharacter: CharacterDescription,
		companionManager: CompanionManager
	): Promise<string | null> {

		try {
			// Strict guard: avoid creating a companion if a similar one already exists
			if (companionManager.existsByName(newCompanionInfo.name)) {
				return null;
			}
			const companionData = await this.narrativeAgent.generateNewCompanionFromNarrativeContext(
				newCompanionInfo,
				existingCompanions,
				narrativeContext,
				playerCharacter
			);

			if (companionData.character_description) {
				// Créer un compagnon complet avec les données générées
				const newCompanion: CompanionCharacter = {
					id: uuidv4(),
					character_description: companionData.character_description as CharacterDescription,
					character_stats: companionData.character_stats || this.generateBasicStats(),
					source_type: 'narrative',
					source_ref: newCompanionInfo.name,
					signature: (companionData.character_description.name || '').toLowerCase().replace(/[\s'`´’-]+/g, ''),
					companion_memory: {
						significant_events: [{
							id: uuidv4(),
							timestamp: new Date().toISOString(),
							event_type: 'discovery',
							description: `Born from the narrative: ${newCompanionInfo.justification}`,
							emotional_impact: 40,
							participants: ['player'],
							player_actions: ['narrative development'],
							companion_reaction: 'Emerges naturally into the story',
							long_term_significance: 'high'
						}],
						personality_influences: [],
						relationship_timeline: [],
						combat_experiences: [],
						dialogue_history: []
					},
					personality_evolution: {
						baseline_personality: companionData.character_description.personality || 'curious',
						current_personality_traits: [],
						evolution_history: [],
						stability_factor: 70
					},
					relationship_data: {
						initial_relationship: newCompanionInfo.relationToExisting,
						current_status: 'acquaintance',
						relationship_milestones: [],
						shared_experiences: []
					},
					created_at: new Date().toISOString(),
					last_interaction: new Date().toISOString(),
					is_active_in_party: false, // Le joueur devra les activer
					loyalty_level: 60,
					trust_level: 50
				};

				// Persist via CompanionManager to enforce strict dedupe
				companionManager.createCompanion(newCompanion);
				const saved = companionManager.getByName(newCompanion.character_description.name);
				return saved ? saved.id : newCompanion.id;
			}
		} catch (error) {
			console.error('Failed to create new companion from narrative:', error);
		}

		return null;
	}

	private generateBasicStats(): any {
		// Générer des stats de base pour un nouveau compagnon
		return {
			level: 1,
			attributes: {
				strength: 0,
				dexterity: 0,
				intelligence: 0,
				wisdom: 0,
				constitution: 0,
				charisma: 0
			},
			resources: {
				HP: { max_value: 25, start_value: 25, game_ends_when_zero: true },
				MP: { max_value: 15, start_value: 15, game_ends_when_zero: false }
			},
			spells_and_abilities: []
		};
	}

	private async processLifeEvents(
		lifeEvents: NonNullable<NarrativeContext['lifeEvents']>,
		companionManager: CompanionManager
	): Promise<void> {

		const activeCompanions = companionManager.getActiveCompanions();

		for (const event of lifeEvents) {
			// Enregistrer l'événement pour tous les compagnions impliqués
			for (const participantName of event.participants) {
				const companion = activeCompanions.find(c => 
					c.character_description.name === participantName
				);

				if (companion) {
					const emotionalImpact = this.calculateLifeEventImpact(event);
					
					companionManager.recordMemoryEvent(companion.id, {
						id: uuidv4(),
						timestamp: new Date().toISOString(),
						event_type: this.mapLifeEventToMemoryType(event.type),
						description: event.description,
						emotional_impact: emotionalImpact,
						participants: event.participants,
						player_actions: [event.description],
						companion_reaction: `Deeply affected by this ${event.type} event`,
						long_term_significance: event.impact as any
					});
				}
			}
		}
	}

	private calculateLifeEventImpact(event: NonNullable<NarrativeContext['lifeEvents']>[0]): number {
		const baseImpacts = {
			marriage: 70,
			childbirth: 80,
			adoption: 60,
			death: -90,
			separation: -50,
			promotion: 40,
			trauma: -70,
			achievement: 50
		};

		let impact = baseImpacts[event.type] || 0;

		// Ajuster selon l'importance
		if (event.impact === 'high') impact *= 1.2;
		else if (event.impact === 'low') impact *= 0.6;

		return Math.round(impact);
	}

	private mapLifeEventToMemoryType(eventType: string): any {
		const mapping = {
			marriage: 'heroic_act',
			childbirth: 'heroic_act', 
			adoption: 'heroic_act',
			death: 'loss',
			separation: 'betrayal',
			promotion: 'discovery',
			trauma: 'betrayal',
			achievement: 'heroic_act'
		};
		return mapping[eventType] || 'dialogue';
	}

	private async removeNPCByName(name: string, npcState: NPCState): Promise<void> {
		// Chercher et supprimer le NPC qui correspond à ce nom
		const npcEntries = Object.entries(npcState);
		for (const [npcKey, npcData] of npcEntries) {
			if (npcData?.known_names && npcData.known_names.some(npcName => 
				npcName.toLowerCase().includes(name.toLowerCase()) ||
				name.toLowerCase().includes(npcName.toLowerCase())
			)) {
				delete npcState[npcKey];
				console.log(`Removed NPC ${npcKey} (${name}) as it became a companion`);
				break;
			}
		}
	}
}
