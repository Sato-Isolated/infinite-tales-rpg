<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import { onMount, tick } from 'svelte';
	import { LLMProvider } from '$lib/ai/llmProvider';
	import { migrateIfApplicable } from '$lib/state/versionMigration';

	// Enhanced state managers
	import { createGameStateManager } from '$lib/state/gameStateManager.svelte';
	import { createUIStateManager } from '$lib/state/uiStateManager.svelte';
	import { useLocalStorage } from '$lib/state/useLocalStorage.svelte';

	// Modern component imports
	import GameModals from './GameModals.svelte';
	import StorySection from './StorySection.svelte';
	import ActionButtons from './ActionButtons.svelte';
	import ActionInputForm from './ActionInputForm.svelte';
	import StaticActionsPanel from './StaticActionsPanel.svelte';
	import TimeWidget from './TimeWidget.svelte';
	import ResourcesComponent from '$lib/components/ResourcesComponent.svelte';

	// Game logic and controllers
	import { createGameController } from '$lib/game/controllers/gameController';
	import { createModalManager } from '$lib/game/ui/modalManager.svelte';
	import * as gameLogic from '$lib/game/logic/gameLogic';

	// Types and initial states
	import { defaultGameSettings, type GameSettings, type Action } from '$lib/ai/agents/gameAgent';
	import {
		initialCharacterStatsState,
		type CharacterStats
	} from '$lib/ai/agents/characterStatsAgent';
	import { initialCharacterState } from '$lib/ai/agents/characterAgent';
	import { initialStoryState } from '$lib/ai/agents/storyAgent';
	import { initialThoughtsState } from '$lib/util.svelte';
	import { initialSystemInstructionsState } from '$lib/ai/llm';
	import { createDefaultTime } from '$lib/types/gameTime';

	// Enhanced state management using modern patterns
	const gameState = createGameStateManager({
		characterState: initialCharacterState,
		characterStatsState: initialCharacterStatsState,
		storyState: initialStoryState,
		thoughtsState: initialThoughtsState
	});

	const uiState = createUIStateManager();
	const modalManager = createModalManager();

	// AI and settings state
	const apiKeyState = useLocalStorage<string>('apiKeyState');
	const temperatureState = useLocalStorage<number>('temperatureState');
	const aiLanguage = useLocalStorage<string>('aiLanguage');
	const systemInstructionsState = useLocalStorage(
		'systemInstructionsState',
		initialSystemInstructionsState
	);
	const gameSettingsState = useLocalStorage<GameSettings>(
		'gameSettingsState',
		defaultGameSettings()
	);
	const aiConfigState = useLocalStorage('aiConfigState');

	// Controller and agents
	let controller = $state<ReturnType<typeof createGameController> | undefined>(undefined);

	// Derived state for UI components
	const latestStoryProgressionState = $derived({
		story: uiState.storyChunk || gameState.currentGameAction.story,
		gameUpdates: uiState.storyChunk ? [] : [], // TODO: Fix gameLogic.getRenderedGameUpdates when available
		imagePrompt: uiState.storyChunk
			? ''
			: [gameState.currentGameAction.image_prompt, gameState.story.value.general_image_prompt].join(
					' '
				),
		stream_finished: !uiState.storyChunk
	});

	const playerResources = $derived(() => {
		const playerId = gameState.playerCharacterId;
		return gameState.playerCharactersGame.value[playerId] || {};
	});

	// Navigation guard
	beforeNavigate(({ cancel }) => {
		if (!uiState.didAIProcessAction) {
			if (!confirm('Navigation will cancel the current AI generation. Are you sure?')) {
				cancel();
			}
		}
	});

	// Initialization
	onMount(async () => {
		await initializeGame();
		if (!gameState.isGameStarted) {
			await startNewGame();
		} else {
			await initializeFromSavedState();
		}
	});

	async function initializeGame() {
		// Initialize LLM and agents
		const llm = LLMProvider.provideLLM(
			{
				temperature: temperatureState.value,
				language: aiLanguage.value,
				apiKey: apiKeyState.value
			},
			false // TODO: Fix useFallbackLlmState when aiConfigState type is properly defined
		);

		// Create controller with all dependencies
		// TODO: Implement proper createGameController when types are available
		// controller = createGameController({
		// 	... proper controller configuration
		// });
	}

	async function startNewGame() {
		if (!controller) return;

		await controller.sendAction({
			characterName: gameState.character.value.name,
			text: 'START_GAME' // This would use GameAgent.getStartingPrompt()
		});
	}

	async function initializeFromSavedState() {
		// Initialize from saved game state
		// This would contain the logic from initializeGameFromSavedState
	}

	// Event handlers using modern patterns
	const handleActionSubmit = async (action: Action, rollDice?: boolean) => {
		if (!controller) return;
		await controller.sendAction(action, rollDice);
	};

	const handleCustomInput = async (text: string, receiver: string) => {
		if (!controller) return;
		// Handle custom input based on receiver type
	};

	const handleRegenerateActions = async () => {
		if (!controller) return;
		await controller.regenerateActions();
	};
