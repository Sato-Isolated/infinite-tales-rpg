import type { UnifiedEntity } from './entityCoordinator';
import { getEntityCoordinator } from './entityCoordinator';
import { v4 as uuidv4 } from 'uuid';
import type {
        MemoryEvent,
        MemoryTimeline,
        PlotThread,
        MemoryConsistencyCheck,
        MemoryContradiction,
        MemoryQuery,
        MemoryContext,
        MemoryValidationResult,
        MemoryConflict
} from './memoryCoordinator.types';

export type {
        MemoryEvent,
        MemoryTimeline,
        PlotThread,
        MemoryConsistencyCheck,
        MemoryContradiction,
        MemoryQuery,
        MemoryContext,
        MemoryValidationResult,
        MemoryConflict
};

/**
 * COORDINATEUR CENTRAL DE LA MÉMOIRE NARRATIVE
 * 
 * Remplace et unifie :
 * - memoryLogic.ts
 * - Mémoires des compagnons
 * - Système de résumés
 * 
 * Responsabilités :
 * - Source unique de vérité pour tous les événements
 * - Maintien de la cohérence temporelle
 * - Prévention des contradictions narratives
 * - Fourniture de contexte intelligent à l'IA
 */
export class MemoryCoordinator {
	private events: Map<string, MemoryEvent> = new Map();
	private plot_threads: Map<string, PlotThread> = new Map();
	private timeline_index: MemoryEvent[] = []; // Triés par story_id
	private entity_coordinator = getEntityCoordinator();

	constructor() {
		console.log('🧠 MemoryCoordinator initialized');
	}

	// ===== GESTION DES ÉVÉNEMENTS =====

	/**
	 * Enregistre un nouvel événement mémoire
	 */
	recordEvent(event_data: Omit<MemoryEvent, 'id' | 'timestamp' | 'causality_links' | 'consequences'>): MemoryEvent {
		const event: MemoryEvent = {
			...event_data,
			id: this.generateEventId(),
			timestamp: new Date(),
			causality_links: [],
			consequences: []
		};

		// Valider la cohérence avant d'ajouter
		const consistency_check = this.validateEventConsistency(event);
		if (!consistency_check.is_consistent) {
			console.warn('⚠️ Event consistency issues detected:', consistency_check.contradictions);
		}

		// Enregistrer l'événement
		this.events.set(event.id, event);
		this.insertEventInTimeline(event);

		// Mettre à jour les entités impliquées
		event.entities_involved.forEach(entity_id => {
			const entity = this.entity_coordinator.getEntity(entity_id);
			if (entity) {
				entity.memories_shared.push(event.id);
				entity.last_seen_story_id = Math.max(entity.last_seen_story_id, event.story_id);
			}
		});

		// Détecter et créer des liens de causalité
		this.detectCausalityLinks(event);

		// Mettre à jour les threads de plot
		this.updatePlotThreads(event);

		console.log(`📝 Recorded memory event: ${event.title} (Story ${event.story_id})`);
		return event;
	}

	/**
	 * Récupère un événement par ID
	 */
	getEvent(event_id: string): MemoryEvent | null {
		return this.events.get(event_id) || null;
	}

