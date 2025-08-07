import { useLocalStorage } from '$lib/state/useLocalStorage.svelte';
import type {
	CompanionCharacter,
	CompanionState,
	MemoryEvent,
	PersonalityChange,
	RelationshipEvent,
	initialCompanionMemory,
	initialPersonalityEvolution,
	initialRelationshipData
} from '$lib/types/companion';
import { v4 as uuidv4 } from 'uuid';

export class CompanionManager {
	private companionState = useLocalStorage<CompanionState>('companions', {});
	private startingCompanionsState = useLocalStorage<CompanionCharacter[]>('startingCompanions', []);

	// ===== CRUD de Base =====
	createCompanion(companion: CompanionCharacter): void {
		companion.id = companion.id || uuidv4();
		companion.created_at = companion.created_at || new Date().toISOString();
		companion.last_interaction = new Date().toISOString();
		
		this.companionState.value[companion.id] = companion;
	}

	getCompanion(id: string): CompanionCharacter | undefined {
		return this.companionState.value[id];
	}

	getAllCompanions(): CompanionCharacter[] {
		return Object.values(this.companionState.value);
	}

	updateCompanion(id: string, updates: Partial<CompanionCharacter>): void {
		const companion = this.companionState.value[id];
		if (!companion) return;

		this.companionState.value[id] = {
			...companion,
			...updates,
			last_interaction: new Date().toISOString()
		};
	}

	deleteCompanion(id: string): void {
		delete this.companionState.value[id];
		// Retirer de la party active aussi
		this.removeFromActiveParty(id);
	}

	// ===== Gestion Party Active =====
	addToActiveParty(companionId: string): void {
		const companion = this.companionState.value[companionId];
		if (!companion) return;

		this.companionState.value[companionId] = {
			...companion,
			is_active_in_party: true,
			last_interaction: new Date().toISOString()
		};

		// Enregistrer événement mémoire
		this.recordMemoryEvent(companionId, {
			id: uuidv4(),
			timestamp: new Date().toISOString(),
			event_type: 'travel',
			description: 'Joined the party for a new adventure',
			emotional_impact: 25,
			participants: ['player'],
			player_actions: ['invited companion to join'],
			companion_reaction: 'Feels honored to be trusted with this journey',
			long_term_significance: 'medium'
		});
	}

	removeFromActiveParty(companionId: string): void {
		const companion = this.companionState.value[companionId];
		if (!companion) return;

		this.companionState.value[companionId] = {
			...companion,
			is_active_in_party: false,
			last_interaction: new Date().toISOString()
		};
	}

	getActiveCompanions(): CompanionCharacter[] {
		return Object.values(this.companionState.value).filter(c => c.is_active_in_party);
	}

	// ===== Gestion Mémoire =====
	recordMemoryEvent(companionId: string, event: MemoryEvent): void {
		const companion = this.companionState.value[companionId];
		if (!companion) return;

		// Ajouter l'événement à la mémoire
		companion.companion_memory.significant_events.push(event);

		// Analyser l'impact émotionnel sur les traits de personnalité
		this.analyzePersonalityImpact(companion, event);

		// Mettre à jour le niveau de confiance/loyauté basé sur l'événement
		this.updateRelationshipFromEvent(companion, event);

		// Sauvegarder les changements
		this.companionState.value[companionId] = {
			...companion,
			last_interaction: new Date().toISOString()
		};
	}

	private analyzePersonalityImpact(companion: CompanionCharacter, event: MemoryEvent): void {
		// Si l'impact émotionnel est significatif, cela peut affecter la personnalité
		if (Math.abs(event.emotional_impact) >= 30) {
			const influence = {
				event_id: event.id,
				traits_affected: this.determineAffectedTraits(event),
				influence_strength: Math.floor(Math.abs(event.emotional_impact) / 10),
				reasoning: `Event "${event.description}" had significant emotional impact (${event.emotional_impact})`
			};

			companion.companion_memory.personality_influences.push(influence);
		}
	}

	private determineAffectedTraits(event: MemoryEvent): string[] {
		const traits: string[] = [];

		switch (event.event_type) {
			case 'combat':
				traits.push('courage', 'loyalty');
				if (event.emotional_impact > 0) traits.push('confidence');
				if (event.emotional_impact < 0) traits.push('caution');
				break;
			case 'betrayal':
				traits.push('trust', 'cynicism');
				break;
			case 'heroic_act':
				traits.push('admiration', 'loyalty', 'inspiration');
				break;
			case 'moral_choice':
				traits.push('morality', 'judgment');
				break;
			case 'dialogue':
				traits.push('communication', 'understanding');
				break;
			default:
				traits.push('experience');
		}

		return traits;
	}

	private updateRelationshipFromEvent(companion: CompanionCharacter, event: MemoryEvent): void {
		let loyaltyChange = 0;
		let trustChange = 0;

		// Calculer l'impact sur la loyauté et la confiance
		if (event.emotional_impact > 50) {
			loyaltyChange = 5;
			trustChange = 3;
		} else if (event.emotional_impact > 20) {
			loyaltyChange = 2;
			trustChange = 1;
		} else if (event.emotional_impact < -50) {
			loyaltyChange = -5;
			trustChange = -5;
		} else if (event.emotional_impact < -20) {
			loyaltyChange = -2;
			trustChange = -2;
		}

		// Événements spéciaux
		if (event.event_type === 'betrayal') {
			trustChange = -15;
			loyaltyChange = -10;
		} else if (event.event_type === 'heroic_act') {
			loyaltyChange += 5;
			trustChange += 3;
		}

		// Appliquer les changements (limité à 0-100)
		companion.loyalty_level = Math.max(0, Math.min(100, companion.loyalty_level + loyaltyChange));
		companion.trust_level = Math.max(0, Math.min(100, companion.trust_level + trustChange));

		// Enregistrer l'événement relationnel si le changement est significatif
		if (Math.abs(loyaltyChange) >= 3 || Math.abs(trustChange) >= 3) {
			const relationshipEvent: RelationshipEvent = {
				timestamp: new Date().toISOString(),
				event_type: loyaltyChange > 0 ? 'trust_gained' : 'trust_lost',
				description: event.description,
				impact_on_relationship: loyaltyChange + trustChange
			};

			companion.companion_memory.relationship_timeline.push(relationshipEvent);
		}
	}

