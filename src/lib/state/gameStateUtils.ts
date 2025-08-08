import type { 
	PlayerCharactersGameState, 
	PlayerCharactersIdToNamesMap, 
	GameActionState,
	InventoryState,
	ResourcesWithCurrentValue,
	InventoryUpdate
} from '$lib/ai/agents/gameAgent.js';
import type { NPCState, NPCStats } from '$lib/ai/agents/characterStatsAgent.js';
import type { StatsUpdate } from '$lib/ai/agents/combatAgent.js';
import { mapStatsUpdateToGameLogic } from '$lib/utils/resourceUtils.js';

export function applyGameActionState(
	playerCharactersGameState: PlayerCharactersGameState,
	playerCharactersIdToNamesMapState: PlayerCharactersIdToNamesMap,
	npcState: NPCState,
	inventoryState: InventoryState,
	state: GameActionState,
	prohibitNPCChange = false
): void {
	function getResourceIfPresent(resources: ResourcesWithCurrentValue, key: string) {
		let resource = resources[key];
		if (!resource) {
			resource = resources[key.toUpperCase()];
		}
		return resource;
	}

	function getCharacterTechnicalId(playerCharactersIdToNamesMapState: PlayerCharactersIdToNamesMap, targetName: string): string | undefined {
		// Implementation to find character ID from name
		for (const [id, names] of Object.entries(playerCharactersIdToNamesMapState)) {
			if (names.includes(targetName)) {
				return id;
			}
		}
		return undefined;
	}

	for (const statUpdate of state?.stats_update?.map(mapStatsUpdateToGameLogic) || []) {
		const characterId =
			getCharacterTechnicalId(playerCharactersIdToNamesMapState, statUpdate.targetName) || '';
		if (playerCharactersGameState[characterId]) {
			if (statUpdate.type.includes('now_level')) {
				playerCharactersGameState[characterId].XP.current_value -=
					Number.parseInt(statUpdate.value.result) || 0;
				continue;
			}
			if (statUpdate.type === 'xp_gained') {
				playerCharactersGameState[characterId].XP.current_value +=
					Number.parseInt(statUpdate.value.result) || 0;
			} else {
				if (statUpdate.type.includes('_gained')) {
					const resource: string = statUpdate.type.replace('_gained', '');
					const res = getResourceIfPresent(playerCharactersGameState[characterId], resource);
					if (!res) continue;
					let gained = Number.parseInt(statUpdate.value.result) || 0;
					gained = gained > 0 ? gained : 0;
					res.current_value = Math.min(res.current_value + gained, res.max_value);
				}
			}
			if (statUpdate.type.includes('_lost')) {
				const resource: string = statUpdate.type.replace('_lost', '');
				const res = getResourceIfPresent(playerCharactersGameState[characterId], resource);
				if (!res) continue;
				let lost = Number.parseInt(statUpdate.value.result) || 0;
				lost = lost > 0 ? lost : 0;
				res.current_value -= lost;
			}
		} else {
			if (!prohibitNPCChange) {
				let npc: NPCStats | undefined = Object.values(npcState).find((npc) =>
					npc.known_names?.includes(statUpdate.targetName)
				);
				if (!npc) {
					// Handle case where NPC is not found
				}
				if (npc && npc.resources) {
					// Apply stats to NPC
				}
			}
		}
	}

	applyInventoryUpdate(inventoryState, state);
}

export function applyInventoryUpdate(inventoryState: InventoryState, state: GameActionState): void {
	for (const inventoryUpdate of state?.inventory_update || []) {
		if (inventoryUpdate.type === 'remove_item') {
			delete inventoryState[inventoryUpdate.item_id];
		}
		if (inventoryUpdate.type === 'add_item') {
			if (inventoryUpdate.item_added) {
				inventoryState[inventoryUpdate.item_id] = inventoryUpdate.item_added;
			} else {
				console.error('item_added with no item', JSON.stringify(inventoryUpdate));
			}
		}
	}
}

export function applyGameActionStates(
	playerCharactersGameState: PlayerCharactersGameState,
	playerCharactersIdToNamesMapState: PlayerCharactersIdToNamesMap,
	npcState: NPCState,
	inventoryState: InventoryState,
	states: Array<GameActionState>
): void {
	for (const state of states) {
		//TODO because of prohibitNPCChange we can not revert actions anymore, introduce derived aswell?
		applyGameActionState(
			playerCharactersGameState,
			playerCharactersIdToNamesMapState,
			npcState,
			inventoryState,
			state,
			true
		);
	}
}

export function getGameEndedMessage(): string {
	return 'Your Tale has come to an end...\\nThanks for playing Infinite Tales RPG!\\nYou can start a new Tale in the menu.';
}

/**
 * Undo the last game action by removing it and restoring the game state
 */
export function undoLastAction(
	gameActions: GameActionState[],
	playerCharactersGameState: PlayerCharactersGameState,
	playerCharactersIdToNamesMap: PlayerCharactersIdToNamesMap,
	npcState: NPCState,
	inventoryState: InventoryState,
	characterStatsResources: ResourcesWithCurrentValue
): {
	updatedGameActions: GameActionState[];
	restoredPlayerCharactersGameState: PlayerCharactersGameState;
	restoredNpcState: NPCState;
	restoredInventoryState: InventoryState;
} {
	if (gameActions.length <= 1) {
		throw new Error('Cannot undo: Not enough actions in history');
	}

	// Remove the last action
	const updatedGameActions = gameActions.slice(0, -1);

	// Reset all game states to their initial values
	const restoredPlayerCharactersGameState: PlayerCharactersGameState = {};
	const restoredNpcState: NPCState = {};
	const restoredInventoryState: InventoryState = {};

	// Initialize the character resources from character stats
	Object.keys(playerCharactersGameState).forEach(characterId => {
		restoredPlayerCharactersGameState[characterId] = {
			...characterStatsResources,
			XP: { current_value: 0, max_value: 0, game_ends_when_zero: false }
		};
	});

	// Re-apply all remaining actions to rebuild the correct state
	applyGameActionStates(
		restoredPlayerCharactersGameState,
		playerCharactersIdToNamesMap,
		restoredNpcState,
		restoredInventoryState,
		updatedGameActions
	);

	return {
		updatedGameActions,
		restoredPlayerCharactersGameState,
		restoredNpcState,
		restoredInventoryState
	};
}