	/**
	 * Recherche d'événements avec critères
	 */
	queryEvents(query: MemoryQuery): MemoryEvent[] {
		let results = Array.from(this.events.values());

		// Filtrer par entités
		if (query.entities && query.entities.length > 0) {
			results = results.filter(event => 
				event.entities_involved.some(entity_id => query.entities!.includes(entity_id))
			);
		}

		// Filtrer par types d'événements
		if (query.event_types && query.event_types.length > 0) {
			results = results.filter(event => query.event_types!.includes(event.event_type));
		}

		// Filtrer par plage temporelle
		if (query.time_range) {
			results = results.filter(event => 
				event.timestamp >= query.time_range!.start && 
				event.timestamp <= query.time_range!.end
			);
		}

		// Filtrer par story_id range
		if (query.story_id_range) {
			results = results.filter(event => 
				event.story_id >= query.story_id_range!.start && 
				event.story_id <= query.story_id_range!.end
			);
		}

		// Filtrer par importance minimale
		if (query.importance_min) {
			const importance_levels = ['low', 'medium', 'high', 'critical'];
			const min_level_index = importance_levels.indexOf(query.importance_min);
			results = results.filter(event => 
				importance_levels.indexOf(event.importance_level) >= min_level_index
			);
		}

		// Filtrer par tags
		if (query.tags && query.tags.length > 0) {
			results = results.filter(event => 
				query.tags!.some(tag => event.tags.includes(tag))
			);
		}

		// Recherche textuelle
		if (query.text_search) {
			const search_lower = query.text_search.toLowerCase();
			results = results.filter(event => 
				event.title.toLowerCase().includes(search_lower) ||
				event.description.toLowerCase().includes(search_lower) ||
				event.tags.some(tag => tag.toLowerCase().includes(search_lower))
			);
		}

		// Trier par story_id (plus récent en premier)
		results.sort((a, b) => b.story_id - a.story_id);

		// Limiter les résultats
		if (query.limit && query.limit > 0) {
			results = results.slice(0, query.limit);
		}

		return results;
	}

	// ===== GESTION DES THREADS DE PLOT =====

	/**
	 * Crée un nouveau thread de plot
	 */
	createPlotThread(thread_data: Omit<PlotThread, 'id' | 'related_events'>): PlotThread {
		const thread: PlotThread = {
			...thread_data,
			id: this.generatePlotThreadId(),
			related_events: []
		};

		this.plot_threads.set(thread.id, thread);
		console.log(`📖 Created plot thread: ${thread.title}`);
		return thread;
	}

	/**
	 * Met à jour les threads de plot basé sur un nouvel événement
	 */
	private updatePlotThreads(event: MemoryEvent): void {
		// Logique pour associer automatiquement les événements aux threads
		// Basée sur les entités impliquées, les tags, et le type d'événement

		this.plot_threads.forEach(thread => {
			// Vérifier si l'événement est lié à ce thread
			if (this.isEventRelatedToThread(event, thread)) {
				thread.related_events.push(event.id);
				
				// Mettre à jour le statut si nécessaire
				if (thread.status === 'paused' && event.narrative_metadata.plot_advancement) {
					thread.status = 'active';
				}
			}
		});
	}

	/**
	 * Détermine si un événement est lié à un thread de plot
	 */
	private isEventRelatedToThread(event: MemoryEvent, thread: PlotThread): boolean {
		// Vérifier les entités communes
		const common_entities = event.entities_involved.filter(entity_id => 
			thread.entities_involved.includes(entity_id)
		);

		if (common_entities.length > 0) return true;

		// Vérifier les mots-clés dans les tags et descriptions
		const thread_keywords = thread.title.toLowerCase().split(' ')
			.concat(thread.description.toLowerCase().split(' '));
		
		const event_text = (event.title + ' ' + event.description + ' ' + event.tags.join(' ')).toLowerCase();
		
		return thread_keywords.some(keyword => 
			keyword.length > 3 && event_text.includes(keyword)
		);
	}

	// ===== COHÉRENCE ET VALIDATION =====

	/**
	 * Valide la cohérence d'un événement avant de l'ajouter
	 */
	private validateEventConsistency(event: MemoryEvent): MemoryConsistencyCheck {
		const contradictions: MemoryContradiction[] = [];
		const warnings: string[] = [];

		// Vérifier les contradictions de chronologie
		const timeline_conflicts = this.checkTimelineConsistency(event);
		contradictions.push(...timeline_conflicts);

		// Vérifier les états des personnages
		const character_conflicts = this.checkCharacterStateConsistency(event);
		contradictions.push(...character_conflicts);

		// Vérifier les faits établis
		const fact_conflicts = this.checkFactualConsistency(event);
		contradictions.push(...fact_conflicts);

		return {
			is_consistent: contradictions.length === 0,
			contradictions,
			warnings,
			suggestions: this.generateConsistencySuggestions(contradictions)
		};
	}

