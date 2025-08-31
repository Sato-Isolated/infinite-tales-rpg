<script lang="ts">
	import { UndoManager } from '$lib/state/undoManager';
	import { onMount } from 'svelte';

	let canUndo = $state(false);
	let lastActionId = $state<number | null>(null);

	// Initialize and check undo availability
	onMount(() => {
		checkUndoAvailability();
	});

	/**
	 * Check if undo is available using the new UndoManager system
	 */
	function checkUndoAvailability() {
		try {
			const undoInfo = UndoManager.getUndoInfo();
			canUndo = undoInfo.canUndo;
			lastActionId = undoInfo.latestActionId || null;
		} catch (error) {
			console.error('Error checking undo availability:', error);
			canUndo = false;
			lastActionId = null;
		}
	}

	/**
	 * Perform undo operation
	 */
	function handleUndo() {
		if (!canUndo) return;

		try {
			// Enhanced logging before undo
			console.log('🔄 Starting undo operation...');
			const beforeState = UndoManager.exportCurrentState();
			console.log('📊 State before undo:', beforeState);

			const success = UndoManager.smartUndo();
			if (success) {
				console.log('✅ Undo successful - page will refresh to reflect changes');
				// Refresh the page to ensure all components reflect the undone state
				window.location.reload();
			} else {
				console.warn('❌ Undo operation failed');
				
				// Provide user feedback about what went wrong
				const diagnostics = UndoManager.diagnoseUndoConsistency();
				if (diagnostics.issues.length > 0) {
					const issueMsg = diagnostics.issues.join('; ');
					alert(`Impossible d'annuler: ${issueMsg}`);
				} else {
					alert("Impossible d'annuler la dernière action");
				}
			}
		} catch (error) {
			console.error('❌ Error during undo:', error);
			alert("Erreur lors de l'annulation");
		}
	}

	/**
	 * Save a snapshot before an action (call this before any game action)
	 */
	export function saveSnapshot(): void {
		UndoManager.saveSnapshot('Manual snapshot');
		// Refresh undo availability after saving
		setTimeout(checkUndoAvailability, 100);
	}

	// Refresh undo availability when localStorage changes
	if (typeof window !== 'undefined') {
		window.addEventListener('storage', checkUndoAvailability);

		// Also check periodically for changes (in case same tab modifies storage)
		const interval = setInterval(checkUndoAvailability, 2000);

		// Cleanup
		onMount(() => {
			return () => {
				window.removeEventListener('storage', checkUndoAvailability);
				clearInterval(interval);
			};
		});
	}
</script>

<div class="undo-controls">
	<button
		class="btn btn-secondary btn-sm"
		class:btn-disabled={!canUndo}
		onclick={handleUndo}
		disabled={!canUndo}
		aria-label="Annuler la dernière action"
		title={canUndo ? `Annuler l'action ${lastActionId}` : 'Aucune action à annuler'}
	>
		<span class="text-lg">↶</span>
		Annuler
		{#if lastActionId !== null}
			<span class="text-xs opacity-70">#{lastActionId}</span>
		{/if}
	</button>

	{#if canUndo}
		<div class="text-base-content/60 mt-1 text-xs">
			Dernière action: #{lastActionId}
		</div>
	{/if}
</div>

<style>
	.undo-controls {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}
</style>
