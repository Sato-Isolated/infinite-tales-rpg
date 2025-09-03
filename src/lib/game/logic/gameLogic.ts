import {
	type Action,
	type GameActionState,
	type InventoryState,
	type InventoryUpdate,
	type PlayerCharactersGameState,
	type PlayerCharactersIdToNamesMap,
	type RandomEventsHandling,
	type ResourcesWithCurrentValue,
	type Targets
} from '$lib/ai/agents/gameAgent';
import { SLOW_STORY_PROMPT } from '$lib/ai/prompts/shared';
import type { StatsUpdate } from '$lib/ai/agents/combatAgent';
import type { NpcID, NPCState, NPCStats } from '$lib/ai/agents/characterStatsAgent';
import isPlainObject from 'lodash.isplainobject';
import { mapXP } from './levelLogic';
import { getNPCTechnicalID } from '$lib/util.svelte';
import { getCharacterTechnicalId } from './characterLogic';
import { InterruptProbability } from '$lib/ai/agents/actionAgent';
import type { DiceRollResult } from './diceRollLogic';

export enum ActionDifficulty {
	simple = 'simple',
	medium = 'medium',
	difficult = 'difficult',
	very_difficult = 'very_difficult'
}

/**
 * Optimized function to get empty critical resource keys
 * Improved performance with early returns and better error handling
 */
export function getEmptyCriticalResourceKeys(resources: ResourcesWithCurrentValue): string[] {
	// Enhanced safety checks for better performance and reliability
	if (!resources || typeof resources !== 'object' || Object.keys(resources).length === 0) {
		return [];
	}

	const result: string[] = [];

	// Optimized iteration with direct object access
	for (const [key, resource] of Object.entries(resources)) {
		if (resource?.game_ends_when_zero === true && resource.current_value <= 0) {
			result.push(key);
		}
	}

	return result;
}

/**
 * Optimized function to get all targets as a list
 * Improved performance with early returns and null checking
 */
export function getAllTargetsAsList(targets: Targets): Array<string> {
	// Enhanced validation with early return for better performance
	if (!targets || typeof targets !== 'object') {
		return [];
	}

	const result: string[] = [];

	// Safely handle each target category with null checking
	if (Array.isArray(targets.hostile)) {
		result.push(...targets.hostile.map(getNPCTechnicalID));
	}
	if (Array.isArray(targets.neutral)) {
		result.push(...targets.neutral.map(getNPCTechnicalID));
	}
	if (Array.isArray(targets.friendly)) {
		result.push(...targets.friendly.map(getNPCTechnicalID));
	}

	return result;
}

/**
 * Optimized function to get all NPC IDs
 * Improved performance with early returns and null checking
 */
export function getAllNpcsIds(targets: Targets): Array<NpcID> {
	// Enhanced validation with early return for better performance
	if (!targets || typeof targets !== 'object') {
		return [];
	}

	const result: NpcID[] = [];

	// Safely handle each target category with null checking
	if (Array.isArray(targets.hostile)) {
		result.push(...targets.hostile);
	}
	if (Array.isArray(targets.neutral)) {
		result.push(...targets.neutral);
	}
	if (Array.isArray(targets.friendly)) {
		result.push(...targets.friendly);
	}

	return result;
}

export function getNewNPCs(targets: Targets, npcState: NPCState) {
	return getAllNpcsIds(targets).filter(
		(newNPC) => !Object.keys(npcState).includes(newNPC.uniqueTechnicalNameId)
	);
}

/**
 * Optimized constant for dice-rolling action keywords
 * Improves performance by avoiding repeated array creation
 */
const DICE_ROLLING_ACTION_KEYWORDS = ['attempt', 'try', 'seek', 'search', 'investigate'] as const;

/**
 * Optimized constant for action types that require dice rolls
 * Improves performance by avoiding repeated string creation
 */
const DICE_REQUIRED_ACTION_TYPES = new Set([
	'social_manipulation',
	'spell',
	'investigation'
] as const);

/**
 * Optimized function to determine if dice roll is required
 * Improved performance with better logic flow and early returns
 */