	/**
	 * Vérifie la cohérence chronologique
	 */
	private checkTimelineConsistency(event: MemoryEvent): MemoryContradiction[] {
		const contradictions: MemoryContradiction[] = [];

		// Vérifier si des événements similaires existent déjà
		const similar_events = this.queryEvents({
			entities: event.entities_involved,
			event_types: [event.event_type],
			story_id_range: { start: event.story_id - 5, end: event.story_id + 5 }
		});

		similar_events.forEach(existing_event => {
			if (existing_event.id !== event.id && this.eventsContradict(event, existing_event)) {
				contradictions.push({
					type: 'timeline',
					conflicting_events: [event.id, existing_event.id],
					description: `Event "${event.title}" contradicts previous event "${existing_event.title}"`,
					severity: 'medium',
					suggested_resolution: 'Modify event description to resolve conflict or mark as alternate timeline'
				});
			}
		});

		return contradictions;
	}

	/**
	 * Vérifie la cohérence des états de personnage
	 */
	private checkCharacterStateConsistency(event: MemoryEvent): MemoryContradiction[] {
		const contradictions: MemoryContradiction[] = [];

		event.entities_involved.forEach(entity_id => {
			const entity = this.entity_coordinator.getEntity(entity_id);
			if (!entity) return;

			// Vérifier si l'entité peut logiquement participer à cet événement
			// basé sur son état actuel et sa dernière apparition
			const last_appearance = this.getEntityLastAppearance(entity_id);
			if (last_appearance && this.entityStateConflict(entity, event, last_appearance)) {
				contradictions.push({
					type: 'character_state',
					conflicting_events: [event.id, last_appearance.id],
					description: `${entity.name}'s state in "${event.title}" conflicts with previous appearance`,
					severity: 'high',
					suggested_resolution: 'Update character state or modify event to match previous state'
				});
			}
		});

		return contradictions;
	}

	/**
	 * Vérifie la cohérence factuelle
	 */
	private checkFactualConsistency(event: MemoryEvent): MemoryContradiction[] {
		const contradictions: MemoryContradiction[] = [];

		// Vérifier les faits établis (lieux, objets, règles du monde)
		const established_facts = this.queryEvents({
			tags: ['worldbuilding', 'fact', 'rule'],
			importance_min: 'medium'
		});

		established_facts.forEach(fact_event => {
			if (this.eventsContradictFacts(event, fact_event)) {
				contradictions.push({
					type: 'fact',
					conflicting_events: [event.id, fact_event.id],
					description: `Event contradicts established fact from "${fact_event.title}"`,
					severity: 'high',
					suggested_resolution: 'Modify event to respect established facts or update world rules'
				});
			}
		});

		return contradictions;
	}

	/**
	 * Génère des suggestions pour résoudre les contradictions
	 */
	private generateConsistencySuggestions(contradictions: MemoryContradiction[]): string[] {
		const suggestions: string[] = [];

		contradictions.forEach(contradiction => {
			suggestions.push(contradiction.suggested_resolution);
		});

		return suggestions;
	}

	// ===== MÉTHODES UTILITAIRES =====

	/**
	 * Génère un ID unique pour un événement
	 */
	private generateEventId(): string {
		return `evt_${uuidv4()}`;
	}

	/**
	 * Génère un ID unique pour un thread de plot
	 */
	private generatePlotThreadId(): string {
		return `plt_${uuidv4()}`;
	}

	/**
	 * Insère un événement dans la timeline triée
	 */
	private insertEventInTimeline(event: MemoryEvent): void {
		// Trouver la position d'insertion pour maintenir l'ordre par story_id
		let insert_index = 0;
		for (let i = 0; i < this.timeline_index.length; i++) {
			if (this.timeline_index[i].story_id > event.story_id) {
				insert_index = i;
				break;
			}
			insert_index = i + 1;
		}
		
		this.timeline_index.splice(insert_index, 0, event);
	}

	/**
	 * Détecte et crée des liens de causalité
	 */
	private detectCausalityLinks(event: MemoryEvent): void {
		// Rechercher des événements récents qui pourraient avoir causé celui-ci
		const recent_events = this.queryEvents({
			story_id_range: { start: Math.max(0, event.story_id - 10), end: event.story_id - 1 },
			entities: event.entities_involved,
			limit: 20
		});

		recent_events.forEach(potential_cause => {
			if (this.eventsCausesOther(potential_cause, event)) {
				event.causality_links.push(potential_cause.id);
				potential_cause.consequences.push(event.id);
			}
		});
	}

