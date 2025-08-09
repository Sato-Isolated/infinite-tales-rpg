export interface MemoryEvent {
        id: string;
        story_id: number;
        timestamp: Date;
        event_type:
                | 'action'
                | 'dialogue'
                | 'discovery'
                | 'relationship_change'
                | 'story_progression'
                | 'combat'
                | 'other';
        title: string;
        description: string;
        entities_involved: string[]; // IDs des entités impliquées
        location?: string;
        emotional_impact: number; // -100 à 100
        importance_level: 'low' | 'medium' | 'high' | 'critical';
        tags: string[];
        causality_links: string[]; // IDs d'autres événements qui ont causé celui-ci
        consequences: string[]; // IDs d'événements causés par celui-ci
        narrative_metadata: {
                plot_advancement: boolean;
                character_development: boolean;
                world_building: boolean;
                mystery_revelation: boolean;
        };
}

export interface MemoryTimeline {
        events: MemoryEvent[];
        total_events: number;
        earliest_event?: Date;
        latest_event?: Date;
        plot_threads: PlotThread[];
}

export interface PlotThread {
        id: string;
        title: string;
        description: string;
        start_story_id: number;
        end_story_id?: number;
        status: 'active' | 'resolved' | 'abandoned' | 'paused';
        related_events: string[]; // IDs des événements liés
        entities_involved: string[];
        importance: 'minor' | 'major' | 'main';
}

export interface MemoryConsistencyCheck {
        is_consistent: boolean;
        contradictions: MemoryContradiction[];
        warnings: string[];
        suggestions: string[];
}

export interface MemoryContradiction {
        type: 'timeline' | 'character_state' | 'location' | 'fact' | 'relationship';
        conflicting_events: string[];
        description: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        suggested_resolution: string;
}

export interface MemoryQuery {
        entities?: string[];
        event_types?: string[];
        time_range?: { start: Date; end: Date };
        story_id_range?: { start: number; end: number };
        importance_min?: 'low' | 'medium' | 'high' | 'critical';
        tags?: string[];
        text_search?: string;
        limit?: number;
}

export interface MemoryContext {
        relevant_events: MemoryEvent[];
        active_plot_threads: PlotThread[];
        entity_summaries: Record<string, string>;
        location_history: string[];
        recent_developments: MemoryEvent[];
        long_term_context: MemoryEvent[];
}

export interface MemoryValidationResult {
        is_coherent: boolean;
        overall_score: number; // 0-100
        conflicts_detected: MemoryConflict[];
        total_events: number;
        validation_depth: number;
        temporal_consistency_score: number;
        character_consistency_score: number;
        plot_consistency_score: number;
        recommendations: string[];
}

export interface MemoryConflict {
        conflict_type:
                | 'temporal_inconsistency'
                | 'character_contradiction'
                | 'plot_hole'
                | 'factual_error';
        severity: 'low' | 'medium' | 'high' | 'critical';
        description: string;
        conflicting_events?: MemoryEvent[];
        suggested_resolution: string;
        entities_affected: string[];
}

