<script lang="ts">
	import { onMount } from 'svelte';
	import { LLMProvider } from '$lib/ai/llmProvider';
	import { GameAgent } from '$lib/ai/agents/gameAgent';
	import type { GameActionState, GameMasterAnswer } from '$lib/types/gameState';
	import { defaultGameSettings, type GameSettings } from '$lib/types/gameSettings';
	import type { InventoryState } from '$lib/types/inventory';
	import type { PlayerCharactersGameState } from '$lib/types/players';
	import { useHybridLocalStorage } from '$lib/state/hybrid/useHybridLocalStorage.svelte';
	import type { Story } from '$lib/ai/agents/storyAgent';
	import type { CharacterDescription } from '$lib/ai/agents/characterAgent';
	import {
		initialSystemInstructionsState,
		type LLMMessage,
		type SystemInstructionsState
	} from '$lib/ai/llm';
	import LoadingModal from '$lib/components/ui/loading/LoadingModal.svelte';
	import { initialThoughtsState, type ThoughtsState } from '$lib/util.svelte';
	import type { AIConfig } from '$lib';
	import { SummaryAgent } from '$lib/ai/agents/summaryAgent';
	import type { NPCState } from '$lib/ai/agents/characterStatsAgent';
	import { getSafetyLevelFromStory } from '$lib/ai/config/contentRatingToSafety';
	import GMQuestionInput from '$lib/components/gm/GMQuestionInput.svelte';

	let {
		onclose,
		initialQuestion = '',
		playerCharactersGameState
	}: {
		onclose?: (closedByPlayer: boolean, gmAnswerStateAsContext?: any) => void;
		initialQuestion?: string;
		playerCharactersGameState: PlayerCharactersGameState;
	} = $props();

	// State management
	const apiKeyState = useHybridLocalStorage<string>('apiKeyState', '');
	const systemInstructionsState = useHybridLocalStorage<SystemInstructionsState>(
		'systemInstructionsState',
		initialSystemInstructionsState
	);
	const aiLanguage = useHybridLocalStorage<string>('aiLanguage');
	const storyState = useHybridLocalStorage<Story>('storyState');
	const characterState = useHybridLocalStorage<CharacterDescription>('characterState');
	const historyMessagesState = useHybridLocalStorage<LLMMessage[]>('historyMessagesState');
	const inventoryState = useHybridLocalStorage<InventoryState>('inventoryState', {});
	const aiConfigState = useHybridLocalStorage<AIConfig>('aiConfigState');
	const gameActionsState = useHybridLocalStorage<GameActionState[]>('gameActionsState');
	const customMemoriesState = useHybridLocalStorage<string>('customMemoriesState');
	const customGMNotesState = useHybridLocalStorage<string>('customGMNotesState');
	const npcState = useHybridLocalStorage<NPCState>('npcState', {});
	const gameSettingsState = useHybridLocalStorage<GameSettings>(
		'gameSettingsState',
		defaultGameSettings()
	);
	const thoughtsState = useHybridLocalStorage<ThoughtsState>('thoughtsState', initialThoughtsState);

	// Derived state
	const currentGameActionState: GameActionState = $derived(
		(gameActionsState.value && gameActionsState.value[gameActionsState.value.length - 1]) ||
			({} as GameActionState)
	);

	// Component state
	let gameAgent: GameAgent;
	let isReady = $state(false);
	let currentQuestion = $state(initialQuestion);
	let isGenerating = $state(false);
	let gmHistory = $state<Array<{ question: string; answer: GameMasterAnswer; timestamp: Date }>>(
		[]
	);
	let showHistory = $state(false);

	onMount(async () => {
		// Wait for hydration
		const maxWaitTime = 3000;
		const startTime = Date.now();

		while (
			(!apiKeyState.storageInfo.isHydrated || apiKeyState.storageInfo.isInitializing) &&
			Date.now() - startTime < maxWaitTime
		) {
			await new Promise((resolve) => setTimeout(resolve, 50));
		}

		if (!apiKeyState.storageInfo.isHydrated) {
			console.warn('⚠️ Enhanced GM Modal - Hydratation timeout - continuing with defaults');
		}

		console.log(
			'🔑 Enhanced GM Modal - API Key ready:',
			apiKeyState.value?.length || 0,
			'characters'
		);

		const llm = LLMProvider.provideLLM(
			{
				temperature: 0.7,
				language: aiLanguage.value,
				apiKey: apiKeyState.value
			},
			getSafetyLevelFromStory(storyState.value),
			aiConfigState.value?.useFallbackLlmState
		);

		gameAgent = new GameAgent(llm);
		isReady = true;

		// If there's an initial question, process it
		if (initialQuestion) {
			handleQuestionSubmit(initialQuestion);
		}
	});

	async function handleQuestionSubmit(question: string, type?: string) {
		if (!gameAgent || isGenerating) return;

		isGenerating = true;
		currentQuestion = question;

		try {
			const summaryAgent = new SummaryAgent(gameAgent.llm);
			const relatedQuestionHistory =
				(
					await summaryAgent.retrieveRelatedHistory(question, gameActionsState.value)
				)?.relatedDetails
					.filter((detail) => detail.relevanceScore >= 0.7)
					.map((detail) => detail.storyReference) || [];

			if (customMemoriesState.value) {
				relatedQuestionHistory.push(customMemoriesState.value);
			}

			const { thoughts, answer } = await gameAgent.generateAnswerForPlayerQuestion(
				question,
				thoughtsState.value,
				systemInstructionsState.value,
				historyMessagesState.value,
				storyState.value,
				characterState.value,
				playerCharactersGameState,
				inventoryState.value,
				npcState.value,
				relatedQuestionHistory,
				gameSettingsState.value,
				customGMNotesState.value,
				currentGameActionState.is_character_restrained_explanation
			);

			// Add to history
			gmHistory.push({
				question,
				answer,
				timestamp: new Date()
			});
		} catch (error) {
			console.error('❌ Enhanced GM Modal - Error generating answer:', error);
			// Add error response to history
			gmHistory.push({
				question,
				answer: {
					answerToPlayer:
						'I encountered an error while processing your question. Please try again or check your API configuration.',
					answerType: 'general' as const,
					confidence: 0,
					rules_considered: [`Error: ${error instanceof Error ? error.message : 'Unknown error'}`],
					game_state_considered: 'Error occurred while processing request',
					relatedQuestions: [],
					sources: ['Error Log']
				},
				timestamp: new Date()
			});
		} finally {
			isGenerating = false;
			currentQuestion = '';
		}
	}

	function handleAddToContext(historyEntry: (typeof gmHistory)[0]) {
		onclose?.(true, {
			question: historyEntry.question,
			...historyEntry.answer
		});
	}

	function getCurrentLocation(): string {
		// Extract location from story state or action state
		return storyState.value?.game || 'unknown location';
	}

	function getCharacterName(): string {
		if (typeof playerCharactersGameState?.name === 'string') {
			return playerCharactersGameState.name;
		}
		return characterState.value?.name || 'Character';
	}
