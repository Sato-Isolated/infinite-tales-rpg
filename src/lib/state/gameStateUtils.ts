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
import type { DiceRoll } from '$lib/ai/agents/combatAgent.js';

// helper hoisted so multiple functions can use it
function getResourceIfPresent(resources: ResourcesWithCurrentValue, key: string) {
	if (!resources) return undefined;
	// direct lookup
	let resource = resources[key] || resources[key?.toUpperCase?.() as string];
	if (resource) return resource;

	const entries = Object.entries(resources);
	const norm = (s: string) => (s || '').toLowerCase().replaceAll('_', '').replaceAll(' ', '');
	const target = norm(key);

	// exact case-insensitive match on normalized keys
	let matchedEntry = entries.find(([k]) => norm(k) === target);
	if (!matchedEntry) {
		// heuristics for generic keys like 'hp'/'mp'
		const aliases: Record<string, string[]> = {
			hp: ['hp', 'health', 'life', 'vitality'],
			mp: ['mp', 'mana', 'magicpower', 'manapoints', 'energy']
		};
		const aliasList = aliases[target] || [target];
		matchedEntry = entries.find(([k]) => {
			const nk = norm(k);
			return aliasList.some(a => nk.includes(a));
		});
	}
	if (!matchedEntry) {
		// fallback: substring match of target within resource key
		matchedEntry = entries.find(([k]) => norm(k).includes(target) || target.includes(norm(k)));
	}
	return matchedEntry ? matchedEntry[1] : undefined;
}

