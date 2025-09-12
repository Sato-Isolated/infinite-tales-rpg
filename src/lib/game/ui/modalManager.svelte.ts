import type { Action } from '$lib/types/playerAction';
import type { Item } from '$lib/types/inventory';
import type { CharacterChangedInto } from '$lib/ai/agents/eventAgent';
import type { Ability, AiLevelUp } from '$lib/ai/agents/characterStatsAgent';
import { useHybridLocalStorage } from '$lib/state/hybrid/useHybridLocalStorage.svelte';

/**
 * Modal Manager - Centralized modal state management
 * Following copilot instructions: Extract complex logic from components
 */

export interface ModalState {
	// Dialog references
	diceRollDialog?: HTMLDialogElement;
	useSpellsAbilitiesModal?: any;
	useItemsModal?: any;
	utilityModal?: any;

	// Modal state
	customActionImpossibleReasonState: 'not_enough_resource' | 'not_plausible' | undefined;
	gmQuestionState: string;
	customDiceRollNotation: string;
	itemForSuggestActionsState?: Item & { item_id: string };
	levelUpState: {
		buttonEnabled: boolean;
		dialogOpened: boolean;
		playerName: string;
	};
}

export function createModalManager() {
	// Reactive state
	let customActionImpossibleReasonState = $state<
		'not_enough_resource' | 'not_plausible' | undefined
	>(undefined);
	let gmQuestionState = $state<string>('');
	let customDiceRollNotation = $state<string>('');
	let itemForSuggestActionsState = $state<(Item & { item_id: string }) | undefined>();

	const levelUpState = useHybridLocalStorage<{
		buttonEnabled: boolean;
		dialogOpened: boolean;
		playerName: string;
	}>('levelUpState', {
		buttonEnabled: false,
		dialogOpened: false,
		playerName: ''
	});

	// Dialog references
	let diceRollDialog = $state<HTMLDialogElement>();
	let useSpellsAbilitiesModal = $state<any>();
	let useItemsModal = $state<any>();
	let utilityModal = $state<any>();

	// Modal actions
	const openDiceRollDialog = () => {
		if (!diceRollDialog) return;
		diceRollDialog.show();
	};

	const closeDiceRollDialog = () => {
		if (!diceRollDialog) return;
		diceRollDialog.close();
	};

	const openUseSpellsAbilitiesModal = () => {
		if (useSpellsAbilitiesModal?.showModal) {
			useSpellsAbilitiesModal.showModal();
		}
	};

	const openUseItemsModal = () => {
		if (useItemsModal?.showModal) {
			useItemsModal.showModal();
		}
	};

	const openUtilityModal = () => {
		if (utilityModal?.showModal) {
			utilityModal.showModal();
		}
	};

	// State setters
	const setCustomActionImpossibleReason = (
		reason: 'not_enough_resource' | 'not_plausible' | undefined
	) => {
		customActionImpossibleReasonState = reason;
	};

	const setGMQuestion = (question: string) => {
		gmQuestionState = question;
	};

	const setCustomDiceRollNotation = (notation: string) => {
		customDiceRollNotation = notation;
	};

	const setItemForSuggestActions = (item: (Item & { item_id: string }) | undefined) => {
		itemForSuggestActionsState = item;
	};

	const setLevelUpDialogOpened = (opened: boolean) => {
		levelUpState.value = { ...levelUpState.value, dialogOpened: opened };
	};

	const setLevelUpPlayerName = (playerName: string) => {
		levelUpState.value = { ...levelUpState.value, playerName };
	};

	const setLevelUpButtonEnabled = (enabled: boolean) => {
		levelUpState.value = { ...levelUpState.value, buttonEnabled: enabled };
	};

	// Reset functions
	const resetCustomActionStates = () => {
		customActionImpossibleReasonState = undefined;
		customDiceRollNotation = '';
	};

	const resetGMQuestion = () => {
		gmQuestionState = '';
	};

	const resetItemSuggestions = () => {
		itemForSuggestActionsState = undefined;
	};

	const resetLevelUpState = () => {
		levelUpState.value = {
			buttonEnabled: false,
			dialogOpened: false,
			playerName: ''
		};
	};

	// Computed states for UI
	const hasCustomActionImpossibleReason = $derived(!!customActionImpossibleReasonState);
	const hasGMQuestion = $derived(!!gmQuestionState);
	const hasCustomDiceRoll = $derived(!!customDiceRollNotation);
	const hasItemSuggestions = $derived(!!itemForSuggestActionsState);
	const shouldShowLevelUpDialog = $derived(levelUpState.value.dialogOpened);

	return {
		// State getters
		get customActionImpossibleReasonState() {
			return customActionImpossibleReasonState;
		},
		get gmQuestionState() {
			return gmQuestionState;
		},
		get customDiceRollNotation() {
			return customDiceRollNotation;
		},
		get itemForSuggestActionsState() {
			return itemForSuggestActionsState;
		},
		get levelUpState() {
			return levelUpState.value;
		},

		// Dialog refs
		get diceRollDialog() {
			return diceRollDialog;
		},
		set diceRollDialog(dialog: HTMLDialogElement | undefined) {
			diceRollDialog = dialog;
		},
		get useSpellsAbilitiesModal() {
			return useSpellsAbilitiesModal;
		},
		set useSpellsAbilitiesModal(modal: any) {
			useSpellsAbilitiesModal = modal;
		},
		get useItemsModal() {
			return useItemsModal;
		},
		set useItemsModal(modal: any) {
			useItemsModal = modal;
		},
		get utilityModal() {
			return utilityModal;
		},
		set utilityModal(modal: any) {
			utilityModal = modal;
		},

		// Actions
		openDiceRollDialog,
		closeDiceRollDialog,
		openUseSpellsAbilitiesModal,
		openUseItemsModal,
		openUtilityModal,

		// State setters
		setCustomActionImpossibleReason,
		setGMQuestion,
		setCustomDiceRollNotation,
		setItemForSuggestActions,
		setLevelUpDialogOpened,
		setLevelUpPlayerName,
		setLevelUpButtonEnabled,

		// Reset functions
		resetCustomActionStates,
		resetGMQuestion,
		resetItemSuggestions,
		resetLevelUpState,

		// Computed states (getters to preserve reactivity outside this module)
		get hasCustomActionImpossibleReason() {
			return hasCustomActionImpossibleReason;
		},
		get hasGMQuestion() {
			return hasGMQuestion;
		},
		get hasCustomDiceRoll() {
			return hasCustomDiceRoll;
		},
		get hasItemSuggestions() {
			return hasItemSuggestions;
		},
		get shouldShowLevelUpDialog() {
			return shouldShowLevelUpDialog;
		}
	};
}

export type ModalManager = ReturnType<typeof createModalManager>;