</script>

{#if !isReady}
	<LoadingModal />
{:else}
	<dialog open class="modal animate-fade-in z-100" style="background: rgba(0, 0, 0, 0.4);">
		<div class="modal-box flex max-h-[95vh] w-full max-w-5xl flex-col">
			<!-- Header -->
			<div
				class="from-primary/10 to-secondary/10 border-base-300 mb-4 flex items-center justify-between rounded-lg border bg-gradient-to-r p-4"
			>
				<div class="flex items-center gap-3">
					<div class="avatar placeholder">
						<div class="bg-primary text-primary-content h-12 w-12 rounded-full">
							<span class="text-xl">🧙</span>
						</div>
					</div>
					<div>
						<h3 class="text-base-content text-lg font-bold">Enhanced Game Master Assistant</h3>
						<p class="text-base-content/70 text-sm">
							Ask intelligent questions and get detailed answers
						</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
					{#if gmHistory.length > 0}
						<button class="btn btn-sm btn-ghost" onclick={() => (showHistory = !showHistory)}>
							<span class="text-base">📚</span>
							History ({gmHistory.length})
						</button>
					{/if}
					<button class="btn btn-sm btn-ghost" onclick={() => onclose?.(true)}> ✕ </button>
				</div>
			</div>

			<!-- Content Area -->
			<div class="flex flex-1 flex-col gap-4 overflow-hidden lg:flex-row">
				<!-- Question Input Section -->
				<div class="flex flex-col lg:w-1/3">
					<h4 class="mb-3 flex items-center gap-2 text-base font-semibold">
						<span class="text-base">💬</span> Ask a Question
					</h4>

					{#if isGenerating}
						<div class="flex items-center justify-center p-8">
							<div class="loading loading-spinner loading-lg text-primary"></div>
							<span class="ml-3 text-sm">Processing your question...</span>
						</div>
					{:else}
						<GMQuestionInput
							onQuestionSubmit={handleQuestionSubmit}
							currentLocation={getCurrentLocation()}
							characterName={getCharacterName()}
						/>
					{/if}
				</div>

				<!-- Answers Section -->
				<div class="flex flex-col overflow-hidden lg:w-2/3">
					{#if showHistory && gmHistory.length > 0}
						<!-- History View -->
						<div class="mb-3 flex items-center justify-between">
							<h4 class="flex items-center gap-2 text-base font-semibold">
								<span class="text-base">📚</span> Question History
							</h4>
							<button class="btn btn-xs btn-ghost" onclick={() => (showHistory = false)}>
								Show Latest
							</button>
						</div>

						<div class="flex-1 space-y-3 overflow-y-auto">
							{#each gmHistory.reverse() as entry}
								<div class="card bg-base-100 border-base-300 border shadow-sm">
									<div class="card-body p-3">
										<div class="mb-2 flex items-start justify-between">
											<h5 class="text-primary text-sm font-medium">Q: {entry.question}</h5>
											<div class="flex items-center gap-2">
												<div class="badge badge-xs badge-outline">
													{entry.answer.answerType.replace('_', ' ')}
												</div>
												<button
													class="btn btn-xs btn-primary"
													onclick={() => handleAddToContext(entry)}
												>
													Add to Context
												</button>
											</div>
										</div>
										<p class="text-base-content/80 line-clamp-3 text-xs">
											{entry.answer.answerToPlayer}
										</p>
										<div class="text-base-content/50 mt-1 text-xs">
											{entry.timestamp.toLocaleTimeString()}
										</div>
									</div>
								</div>
							{/each}
						</div>
					{:else if gmHistory.length > 0}
						<!-- Latest Answer View -->
						<div class="mb-3 flex items-center justify-between">
							<h4 class="flex items-center gap-2 text-base font-semibold">
								<span class="text-base">💡</span> Latest Answer
							</h4>
							{#if gmHistory.length > 1}
								<button class="btn btn-xs btn-ghost" onclick={() => (showHistory = true)}>
									View History ({gmHistory.length})
								</button>
							{/if}
						</div>

						<div class="flex-1 overflow-y-auto">
							{#if gmHistory.length > 0}
								{@const latestEntry = gmHistory[gmHistory.length - 1]}
								<div class="space-y-4">
									<!-- Question -->
									<div class="card bg-primary/5 border-primary/20 border shadow-sm">
										<div class="card-body p-3">
											<h5 class="text-primary mb-1 text-sm font-medium">Your Question:</h5>
											<p class="text-sm">{latestEntry.question}</p>
										</div>
									</div>

									<!-- Enhanced Answer Display -->
									<div class="card bg-base-100 border-base-300 border shadow-sm">
										<div class="card-body p-4">
											<div class="mb-3 flex items-center justify-between">
												<h5 class="text-secondary flex items-center gap-2 text-base font-medium">
													<span class="text-base">🎯</span> GM Answer
												</h5>
												<div class="flex items-center gap-2">
													<div class="badge badge-sm badge-outline">
														{latestEntry.answer.answerType
															.replace('_', ' ')
															.replace(/\b\w/g, (l) => l.toUpperCase())}
													</div>
													{#if latestEntry.answer.confidence !== undefined}
														<div
															class="badge badge-sm"
															class:badge-success={latestEntry.answer.confidence >= 80}
															class:badge-warning={latestEntry.answer.confidence >= 50 &&
																latestEntry.answer.confidence < 80}
															class:badge-error={latestEntry.answer.confidence < 50}
														>
															{latestEntry.answer.confidence}%
														</div>
													{/if}
												</div>
											</div>

											<div class="prose text-base-content max-w-none">
												<p class="whitespace-pre-wrap">{latestEntry.answer.answerToPlayer}</p>
											</div>

											<!-- Related Questions -->
											{#if latestEntry.answer.relatedQuestions && latestEntry.answer.relatedQuestions.length > 0}
												<div class="mt-4">
													<h6 class="text-accent mb-2 text-sm font-medium">Related Questions:</h6>
													<div class="flex flex-wrap gap-1">
														{#each latestEntry.answer.relatedQuestions as relatedQ}
															<button
																class="btn btn-xs btn-outline btn-accent normal-case"
																onclick={() => handleQuestionSubmit(relatedQ)}
															>
																{relatedQ}
															</button>
														{/each}
													</div>
												</div>
											{/if}

											<!-- Action Buttons -->
											<div class="mt-4 flex gap-2">
												<button
													class="btn btn-primary btn-sm"
													onclick={() => handleAddToContext(latestEntry)}
												>
													<span class="text-base">📝</span>
													Add to Context
												</button>
											</div>
										</div>
									</div>
								</div>
							{/if}
						</div>
					{:else}
						<!-- Empty State -->
						<div class="flex flex-1 items-center justify-center">
							<div class="text-base-content/50 text-center">
								<div class="mb-4 text-4xl">🧙‍♂️</div>
								<h4 class="mb-2 text-lg font-medium">Welcome to the Enhanced GM Assistant</h4>
								<p class="text-sm">
									Ask any question about the game world, rules, or your current situation.
								</p>
								<p class="mt-2 text-xs">
									Your questions will appear here with detailed, contextual answers.
								</p>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Footer -->
			<div class="border-base-300 flex items-center justify-between border-t pt-4">
				<div class="text-base-content/50 text-xs">
					Enhanced GM powered by AI • Context-aware responses
				</div>
				<button class="btn btn-sm btn-ghost" onclick={() => onclose?.(true)}>
					Close Assistant
				</button>
			</div>
		</div>
	</dialog>
{/if}

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.animate-fade-in {
		animation: fade-in 0.2s ease-out;
	}

	.line-clamp-3 {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>

