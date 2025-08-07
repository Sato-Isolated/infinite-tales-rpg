import type { CompanionCharacter } from '$lib/types/companion';
import type { CharacterDescription } from '$lib/ai/agents/characterAgent';
import type { NPCState, NPCStats } from '$lib/ai/agents/characterStatsAgent';
import type { ResourcesWithCurrentValue } from '$lib/ai/agents/gameAgent';
import { v4 as uuidv4 } from 'uuid';

export type EntityType = 'player' | 'companion' | 'npc';

export interface UnifiedEntity {
	id: string;
	type: EntityType;
	name: string;
	names_variations: string[]; // Variations du nom pour éviter les doublons
	character_description: CharacterDescription;
	resources: ResourcesWithCurrentValue;
	relationships: Record<string, EntityRelationship>;
	memories_shared: string[]; // IDs des événements mémoire partagés
	last_seen_story_id: number; // Dernier ID d'action où cette entité était présente
	coherence_data: EntityCoherenceData;
}

export interface EntityRelationship {
	target_entity_id: string;
	relationship_type: 'hostile' | 'neutral' | 'friendly' | 'romantic' | 'family' | 'ally' | 'rival';
	trust_level: number; // -100 à 100
	loyalty_level: number; // 0 à 100  
	history_summary: string;
	last_interaction_story_id: number;
}

export interface EntityCoherenceData {
	creation_story_id: number;
	locations_visited: string[];
	items_known_about: string[];
	secrets_knows: string[];
	promises_made: string[];
	goals_current: string[];
	personality_evolution_log: PersonalityEvolution[];
}

export interface PersonalityEvolution {
	story_id: number;
	old_personality: string;
	new_personality: string;
	reason: string;
	emotional_impact: number;
}

export interface EntityValidationResult {
	is_valid: boolean;
	conflicts: EntityConflict[];
	warnings: string[];
	auto_corrections: EntityCorrection[];
}

export interface EntityConflict {
	type: 'name_duplicate' | 'stat_inconsistency' | 'memory_contradiction' | 'relationship_conflict';
	entities_involved: string[];
	description: string;
	severity: 'low' | 'medium' | 'high' | 'critical';
	suggested_resolution: string;
}

export interface EntityCorrection {
	entity_id: string;
	field: string;
	old_value: any;
	new_value: any;
	reason: string;
}

/**
 * COORDINATEUR CENTRAL DE TOUTES LES ENTITÉS
 * 
 * Remplace et unifie :
 * - NPCState
 * - CompanionManager (partiellement)
 * - PlayerCharactersGameState
 * 
 * Responsabilités :
 * - Source unique de vérité pour toutes les entités
 * - Prévention automatique des doublons
 * - Synchronisation des stats en temps réel
 * - Cohérence des relations et mémoires
 */
export class EntityCoordinator {
	private entities: Map<string, UnifiedEntity> = new Map();
	private name_registry: Map<string, string> = new Map(); // nom_lower -> entity_id
	private player_entity_id: string | null = null;

	constructor() {
		console.log('🏗️ EntityCoordinator initialized');
	}

	// ===== GESTION DES ENTITÉS =====

	/**
	 * Crée une nouvelle entité (player, companion, ou npc)
	 */
	createEntity(
		type: EntityType, 
		character_description: CharacterDescription,
		resources: ResourcesWithCurrentValue,
		story_id: number = 0
	): UnifiedEntity {
		// Vérifier les conflits de nom AVANT création
		const conflicts = this.checkNameConflicts(character_description.name);
		if (conflicts.length > 0) {
			throw new Error(`Name conflict detected: ${conflicts.join(', ')}`);
		}

		const id = uuidv4();
		const names_variations = this.generateNameVariations(character_description.name);
		
		const entity: UnifiedEntity = {
			id,
			type,
			name: character_description.name,
			names_variations,
			character_description,
			resources,
			relationships: {},
			memories_shared: [],
			last_seen_story_id: story_id,
			coherence_data: {
				creation_story_id: story_id,
				locations_visited: [],
				items_known_about: [],
				secrets_knows: [],
				promises_made: [],
				goals_current: [character_description.motivation || ''],
				personality_evolution_log: []
			}
		};

		// Enregistrer l'entité
		this.entities.set(id, entity);
		
		// Enregistrer toutes les variations de nom
		names_variations.forEach(name => {
			this.name_registry.set(name.toLowerCase(), id);
		});

		// Marquer comme player si c'est le cas
		if (type === 'player') {
			this.player_entity_id = id;
		}

		console.log(`✅ Created ${type} entity: ${character_description.name} (${id})`);
		return entity;
	}

