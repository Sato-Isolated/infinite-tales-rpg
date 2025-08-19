<script lang="ts">
	import type { Action, GameActionState, InventoryState } from '$lib/ai/agents/gameAgent';
	import { getTextForActionButton } from '$lib/util.svelte';
	import { mustRollDice, isEnoughResource } from '../../../routes/game/gameLogic';
	import RegenerateActionsButton from './RegenerateActionsButton.svelte';

	export let actions: Action[] = [];
	export let currentGameActionState: GameActionState;
	export let sendAction: (action: Action, rollDice?: boolean) => void;
	export let isGameEnded: boolean;
	export let playerResources: Record<string, any>; // resources for current player
	export let inventoryState: InventoryState;
	export let regenerateActions: (() => Promise<void>) | undefined = undefined;

	const handleClick = (action: Action) => {
		sendAction(action, mustRollDice(action, currentGameActionState.is_character_in_combat));
	};
</script>

{#if !isGameEnded}
	<div class="mt-2 p-4 pt-0 pb-0">
		{#each actions as action, index ((action.text || 'unknown') + '_' + (action.type || 'action') + '_' + index)}
			{#if index === 0 && regenerateActions}
				<div class="flex gap-2 mb-3">
					<button
						class="text-md ai-gen-action btn btn-neutral btn-md flex-1"
						disabled={!isEnoughResource(action, playerResources, inventoryState)}
						onclick={() => handleClick(action)}>{getTextForActionButton(action)}</button
					>
					<RegenerateActionsButton 
						regenerateActions={regenerateActions}
						variant="ghost"
						size="md"
						iconOnly={true}
					/>
				</div>
			{:else}
				<button
					class="text-md ai-gen-action btn btn-neutral btn-md mb-3 w-full"
					disabled={!isEnoughResource(action, playerResources, inventoryState)}
					onclick={() => handleClick(action)}>{getTextForActionButton(action)}</button
				>
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
