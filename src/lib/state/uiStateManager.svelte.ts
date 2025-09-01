/**
 * Game UI State Manager - Modern Svelte 5 patterns for UI state
 * Separates UI concerns from game logic state
 */

import type { GameTime } from '$lib/types/gameTime';
import type { DiceRollResult } from '$lib/game/logic/diceRollLogic';
import { useHybridLocalStorage } from './hybrid/useHybridLocalStorage.svelte';

export interface UIStateManager {
	// UI State
	isAiGenerating: boolean;
	didAIProcessAction: boolean;
	storyChunk: string;
	showXLastStoryProgressions: number;
	skillsProgressionForCurrentAction: number | undefined;
	customActionReceiver: 'Game Command' | 'Character Action' | 'GM Question' | 'Dice Roll';

	// Persistent UI State
	gameTime: ReturnType<typeof useHybridLocalStorage<GameTime | null>>;
	useDynamicCombat: ReturnType<typeof useHybridLocalStorage<boolean>>;
	ttsVoice: ReturnType<typeof useHybridLocalStorage<string>>;
	didAIProcessDiceRollAction: ReturnType<typeof useHybridLocalStorage<boolean>>;

	// Actions
	setAiGenerating: (value: boolean) => void;
	setDidAIProcessAction: (value: boolean) => void;
	setStoryChunk: (value: string) => void;
	resetShowXLastStoryProgressions: () => void;
	incrementShowXLastStoryProgressions: () => void;
	resetStoryChunk: () => void;
}

export function createUIStateManager(): UIStateManager {
	// Non-persistent UI state using $state
	let isAiGenerating = $state(false);
	let didAIProcessAction = $state(true);
	let storyChunk = $state('');
	let showXLastStoryProgressions = $state(0);
	let skillsProgressionForCurrentAction = $state<number | undefined>(undefined);
	let customActionReceiver = $state<
		'Game Command' | 'Character Action' | 'GM Question' | 'Dice Roll'
	>('Character Action');

	// Persistent UI state using useHybridLocalStorage
	const gameTime = useHybridLocalStorage<GameTime | null>('gameTimeState', null);
	const useDynamicCombat = useHybridLocalStorage<boolean>('useDynamicCombat', false);
	const ttsVoice = useHybridLocalStorage<string>('ttsVoice');
	const didAIProcessDiceRollAction = useHybridLocalStorage<boolean>('didAIProcessDiceRollAction');

	// Action methods
	const setAiGenerating = (value: boolean) => {
		isAiGenerating = value;
	};

	const setDidAIProcessAction = (value: boolean) => {
		didAIProcessAction = value;
	};

	const setStoryChunk = (value: string) => {
		storyChunk = value;
	};

	const resetShowXLastStoryProgressions = () => {
		showXLastStoryProgressions = 0;
	};

	const incrementShowXLastStoryProgressions = () => {
		showXLastStoryProgressions += 1;
	};

	const resetStoryChunk = () => {
		storyChunk = '';
	};

	return {
		// UI State
		get isAiGenerating() {
			return isAiGenerating;
		},
		get didAIProcessAction() {
			return didAIProcessAction;
		},
		get storyChunk() {
			return storyChunk;
		},
		get showXLastStoryProgressions() {
			return showXLastStoryProgressions;
		},
		get skillsProgressionForCurrentAction() {
			return skillsProgressionForCurrentAction;
		},
		set skillsProgressionForCurrentAction(value: number | undefined) {
			skillsProgressionForCurrentAction = value;
		},
		get customActionReceiver() {
			return customActionReceiver;
		},
		set customActionReceiver(
			value: 'Game Command' | 'Character Action' | 'GM Question' | 'Dice Roll'
		) {
			customActionReceiver = value;
		},

		// Persistent UI State
		gameTime,
		useDynamicCombat,
		ttsVoice,
		didAIProcessDiceRollAction,

		// Actions
		setAiGenerating,
		setDidAIProcessAction,
		setStoryChunk,
		resetShowXLastStoryProgressions,
		incrementShowXLastStoryProgressions,
		resetStoryChunk
	};
}
