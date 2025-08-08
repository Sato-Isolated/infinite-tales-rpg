import type { StatsUpdate } from '$lib/ai/agents/combatAgent.js';
import type { ResourcesWithCurrentValue, InventoryUpdate, InventoryState } from '$lib/ai/agents/gameAgent.js';
import type { RenderedGameUpdate } from '$lib/types/gameTypes.js';
import { mapStatsUpdateToGameLogic, getColorForStatUpdate, formatItemId } from '$lib/utils/resourceUtils.js';

function isPlainObject(value: unknown): boolean {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function renderStatUpdates(
	statsUpdates: Array<StatsUpdate>,
	resources: ResourcesWithCurrentValue,
	playerNames: Array<string>
): (undefined | RenderedGameUpdate)[] {
	if (statsUpdates) {
		return statsUpdates
			.toSorted((a, b) => (a.targetName < b.targetName ? -1 : 1))
			.map(mapStatsUpdateToGameLogic)
			.map((statsUpdate) => {
				if (
					!statsUpdate.value?.result ||
					isPlainObject(statsUpdate.value.result) ||
					Number.parseInt(statsUpdate.value.result) <= 0 ||
					statsUpdate.type === 'null' ||
					statsUpdate.type === 'none'
				) {
					return undefined;
				}
				let responseText: string;
				let resourceText = ('' + statsUpdate.value.result).replaceAll('_', ' ');
				let changeText = statsUpdate.type?.includes('_gained')
					? 'gain'
					: statsUpdate.type?.includes('_lost')
						? 'loose'
						: undefined;

				const mappedType =
					statsUpdate.type
						?.replace('_gained', '')
						.replace('_lost', '')
						.replace('_increased', '')
						.replaceAll('_', ' ')
						.toUpperCase() || '';

				const color = getColorForStatUpdate(mappedType, resources);

				if (playerNames.includes(statsUpdate.targetName)) {
					responseText = 'You ';
					if (!changeText) {
						//probably unhandled status effect
						changeText = 'are';
					}
					if (mappedType.includes('LEVEL')) {
						resourceText = '';
					} else {
						// Handle other player stats
					}
				} else {
					responseText = statsUpdate.targetName.replaceAll('_', ' ').replaceAll('id', '') + ' ';
					if (!changeText) {
						// Handle NPC status effects
					} else {
						// Handle NPC stat changes
					}
				}
				responseText += changeText;
				resourceText += ' ' + mappedType;
				return { text: responseText, resourceText, color };
			})
			.filter((value) => !!value);
	}
	return [];
}

export function renderInventoryUpdate(
	inventoryUpdate: Array<InventoryUpdate>
): Array<undefined | RenderedGameUpdate> {
	if (inventoryUpdate) {
		return inventoryUpdate
			.toSorted((a, b) => (a.type < b.type ? -1 : 1))
			.map((inventoryUpdate) => {
				const mappedId = formatItemId(inventoryUpdate.item_id);
				let text = '',
					resourceText = mappedId;
				const color = 'text-yellow-500';
				if (inventoryUpdate.type === 'add_item') {
					text = 'You gain ';
				}
				if (inventoryUpdate.type === 'remove_item') {
					text = 'You loose ';
				}
				if (!text) {
					text = 'Unidentified item update:';
					resourceText = JSON.stringify(inventoryUpdate);
				}
				return { text, resourceText, color };
			})
			.filter((value) => !!value);
	}
	return [];
}

//TODO too difficult if too many hits
function getTakeLessDamageForManyHits(
	stats_update: Array<StatsUpdate>,
	damage: number,
	playerNames: Array<string>
): number {
	if (damage <= 2) {
		return damage;
	}
	const allPlayerHits = stats_update
		.filter((update) => playerNames.includes(update.targetName))
		.filter((update) => update.type === 'hp_lost');

	return Math.max(1, Math.round(damage / Math.min(3, allPlayerHits?.length || 1)));
}
