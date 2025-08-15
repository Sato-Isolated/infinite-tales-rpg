<script lang="ts">
	export let levelUpEnabled: boolean;
	export let onContinue: () => void;
	export let onLevelUp: () => void;
	export let transformPending: boolean;
	export let transformLabel: string | undefined;
	export let onTransform: () => void;
	export let abilitiesPending: boolean;
	export let onLearnAbilities: () => void;
	export let onOpenSpells: () => void;
	export let onOpenInventory: () => void;
	export let onOpenUtility: () => void;
	// When busy (AI generating), disable interactive buttons to prevent duplicate actions
	export let busy: boolean = false;
</script>

<div id="static-actions" class="p-4 pb-0 pt-0">
	<button
		onclick={onContinue}
		class="text-md btn btn-neutral mb-3 w-full"
		disabled={busy}
		aria-disabled={busy}>Continue The Tale.</button
	>
	{#if levelUpEnabled}
		<button
			onclick={onLevelUp}
			class="text-md btn btn-success mb-3 w-full"
			disabled={busy}
			aria-disabled={busy}>Level up!</button
		>
	{/if}
	{#if transformPending}
		<button
			onclick={onTransform}
			class="text-md btn btn-success mb-3 w-full"
			disabled={busy}
			aria-disabled={busy}>Transform into {transformLabel}</button
		>
	{/if}
	{#if abilitiesPending}
		<button
			onclick={onLearnAbilities}
			class="text-md btn btn-success mb-3 w-full"
			disabled={busy}
			aria-disabled={busy}>Learn new Spells & Abilities</button
		>
	{/if}
	<button
		onclick={onOpenSpells}
		class="text-md btn btn-primary w-full"
		disabled={busy}
		aria-disabled={busy}>Spells & Abilities</button
	>
	<button
		onclick={onOpenInventory}
		class="text-md btn btn-primary mt-3 w-full"
		disabled={busy}
		aria-disabled={busy}>Inventory</button
	>
	<button
		onclick={onOpenUtility}
		class="text-md btn btn-primary mt-3 w-full"
		disabled={busy}
		aria-disabled={busy}>Utility</button
	>
</div>