	/**
	 * Détermine si deux événements se contredisent
	 */
	private eventsContradict(event1: MemoryEvent, event2: MemoryEvent): boolean {
		// Logique simple : événements du même type avec des entités communes
		// mais des implications différentes
		if (event1.event_type !== event2.event_type) return false;
		
		const common_entities = event1.entities_involved.filter(id => 
			event2.entities_involved.includes(id)
		);
		
		if (common_entities.length === 0) return false;
		
		// Si l'impact émotionnel est opposé, c'est probablement contradictoire
		return Math.abs(event1.emotional_impact - event2.emotional_impact) > 100;
	}

	/**
	 * Détermine si un événement contredit des faits établis
	 */
	private eventsContradictFacts(event: MemoryEvent, fact_event: MemoryEvent): boolean {
		// Logique basique : vérifier les contradictions de lieu et de règles
		if (event.location && fact_event.location && event.location !== fact_event.location) {
			// Vérifier si c'est logiquement possible
			return false; // À implémenter selon les règles du monde
		}
		
		return false; // À implémenter avec plus de logique
	}

	/**
	 * Vérifie si l'état d'une entité est en conflit entre deux événements
	 */
	private entityStateConflict(entity: UnifiedEntity, current_event: MemoryEvent, last_event: MemoryEvent): boolean {
		// Vérifier les conflits d'état basiques
		const story_gap = current_event.story_id - last_event.story_id;
		
		// Si les événements sont trop rapprochés pour un changement d'état majeur
		if (story_gap < 3 && Math.abs(current_event.emotional_impact - last_event.emotional_impact) > 50) {
			return true;
		}
		
		return false;
	}

	/**
	 * Récupère la dernière apparition d'une entité
	 */
	private getEntityLastAppearance(entity_id: string): MemoryEvent | null {
		const entity_events = this.queryEvents({
			entities: [entity_id],
			limit: 1
		});
		
		return entity_events.length > 0 ? entity_events[0] : null;
	}

	/**
	 * Détermine si un événement cause un autre
	 */
	private eventsCausesOther(cause: MemoryEvent, effect: MemoryEvent): boolean {
		// Logique simple : événements proches dans le temps avec des entités communes
		const story_gap = effect.story_id - cause.story_id;
		if (story_gap > 5 || story_gap < 1) return false;
		
		const common_entities = cause.entities_involved.filter(id => 
			effect.entities_involved.includes(id)
		);
		
		if (common_entities.length === 0) return false;
		
		// Si l'événement cause a un fort impact et l'effet suit logiquement
		return Math.abs(cause.emotional_impact) > 30 && 
			   cause.narrative_metadata.plot_advancement;
	}

	// ===== GÉNÉRATION DE CONTEXTE =====

	/**
	 * Génère un contexte mémoire intelligent pour l'IA
	 */
	generateContextForStory(
		current_story_id: number,
		focus_entities?: string[],
		context_depth: number = 10
	): MemoryContext {
		const player_entity = this.entity_coordinator.getPlayerEntity();
		const all_entities = focus_entities || (player_entity ? [player_entity.id] : []);
		
		// Événements récents (contexte immédiat)
		const recent_events = this.queryEvents({
			entities: all_entities,
			story_id_range: { start: Math.max(0, current_story_id - 5), end: current_story_id - 1 },
			limit: 5
		});

		// Événements importants (contexte à long terme)
		const important_events = this.queryEvents({
			entities: all_entities,
			importance_min: 'high',
			limit: context_depth
		});

		// Threads de plot actifs
		const active_threads = Array.from(this.plot_threads.values())
			.filter(thread => thread.status === 'active')
			.slice(0, 5);

		// Résumés des entités
		const entity_summaries: Record<string, string> = {};
		all_entities.forEach(entity_id => {
			const entity = this.entity_coordinator.getEntity(entity_id);
			if (entity) {
				entity_summaries[entity_id] = this.generateEntitySummary(entity_id);
			}
		});

		// Historique des lieux
		const location_history = this.extractLocationHistory(all_entities, 10);

		return {
			relevant_events: [...recent_events, ...important_events],
			active_plot_threads: active_threads,
			entity_summaries,
			location_history,
			recent_developments: recent_events,
			long_term_context: important_events
		};
	}