	/**
	 * Met à jour une entité existante
	 */
	updateEntity(entity_id: string, updates: Partial<UnifiedEntity>): boolean {
		const entity = this.entities.get(entity_id);
		if (!entity) {
			console.error(`❌ Entity not found: ${entity_id}`);
			return false;
		}

		// Vérifier les conflits de nom si le nom change
		if (updates.name && updates.name !== entity.name) {
			const conflicts = this.checkNameConflicts(updates.name);
			if (conflicts.length > 0) {
				console.error(`❌ Name update blocked due to conflicts: ${conflicts.join(', ')}`);
				return false;
			}

			// Supprimer anciens noms du registre
			entity.names_variations.forEach(name => {
				this.name_registry.delete(name.toLowerCase());
			});

			// Ajouter nouveaux noms
			const new_variations = this.generateNameVariations(updates.name);
			new_variations.forEach(name => {
				this.name_registry.set(name.toLowerCase(), entity_id);
			});
			
			updates.names_variations = new_variations;
		}

		// Appliquer les mises à jour
		Object.assign(entity, updates);
		this.entities.set(entity_id, entity);

		console.log(`✅ Updated entity: ${entity.name} (${entity_id})`);
		return true;
	}

	/**
	 * Supprime une entité
	 */
	removeEntity(entity_id: string): boolean {
		const entity = this.entities.get(entity_id);
		if (!entity) return false;

		// Supprimer du registre des noms
		entity.names_variations.forEach(name => {
			this.name_registry.delete(name.toLowerCase());
		});

		// Supprimer les relations avec cette entité
		this.entities.forEach(other_entity => {
			if (other_entity.relationships[entity_id]) {
				delete other_entity.relationships[entity_id];
			}
		});

		// Supprimer l'entité
		this.entities.delete(entity_id);
		
		if (this.player_entity_id === entity_id) {
			this.player_entity_id = null;
		}

		console.log(`🗑️ Removed entity: ${entity.name} (${entity_id})`);
		return true;
	}

	// ===== RECHERCHE ET RÉCUPÉRATION =====

	/**
	 * Récupère une entité par son ID
	 */
	getEntity(entity_id: string): UnifiedEntity | null {
		return this.entities.get(entity_id) || null;
	}

	/**
	 * Trouve une entité par son nom (avec tolérance aux variations)
	 */
	findEntityByName(name: string): UnifiedEntity | null {
		const entity_id = this.name_registry.get(name.toLowerCase());
		return entity_id ? this.getEntity(entity_id) : null;
	}

	/**
	 * Récupère toutes les entités d'un type donné
	 */
	getEntitiesByType(type: EntityType): UnifiedEntity[] {
		return Array.from(this.entities.values()).filter(entity => entity.type === type);
	}

	/**
	 * Récupère l'entité joueur
	 */
	getPlayerEntity(): UnifiedEntity | null {
		return this.player_entity_id ? this.getEntity(this.player_entity_id) : null;
	}

	/**
	 * Récupère tous les compagnons actifs
	 */
	getActiveCompanions(): UnifiedEntity[] {
		return this.getEntitiesByType('companion');
	}

	/**
	 * Récupère tous les NPCs
	 */
	getAllNPCs(): UnifiedEntity[] {
		return this.getEntitiesByType('npc');
	}

	/**
	 * Récupère toutes les entités présentes dans une histoire donnée
	 */
	getEntitiesPresentInStory(story_id: number): UnifiedEntity[] {
		return Array.from(this.entities.values()).filter(
			entity => entity.last_seen_story_id === story_id
		);
	}

	// ===== PRÉVENTION DES DOUBLONS =====

	/**
	 * Vérifie les conflits de nom avant création/mise à jour
	 */
	private checkNameConflicts(name: string): string[] {
		const conflicts: string[] = [];
		const variations = this.generateNameVariations(name);
		
		variations.forEach(variation => {
			const existing_id = this.name_registry.get(variation.toLowerCase());
			if (existing_id) {
				const existing_entity = this.getEntity(existing_id);
				if (existing_entity) {
					conflicts.push(`"${variation}" conflicts with existing ${existing_entity.type}: ${existing_entity.name}`);
				}
			}
		});

		return conflicts;
	}

