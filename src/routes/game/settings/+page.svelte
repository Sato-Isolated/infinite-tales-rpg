<script lang="ts">
	import { useLocalStorage } from '$lib/state/useLocalStorage.svelte';
	import { navigate } from '$lib/util.svelte';
	import ImportExportSaveGame from '$lib/components/ui/data/ImportExportSaveGame.svelte';
	import type { Campaign } from '$lib/ai/agents/campaignAgent';
	import GameSettingsModal from '$lib/components/modals/settings/GameSettingsModal.svelte';
	import AiGameSettingsModal from '$lib/components/modals/settings/AiGameSettings.svelte';
	import { createDefaultTime, type GameTime } from '$lib/types/gameTime';
	import { generateStoryAppropriateTime, normalizeGameTime } from '$lib/game/logic/timeLogic';
	import type { CharacterDescription } from '$lib/ai/agents/characterAgent';
	import type { Story } from '$lib/ai/agents/storyAgent';
	import type { GameSettings } from '$lib/ai/agents/gameAgent';
	import type { AIConfig } from '$lib';

	let showGameSettingsModal = $state<boolean>(false);
	let showAiGameSettingsModal = $state<boolean>(false);
	let isRegeneratingTime = $state<boolean>(false);

	const campaignState = useLocalStorage<Campaign>('campaignState');
	const customMemoriesState = useLocalStorage<string>('customMemoriesState');
	const customGMNotesState = useLocalStorage<string>('customGMNotesState');
	const gameTimeState = useLocalStorage<GameTime>('gameTimeState', createDefaultTime());
	const storyState = useLocalStorage<Story>('storyState');
	const characterState = useLocalStorage<CharacterDescription>('characterState');
	const gameSettingsState = useLocalStorage<GameSettings>('gameSettingsState');
	const apiKeyState = useLocalStorage<string>('apiKeyState');
	const aiLanguage = useLocalStorage<string>('aiLanguage');
	const aiConfigState = useLocalStorage<AIConfig>('aiConfigState');
	//TODO migrate all settings that can be changed during game here

	const taleSettingsClicked = () => {
		if (campaignState.value?.chapters.length > 0) {
			navigate('/new/campaign');
		} else {
			navigate('/new/tale');
		}
	};

	const regenerateGameTime = async () => {
		if (!storyState.value || !characterState.value || !apiKeyState.value) {
			alert('Missing story, character or API key configuration');
			return;
		}

		isRegeneratingTime = true;
		try {
			const newGameTime = await generateStoryAppropriateTime(
				storyState.value,
				characterState.value,
				gameSettingsState.value,
				apiKeyState.value,
				aiLanguage.value,
				aiConfigState.value?.useFallbackLlmState
			);
			gameTimeState.value = normalizeGameTime(newGameTime);
			alert(
				`New game time generated: ${newGameTime.dayName} ${newGameTime.day} ${newGameTime.monthName} ${newGameTime.year}, ${newGameTime.hour}:${newGameTime.minute.toString().padStart(2, '0')} (${newGameTime.timeOfDay})`
			);
		} catch (error) {
			console.error('Failed to regenerate time:', error);
			alert('Failed to regenerate time. Check console for details.');
		} finally {
			isRegeneratingTime = false;
		}
	};
</script>

{#if showGameSettingsModal}
	<GameSettingsModal onclose={() => (showGameSettingsModal = false)} />
{/if}
{#if showAiGameSettingsModal}
	<AiGameSettingsModal onclose={() => (showAiGameSettingsModal = false)} />
{/if}
<form class="m-6 flex flex-col items-center text-center">
	<button class="btn btn-neutral btn-md mt-2 w-1/2" onclick={() => (showGameSettingsModal = true)}>
		Game Settings
	</button>
	<button
		class="btn btn-neutral btn-md mt-2 w-1/2"
		onclick={() => (showAiGameSettingsModal = true)}
	>
		AI Settings
	</button>

	<ImportExportSaveGame isSaveGame={true}>
		{#snippet exportButton(onclick)}
			<button {onclick} class="btn btn-neutral btn-md m-auto mt-4 w-1/2"> Export Save Game </button>
		{/snippet}
		{#snippet importButton(onclick)}
			<button {onclick} class="btn btn-neutral btn-md m-auto mt-2 w-1/2"> Import Save Game </button>
		{/snippet}
	</ImportExportSaveGame>
	<button class="btn btn-neutral btn-md mt-2 w-1/2" onclick={taleSettingsClicked}>
		View Tale Settings
	</button>
	<button
		class="btn btn-secondary btn-md mt-2 w-1/2"
		onclick={regenerateGameTime}
		disabled={isRegeneratingTime}
	>
		{isRegeneratingTime ? 'Generating...' : 'Regenerate Game Time (AI)'}
	</button>
	<fieldset class="mt-2 w-full">
		<p>Custom Tale Memories</p>
		<textarea
			rows={3}
			placeholder="If the AI forgets important events during the Tale, you can enter custom memories here. Added to every action, don't make it too long."
			bind:value={customMemoriesState.value}
			class="textarea textarea-md mt-2 w-full"
		></textarea>
	</fieldset>
	<fieldset class="mt-2 w-full">
		<p>Custom GM Notes</p>
		<textarea
			rows={3}
			placeholder="Use for specific/temporary game rules, added to every action, don't make it too long."
			bind:value={customGMNotesState.value}
			class="textarea textarea-md mt-2 w-full"
		></textarea>
	</fieldset>
</form>