</script>

/** * Game Container Component - Modern Svelte 5 refactored main game component * This demonstrates
how the massive +page.svelte could be decomposed * Uses modern patterns and better state management
*/

<!-- Modern component structure with better organization -->
<div class="game-container bg-base-200 min-h-screen">
	<!-- Game Modals - TODO: Add proper props when component is completed -->
	<!-- <GameModals {modalManager} /> -->

	<!-- Main Game Layout -->
	<div class="container mx-auto max-w-6xl p-4">
		<!-- Game Header -->
		<header class="mb-4">
			<div class="flex items-center justify-between">
				<h1 class="text-2xl font-bold">Infinite Tales RPG</h1>
				<TimeWidget gameTime={uiState.gameTime.value} />
			</div>
		</header>

		<!-- Game Content -->
		<main class="grid gap-4 lg:grid-cols-12">
			<!-- Story Section -->
			<section class="lg:col-span-8">
				<!-- TODO: Implement proper StorySection props when component is completed -->
				<!-- <StorySection
					currentGameActionState={gameState.currentGameAction}
					gameActions={gameState.gameActions.value}
					{latestStoryProgressionState}
					showXLastStoryProgressions={uiState.showXLastStoryProgressions}
					setShowXLastStoryProgressions={uiState.incrementShowXLastStoryProgressions}
					getRenderedGameUpdates={(gameState, playerId) =>
						gameLogic.getRenderedGameUpdates(
							gameState,
							gameState.playerCharactersGame.value,
							gameState.playerCharactersIdToNames.value,
							playerId
						)}
					storyState={gameState.story.value}
					isGameEnded={false}
					playerCharacterIdState={gameState.playerCharacterId}
				/> -->
				<div class="p-4">
					<h2>Game Container - Under Development</h2>
					<p>This component is being refactored and is not currently active.</p>
				</div>
			</section>

			<!-- Sidebar -->
			<aside class="space-y-4 lg:col-span-4">
				<!-- Resources -->
				<!-- TODO: Add proper ResourcesComponent props -->
				<!-- <ResourcesComponent
					resources={playerResources}
					characterStats={gameState.characterStats.value}
				/> -->

				<!-- TODO: Add proper ActionButtons props -->
				<!-- <ActionButtons
					actions={gameState.characterActions.value}
					currentGameActionState={gameState.currentGameAction}
					sendAction={handleActionSubmit}
					isGameEnded={false}
					{playerResources}
					inventoryState={gameState.inventory.value}
					regenerateActions={handleRegenerateActions}
				/> -->

				<!-- TODO: Add proper StaticActionsPanel props -->
				<!-- <StaticActionsPanel /> -->
			</aside>
		</main>

		<!-- Input Form -->
		<footer class="mt-4">
			<ActionInputForm handleSubmit={handleCustomInput} />
		</footer>
	</div>
</div>

<style>
	.game-container {
		/* Enhanced styling for better UX */
		background: linear-gradient(135deg, hsl(var(--b2)) 0%, hsl(var(--b3)) 100%);
	}

	/* Optimized responsive design */
	@media (max-width: 1024px) {
		.container {
			padding: 1rem;
		}
	}
</style>