	/**
	 * Génère les variations d'un nom pour la détection de doublons
	 */
	private generateNameVariations(name: string): string[] {
		const variations = new Set<string>();
		
		// Nom exact
		variations.add(name);
		
		// Nom sans espaces
		variations.add(name.replace(/\s+/g, ''));
		
		// Premier mot seulement
		const first_word = name.split(' ')[0];
		if (first_word && first_word.length > 2) {
			variations.add(first_word);
		}
		
		// Dernière partie du nom (nom de famille)
		const words = name.split(' ');
		if (words.length > 1) {
			const last_word = words[words.length - 1];
			if (last_word && last_word.length > 2) {
				variations.add(last_word);
			}
		}

		// Variations avec casse différente
		const base_variations = Array.from(variations);
		base_variations.forEach(variant => {
			variations.add(variant.toLowerCase());
			variations.add(variant.toUpperCase());
			variations.add(variant.charAt(0).toUpperCase() + variant.slice(1).toLowerCase());
		});

		return Array.from(variations);
	}

	/**
	 * Détecte et résout automatiquement les doublons
	 */
	detectAndResolveDuplicates(): EntityValidationResult {
		const conflicts: EntityConflict[] = [];
		const corrections: EntityCorrection[] = [];
		const processed_names = new Set<string>();

		// Chercher les doublons de noms
		this.entities.forEach(entity => {
			entity.names_variations.forEach(name => {
				const name_lower = name.toLowerCase();
				if (processed_names.has(name_lower)) {
					// Doublon détecté !
					const other_entity_id = this.name_registry.get(name_lower);
					const other_entity = other_entity_id ? this.getEntity(other_entity_id) : null;
					
					if (other_entity && other_entity.id !== entity.id) {
						conflicts.push({
							type: 'name_duplicate',
							entities_involved: [entity.id, other_entity.id],
							description: `Duplicate name detected: "${name}" used by ${entity.type} "${entity.name}" and ${other_entity.type} "${other_entity.name}"`,
							severity: 'high',
							suggested_resolution: `Keep ${entity.type === 'player' ? entity.name : other_entity.name}, rename the other`
						});
					}
				}
				processed_names.add(name_lower);
			});
		});

		return {
			is_valid: conflicts.length === 0,
			conflicts,
			warnings: [],
			auto_corrections: corrections
		};
	}

	// ===== SYNCHRONISATION DES STATS =====

	/**
	 * Synchronise les stats d'une entité
	 */
	syncEntityStats(entity_id: string, new_resources: Partial<ResourcesWithCurrentValue>): boolean {
		const entity = this.getEntity(entity_id);
		if (!entity) return false;

		// Appliquer les changements
		Object.assign(entity.resources, new_resources);
		
		console.log(`📊 Synced stats for ${entity.name}: ${JSON.stringify(new_resources)}`);
		return true;
	}

	/**
	 * Synchronise toutes les stats de toutes les entités
	 */
	syncAllStats(): void {
		console.log('🔄 Syncing all entity stats...');
		// Cette méthode sera appelée après chaque génération d'histoire
		// pour s'assurer que toutes les entités ont des stats cohérentes
		this.entities.forEach(entity => {
			this.validateEntityStats(entity);
		});
	}

	/**
	 * Valide et corrige les stats d'une entité
	 */
	private validateEntityStats(entity: UnifiedEntity): void {
		Object.entries(entity.resources).forEach(([key, resource]) => {
			// Corriger les valeurs invalides
			if (resource.current_value > resource.max_value) {
				resource.current_value = resource.max_value;
				console.log(`⚠️ Corrected ${entity.name}'s ${key}: was over max, set to ${resource.max_value}`);
			}
			
			if (resource.current_value < 0) {
				resource.current_value = 0;
				console.log(`⚠️ Corrected ${entity.name}'s ${key}: was negative, set to 0`);
			}
		});
	}

	// ===== GESTION DES RELATIONS =====

	/**
	 * Définit ou met à jour une relation entre deux entités
	 */
	setRelationship(
		entity_id1: string, 
		entity_id2: string, 
		relationship_type: EntityRelationship['relationship_type'],
		trust_level: number = 0,
		loyalty_level: number = 50,
		story_id: number = 0
	): boolean {
		const entity1 = this.getEntity(entity_id1);
		const entity2 = this.getEntity(entity_id2);
		
		if (!entity1 || !entity2) return false;

		// Relation de entity1 vers entity2
		entity1.relationships[entity_id2] = {
			target_entity_id: entity_id2,
			relationship_type,
			trust_level: Math.max(-100, Math.min(100, trust_level)),
			loyalty_level: Math.max(0, Math.min(100, loyalty_level)),
			history_summary: '',
			last_interaction_story_id: story_id
		};

		// Relation symétrique (peut être différente)
		if (!entity2.relationships[entity_id1]) {
			entity2.relationships[entity_id1] = {
				target_entity_id: entity_id1,
				relationship_type: relationship_type,
				trust_level: Math.max(-100, Math.min(100, trust_level)),
				loyalty_level: Math.max(0, Math.min(100, loyalty_level)),
				history_summary: '',
				last_interaction_story_id: story_id
			};
		}

		console.log(`🤝 Set relationship: ${entity1.name} -> ${entity2.name} (${relationship_type})`);
		return true;
	}

