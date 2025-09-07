/**
 * Player character type definitions
 */
import type { ResourcesWithCurrentValue } from './resources';

export type PlayerCharactersIdToNamesMap = {
  [playerCharacterId: string]: Array<string>;
};

export type PlayerCharactersGameState = {
  [playerCharacterId: string]: ResourcesWithCurrentValue;
};