	/**
	 * Génère un résumé d'une entité basé sur ses événements
	 */
	private generateEntitySummary(entity_id: string): string {
		const entity = this.entity_coordinator.getEntity(entity_id);
		if (!entity) return 'Unknown entity';

		const entity_events = this.queryEvents({
			entities: [entity_id],
			limit: 20
		});

		const key_events = entity_events
			.filter(event => event.importance_level !== 'low')
			.slice(0, 5);

		let summary = `${entity.name} (${entity.type}): `;
		
		if (key_events.length > 0) {
			summary += key_events.map(event => event.title).join(', ');
		} else {
			summary += entity.character_description.background || 'No significant events recorded';
		}

		return summary;
	}

	/**
	 * Extrait l'historique des lieux visités
	 */
	private extractLocationHistory(entity_ids: string[], limit: number = 10): string[] {
		const location_events = this.queryEvents({
			entities: entity_ids,
			limit: limit * 2
		});

		const locations = new Set<string>();
		location_events.forEach(event => {
			if (event.location) {
				locations.add(event.location);
			}
		});

		return Array.from(locations).slice(0, limit);
	}

	// ===== MIGRATION ET MAINTENANCE =====

	/**
	 * Migre les données depuis l'ancien système de mémoire
	 */
	migrateFromLegacyMemory(legacyData: any): void {
		console.log('🔄 Migrating legacy memory data...');
		
		// Migration des anciens événements si disponible
		if (legacyData.events) {
			legacyData.events.forEach((legacyEvent: any) => {
				try {
					const event: Omit<MemoryEvent, 'id' | 'timestamp' | 'causality_links' | 'consequences'> = {
						story_id: legacyEvent.story_id || 0,
						event_type: legacyEvent.type || 'other',
						title: legacyEvent.title || 'Legacy Event',
						description: legacyEvent.description || '',
						entities_involved: legacyEvent.entities || [],
						location: legacyEvent.location,
						emotional_impact: legacyEvent.emotional_impact || 0,
						importance_level: legacyEvent.importance || 'medium',
						tags: legacyEvent.tags || [],
						narrative_metadata: {
							plot_advancement: legacyEvent.plot_advancement || false,
							character_development: legacyEvent.character_development || false,
							world_building: legacyEvent.world_building || false,
							mystery_revelation: legacyEvent.mystery_revelation || false
						}
					};
					
					this.recordEvent(event);
				} catch (error) {
					console.error('❌ Failed to migrate legacy event:', error);
				}
			});
		}

		console.log(`✅ Memory migration complete. Total events: ${this.events.size}`);
	}

	/**
	 * Nettoie la mémoire des anciens événements peu importants
	 */
	cleanupOldMemories(keep_story_count: number = 100): void {
		const all_events = Array.from(this.events.values())
			.sort((a, b) => b.story_id - a.story_id);

		if (all_events.length <= keep_story_count) return;

		const cutoff_story_id = all_events[keep_story_count - 1].story_id;
		let removed_count = 0;

		all_events.forEach(event => {
			// Conserver les événements récents ou très importants
			if (event.story_id >= cutoff_story_id || event.importance_level === 'critical') {
				return;
			}

			// Supprimer l'événement
			this.events.delete(event.id);
			this.timeline_index = this.timeline_index.filter(e => e.id !== event.id);
			removed_count++;
		});

		console.log(`🧹 Cleaned up ${removed_count} old memory events`);
	}

	// ===== DEBUG ET EXPORT =====