export function applyGameActionState(
	playerCharactersGameState: PlayerCharactersGameState,
	playerCharactersIdToNamesMapState: PlayerCharactersIdToNamesMap,
	npcState: NPCState,
	inventoryState: InventoryState,
	state: GameActionState,
	prohibitNPCChange = false
): void {
	function getResourceIfPresent(resources: ResourcesWithCurrentValue, key: string) {
		if (!resources) return undefined;
		// direct lookup
		let resource = resources[key] || resources[key?.toUpperCase?.() as string];
		if (resource) return resource;

		const entries = Object.entries(resources);
		const norm = (s: string) => (s || '').toLowerCase().replaceAll('_', '').replaceAll(' ', '');
		const target = norm(key);

		// exact case-insensitive match on normalized keys
		let matchedEntry = entries.find(([k]) => norm(k) === target);
		if (!matchedEntry) {
			// heuristics for generic keys like 'hp'/'mp'
			const aliases: Record<string, string[]> = {
				hp: ['hp', 'health', 'life', 'vitality'],
				mp: ['mp', 'mana', 'magicpower', 'manapoints', 'energy']
			};
			const aliasList = aliases[target] || [target];
			matchedEntry = entries.find(([k]) => {
				const nk = norm(k);
				return aliasList.some(a => nk.includes(a));
			});
		}
		if (!matchedEntry) {
			// fallback: substring match of target within resource key
			matchedEntry = entries.find(([k]) => norm(k).includes(target) || target.includes(norm(k)));
		}
		return matchedEntry ? matchedEntry[1] : undefined;
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
				const xpCost = Number.parseInt(String(statUpdate.value?.result ?? '0'));
				const safeCost = Number.isFinite(xpCost) ? Math.max(0, xpCost) : 0;
				playerCharactersGameState[characterId].XP.current_value = Math.max(
					0,
					(playerCharactersGameState[characterId].XP.current_value || 0) - safeCost
				);
				continue;
			}
			if (statUpdate.type === 'xp_gained') {
				const xpGain = Number.parseInt(String(statUpdate.value?.result ?? '0'));
				const safeGain = Number.isFinite(xpGain) ? Math.max(0, xpGain) : 0;
				playerCharactersGameState[characterId].XP.current_value =
					(playerCharactersGameState[characterId].XP.current_value || 0) + safeGain;
			} else {
				if (statUpdate.type.includes('_gained')) {
					const resource: string = statUpdate.type.replace('_gained', '');
					const res = getResourceIfPresent(playerCharactersGameState[characterId], resource);
					if (!res) continue;
					const parsed = Number.parseInt(String(statUpdate.value?.result ?? '0'));
					const gained = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
					const cur = Number.isFinite(res.current_value) ? res.current_value : 0;
					const max = Number.isFinite(res.max_value) ? res.max_value : cur;
					res.current_value = Math.min(cur + gained, max);
				}
			}
			if (statUpdate.type.includes('_lost')) {
				const resource: string = statUpdate.type.replace('_lost', '');
				const res = getResourceIfPresent(playerCharactersGameState[characterId], resource);
				if (!res) continue;
				const parsed = Number.parseInt(String(statUpdate.value?.result ?? '0'));
				const lost = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
				const cur = Number.isFinite(res.current_value) ? res.current_value : 0;
				res.current_value = Math.max(0, cur - lost);
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

/**
 * Get a snapshot of the current player character stats (resources) by characterId.
 */
export function getPlayerStats(
	playerCharactersGameState: PlayerCharactersGameState,
	playerCharacterId: string
): ResourcesWithCurrentValue | undefined {
	return playerCharactersGameState[playerCharacterId];
}

export type StatDelta = {
	targetName: string;
	resourceKey: string; // e.g., 'hp', 'mp', or actual game resource key
	amount: number; // positive for gain, negative for loss
};

/**
 * Apply a list of stat deltas (already signed amounts) to player and NPCs.
 * - Positive amount increases, negative decreases
 * - Uses same fuzzy key resolution and clamping logic as applyGameActionState
 */
export function applyStatDeltas(
	playerCharactersGameState: PlayerCharactersGameState,
	playerCharactersIdToNamesMapState: PlayerCharactersIdToNamesMap,
	npcState: NPCState,
	deltas: StatDelta[],
	prohibitNPCChange = false
): void {
	for (const delta of deltas || []) {
		const characterId = (function getId(): string | undefined {
			for (const [id, names] of Object.entries(playerCharactersIdToNamesMapState)) {
				if (names.includes(delta.targetName)) return id;
			}
			return undefined;
		})() || '';

		const applyToResource = (res?: { current_value: number; max_value: number }) => {
			if (!res) return;
			const cur = Number.isFinite(res.current_value) ? res.current_value : 0;
			const max = Number.isFinite(res.max_value) ? res.max_value : cur;
			const next = cur + delta.amount;
			res.current_value = Math.max(0, Math.min(max, next));
		};

		if (playerCharactersGameState[characterId]) {
			const res = getResourceIfPresent(playerCharactersGameState[characterId], delta.resourceKey);
			applyToResource(res);
		} else if (!prohibitNPCChange) {
			const npc: NPCStats | undefined = Object.values(npcState).find((n) =>
				n.known_names?.includes(delta.targetName)
			);
			if (npc && npc.resources) {
				if (delta.resourceKey.toLowerCase().includes('hp')) {
					npc.resources.current_hp = Math.max(0, npc.resources.current_hp + delta.amount);
				}
				if (delta.resourceKey.toLowerCase().includes('mp')) {
					npc.resources.current_mp = Math.max(0, npc.resources.current_mp + delta.amount);
				}
			}
		}
	}
}

/**
 * Convenience: map StatsUpdate[] into StatDelta[]
 */
export function toStatDeltas(
	updates: Array<{ targetName: string; type: string; value: DiceRoll }>
): StatDelta[] {
	return (updates || []).map((u) => {
		const isGain = u.type.includes('_gained');
		const isLoss = u.type.includes('_lost');
		const key = u.type.replace('_gained', '').replace('_lost', '');
		const raw = u.value?.result as unknown;
		const amountParsed = Number.parseInt(String(raw ?? '0'));
		const magnitude = Number.isFinite(amountParsed) ? Math.max(0, amountParsed) : 0;
		const signed = isGain ? magnitude : isLoss ? -magnitude : 0;
		return { targetName: u.targetName, resourceKey: key, amount: signed };
	});
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
