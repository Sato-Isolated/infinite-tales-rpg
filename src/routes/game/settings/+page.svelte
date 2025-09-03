<script lang="ts">
	import { useHybridLocalStorage } from '$lib/state/hybrid/useHybridLocalStorage.svelte';
	import { navigate } from '$lib/util.svelte';
	import ImportExportSaveGame from '$lib/components/ui/data/ImportExportSaveGame.svelte';
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

	// campaign removed
	const customMemoriesState = useHybridLocalStorage<string>('customMemoriesState');
	const customGMNotesState = useHybridLocalStorage<string>('customGMNotesState');
	const gameTimeState = useHybridLocalStorage<GameTime>('gameTimeState', createDefaultTime());
	const storyState = useHybridLocalStorage<Story>('storyState');
	const characterState = useHybridLocalStorage<CharacterDescription>('characterState');
	const gameSettingsState = useHybridLocalStorage<GameSettings>('gameSettingsState');
	const apiKeyState = useHybridLocalStorage<string>('apiKeyState', '');
	const aiLanguage = useHybridLocalStorage<string>('aiLanguage');
	const aiConfigState = useHybridLocalStorage<AIConfig>('aiConfigState');

	const taleSettingsClicked = () => {
		navigate('/new/tale');
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

<div class="from-base-100 to-base-200 min-h-screen bg-gradient-to-br">
	<!-- Hero Section -->
	<div class="hero py-16">
		<div class="hero-content max-w-4xl text-center">
			<div>
				<h1 class="mb-6 text-4xl font-bold sm:text-5xl">
					<span class="from-primary to-secondary bg-gradient-to-r bg-clip-text text-transparent">
						Game Settings
					</span>
				</h1>
				<p class="text-base-content/80 mx-auto mb-6 max-w-2xl text-lg">
					Customize your gaming experience and manage your adventure
				</p>
				<div class="flex flex-wrap justify-center gap-2">
					<div class="badge badge-primary">🎮 Game Config</div>
					<div class="badge badge-info">💾 Save Management</div>
					<div class="badge badge-accent">📝 Custom Notes</div>
				</div>
			</div>
		</div>
	</div>

	<div class="container mx-auto max-w-6xl px-6 pb-16">
		<!-- Core Settings Grid -->
		<div class="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
			<!-- Game Configuration Card -->
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h2 class="card-title mb-6 text-2xl">
						<span class="mr-2 text-2xl">⚙️</span>
						Game Configuration
					</h2>

					<div class="space-y-4">
						<div class="flex flex-col gap-3">
							<button
								class="btn btn-primary justify-start gap-2"
								onclick={() => (showGameSettingsModal = true)}
							>
								<span>🎯</span>
								Game Settings
							</button>
							<p class="text-base-content/70 ml-2 text-sm">
								Configure gameplay mechanics and rules
							</p>
						</div>

						<div class="divider"></div>

						<div class="flex flex-col gap-3">
							<button
								class="btn btn-secondary justify-start gap-2"
								onclick={() => (showAiGameSettingsModal = true)}
							>
								<span>🤖</span>
								AI Settings
							</button>
							<p class="text-base-content/70 ml-2 text-sm">
								Adjust AI behavior and generation settings
							</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Save Management Card -->
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h2 class="card-title mb-6 text-2xl">
						<span class="mr-2 text-2xl">💾</span>
						Save Management
					</h2>

					<div class="space-y-4">
						<ImportExportSaveGame isSaveGame={true}>
							{#snippet exportButton(onclick)}
								<div class="flex flex-col gap-3">
									<button {onclick} class="btn btn-success justify-start gap-2">
										<span>📤</span>
										Export Save Game
									</button>
									<p class="text-base-content/70 ml-2 text-sm">
										Download your current game progress
									</p>
								</div>
							{/snippet}
							{#snippet importButton(onclick)}
								<div class="flex flex-col gap-3">
									<button {onclick} class="btn btn-info justify-start gap-2">
										<span>📥</span>
										Import Save Game
									</button>
									<p class="text-base-content/70 ml-2 text-sm">Load a previously saved game</p>
								</div>
							{/snippet}
						</ImportExportSaveGame>
					</div>
				</div>
			</div>
		</div>

		<!-- Story Settings Card -->
		<div class="card bg-base-100 mb-8 shadow-xl">
			<div class="card-body">
				<h2 class="card-title mb-6 text-2xl">
					<span class="mr-2 text-2xl">📖</span>
					Story Settings
				</h2>

				<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
					<div class="flex flex-col gap-3">
						<button class="btn btn-accent gap-2" onclick={taleSettingsClicked}>
							<span>📋</span>
							View Tale Settings
						</button>
						<p class="text-base-content/70 text-sm">
							Review and modify your current tale configuration
						</p>
					</div>

					<div class="flex flex-col gap-3">
						<button
							class="btn btn-warning gap-2 {isRegeneratingTime ? 'loading' : ''}"
							onclick={regenerateGameTime}
							disabled={isRegeneratingTime}
						>
							{#if !isRegeneratingTime}
								<span>🕐</span>
							{/if}
							{isRegeneratingTime ? 'Generating...' : 'Regenerate Game Time'}
						</button>
						<p class="text-base-content/70 text-sm">
							Let AI create a new appropriate time for your story
						</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Custom Notes Section -->
		<div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
			<!-- Custom Tale Memories Card -->
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h2 class="card-title mb-6 text-xl">
						<span class="mr-2 text-xl">🧠</span>
						Custom Tale Memories
					</h2>

					<div class="form-control">
						<label class="label" for="custom-memories">
							<span class="label-text text-base font-medium">Memory Notes</span>
							<span class="label-text-alt">
								<div class="badge badge-ghost badge-sm">Optional</div>
							</span>
						</label>
						<textarea
							id="custom-memories"
							rows={4}
							placeholder="If the AI forgets important events during the Tale, you can enter custom memories here. These will be added to every action to help maintain continuity..."
							bind:value={customMemoriesState.value}
							class="textarea textarea-bordered textarea-lg w-full"
						></textarea>
						<div class="label">
							<span class="label-text-alt text-warning">
								⚠️ Keep it concise - added to every action
							</span>
						</div>
					</div>

					<div class="alert alert-info mt-4">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							class="h-6 w-6 shrink-0 stroke-current"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							></path></svg
						>
						<div class="text-sm">
							<div class="font-semibold">Memory Helper</div>
							<div>
								Use this to remind the AI of important plot points, character relationships, or key
								events that should not be forgotten.
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Custom GM Notes Card -->
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h2 class="card-title mb-6 text-xl">
						<span class="mr-2 text-xl">📝</span>
						Custom GM Notes
					</h2>

					<div class="form-control">
						<label class="label" for="gm-notes">
							<span class="label-text text-base font-medium">Game Master Rules</span>
							<span class="label-text-alt">
								<div class="badge badge-ghost badge-sm">Optional</div>
							</span>
						</label>
						<textarea
							id="gm-notes"
							rows={4}
							placeholder="Use for specific or temporary game rules that should influence AI decisions. Examples: 'Magic is forbidden in this area', 'NPCs should be more hostile', etc..."
							bind:value={customGMNotesState.value}
							class="textarea textarea-bordered textarea-lg w-full"
						></textarea>
						<div class="label">
							<span class="label-text-alt text-warning">
								⚠️ Keep it concise - added to every action
							</span>
						</div>
					</div>

					<div class="alert alert-warning mt-4">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-6 w-6 shrink-0 stroke-current"
							fill="none"
							viewBox="0 0 24 24"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 15.5c-.77.833.192 2.5 1.732 2.5z"
							/></svg
						>
						<div class="text-sm">
							<div class="font-semibold">GM Override</div>
							<div>
								These notes act as temporary game master instructions that override normal AI
								behavior for your current session.
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Help Section -->
		<div class="mt-12">
			<div class="card bg-base-200/50 shadow-lg">
				<div class="card-body text-center">
					<h3 class="card-title mb-4 justify-center">
						<span class="mr-2 text-2xl">💡</span>
						Settings Help
					</h3>
					<p class="text-base-content/70 mb-6">
						Need help configuring your game? Check out our guides or ask the community for advice.
					</p>
					<div class="flex flex-wrap justify-center gap-4">
						<a
							href="https://github.com/JayJayBinks/infinite-tales-rpg/wiki/Game-Settings"
							target="_blank"
							class="btn btn-outline gap-2"
						>
							<span>📚</span>
							Settings Guide
						</a>
						<a href="https://discord.gg/CUvgRQR77y" target="_blank" class="btn btn-outline gap-2">
							<span>💬</span>
							Get Help
						</a>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