	/**
	 * Valide la cohérence globale du système mémoire
	 */
	async validateOverallCoherence(): Promise<MemoryValidationResult> {
		const all_events = Array.from(this.events.values());
		const conflicts_detected: MemoryConflict[] = [];
		const recommendations: string[] = [];
		
		// Vérifier la cohérence temporelle
		const temporal_conflicts = this.checkTemporalCoherence(all_events);
		conflicts_detected.push(...temporal_conflicts);
		
		// Vérifier la cohérence des personnages
		const character_conflicts = this.checkCharacterCoherence(all_events);
		conflicts_detected.push(...character_conflicts);
		
		// Vérifier la cohérence de l'intrigue
		const plot_conflicts = this.checkPlotCoherence(all_events);
		conflicts_detected.push(...plot_conflicts);
		
		// Calculer les scores
		const temporal_score = Math.max(0, 100 - temporal_conflicts.length * 15);
		const character_score = Math.max(0, 100 - character_conflicts.length * 10);
		const plot_score = Math.max(0, 100 - plot_conflicts.length * 12);
		const overall_score = Math.round((temporal_score + character_score + plot_score) / 3);
		
		// Générer des recommandations
		if (conflicts_detected.length > 0) {
			recommendations.push(`Resolve ${conflicts_detected.length} detected conflicts`);
		}
		if (overall_score < 80) {
			recommendations.push('Consider reviewing recent story events for consistency');
		}
		
		return {
			is_coherent: conflicts_detected.length === 0,
			overall_score,
			conflicts_detected,
			total_events: all_events.length,
			validation_depth: Math.min(all_events.length, 50),
			temporal_consistency_score: temporal_score,
			character_consistency_score: character_score,
			plot_consistency_score: plot_score,
			recommendations
		};
	}
	
	private checkTemporalCoherence(events: MemoryEvent[]): MemoryConflict[] {
		const conflicts: MemoryConflict[] = [];
		
		// Vérifier les événements dans l'ordre chronologique
		const sorted_events = events.sort((a, b) => a.story_id - b.story_id);
		
		for (let i = 1; i < sorted_events.length; i++) {
			const prev_event = sorted_events[i - 1];
			const curr_event = sorted_events[i];
			
			// Vérifier les incohérences temporelles
			if (this.hasTemporalInconsistency(prev_event, curr_event)) {
				conflicts.push({
					conflict_type: 'temporal_inconsistency',
					severity: 'medium',
					description: `Temporal inconsistency between "${prev_event.title}" and "${curr_event.title}"`,
					conflicting_events: [prev_event, curr_event],
					suggested_resolution: 'Adjust event timeline or add transitional events',
					entities_affected: [...new Set([...prev_event.entities_involved, ...curr_event.entities_involved])]
				});
			}
		}
		
		return conflicts;
	}
	
	private checkCharacterCoherence(events: MemoryEvent[]): MemoryConflict[] {
		const conflicts: MemoryConflict[] = [];
		const entity_coordinator = this.entity_coordinator;
		
		// Grouper les événements par entité
		const events_by_entity = new Map<string, MemoryEvent[]>();
		events.forEach(event => {
			event.entities_involved.forEach(entity_id => {
				if (!events_by_entity.has(entity_id)) {
					events_by_entity.set(entity_id, []);
				}
				events_by_entity.get(entity_id)!.push(event);
			});
		});
		
		// Vérifier la cohérence pour chaque entité
		events_by_entity.forEach((entity_events, entity_id) => {
			const entity = entity_coordinator.getEntity(entity_id);
			if (!entity) return;
			
			const sorted_entity_events = entity_events.sort((a, b) => a.story_id - b.story_id);
			
			for (let i = 1; i < sorted_entity_events.length; i++) {
				const prev_event = sorted_entity_events[i - 1];
				const curr_event = sorted_entity_events[i];
				
				if (this.hasCharacterInconsistency(prev_event, curr_event, entity)) {
					conflicts.push({
						conflict_type: 'character_contradiction',
						severity: 'high',
						description: `Character inconsistency for ${entity.name} between events`,
						conflicting_events: [prev_event, curr_event],
						suggested_resolution: `Review ${entity.name}'s character development`,
						entities_affected: [entity_id]
					});
				}
			}
		});
		
		return conflicts;
	}
	
