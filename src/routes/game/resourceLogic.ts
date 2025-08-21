import type { Resources } from '$lib/ai/agents/characterStatsAgent';
import {
	GameAgent,
	type GameActionState,
	type PlayerCharactersGameState,
	type ResourcesWithCurrentValue
} from '$lib/ai/agents/gameAgent';

/**
 * Type guard to safely check if an object has resource-like properties
 */
function isResourceWithValue(obj: unknown): obj is { current_value?: number; max_value?: number } {
	return typeof obj === 'object' && obj !== null;
}

/**
 * Type guard to check if player state exists and is valid
 */
function isValidPlayerState(state: unknown): state is Record<string, unknown> {
	return typeof state === 'object' && state !== null;
}

/**
 * Safely gets current value from player resource with proper validation
 */
function getCurrentResourceValue(
	playerState: PlayerCharactersGameState,
	playerId: string,
	resourceKey: string
): number {
	const playerResources = playerState[playerId];
	if (!isValidPlayerState(playerResources)) {
		return 0;
	}

	const resource = playerResources[resourceKey];
	if (!isResourceWithValue(resource)) {
		return 0;
	}

	return resource.current_value ?? 0;
}

export function refillResourcesFully(
	maxResources: Resources,
	playerId: string,
	playerCharacterName: string,
	gameActionsState: GameActionState[],
	playerCharactersGameState: PlayerCharactersGameState
): {
	updatedGameActionsState: GameActionState[];
	updatedPlayerCharactersGameState: PlayerCharactersGameState;
} {
	// Validate inputs
	if (!playerId || !playerCharacterName || !maxResources) {
		throw new Error('Invalid parameters for refillResourcesFully');
	}

	// Get the current state for the given player
	const currentPlayerResources = playerCharactersGameState[playerId];
	if (!currentPlayerResources) {
		throw new Error(`Player with ID ${playerId} not found in game state`);
	}

	// First: compute the update log via GameAgent using the provided values
	const statsUpdate = GameAgent.getRefillResourcesUpdateObject(
		maxResources,
		currentPlayerResources,
		playerCharacterName
	);

	// Copy the game actions state and update the last action's stats_update log
	const updatedGameActionsState = [...gameActionsState];
	const lastIndex = updatedGameActionsState.length - 1;
	if (lastIndex >= 0) {
		updatedGameActionsState[lastIndex] = {
			...updatedGameActionsState[lastIndex],
			stats_update: [
				...updatedGameActionsState[lastIndex].stats_update,
				...statsUpdate.stats_update
			]
		};
	}

	// Process resources with proper type safety
	const newResources: ResourcesWithCurrentValue = {};

	for (const [resourceKey, resourceData] of Object.entries(maxResources)) {
		if (!resourceData) continue;

		const refillValue = GameAgent.getRefillValue(resourceData);
		const currentValue = getCurrentResourceValue(playerCharactersGameState, playerId, resourceKey);

		newResources[resourceKey] = {
			...resourceData,
			current_value: refillValue >= currentValue ? refillValue : currentValue
		};
	}

	// Then: update the player's resource values to be set to the maximum.
	const updatedPlayerResources = {
		...currentPlayerResources, // preserve existing properties (like XP)
		...newResources
	};

	// Prepare the new playerCharactersGameState with the updated value for playerName.
	const updatedPlayerCharactersGameState = {
		...playerCharactersGameState,
		[playerId]: updatedPlayerResources
	};

	return {
		updatedGameActionsState,
		updatedPlayerCharactersGameState
	};
}

export function initializeMissingResources(
	resources: Resources,
	playerId: string,
	playerCharacterName: string,
	gameActionsState: GameActionState[],
	playerCharactersGameState: PlayerCharactersGameState
) {
	// Validate inputs
	if (!playerId || !resources) {
		return {
			updatedGameActionsState: gameActionsState,
			updatedPlayerCharactersGameState: playerCharactersGameState
		};
	}

	const playerState = playerCharactersGameState[playerId];
	if (!isValidPlayerState(playerState)) {
		console.warn(`Player state not found for ID: ${playerId}`);
		return {
			updatedGameActionsState: gameActionsState,
			updatedPlayerCharactersGameState: playerCharactersGameState
		};
	}

	// Check for any resources that are missing in the player's state.
	const missingResources: Resources = Object.entries(resources)
		.filter(([resourceKey]) => {
			const resource = playerState[resourceKey];
			return !isResourceWithValue(resource) || resource.current_value === undefined;
		})
		.reduce((acc, [resourceKey, resource]) => ({ ...acc, [resourceKey]: resource }), {});

	if (Object.keys(missingResources).length > 0) {
		// On reload/initialization we should NOT append stats_update to history,
		// just ensure the player's resources have proper current_value set.
		const currentPlayerResources = playerState;
		const filledResources: ResourcesWithCurrentValue = {};

		for (const [resourceKey, resourceData] of Object.entries(missingResources)) {
			if (!resourceData) continue;

			const refillValue = GameAgent.getRefillValue(resourceData);
			filledResources[resourceKey] = {
				...resourceData,
				current_value: refillValue
			};
		}

		const updatedPlayerResources = {
			...currentPlayerResources,
			...filledResources
		};

		const updatedPlayerCharactersGameState = {
			...playerCharactersGameState,
			[playerId]: updatedPlayerResources
		};

		return { updatedGameActionsState: gameActionsState, updatedPlayerCharactersGameState };
	}

	return {
		updatedGameActionsState: gameActionsState,
		updatedPlayerCharactersGameState: playerCharactersGameState
	};
}
