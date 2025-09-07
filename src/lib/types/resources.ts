/**
 * Resource-related type definitions
 */

export type ResourcesWithCurrentValue = {
  [resourceKey: string]: {
    max_value: number;
    current_value: number;
    game_ends_when_zero: boolean;
  };
};
