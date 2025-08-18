<script lang="ts">
	import type { Action, GameActionState, InventoryState } from '$lib/ai/agents/gameAgent';
	import { getTextForActionButton } from '$lib/util.svelte';
	import { mustRollDice, isEnoughResource } from '../../../routes/game/gameLogic';

	export let actions: Action[] = [];
	export let currentGameActionState: GameActionState;
	export let sendAction: (action: Action, rollDice?: boolean) => void;
	export let isGameEnded: boolean;
	export let playerResources: Record<string, any>; // resources for current player
	export let inventoryState: InventoryState;

	const handleClick = (action: Action) => {
		sendAction(action, mustRollDice(action, currentGameActionState.is_character_in_combat));
	};
</script>

{#if !isGameEnded}
	<div class="mt-2 p-4 pb-0 pt-0">
		{#each actions as action (action.text + action.type)}
			<button
				class="text-md ai-gen-action btn btn-neutral mb-3 w-full btn-md"
				disabled={!isEnoughResource(action, playerResources, inventoryState)}
				onclick={() => handleClick(action)}>{getTextForActionButton(action)}</button
			>
		{/each}
	</div>
{/if}

<style>
	.btn {
		height: auto;
		padding: 1rem;
	}
</style>
