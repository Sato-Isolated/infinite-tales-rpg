import type { CharacterDescription } from '$lib/ai/agents/characterAgent';
import type { CharacterStats } from '$lib/ai/agents/characterStatsAgent';

export type CompanionCharacter = {
	// Données de base (comme un personnage complet)
	id: string;
	character_description: CharacterDescription;
	character_stats: CharacterStats;
	
	// Système évolutif spécifique aux compagnons
	companion_memory: CompanionMemory;
	personality_evolution: PersonalityEvolution;
	relationship_data: RelationshipData;
	
	// Meta compagnon
	created_at: string;
	last_interaction: string;
	is_active_in_party: boolean;
	loyalty_level: number; // 0-100
	trust_level: number; // 0-100
};

export type CompanionMemory = {
	significant_events: MemoryEvent[];
	personality_influences: PersonalityInfluence[];
	relationship_timeline: RelationshipEvent[];
	combat_experiences: CombatMemory[];
	dialogue_history: ConversationMemory[];
};

export type MemoryEvent = {
	id: string;
	timestamp: string;
	event_type: 'combat' | 'dialogue' | 'moral_choice' | 'travel' | 'discovery' | 'betrayal' | 'heroic_act' | 'loss';
	description: string;
	emotional_impact: number; // -100 à +100
	participants: string[];
	location?: string;
	player_actions: string[];
	companion_reaction: string;
	long_term_significance: 'low' | 'medium' | 'high';
};

export type PersonalityEvolution = {
	baseline_personality: string; // Personnalité originale (immutable)
	current_personality_traits: PersonalityTrait[];
	evolution_history: PersonalityChange[];
	stability_factor: number; // 0-100, résistance au changement
};

export type PersonalityTrait = {
	trait_name: string; // courage, humor, loyalty, cynicism, etc.
	value: number; // 0-100
	last_changed: string;
	influenced_by: string[]; // IDs des événements qui ont influencé ce trait
};

export type PersonalityChange = {
	timestamp: string;
	trait_affected: string;
	old_value: number;
	new_value: number;
	trigger_event: string;
	reasoning: string;
};

export type PersonalityInfluence = {
	event_id: string;
	traits_affected: string[];
	influence_strength: number; // 1-10
	reasoning: string;
};

export type RelationshipData = {
	initial_relationship: string;
	current_status: 'stranger' | 'acquaintance' | 'friend' | 'close_friend' | 'companion' | 'soulmate' | 'rival' | 'enemy';
	relationship_milestones: RelationshipMilestone[];
	shared_experiences: string[];
};

export type RelationshipEvent = {
	timestamp: string;
	event_type: 'first_meeting' | 'trust_gained' | 'trust_lost' | 'conflict_resolved' | 'bonding_moment';
	description: string;
	impact_on_relationship: number; // -50 à +50
};

export type RelationshipMilestone = {
	milestone_type: 'became_friends' | 'shared_secret' | 'saved_life' | 'major_disagreement' | 'reconciliation';
	timestamp: string;
	description: string;
	relationship_level_before: string;
	relationship_level_after: string;
};

export type CombatMemory = {
	combat_id: string;
	timestamp: string;
	allies: string[];
	enemies: string[];
	outcome: 'victory' | 'defeat' | 'retreat' | 'draw';
	companion_performance: 'heroic' | 'good' | 'average' | 'poor' | 'cowardly';
	player_performance: 'heroic' | 'good' | 'average' | 'poor' | 'cowardly';
	lessons_learned: string[];
};

export type ConversationMemory = {
	timestamp: string;
	topic: string;
	player_stance: string;
	companion_response: string;
	emotional_tone: 'positive' | 'neutral' | 'negative' | 'mixed';
	subjects_discussed: string[];
	agreements: string[];
	disagreements: string[];
};

// Templates pour la création de compagnons
export type CompanionTemplate = {
	role: 'warrior' | 'mage' | 'rogue' | 'healer' | 'scholar' | 'guide' | 'noble' | 'merchant' | 'outlaw';
	relationship: 'childhood_friend' | 'mentor' | 'rescued_companion' | 'hired_help' | 'mysterious_ally' | 'family_member' | 'rival_turned_ally';
	personality_base: 'loyal' | 'cynical' | 'optimistic' | 'pragmatic' | 'rebellious' | 'wise' | 'naive' | 'ambitious';
	background_connection?: string; // Connection au background du joueur
};

export type CompanionSetupOptions = {
	no_companions: boolean;
	generate_random_companion: boolean;
	create_custom_companions: CompanionCharacter[];
	import_existing_companions: string[]; // IDs de compagnons sauvegardés
};

export type CompanionState = {
	[companionId: string]: CompanionCharacter;
};

// Données d'évolution et d'analyse
export type EvolutionTrigger = {
	trigger_type: 'major_event' | 'repeated_behavior' | 'relationship_milestone' | 'moral_conflict';
	description: string;
	traits_to_affect: string[];
	potential_change: number;
	probability: number; // 0-1
};

export type BehaviorPrediction = {
	situation: string;
	predicted_reaction: string;
	confidence: number; // 0-1
	influencing_traits: string[];
	influencing_memories: string[];
};

// Pour l'initialisation
export const initialCompanionMemory: CompanionMemory = {
	significant_events: [],
	personality_influences: [],
	relationship_timeline: [],
	combat_experiences: [],
	dialogue_history: []
};

export const initialPersonalityEvolution = (basePersonality: string): PersonalityEvolution => ({
	baseline_personality: basePersonality,
	current_personality_traits: [],
	evolution_history: [],
	stability_factor: 75 // Valeur par défaut : moyennement stable
});

export const initialRelationshipData = (relationship: string): RelationshipData => ({
	initial_relationship: relationship,
	current_status: 'acquaintance',
	relationship_milestones: [],
	shared_experiences: []
});