	/**
	 * Récupère la relation entre deux entités
	 */
	getRelationship(entity_id1: string, entity_id2: string): EntityRelationship | null {
		const entity = this.getEntity(entity_id1);
		return entity?.relationships[entity_id2] || null;
	}

	// ===== MIGRATION ET UTILITAIRES =====

	/**
	 * Migre les données depuis l'ancien système
	 * (CompanionManager, NPCState, PlayerCharactersGameState)
	 */
	migrateFromLegacySystems(
		companionManager: any, 
		npcState: NPCState, 
		playerCharactersGameState: any,
		playerCharacterDescription: CharacterDescription
	): void {
		console.log('🔄 Migrating from legacy systems...');

		// Créer l'entité joueur
		if (playerCharacterDescription && Object.keys(playerCharactersGameState).length > 0) {
			const player_resources = Object.values(playerCharactersGameState)[0] as ResourcesWithCurrentValue;
			this.createEntity('player', playerCharacterDescription, player_resources, 0);
		}

		// Migrer les compagnons
		if (companionManager && companionManager.getActiveCompanions) {
			const companions = companionManager.getActiveCompanions();
			companions.forEach((companion: CompanionCharacter) => {
				try {
					const companion_resources = this.convertCompanionStatsToResources(companion.character_stats);
					this.createEntity('companion', companion.character_description, companion_resources, 0);
				} catch (error) {
					console.error(`❌ Failed to migrate companion ${companion.character_description.name}:`, error);
				}
			});
		}

		// Migrer les NPCs
		Object.entries(npcState).forEach(([npc_key, npc_data]) => {
			try {
				const npc_description: CharacterDescription = {
					name: npc_data.known_names?.[0] || npc_key,
					background: `Level ${npc_data.level} ${npc_data.class}`,
					personality: `${npc_data.rank_enum_english} ${npc_data.class}`,
					appearance: `A ${npc_data.rank_enum_english.toLowerCase()} ${npc_data.class.toLowerCase()}`,
					motivation: 'Unknown motivation',
					class: npc_data.class || 'Unknown',
					race: 'Unknown',
					gender: 'Unknown',
					alignment: 'Unknown'
				};
				
				const npc_resources = this.convertNPCStatsToResources(npc_data.resources);
				this.createEntity('npc', npc_description, npc_resources, 0);
			} catch (error) {
				console.error(`❌ Failed to migrate NPC ${npc_key}:`, error);
			}
		});

		console.log(`✅ Migration complete. Total entities: ${this.entities.size}`);
	}

	/**
	 * Convertit les stats d'un compagnon vers le format unifié
	 */
	private convertCompanionStatsToResources(companion_stats: any): ResourcesWithCurrentValue {
		const resources: ResourcesWithCurrentValue = {};
		
		if (companion_stats?.resources) {
			Object.entries(companion_stats.resources).forEach(([key, resource]: [string, any]) => {
				resources[key] = {
					max_value: resource.max_value || resource.start_value || 100,
					current_value: resource.current_value || resource.start_value || 100,
					game_ends_when_zero: resource.game_ends_when_zero || false
				};
			});
		}

		return resources;
	}

	/**
	 * Convertit les stats d'un NPC vers le format unifié
	 */
	private convertNPCStatsToResources(npc_resources?: any): ResourcesWithCurrentValue {
		const resources: ResourcesWithCurrentValue = {};
		
		if (npc_resources) {
			resources.HP = {
				max_value: npc_resources.max_hp || 100,
				current_value: npc_resources.current_hp || npc_resources.max_hp || 100,
				game_ends_when_zero: false
			};
			
			if (npc_resources.max_mp) {
				resources.MP = {
					max_value: npc_resources.max_mp,
					current_value: npc_resources.current_mp || npc_resources.max_mp,
					game_ends_when_zero: false
				};
			}
		}

		return resources;
	}

