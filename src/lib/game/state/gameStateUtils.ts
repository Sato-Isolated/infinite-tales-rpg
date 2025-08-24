import type {
	GameActionState,
	PlayerCharactersGameState,
	PlayerCharactersIdToNamesMap
} from '$lib/ai/agents/gameAgent';
import type { CharacterStats } from '$lib/ai/agents/characterStatsAgent';
import { getCharacterTechnicalId } from '../logic/characterLogic';
import * as gameLogic from '../logic/gameLogic';

/**
 * Game State Utilities - Pure helper functions for game state management
 * Following copilot instructions: Extract utility functions to dedicated logic files
 */

/**
 * Get the current character's game state (resources, XP, etc.)
 */
export function getCurrentCharacterGameState(
	playerCharactersGameState: PlayerCharactersGameState,
	playerCharactersIdToNamesMap: PlayerCharactersIdToNamesMap,
	characterName: string
) {
	const characterId = getCharacterTechnicalId(playerCharactersIdToNamesMap, characterName) || '';
	return playerCharactersGameState[characterId] || undefined;
}

/**
 * Render game updates for display (stats + inventory updates)
 */
export function getRenderedGameUpdates(
	gameState: GameActionState,
	playerCharactersGameState: PlayerCharactersGameState,
	playerCharactersIdToNamesMap: PlayerCharactersIdToNamesMap,
	playerId: string
) {
	if (!gameState) return [];

	const playerResources = playerCharactersGameState[playerId];
	const playerNames = playerCharactersIdToNamesMap[playerId];

	// Create a deep copy of stats_update to avoid mutating the original during reactive contexts
	const statsUpdateCopy = gameState.stats_update
		? JSON.parse(JSON.stringify(gameState.stats_update))
		: undefined;

	return gameLogic
		.renderStatUpdates(statsUpdateCopy, playerResources, playerNames)
		.concat(gameLogic.renderInventoryUpdate(gameState.inventory_update));
}

/**
 * Check if the game has ended based on critical resources
 */
export function shouldGameEnd(
	playerCharactersGameState: PlayerCharactersGameState,
	playerCharacterId: string,
	isGameEnded: boolean
): boolean {
	if (isGameEnded) return true;

	const emptyResourceKeys = gameLogic.getEmptyCriticalResourceKeys(
		playerCharactersGameState[playerCharacterId]
	);
	return emptyResourceKeys.length > 0;
}

/**
 * Get empty critical resource keys for game ending
 */
export function getEmptyResourceKeysForGameEnd(
	playerCharactersGameState: PlayerCharactersGameState,
	playerCharacterId: string
): string[] {
	return gameLogic.getEmptyCriticalResourceKeys(playerCharactersGameState[playerCharacterId]);
}

/**
 * Check if character can level up based on XP and level
 */
export function canLevelUp(
	playerCharactersGameState: PlayerCharactersGameState,
	playerCharacterId: string,
	characterStats: CharacterStats,
	getXPNeededForLevel: (level: number) => number | undefined
): boolean {
	const neededXP = getXPNeededForLevel(characterStats.level);
	if (!neededXP) return false;

	const currentXP = playerCharactersGameState[playerCharacterId]?.XP?.current_value || 0;
	return currentXP >= neededXP;
}

/**
 * Extract the latest story messages from history
 */
export function getLatestStoryMessages(historyMessages: any[], numOfActions: number = 2): any[] {
	return historyMessages.slice(-numOfActions);
}