export function mustRollDice(action: Action, isInCombat?: boolean): boolean {
	// Early return for invalid action
	if (!action || typeof action !== 'object') {
		return false;
	}

	const diffKey = (action.action_difficulty?.toLowerCase() || '') as keyof typeof ActionDifficulty;
	const difficulty: ActionDifficulty | undefined = ActionDifficulty[diffKey];

	// Early return for simple actions
	if (!difficulty || difficulty === ActionDifficulty.simple) {
		return false;
	}

	const actionText = action.text?.toLowerCase() || '';

	// Early return for continue tale action
	if (actionText === 'continue the tale') {
		return false;
	}

	// Check if action type requires dice roll
	const actionType = action.type?.toLowerCase();
	if (actionType && DICE_REQUIRED_ACTION_TYPES.has(actionType as any)) {
		return true;
	}

	// Check for dice-rolling keywords in action text
	const includesTrying = DICE_ROLLING_ACTION_KEYWORDS.some((keyword) =>
		actionText.includes(keyword)
	);

	// Determine if dice roll is needed based on difficulty and other factors
	return (
		difficulty !== ActionDifficulty.medium ||
		String(action.narration_details || '').includes('HIGH') ||
		isInCombat === true ||
		includesTrying
	);
}

export const getTargetPromptAddition = function (targets: string[]) {
	return '\n I target ' + targets.join(' and ');
};

export function formatItemId(item_id: string) {
	return item_id.replaceAll('_id', '').replaceAll('_', ' ');
}

export type RenderedGameUpdate = { text: string; resourceText: string; color: string };

export function mapStatsUpdateToGameLogic(statsUpdate: StatsUpdate): StatsUpdate {
	if (!statsUpdate?.type) return statsUpdate;
	// Normalize common LLM typos and casing to keep engine tolerant
	let normalized = ('' + statsUpdate.type).trim().toLowerCase();
	// frequent typo in LLM outputs: "loose" instead of "lost"
	normalized = normalized.replaceAll('loose', 'lost');
	// handle alternative wording
	normalized = normalized.replaceAll('_loss', '_lost');
	statsUpdate.type = normalized;

	if (statsUpdate.type.toUpperCase().includes('XP')) {
		mapXP(statsUpdate);
	}
	return statsUpdate;
}

/**
 * Create a canonical representation of resource keys to allow tolerant matching.
 * - Removes diacritics and decomposes ligatures (e.g., Æ -> AE)
 * - Replaces any sequence of non-alphanumeric characters with a single underscore
 * - Trims leading/trailing underscores and uppercases for stable comparison
 */
function canonicalizeKey(input: string | undefined): string {
	if (!input) return '';
	return input
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-zA-Z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
		.toUpperCase();
}

