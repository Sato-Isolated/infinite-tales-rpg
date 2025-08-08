import type { ResourcesWithCurrentValue, Action, InventoryState } from '$lib/ai/agents/gameAgent.js';
import type { StatsUpdate } from '$lib/ai/agents/combatAgent.js';

export function getEmptyCriticalResourceKeys(resources: ResourcesWithCurrentValue): string[] {
	return Object.entries(resources)
		.filter((entry) => entry[1].game_ends_when_zero && entry[1].current_value <= 0)
		.map((entry) => entry[0]);
}

export function mapStatsUpdateToGameLogic(statsUpdate: StatsUpdate): StatsUpdate {
	if (statsUpdate.type.toUpperCase().includes('XP')) {
		mapXP(statsUpdate);
	}
	return statsUpdate;
}

function mapXP(statsUpdate: StatsUpdate) {
	// TODO: Implement XP mapping logic
	// This function should contain the XP mapping implementation
}

export function getColorForStatUpdate(mappedType: string, resources: ResourcesWithCurrentValue): string {
	let color = '';
	if (mappedType.includes('XP')) color = 'text-green-500';
	if (mappedType.includes('HP')) color = 'text-red-500';
	if (mappedType.includes('MP')) color = 'text-blue-500';
	if (mappedType.includes('LEVEL')) color = 'text-green-500';
	if (mappedType.includes('SKILL')) color = 'text-green-500';
	if (!color) {
		const foundResourceEntry = Object.entries(resources).find((res) => {
			const processedKey = res[0]?.replaceAll('_', ' ').toUpperCase();
			return processedKey?.includes(mappedType.toUpperCase());
		});

		const foundResourceValue = foundResourceEntry ? foundResourceEntry[1] : undefined;
		if (foundResourceValue) {
			color = foundResourceValue.game_ends_when_zero ? 'text-red-500' : 'text-blue-500';
		}
	}
	return color;
}

export function formatItemId(item_id: string): string {
	return item_id.replaceAll('_id', '').replaceAll('_', ' ');
}

export function isEnoughResource(
	action: Action,
	resources: ResourcesWithCurrentValue,
	inventory: InventoryState
): boolean {
	const cost = parseInt(action.resource_cost?.cost as unknown as string) || 0;
	if (cost === 0) {
		return true;
	}
	const resourceKey = Object.keys(resources).find(
		(key) => key.toLowerCase() === action.resource_cost?.resource_key?.toLowerCase()
	);
	let inventoryKey: string | undefined = undefined;
	if (!resourceKey) {
		inventoryKey = Object.keys(inventory).find(
			(key) => key.toLowerCase() === action.resource_cost?.resource_key?.toLowerCase()
		);
		return !!inventoryKey;
	}
	return resources[resourceKey || '']?.current_value >= cost;
}
