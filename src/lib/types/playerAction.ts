import { ActionDifficulty } from '$lib/game/logic/gameLogic';

export type ReasonedEnum = {
  reasoning: string;
  enum_english: string;
};

export type ReasonedLevelEnum = {
  reasoning: string;
  enum_english: 'LOW' | 'MEDIUM' | 'HIGH';
};

export type DiceRollDifficulty = {
  action_difficulty?: ActionDifficulty;
  dice_roll?: {
    modifier: 'none' | 'bonus' | 'malus';
    modifier_value: number;
    modifier_explanation: string;
  };
};

export type Action = {
  characterName: string;
  text: string;
  related_attribute?: string;
  related_skill?: string;
  action_difficulty?: ActionDifficulty;
  is_custom_action?: boolean;
  is_possible?: boolean;
  plausibility?: string;
  difficulty_explanation?: string;
  type?: string;
  narration_details?: ReasonedLevelEnum;
  actionSideEffects?: string;
  enemyEncounterExplanation?: ReasonedLevelEnum;
  is_interruptible?: ReasonedEnum;
  resource_cost?: {
    resource_key: string | undefined;
    cost: number;
  };
} & DiceRollDifficulty;
