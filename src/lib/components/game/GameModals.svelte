<script lang="ts">
	import type { ModalManager } from '../../../routes/game/modalManager.svelte';
	import type {
		GameActionState,
		PlayerCharactersGameState,
		InventoryState
	} from '$lib/ai/agents/gameAgent';
	import type { Ability, CharacterStats, NPCState } from '$lib/ai/agents/characterStatsAgent';
	import type { EventEvaluation } from '$lib/ai/agents/eventAgent';
	import type { Action } from '$lib/ai/agents/gameAgent';
	import { errorState } from '$lib/state/errorState.svelte';
	import type { Story } from '$lib/ai/agents/storyAgent';
	import { getCurrentCharacterGameState } from '../../../routes/game/gameStateUtils';

	// Import modal components
	import LoadingModal from '$lib/components/LoadingModal.svelte';
	import ErrorDialog from '$lib/components/interaction_modals/ErrorModal.svelte';
	import ImpossibleActionModal from '$lib/components/interaction_modals/ImpossibleActionModal.svelte';
	import GMQuestionModal from '$lib/components/interaction_modals/GMQuestionModal.svelte';
	import CharacterChangedConfirmationModal from '$lib/components/interaction_modals/CharacterChangedConfirmationModal.svelte';
	import NewAbilitiesConfirmatonModal from '$lib/components/interaction_modals/character/NewAbilitiesConfirmatonModal.svelte';
	import UseSpellsAbilitiesModal from '$lib/components/interaction_modals/UseSpellsAbilitiesModal.svelte';
	import UseItemsModal from '$lib/components/interaction_modals/UseItemsModal.svelte';
	import SuggestedActionsModal from '$lib/components/interaction_modals/SuggestedActionsModal.svelte';
	import LevelUpModal from '$lib/components/interaction_modals/LevelUpModal.svelte';
	import UtilityModal from '$lib/components/interaction_modals/UtilityModal.svelte';
	import DiceRollComponent from '$lib/components/interaction_modals/dice/DiceRollComponent.svelte';
	import SimpleDiceRoller from '$lib/components/interaction_modals/dice/SimpleDiceRoller.svelte';

	// Props
	interface Props {
		isAiGeneratingState: boolean;
		modalManager: ModalManager;
		currentGameActionState: GameActionState;
		playerCharactersGameState: PlayerCharactersGameState;
		playerCharactersIdToNamesMapState: Record<string, any>;
		characterName: string;
		characterStatsState: CharacterStats;
		inventoryState: InventoryState;
		storyState: Story;
		eventEvaluationState: EventEvaluation;
		chosenActionState: Action;
		didAIProcessDiceRollActionState: boolean;
		// Event handlers
		handleAIError: () => void;
		handleImpossibleAction: (tryAnyway: boolean) => Promise<void>;
		handleGMQuestionClosed: (closedByPlayer: boolean, gmAnswerStateAsContext?: any) => void;
		confirmCharacterChangeEvent: (changedInto: any, confirmed: boolean) => void;
		confirmAbilitiesLearned: (abilities?: Ability[]) => void;
		handleTargetedSpellsOrAbility: (action: any, targets: string[]) => void;
		onDeleteItem: (item: any) => void;
		handleCustomActionSubmit: (text: string, isAction: boolean) => void;
		handleItemUseChosen: (item?: any) => void;
		handleSuggestItemActionClosed: () => void;
		handleLevelUpModalClosed: (levelUp?: any) => void;
		handleUtilityAction: (action: any) => void;
		handleCustomDiceRollClosed: () => void;
		getEventToConfirm: (event: any) => any;
	}

	let {
		isAiGeneratingState,
		modalManager,
		currentGameActionState,
		playerCharactersGameState,
		playerCharactersIdToNamesMapState,
		characterName,
		characterStatsState,
		inventoryState,
		storyState,
		eventEvaluationState,
		chosenActionState,
		didAIProcessDiceRollActionState,
		handleAIError,
		handleImpossibleAction,
		handleGMQuestionClosed,
		confirmCharacterChangeEvent,
		confirmAbilitiesLearned,
		handleTargetedSpellsOrAbility,
		onDeleteItem,
		handleCustomActionSubmit,
		handleItemUseChosen,
		handleSuggestItemActionClosed,
		handleLevelUpModalClosed,
		handleUtilityAction,
		handleCustomDiceRollClosed,
		getEventToConfirm
	}: Props = $props();

	// Utility player actions import
	import { utilityPlayerActions } from '../../../routes/game/gameLogic';
