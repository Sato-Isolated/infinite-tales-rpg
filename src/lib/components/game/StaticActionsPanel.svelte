<script lang="ts">
	export let levelUpEnabled: boolean;
	export let handleContinue: () => void;
	export let handleLevelUp: () => void;
	export let transformPending: boolean;
	export let transformLabel: string | undefined;
	export let handleTransform: () => void;
	export let abilitiesPending: boolean;
	export let handleLearnAbilities: () => void;
	export let handleOpenSpells: () => void;
	export let handleOpenInventory: () => void;
	export let handleOpenUtility: () => void;
	// When busy (AI generating), disable interactive buttons to prevent duplicate actions
	export let busy: boolean = false;
</script>

<div id="static-actions" class="p-4 pt-0 pb-0">
	<button
		onclick={handleContinue}
		class="text-md btn btn-neutral btn-md mb-3 w-full"
		disabled={busy}
		aria-disabled={busy}>Continue The Tale.</button
	>
	{#if levelUpEnabled}
		<button
			onclick={handleLevelUp}
			class="text-md btn btn-success btn-md mb-3 w-full"
			disabled={busy}
			aria-disabled={busy}>Level up!</button
		>
	{/if}
	{#if transformPending}
		<button
			onclick={handleTransform}
			class="text-md btn btn-success btn-md mb-3 w-full"
			disabled={busy}
			aria-disabled={busy}>Transform into {transformLabel}</button
		>
	{/if}
	{#if abilitiesPending}
		<button
			onclick={handleLearnAbilities}
			class="text-md btn btn-success btn-md mb-3 w-full"
			disabled={busy}
			aria-disabled={busy}>Learn new Spells & Abilities</button
		>
	{/if}
	<button
		onclick={handleOpenSpells}
		class="text-md btn btn-primary btn-md w-full"
		disabled={busy}
		aria-disabled={busy}>Spells & Abilities</button
	>
	<button
		onclick={handleOpenInventory}
		class="text-md btn btn-primary btn-md mt-3 w-full"
		disabled={busy}
		aria-disabled={busy}>Inventory</button
	>
	<button
		onclick={handleOpenUtility}
		class="text-md btn btn-primary btn-md mt-3 w-full"
		disabled={busy}
		aria-disabled={busy}>Utility</button
	>
</div>