	private checkPlotCoherence(events: MemoryEvent[]): MemoryConflict[] {
		const conflicts: MemoryConflict[] = [];
		
		// Vérifier les threads de plot
		this.plot_threads.forEach(thread => {
			const thread_events = events.filter(event => 
				thread.related_events.includes(event.id)
			).sort((a, b) => a.story_id - b.story_id);
			
			// Vérifier la cohérence narrative du thread
			for (let i = 1; i < thread_events.length; i++) {
				const prev_event = thread_events[i - 1];
				const curr_event = thread_events[i];
				
				if (this.hasPlotInconsistency(prev_event, curr_event, thread)) {
					conflicts.push({
						conflict_type: 'plot_hole',
						severity: 'medium',
						description: `Plot inconsistency in thread "${thread.title}"`,
						conflicting_events: [prev_event, curr_event],
						suggested_resolution: 'Review plot thread development',
						entities_affected: thread.entities_involved
					});
				}
			}
		});
		
		return conflicts;
	}
	
	private hasTemporalInconsistency(prev: MemoryEvent, curr: MemoryEvent): boolean {
		// Vérifier si les événements se contredisent temporellement
		const time_gap = curr.story_id - prev.story_id;
		
		// Si les événements sont trop rapprochés pour certains changements
		if (time_gap < 2 && Math.abs(prev.emotional_impact - curr.emotional_impact) > 80) {
			return true;
		}
		
		return false;
	}
	
	private hasCharacterInconsistency(prev: MemoryEvent, curr: MemoryEvent, entity: UnifiedEntity): boolean {
		// Vérifier la cohérence du développement du personnage
		const emotional_swing = Math.abs(prev.emotional_impact - curr.emotional_impact);
		const time_gap = curr.story_id - prev.story_id;
		
		// Changement émotionnel trop brusque pour un personnage
		if (emotional_swing > 100 && time_gap < 3) {
			return true;
		}
		
		return false;
	}
	
	private hasPlotInconsistency(prev: MemoryEvent, curr: MemoryEvent, thread: PlotThread): boolean {
		// Vérifier la logique narrative du thread
		if (!prev.narrative_metadata.plot_advancement && curr.narrative_metadata.plot_advancement) {
			// Un événement majeur suit un événement mineur - potentiellement incohérent
			const time_gap = curr.story_id - prev.story_id;
			return time_gap < 2;
		}
		
		return false;
	}

	/**
	 * Exporte toutes les données mémoire
	 */
	exportMemoryData(): {
		events: MemoryEvent[];
		plot_threads: PlotThread[];
		timeline: MemoryTimeline;
		stats: {
			total_events: number;
			events_by_type: Record<string, number>;
			active_threads: number;
		};
	} {
		const events = Array.from(this.events.values());
		const plot_threads = Array.from(this.plot_threads.values());
		
		const events_by_type: Record<string, number> = {};
		events.forEach(event => {
			events_by_type[event.event_type] = (events_by_type[event.event_type] || 0) + 1;
		});

		const timeline: MemoryTimeline = {
			events: this.timeline_index,
			total_events: events.length,
			earliest_event: events.length > 0 ? new Date(Math.min(...events.map(e => e.timestamp.getTime()))) : undefined,
			latest_event: events.length > 0 ? new Date(Math.max(...events.map(e => e.timestamp.getTime()))) : undefined,
			plot_threads: plot_threads
		};

		return {
			events,
			plot_threads,
			timeline,
			stats: {
				total_events: events.length,
				events_by_type,
				active_threads: plot_threads.filter(t => t.status === 'active').length
			}
		};
	}
}

// Instance singleton
let memoryCoordinatorInstance: MemoryCoordinator | null = null;

/**
 * Récupère l'instance singleton de MemoryCoordinator
 */
export function getMemoryCoordinator(): MemoryCoordinator {
	if (!memoryCoordinatorInstance) {
		memoryCoordinatorInstance = new MemoryCoordinator();
	}
	return memoryCoordinatorInstance;
}

/**
 * Réinitialise le MemoryCoordinator (utile pour les tests)
 */
export function resetMemoryCoordinator(): MemoryCoordinator {
	memoryCoordinatorInstance = new MemoryCoordinator();
	return memoryCoordinatorInstance;
}