function getColorForStatUpdate(mappedType: string, resources: ResourcesWithCurrentValue) {
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

export function renderStatUpdates(
	statsUpdates: Array<StatsUpdate>,
	resourcesOrPlayerName: ResourcesWithCurrentValue | string,
	playerNamesParam?: Array<string> | string
): (undefined | RenderedGameUpdate)[] {
	if (statsUpdates) {
		// Backward-compatible param handling: tests may call (updates, currentPlayerName)
		const resources: ResourcesWithCurrentValue =
			typeof resourcesOrPlayerName === 'string'
				? ({} as ResourcesWithCurrentValue)
				: resourcesOrPlayerName;
		const playerNames: Array<string> = Array.isArray(playerNamesParam)
			? playerNamesParam
			: typeof playerNamesParam === 'string'
				? [playerNamesParam]
				: typeof resourcesOrPlayerName === 'string'
					? [resourcesOrPlayerName]
					: [];
		const getTarget = (u: any) => (u?.targetName ?? u?.targetId ?? '') as string;
		return statsUpdates
			.toSorted((a, b) => (getTarget(a) < getTarget(b) ? -1 : 1))
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
				const targetName = (statsUpdate as any).targetName ?? (statsUpdate as any).targetId ?? '';
				let responseText: string;
				let resourceText = ('' + statsUpdate.value.result).replaceAll('_', ' ');
				let changeText = statsUpdate.type?.includes('_gained')
					? 'gain'
					: statsUpdate.type?.includes('_lost')
						? 'lose'
						: undefined;

				const mappedType =
					statsUpdate.type
						?.replace('_gained', '')
						.replace('_lost', '')
						.replace('_increased', '')
						.replaceAll('_', ' ')
						.toUpperCase() || '';

				const color = getColorForStatUpdate(
					mappedType,
					resources || ({} as ResourcesWithCurrentValue)
				);

				if (playerNames.includes(targetName)) {
					responseText = 'You ';
					if (!changeText) {
						//probably unhandled status effect
						changeText = 'are';
					}
					if (mappedType.includes('LEVEL')) {
						resourceText = '';
					} else {
						resourceText =
							'' +
							(getTakeLessDamageForManyHits(
								statsUpdates,
								Number.parseInt(statsUpdate.value.result),
								playerNames
							) || resourceText);
					}
				} else {
					responseText = (targetName || '').replaceAll('_', ' ').replaceAll('id', '') + ' ';
					if (!changeText) {
						//probably unhandled status effect
						changeText = 'is';
					} else {
						//third person
						changeText += 's';
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

function getTakeLessDamageForManyHits(
	stats_update: Array<StatsUpdate>,
	damage: number,
	playerNames: Array<string>
) {
	if (damage <= 2) {
		return damage;
	}
	const allPlayerHits = stats_update
		.filter((update: any) => playerNames.includes(update?.targetName ?? update?.targetId))
		.filter((update) => update.type === 'hp_lost');

	return Math.max(1, Math.round(damage / Math.min(3, allPlayerHits?.length || 1)));
}

export function applyGameActionState(
	playerCharactersGameState: PlayerCharactersGameState,
	playerCharactersIdToNamesMapState: PlayerCharactersIdToNamesMap,
	npcState: NPCState,
	inventoryState: InventoryState,
	state: GameActionState,
	prohibitNPCChange = false
) {
	function getResourceIfPresent(resources: ResourcesWithCurrentValue, key: string) {
		if (!key || !resources) return undefined;
		// Fast path: direct and simple case-insensitive lookups
		let resource = resources[key] || resources[key.toUpperCase()];
		if (resource) return resource;
		// Tolerant path: compare canonicalized keys (handles accents, ligatures, spaces vs underscores)
		const wanted = canonicalizeKey(key);
		const matchKey = Object.keys(resources).find((k) => canonicalizeKey(k) === wanted);
		return matchKey ? resources[matchKey] : undefined;
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
				// Support both enum and numbers; mapXP already normalized enums to numbers when possible
				const xpValue = Number.parseInt(statUpdate.value.result) || 0;
				playerCharactersGameState[characterId].XP.current_value += xpValue;
			} else if (statUpdate.type === 'xp_lost') {
				const xpValue = Number.parseInt(statUpdate.value.result) || 0;
				playerCharactersGameState[characterId].XP.current_value -= xpValue;
			} else {
				if (statUpdate.type.includes('_gained')) {
					const resource: string = statUpdate.type.replace('_gained', '');
					const res = getResourceIfPresent(playerCharactersGameState[characterId], resource);
					if (!res) continue;
					let gained = Number.parseInt(statUpdate.value.result) || 0;
					gained = gained > 0 ? gained : 0;
					if ((res.current_value || 0) + gained <= res.max_value) {
						res.current_value = (res.current_value || 0) + gained;
					} else {
						res.current_value = res.max_value;
					}
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
					npc = npcState[statUpdate.targetName];
				}
				if (npc && npc.resources) {
					const result = Number.parseInt(statUpdate.value.result);
					switch (statUpdate.type) {
						case 'hp_gained':
							npc.resources.current_hp += result > 0 ? result : 0;
							break;
						case 'hp_lost':
							npc.resources.current_hp -= result > 0 ? result : 0;
							break;
						case 'mp_gained':
							npc.resources.current_mp += result > 0 ? result : 0;
							break;
						case 'mp_lost':
							npc.resources.current_mp -= result > 0 ? result : 0;
							break;
					}
				}
			}
		}
	}

	applyInventoryUpdate(inventoryState, state);
}

export function applyInventoryUpdate(inventoryState: InventoryState, state: GameActionState) {
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
) {
	for (const state of states) {
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

export function getGameEndedMessage() {
	return 'Your Tale has come to an end...\\nThanks for playing Infinite Tales RPG!\\nYou can start a new Tale in the menu.';
}

export function isEnoughResource(
	action: Action,
	resources: ResourcesWithCurrentValue,
	inventory: InventoryState
): boolean {
	// Defensive programming: handle null/undefined inputs
	if (!action || !resources || !inventory) {
		return false;
	}

	const cost = parseInt(action.resource_cost?.cost as unknown as string) || 0;
	if (cost === 0) {
		return true;
	}
	const wanted = canonicalizeKey(action.resource_cost?.resource_key || '');
	const resourceKey = Object.keys(resources).find((key) => canonicalizeKey(key) === wanted);
	let inventoryKey: string | undefined = undefined;
	if (!resourceKey) {
		inventoryKey = Object.keys(inventory).find((key) => canonicalizeKey(key) === wanted);
		return !!inventoryKey;
	}
	return resources[resourceKey || '']?.current_value >= cost;
}

export function addAdditionsFromActionSideeffects(
	action: Action,
	additionalStoryInput: string,
	randomEventsHandling: RandomEventsHandling,
	is_character_in_combat: boolean,
	diceRollResult: DiceRollResult
) {
	const is_travel = action.type?.toLowerCase().includes('travel');
	const narration_details = JSON.stringify(action.narration_details) || '';
	if (is_travel || narration_details.includes('HIGH') || narration_details.includes('MEDIUM')) {
		additionalStoryInput += '\n' + SLOW_STORY_PROMPT;
	}
	const encounterString = JSON.stringify(action.enemyEncounterExplanation) || '';
	if (encounterString.includes('HIGH') && !encounterString.includes('LOW')) {
		additionalStoryInput += '\nenemyEncounter: ' + encounterString;
	}

	if (randomEventsHandling !== 'none' && diceRollResult !== 'critical_success') {
		const is_interruptible = JSON.stringify(action.is_interruptible) || '';
		const probabilityEnum = getProbabilityEnum(is_interruptible);
		const directly_interrupted =
			probabilityEnum === InterruptProbability.ALWAYS || InterruptProbability.HIGH;
		const travel_interrupted = is_travel && probabilityEnum === InterruptProbability.MEDIUM;

		if (randomEventsHandling === 'ai_decides') {
			if (directly_interrupted || travel_interrupted) {
				additionalStoryInput += `\naction is possibly interrupted: ${is_interruptible} probability.`;
			}
		}
		if (randomEventsHandling === 'probability') {
			//combat is already long enough, dont interrupt often
			const modifier = is_character_in_combat ? 0.5 : 1;
			const randomEventCreated = isRandomEventCreated(probabilityEnum, modifier);
			console.log('randomEventCreated', randomEventCreated);
			if (randomEventCreated) {
				additionalStoryInput += `\naction definitely must be interrupted: ${action.is_interruptible?.reasoning}`;
			}
		}
	}
	return additionalStoryInput;
}

function getProbabilityEnum(probability: string) {
	if (probability.includes('ALWAYS')) {
		return InterruptProbability.ALWAYS;
	}
	if (probability.includes('LOW')) {
		return InterruptProbability.LOW;
	}
	if (probability.includes('MEDIUM')) {
		return InterruptProbability.MEDIUM;
	}
	if (probability.includes('HIGH')) {
		return InterruptProbability.HIGH;
	}
	return InterruptProbability.NEVER;
}

export function isRandomEventCreated(probEnum: InterruptProbability, modifier = 1) {
	const randomEventValue = Math.random();
	console.log('randomEventValue', randomEventValue, probEnum, 'modifier', modifier);
	switch (probEnum) {
		case InterruptProbability.NEVER:
			return false;
		case InterruptProbability.LOW:
			return randomEventValue < 0.05 * modifier;
		case InterruptProbability.MEDIUM:
			return randomEventValue < 0.2 * modifier;
		case InterruptProbability.HIGH:
			return randomEventValue < 0.35 * modifier;
		case InterruptProbability.ALWAYS:
			return true;
		default:
			return false;
	}
}

export const utilityPlayerActions = [
	{
		label: 'Short Rest',
		value: 'short-rest'
	},
	{
		label: 'Long Rest',
		value: 'long-rest'
	}
];