	// ===== UTILITAIRES POUR GAMEAGENT =====

	/**
	 * Convertit les entités vers le format attendu par GameAgent
	 * pour currently_present_npcs
	 */
	getEntitiesForGameAgent(): {
		hostile: Array<{uniqueTechnicalNameId: string, displayName: string}>;
		friendly: Array<{uniqueTechnicalNameId: string, displayName: string}>;
		neutral: Array<{uniqueTechnicalNameId: string, displayName: string}>;
	} {
		const result = {
			hostile: [] as Array<{uniqueTechnicalNameId: string, displayName: string}>,
			friendly: [] as Array<{uniqueTechnicalNameId: string, displayName: string}>,
			neutral: [] as Array<{uniqueTechnicalNameId: string, displayName: string}>
		};

		this.entities.forEach(entity => {
			if (entity.type !== 'player') { // Exclure le joueur
				const npcData = {
					uniqueTechnicalNameId: entity.id,
					displayName: entity.name
				};

				// Déterminer la catégorie basée sur les relations avec le joueur
				const player = this.getPlayerEntity();
				if (player) {
					const relationship = entity.relationships[player.id];
					if (relationship) {
						switch (relationship.relationship_type) {
							case 'hostile':
							case 'rival':
								result.hostile.push(npcData);
								break;
							case 'friendly':
							case 'ally':
							case 'family':
							case 'romantic':
								result.friendly.push(npcData);
								break;
							default:
								result.neutral.push(npcData);
								break;
						}
					} else {
						// Pas de relation définie - basé sur le type
						if (entity.type === 'companion') {
							result.friendly.push(npcData);
						} else {
							result.neutral.push(npcData);
						}
					}
				} else {
					result.neutral.push(npcData);
				}
			}
		});

		return result;
	}

	/**
	 * Convertit une entité vers le format CompanionCharacter (pour rétrocompatibilité)
	 */
	entityToCompanionCharacter(entity: UnifiedEntity): any {
		if (entity.type !== 'companion') return null;

		return {
			character_description: entity.character_description,
			character_stats: {
				resources: entity.resources,
				level: 1, // À adapter selon les besoins
				attributes: {},
				skills: {},
				spells_and_abilities: []
			},
			loyalty_level: Object.values(entity.relationships)[0]?.loyalty_level || 50,
			trust_level: Object.values(entity.relationships)[0]?.trust_level || 30,
			companion_memory: {
				significant_events: entity.coherence_data.personality_evolution_log.map(log => ({
					event_type: 'story_progression',
					description: log.reason,
					emotional_impact: log.emotional_impact
				}))
			}
		};
	}

	// ===== DEBUG ET MONITORING =====

	/**
	 * Retourne un résumé de l'état actuel
	 */
	getSystemStatus(): {
		total_entities: number;
		by_type: Record<EntityType, number>;
		total_relationships: number;
		potential_conflicts: number;
	} {
		const by_type: Record<EntityType, number> = { player: 0, companion: 0, npc: 0 };
		let total_relationships = 0;

		this.entities.forEach(entity => {
			by_type[entity.type]++;
			total_relationships += Object.keys(entity.relationships).length;
		});

		const validation_result = this.detectAndResolveDuplicates();

		return {
			total_entities: this.entities.size,
			by_type,
			total_relationships,
			potential_conflicts: validation_result.conflicts.length
		};
	}

	/**
	 * Exporte toutes les données pour le debugging
	 */
	exportAllData(): {
		entities: UnifiedEntity[];
		name_registry: Record<string, string>;
		system_status: {
			total_entities: number;
			by_type: Record<EntityType, number>;
			total_relationships: number;
			potential_conflicts: number;
		};
	} {
		return {
			entities: Array.from(this.entities.values()),
			name_registry: Object.fromEntries(this.name_registry),
			system_status: this.getSystemStatus()
		};
	}
}

// Instance singleton
let entityCoordinatorInstance: EntityCoordinator | null = null;

/**
 * Récupère l'instance singleton de EntityCoordinator
 */
export function getEntityCoordinator(): EntityCoordinator {
	if (!entityCoordinatorInstance) {
		entityCoordinatorInstance = new EntityCoordinator();
	}
	return entityCoordinatorInstance;
}

/**
 * Réinitialise l'EntityCoordinator (utile pour les tests)
 */
export function resetEntityCoordinator(): EntityCoordinator {
	entityCoordinatorInstance = new EntityCoordinator();
	return entityCoordinatorInstance;
}