	// ===== Évolution de Personnalité =====
	async evolvePersonality(companionId: string): Promise<PersonalityChange[]> {
		const companion = this.companionState.value[companionId];
		if (!companion) return [];

		const changes: PersonalityChange[] = [];
		const recentInfluences = companion.companion_memory.personality_influences
			.slice(-5); // Dernières 5 influences

		// Grouper les influences par trait
		const traitInfluences = new Map<string, number>();
		recentInfluences.forEach(influence => {
			influence.traits_affected.forEach(trait => {
				const current = traitInfluences.get(trait) || 0;
				traitInfluences.set(trait, current + influence.influence_strength);
			});
		});

		// Appliquer les changements de personnalité
		for (const [traitName, totalInfluence] of traitInfluences.entries()) {
			if (totalInfluence >= 5) { // Seuil pour changement
				const existingTrait = companion.personality_evolution.current_personality_traits
					.find(t => t.trait_name === traitName);

				const change = Math.min(totalInfluence, 20); // Maximum 20 points de changement
				const stabilityFactor = companion.personality_evolution.stability_factor / 100;
				const actualChange = Math.floor(change * (1 - stabilityFactor));

				if (existingTrait) {
					const oldValue = existingTrait.value;
					existingTrait.value = Math.max(0, Math.min(100, existingTrait.value + actualChange));
					existingTrait.last_changed = new Date().toISOString();

					if (Math.abs(existingTrait.value - oldValue) >= 5) {
						changes.push({
							timestamp: new Date().toISOString(),
							trait_affected: traitName,
							old_value: oldValue,
							new_value: existingTrait.value,
							trigger_event: recentInfluences[recentInfluences.length - 1]?.event_id || 'unknown',
							reasoning: `Accumulated experiences have shifted this trait by ${actualChange} points`
						});
					}
				} else {
					// Nouveau trait
					const newTrait = {
						trait_name: traitName,
						value: Math.min(50 + actualChange, 100),
						last_changed: new Date().toISOString(),
						influenced_by: recentInfluences.map(i => i.event_id)
					};

					companion.personality_evolution.current_personality_traits.push(newTrait);
					
					changes.push({
						timestamp: new Date().toISOString(),
						trait_affected: traitName,
						old_value: 0,
						new_value: newTrait.value,
						trigger_event: recentInfluences[recentInfluences.length - 1]?.event_id || 'unknown',
						reasoning: `New personality trait developed through experiences`
					});
				}
			}
		}

		// Enregistrer les changements
		companion.personality_evolution.evolution_history.push(...changes);
		this.companionState.value[companionId] = {
			...companion,
			last_interaction: new Date().toISOString()
		};

		return changes;
	}

	// ===== Starting Companions =====
	setStartingCompanions(companions: CompanionCharacter[]): void {
		this.startingCompanionsState.value = companions;
	}

	getStartingCompanions(): CompanionCharacter[] {
		return this.startingCompanionsState.value;
	}

	clearStartingCompanions(): void {
		this.startingCompanionsState.value = [];
	}

	initializeGameWithCompanions(): void {
		const startingCompanions = this.startingCompanionsState.value;
		
		startingCompanions.forEach(companion => {
			// Sauvegarder le compagnon
			this.createCompanion(companion);
			
			// L'ajouter à la party active
			this.addToActiveParty(companion.id);
			
			// Enregistrer l'événement "Journey Begins"
			this.recordMemoryEvent(companion.id, {
				id: uuidv4(),
				timestamp: new Date().toISOString(),
				event_type: 'travel',
				description: 'Our adventure begins together',
				emotional_impact: 50,
				participants: ['player'],
				player_actions: ['started adventure together'],
				companion_reaction: 'Excited and ready for the journey ahead',
				long_term_significance: 'high'
			});
		});

		// Clear starting companions après initialisation
		this.clearStartingCompanions();
	}

	// ===== Utilitaires =====
	getCompanionsByRelationshipLevel(level: 'stranger' | 'acquaintance' | 'friend' | 'close_friend' | 'companion' | 'soulmate'): CompanionCharacter[] {
		return Object.values(this.companionState.value)
			.filter(c => c.relationship_data.current_status === level);
	}

	searchCompanionsByName(query: string): CompanionCharacter[] {
		const lowerQuery = query.toLowerCase();
		return Object.values(this.companionState.value)
			.filter(c => c.character_description.name.toLowerCase().includes(lowerQuery));
	}

	// Export des données pour sauvegarde
	exportCompanionData(): CompanionState {
		return this.companionState.value;
	}

	// Import des données
	importCompanionData(data: CompanionState): void {
		this.companionState.value = data;
	}
}

// Les instances doivent être créées dans un contexte de composant Svelte
// export const companionManager = new CompanionManager();
