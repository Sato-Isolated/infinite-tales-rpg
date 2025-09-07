/**
 * Action and interaction type definitions
 */
import type { InventoryUpdate } from './inventory';
import type { StatsUpdate } from '$lib/ai/agents/combatAgent';
import type { NpcID } from '$lib/ai/agents/characterStatsAgent';

export type GameAction = {
  name: string;
  is_possible: boolean;
  difficulty?: string;
  category?: string;
  skill_relevance?: string[];
  tools_needed?: string[];
  risk_level?: 'low' | 'medium' | 'high';
  consequences?: string;
  reason_if_impossible?: string;
  is_dice_action?: boolean;
  reasoning?: string;
};

export type GameActionsState = {
  actions: GameAction[];
};

export const defaultGameActionsState = (): GameActionsState => ({
  actions: []
});

export type ActionButton = {
  actionText: string;
  isActive?: boolean;
  actionsId?: string;
  category?: string;
  onActionClick: (actionText: string, category?: string) => void;
};

export type ActionFormData = {
  action: string;
  category: string;
};

export type Targets = {
  hostile: Array<NpcID>;
  friendly: Array<NpcID>;
  neutral: Array<NpcID>
};

export type GameActionState = {
  id: number;
  currentPlotPoint: string;
  nextPlotPoint: string;
  story: string;
  inventory_update: Array<InventoryUpdate>;
  stats_update: Array<StatsUpdate>;
  is_character_in_combat: boolean;
  is_character_restrained_explanation?: string;
  currently_present_npcs: Targets;
  story_memory_explanation: string;
  time_passed_minutes?: number;
  time_passed_explanation?: string;
  initial_game_time?: {
    day: number;
    dayName: string;
    month: number;
    monthName: string;
    year: number;
    hour: number;
    minute: number;
    timeOfDay: string;
    explanation?: string;
  };
};

export type GameMasterAnswer = {
  answerToPlayer: string;
  answerType: 'rule_clarification' | 'world_lore' | 'tactical_advice' | 'current_situation' | 'character_info' | 'general';
  confidence: number;
  rules_considered: Array<string>;
  game_state_considered: string;
  relatedQuestions: string[];
  sources: string[];
  followUpSuggestions?: string[];
  requiresClarification?: boolean;
  suggestedActions?: string[];
};
