<script lang="ts">
	import { type CharacterStats } from '$lib/ai/agents/characterStatsAgent';
	import { onMount } from 'svelte';
	import { LLMProvider } from '$lib/ai/llmProvider';
	import { useHybridLocalStorage } from '$lib/state/hybrid/useHybridLocalStorage.svelte';
	import { type CharacterDescription } from '$lib/ai/agents/characterAgent';
	import type { LLMMessage } from '$lib/ai/llm';
	import type { Story } from '$lib/ai/agents/storyAgent';
	import { ActionAgent } from '$lib/ai/agents/actionAgent';
	import type { Action } from '$lib/types/action';
	import type { GameActionState } from '$lib/types/actions';
	import type { InventoryState, ItemWithId } from '$lib/types/inventory';
	import type { ResourcesWithCurrentValue } from '$lib/types/resources';
	import { getTextForActionButton } from '$lib/util.svelte';
	import { isEnoughResource } from '$lib/game/logic/gameLogic';
	import LoadingIcon from '$lib/components/ui/loading/LoadingIcon.svelte';
	import type { AIConfig } from '$lib';
	import { getSafetyLevelFromStory } from '$lib/ai/config/contentRatingToSafety';

	let {
		onclose,
		currentGameActionState,
		resources,
		itemForSuggestActionsState
	}: {
		onclose?: (
			action?: Action | { characterName: string; text: string; is_custom_action: boolean }
		) => void;
		currentGameActionState: GameActionState;
		resources: ResourcesWithCurrentValue;
		itemForSuggestActionsState: ItemWithId;
	} = $props();

	const storyState = useHybridLocalStorage<Story>('storyState');
	const characterState = useHybridLocalStorage<CharacterDescription>('characterState');
	const characterStatsState = useHybridLocalStorage<CharacterStats>('characterStatsState');
	const historyMessagesState = useHybridLocalStorage<LLMMessage[]>('historyMessagesState');
	const inventoryState = useHybridLocalStorage<InventoryState>('inventoryState', {});
	const additionalActionInputState = useHybridLocalStorage<string>(
		'additionalActionInputState',
		''
	);

	const apiKeyState = useHybridLocalStorage<string>('apiKeyState', '');
	const aiLanguage = useHybridLocalStorage<string>('aiLanguage');
	const temperatureState = useHybridLocalStorage<number>('temperatureState');
	const customSystemInstruction = useHybridLocalStorage<string>('customSystemInstruction');
	const customActionAgentInstruction = useHybridLocalStorage<string>(
		'customActionAgentInstruction'
	);
	const aiConfigState = useHybridLocalStorage<AIConfig>('aiConfigState');
	let thoughtsState = $state('');
	let suggestedActions: Array<Action> = $state([]);
	let customActionInput: string = $state('');

	let isGeneratingState = $state(false);
	let actionAgent: ActionAgent;

	onMount(async () => {
		const llm = LLMProvider.provideLLM(
			{
				temperature: temperatureState.value,
				language: aiLanguage.value,
				apiKey: apiKeyState.value
			},
			getSafetyLevelFromStory(storyState.value), // Use tale's content rating
			aiConfigState.value?.useFallbackLlmState
		);
		actionAgent = new ActionAgent(llm);

		isGeneratingState = true;
		const { thoughts, actions } = await actionAgent.generateActionsForItem(
			itemForSuggestActionsState,
			currentGameActionState,
			historyMessagesState.value,
			storyState.value,
			characterState.value,
			characterStatsState.value,
			inventoryState.value,
			currentGameActionState.is_character_restrained_explanation,
			customSystemInstruction.value,
			customActionAgentInstruction.value,
			true,
			additionalActionInputState.value
		);
		console.log('suggestedActions', actions);
		thoughtsState = thoughts;
		suggestedActions = actions;
		isGeneratingState = false;
	});
</script>

<dialog open class="modal z-100" style="background: rgba(0, 0, 0, 0.3);">
	<div class="modal-box flex flex-col items-center text-center">
		<span class="m-auto font-bold">Suggested Actions</span>
		<button
			onclick={() => onclose?.()}
			class="btn btn-circle btn-ghost btn-sm absolute top-2 right-2">✕</button
		>
		{#if isGeneratingState}
			<div class="mt-2 flex flex-col">
				<span class="m-auto">Generating actions...</span>
				<div class="m-auto">
					<LoadingIcon />
				</div>
			</div>
		{:else}
			<details
				class="collapse-arrow textarea bg-base-200 textarea-md collapse mt-4 overflow-y-scroll border"
			>
				<summary class="collapse-title capitalize">
					<p>Thoughts</p>
				</summary>
				<p>{thoughtsState}</p>
			</details>
			{#each suggestedActions as action}
				<button
					type="button"
					disabled={!isEnoughResource(action, resources, inventoryState.value)}
					class="components btn btn-neutral no-animation btn-md mt-2 w-full"
					onclick={() => onclose?.(action)}
				>
					{getTextForActionButton(action)}
				</button>
			{/each}
		{/if}
		<div class="lg:join mt-4 w-full">
			<input
				type="text"
				bind:value={customActionInput}
				class="input input-md w-full"
				id="user-input"
				placeholder="Custom action for item"
			/>
			<button
				type="submit"
				onclick={() =>
					onclose?.({
						characterName: characterState.value.name,
						text: 'Use item ' + itemForSuggestActionsState.item_id + ' - ' + customActionInput,
						is_custom_action: true
					})}
				class="btn btn-neutral btn-md w-full lg:w-1/4"
				id="submit-button"
				>Submit
			</button>
		</div>
	</div>
</dialog>
