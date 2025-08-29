<script lang="ts">
	import { canPerformUndo, performUndo, getLastActionInfo } from '$lib/state/gameActionHelper';

	// Use modern Svelte 5 $props() pattern
	interface Props {
		levelUpEnabled: boolean;
		handleContinue: () => void;
		handleLevelUp: () => void;
		transformPending: boolean;
		transformLabel: string | undefined;
		handleTransform: () => void;
		abilitiesPending: boolean;
		handleLearnAbilities: () => void;
		handleOpenSpells: () => void;
		handleOpenInventory: () => void;
		handleOpenUtility: () => void;
		// When busy (AI generating), disable interactive buttons to prevent duplicate actions
		busy?: boolean;
	}

	const {
		levelUpEnabled,
		handleContinue,
		handleLevelUp,
		transformPending,
		transformLabel,
		handleTransform,
		abilitiesPending,
		handleLearnAbilities,
		handleOpenSpells,
		handleOpenInventory,
		handleOpenUtility,
		busy = false
	}: Props = $props();

	// Undo functionality with French interface
	let undoAvailable = $state(false);
	let lastActionInfo = $state({ canUndo: false, actionId: null as number | null });

	// Check undo availability on component mount and whenever localStorage changes
	const updateUndoState = () => {
		undoAvailable = canPerformUndo();
		lastActionInfo = getLastActionInfo();
	};

	// Update undo state initially and when storage changes
	$effect(() => {
		updateUndoState();

		// Listen for localStorage changes to update undo availability
		const handleStorageChange = () => updateUndoState();
		window.addEventListener('storage', handleStorageChange);

		// Also check periodically for changes made in the same tab
		const interval = setInterval(updateUndoState, 1000);

		return () => {
			window.removeEventListener('storage', handleStorageChange);
			clearInterval(interval);
		};
	});

	const handleUndo = () => {
		if (!undoAvailable || busy) return;

		try {
			const success = performUndo();
			if (success) {
				// Refresh the page to reflect the restored state
				window.location.reload();
			} else {
				console.error("Échec de l'annulation de la dernière action");
			}
		} catch (error) {
			console.error("Erreur lors de l'annulation:", error);
		}
	};
</script>

<div id="static-actions" class="p-4 pt-0 pb-0">
	<button
		onclick={handleContinue}
		class="text-md btn btn-neutral btn-md mb-3 w-full"
		disabled={busy}
		aria-disabled={busy}>Continue The Tale.</button
	>

	<!-- Undo Button - French Interface -->
	{#if undoAvailable}
		<button
			onclick={handleUndo}
			class="text-md btn btn-warning btn-md mb-3 w-full"
			disabled={busy}
			aria-disabled={busy}
			title={lastActionInfo.actionId
				? `Annuler l'action #${lastActionInfo.actionId}`
				: 'Annuler la dernière action'}
		>
			<span class="text-base">↶</span>
			Annuler la dernière action
		</button>
	{/if}

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
