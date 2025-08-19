/**
 * Optimized Game State Manager using modern Svelte 5 patterns
 * Decomposes the large state management from the main component
 * Uses SvelteMap/SvelteSet for better reactivity where appropriate
 */

import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import type {
	Action,
	GameActionState,
	InventoryState,
	PlayerCharactersGameState,
	PlayerCharactersIdToNamesMap
} from '$lib/ai/agents/gameAgent';
import type { CharacterStats, NPCState } from '$lib/ai/agents/characterStatsAgent';
import type { CharacterDescription } from '$lib/ai/agents/characterAgent';
import type { Story } from '$lib/ai/agents/storyAgent';
import type { LLMMessage } from '$lib/ai/llm';
import type { ThoughtsState } from '$lib/util.svelte';
import { useLocalStorage } from './useLocalStorage.svelte';

export interface GameStateManager {
	// Core game state
	gameActions: ReturnType<typeof useLocalStorage<GameActionState[]>>;
	characterActions: ReturnType<typeof useLocalStorage<Action[]>>;
	historyMessages: ReturnType<typeof useLocalStorage<LLMMessage[]>>;
	character: ReturnType<typeof useLocalStorage<CharacterDescription>>;
	characterStats: ReturnType<typeof useLocalStorage<CharacterStats>>;
	story: ReturnType<typeof useLocalStorage<Story>>;
	thoughts: ReturnType<typeof useLocalStorage<ThoughtsState>>;

	// Player and NPC state
	playerCharactersGame: ReturnType<typeof useLocalStorage<PlayerCharactersGameState>>;
	playerCharactersIdToNames: ReturnType<typeof useLocalStorage<PlayerCharactersIdToNamesMap>>;
	npcs: ReturnType<typeof useLocalStorage<NPCState>>;
	inventory: ReturnType<typeof useLocalStorage<InventoryState>>;

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
	// Initialize all state using the optimized useLocalStorage
	const gameActions = useLocalStorage<GameActionState[]>('gameActionsState', []);
	const characterActions = useLocalStorage<Action[]>('characterActionsState', []);
	const historyMessages = useLocalStorage<LLMMessage[]>('historyMessagesState', []);
	const character = useLocalStorage<CharacterDescription>(
		'characterState',
		initialStates.characterState
	);
	const characterStats = useLocalStorage<CharacterStats>(
		'characterStatsState',
		initialStates.characterStatsState
	);
	const story = useLocalStorage<Story>('storyState', initialStates.storyState);
	const thoughts = useLocalStorage<ThoughtsState>('thoughtsState', initialStates.thoughtsState);

	const playerCharactersGame = useLocalStorage<PlayerCharactersGameState>(
		'playerCharactersGameState',
		{}
	);
	const playerCharactersIdToNames = useLocalStorage<PlayerCharactersIdToNamesMap>(
		'playerCharactersIdToNamesMapState',
		{}
	);
	const npcs = useLocalStorage<NPCState>('npcState', {});
	const inventory = useLocalStorage<InventoryState>('inventoryState', {});

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