</script>

{#if isAiGeneratingState}
	<LoadingModal></LoadingModal>
{/if}

{#if errorState.userMessage && errorState.code != 'memory_retrieval'}
	<ErrorDialog onclose={handleAIError} />
{/if}

{#if modalManager.hasCustomActionImpossibleReason}
	<ImpossibleActionModal action={chosenActionState} onclose={handleImpossibleAction} />
{/if}

{#if modalManager.hasGMQuestion}
	<GMQuestionModal
		onclose={handleGMQuestionClosed}
		question={modalManager.gmQuestionState}
		{playerCharactersGameState}
	/>
{/if}

{#if eventEvaluationState.character_changed?.showEventConfirmationDialog && !eventEvaluationState.character_changed?.aiProcessingComplete}
	<CharacterChangedConfirmationModal
		onclose={(confirmed: boolean) =>
			confirmCharacterChangeEvent(eventEvaluationState.character_changed!, confirmed)}
		eventToConfirm={getEventToConfirm(eventEvaluationState.character_changed)}
	/>
{/if}

{#if eventEvaluationState.abilities_learned?.showEventConfirmationDialog && !eventEvaluationState.abilities_learned?.aiProcessingComplete}
	<NewAbilitiesConfirmatonModal
		spells_abilities={eventEvaluationState.abilities_learned?.abilities || []}
		onclose={(confirmedAbilities?: Ability[]) => confirmAbilitiesLearned(confirmedAbilities)}
	/>
{/if}

<UseSpellsAbilitiesModal
	bind:dialogRef={modalManager.useSpellsAbilitiesModal}
	playerName={characterName}
	resources={playerCharactersGameState[Object.keys(playerCharactersGameState)[0]] || {}}
	abilities={characterStatsState?.spells_and_abilities}
	storyImagePrompt={storyState.general_image_prompt}
	targets={currentGameActionState.currently_present_npcs}
	onclose={handleTargetedSpellsOrAbility}
></UseSpellsAbilitiesModal>

<UseItemsModal
	bind:dialogRef={modalManager.useItemsModal}
	{onDeleteItem}
	playerName={characterName}
	{inventoryState}
	storyImagePrompt={storyState.general_image_prompt}
	oncrafting={(craftingPrompt) => {
		if (craftingPrompt) {
			handleCustomActionSubmit(craftingPrompt, true);
		}
	}}
	onclose={handleItemUseChosen}
></UseItemsModal>

{#if modalManager.hasItemSuggestions && modalManager.itemForSuggestActionsState}
	<SuggestedActionsModal
		onclose={handleSuggestItemActionClosed}
		resources={getCurrentCharacterGameState(
			playerCharactersGameState,
			playerCharactersIdToNamesMapState,
			characterName
		)}
		itemForSuggestActionsState={modalManager.itemForSuggestActionsState}
		{currentGameActionState}
	/>
{/if}

{#if modalManager.shouldShowLevelUpDialog}
	<LevelUpModal onclose={handleLevelUpModalClosed} />
{/if}

<UtilityModal
	bind:dialogRef={modalManager.utilityModal}
	is_character_in_combat={currentGameActionState.is_character_in_combat}
	actions={utilityPlayerActions}
	onclose={(action) => handleUtilityAction(action)}
/>

<DiceRollComponent
	bind:diceRollDialog={modalManager.diceRollDialog as HTMLDialogElement}
	action={chosenActionState}
	resetState={didAIProcessDiceRollActionState}
></DiceRollComponent>

{#if modalManager.hasCustomDiceRoll}
	<SimpleDiceRoller
		onClose={handleCustomDiceRollClosed}
		notation={modalManager.customDiceRollNotation}
	/>
{/if}
