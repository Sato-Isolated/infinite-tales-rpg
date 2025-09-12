/**
 * Optimized Game State Manager using modern Svelte 5 patterns
 * Decomposes the large state management from the main component
 * Uses SvelteMap/SvelteSet for better reactivity where appropriate
 */

import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import type { Action } from '$lib/types/playerAction';
import type { GameActionState } from '$lib/types/gameState';
import type { InventoryState } from '$lib/types/inventory';
import type { PlayerCharactersGameState, PlayerCharactersIdToNamesMap } from '$lib/types/players';
import type { CharacterStats, NPCState } from '$lib/ai/agents/characterStatsAgent';
import type { CharacterDescription } from '$lib/ai/agents/characterAgent';
import type { Story } from '$lib/ai/agents/storyAgent';
import type { LLMMessage } from '$lib/ai/llm';
import type { ThoughtsState } from '$lib/util.svelte';
import { useHybridLocalStorage } from './hybrid/useHybridLocalStorage.svelte';

export interface GameStateManager {
	// Core game state
	gameActions: ReturnType<typeof useHybridLocalStorage<GameActionState[]>>;
	characterActions: ReturnType<typeof useHybridLocalStorage<Action[]>>;
	historyMessages: ReturnType<typeof useHybridLocalStorage<LLMMessage[]>>;
	character: ReturnType<typeof useHybridLocalStorage<CharacterDescription>>;
	characterStats: ReturnType<typeof useHybridLocalStorage<CharacterStats>>;
	story: ReturnType<typeof useHybridLocalStorage<Story>>;
	thoughts: ReturnType<typeof useHybridLocalStorage<ThoughtsState>>;

	// Player and NPC state
	playerCharactersGame: ReturnType<typeof useHybridLocalStorage<PlayerCharactersGameState>>;
	playerCharactersIdToNames: ReturnType<typeof useHybridLocalStorage<PlayerCharactersIdToNamesMap>>;
	npcs: ReturnType<typeof useHybridLocalStorage<NPCState>>;
	inventory: ReturnType<typeof useHybridLocalStorage<InventoryState>>;

	// Derived state
	currentGameAction: GameActionState;
	playerCharacterId: string;
	isGameStarted: boolean;

	// Actions
	resetGame: () => void;
	updateCharacterStats: (updater: (stats: CharacterStats) => CharacterStats) => void;
	addGameAction: (action: GameActionState) => void;
}

export function createGameStateManager(initialStates: {
	characterState: any;
	characterStatsState: any;
	storyState: any;
	thoughtsState: any;
}): GameStateManager {
	// Initialize all state using the optimized useHybridLocalStorage
	const gameActions = useHybridLocalStorage<GameActionState[]>('gameActionsState', []);
	const characterActions = useHybridLocalStorage<Action[]>('characterActionsState', []);
	const historyMessages = useHybridLocalStorage<LLMMessage[]>('historyMessagesState', []);
	const character = useHybridLocalStorage<CharacterDescription>(
		'characterState',
		initialStates.characterState
	);
	const characterStats = useHybridLocalStorage<CharacterStats>(
		'characterStatsState',
		initialStates.characterStatsState
	);
	const story = useHybridLocalStorage<Story>('storyState', initialStates.storyState);
	const thoughts = useHybridLocalStorage<ThoughtsState>('thoughtsState', initialStates.thoughtsState);

	const playerCharactersGame = useHybridLocalStorage<PlayerCharactersGameState>(
		'playerCharactersGameState',
		{}
	);
	const playerCharactersIdToNames = useHybridLocalStorage<PlayerCharactersIdToNamesMap>(
		'playerCharactersIdToNamesMapState',
		{}
	);
	const npcs = useHybridLocalStorage<NPCState>('npcState', {});
	const inventory = useHybridLocalStorage<InventoryState>('inventoryState', {});

	// Derived state using $derived for optimal performance
	const currentGameAction = $derived(
		(gameActions.value && gameActions.value[gameActions.value.length - 1]) ||
		({} as GameActionState)
	);

	const playerCharacterId = $derived.by(() => {
		const names = playerCharactersIdToNames.value;
		const characterName = character.value.name;
		for (const [id, nameArray] of Object.entries(names)) {
			if (Array.isArray(nameArray) && nameArray.includes(characterName)) {
				return id;
			}
		}
		return '';
	});

	const isGameStarted = $derived(gameActions.value.length > 0);

	// Optimized action methods
	const resetGame = () => {
		gameActions.reset();
		characterActions.reset();
		historyMessages.reset();
		thoughts.reset();
		// Don't reset character and story as they might be reused
	};

	const updateCharacterStats = (updater: (stats: CharacterStats) => CharacterStats) => {
		characterStats.update(updater);
	};

	const addGameAction = (action: GameActionState) => {
		gameActions.update((current) => [...current, action]);
	};

	return {
		// State
		gameActions,
		characterActions,
		historyMessages,
		character,
		characterStats,
		story,
		thoughts,
		playerCharactersGame,
		playerCharactersIdToNames,
		npcs,
		inventory,

		// Derived
		currentGameAction,
		playerCharacterId,
		isGameStarted,

		// Actions
		resetGame,
		updateCharacterStats,
		addGameAction
	};
}


