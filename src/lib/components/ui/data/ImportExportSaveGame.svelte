<script lang="ts">
	import { useHybridLocalStorage } from '$lib/state/hybrid/useHybridLocalStorage.svelte';
	import { downloadHybridStorageAsJson, importJsonFromFile } from '$lib/util.svelte';
	import type { Snippet } from 'svelte';
	import { migrateIfApplicable } from '$lib/state/versionMigration';
	import type { RelatedStoryHistory } from '$lib/ai/agents/summaryAgent';
	import { UndoManager } from '$lib/state/undoManager';
	import { initialSystemInstructionsState, type SystemInstructionsState } from '$lib/ai/llm';

	let {
		isSaveGame,
		exportButton,
		importButton,
		onImportComplete
	}: {
		isSaveGame: boolean;
		exportButton: Snippet<[() => void]>;
		importButton: Snippet<[() => void]>;
		onImportComplete?: () => void;
	} = $props();
	const storyState = useHybridLocalStorage('storyState');
	// campaign removed
	const characterState = useHybridLocalStorage('characterState');
	const characterStatsState = useHybridLocalStorage('characterStatsState');
	const systemInstructionsState = useHybridLocalStorage<SystemInstructionsState>(
		'systemInstructionsState',
		initialSystemInstructionsState
	);
	const difficultyState = useHybridLocalStorage('difficultyState');
	const useKarmicDice = useHybridLocalStorage('useKarmicDice');
	const useDynamicCombat = useHybridLocalStorage('useDynamicCombat');
	const relatedStoryHistoryState = useHybridLocalStorage<RelatedStoryHistory>(
		'relatedStoryHistoryState',
		{ relatedDetails: [] }
	);
	const relatedActionHistoryState = useHybridLocalStorage<string[]>(
		'relatedActionHistoryState',
		[]
	);

	const importSettings = () => {
		importJsonFromFile((parsed: any) => {
			parsed.characterStatsState = migrateIfApplicable(
				'characterStatsState',
				parsed.characterStatsState
			);
			relatedStoryHistoryState.reset();
			relatedActionHistoryState.reset();

			// Clear undo stack and conversation state when importing settings/save game
			UndoManager.clearUndoStack();

			// Clear conversation state
			try {
				localStorage.removeItem('conversationState');
			} catch (error) {
				console.warn('Failed to clear conversation state during import:', error);
			}

			if (isSaveGame) {
				Object.keys(parsed).forEach((key) => {
					const state = migrateIfApplicable(key, parsed[key]);
					localStorage.setItem(key, JSON.stringify(state));
				});
				alert('Import successfull.');
				// For save games, still reload as it's a full game state restoration
				window.location.reload();
			} else {
				// campaign removed
				storyState.value = parsed.storyState;
				characterState.value = parsed.characterState;
				characterStatsState.value = parsed.characterStatsState;
				systemInstructionsState.value =
					parsed.systemInstructionsState || initialSystemInstructionsState;
				//settings
				difficultyState.value = parsed.difficultyState;
				useKarmicDice.value = parsed.useKarmicDice;
				useDynamicCombat.value = parsed.useDynamicCombat;

				// Call callback instead of reloading for settings import
				if (onImportComplete) {
					onImportComplete();
				}
			}
		});
	};

	async function handleExport() {
		// Flush pending debounced saves to ensure Mongo/localStorage has latest
		try {
			await Promise.all([
				storyState.forceSave(),
				characterState.forceSave(),
				characterStatsState.forceSave(),
				systemInstructionsState.forceSave(),
				difficultyState.forceSave(),
				useKarmicDice.forceSave(),
				useDynamicCombat.forceSave(),
				relatedStoryHistoryState.forceSave(),
				relatedActionHistoryState.forceSave()
			]);
		} catch (e) {
			console.warn('Some values could not be flushed before export, proceeding anyway:', e);
		}
		await downloadHybridStorageAsJson();
	}
</script>

{@render exportButton(handleExport)}
{@render importButton(importSettings)}
