<script lang="ts">
	import type { Action, GameActionState, InventoryState } from '$lib/ai/agents/gameAgent';
	import { getTextForActionButton } from '$lib/util.svelte';
	import { mustRollDice, isEnoughResource } from '../../../routes/game/gameLogic';
	import RegenerateActionsButton from './RegenerateActionsButton.svelte';

	// Use modern Svelte 5 $props() pattern
	interface Props {
		actions?: Action[];
		currentGameActionState: GameActionState;
		sendAction: (action: Action, rollDice?: boolean) => void;
		isGameEnded: boolean;
		playerResources: Record<string, any>;
		inventoryState: InventoryState;
		regenerateActions?: () => Promise<void>;
	}

	const {
		actions = [],
		currentGameActionState,
		sendAction,
		isGameEnded,
		playerResources,
		inventoryState,
		regenerateActions
	}: Props = $props();

	// Derived state for action availability
	const actionAvailability = $derived(
		actions.map((action) => ({
			action,
			isAvailable: isEnoughResource(action, playerResources, inventoryState),
			requiresDice: mustRollDice(action, currentGameActionState.is_character_in_combat)
		}))
	);

	// Optimized event handler using modern patterns
	const handleActionClick = (actionData: { action: Action; requiresDice: boolean }) => {
		sendAction(actionData.action, actionData.requiresDice);
	};
</script>

{#if !isGameEnded}
	<div class="mt-2 p-4 pt-0 pb-0">
		{#each actionAvailability as { action, isAvailable, requiresDice }, index (action.text + '_' + action.type + '_' + index)}
			{#if index === 0 && regenerateActions}
				<div class="mb-3 flex gap-2">
					<button
						class="text-md ai-gen-action btn btn-neutral btn-md hover:bg-neutral-focus
						focus:ring-primary focus:ring-opacity-50 flex-1
						transition-all duration-200 ease-in-out
						hover:scale-105 hover:shadow-lg
						focus:ring-2 active:scale-95 active:shadow-sm
						disabled:hover:scale-100 disabled:hover:shadow-none"
						disabled={!isAvailable}
						onclick={() => handleActionClick({ action, requiresDice })}
					>
						{getTextForActionButton(action)}
					</button>
					<RegenerateActionsButton {regenerateActions} variant="ghost" size="md" iconOnly={true} />
				</div>
			{:else}
				<button
					class="text-md ai-gen-action btn btn-neutral btn-md hover:bg-neutral-focus focus:ring-primary
					focus:ring-opacity-50 mb-3 w-full
					transition-all duration-200 ease-in-out
					hover:scale-105 hover:shadow-lg
					focus:ring-2 active:scale-95 active:shadow-sm
					disabled:hover:scale-100 disabled:hover:shadow-none"
					disabled={!isAvailable}
					onclick={() => handleActionClick({ action, requiresDice })}
				>
					{getTextForActionButton(action)}
				</button>
			{/if}
		{/each}
	</div>
{/if}

<style>
	.btn {
		height: auto;
		padding: 1rem;
	}
</style>
