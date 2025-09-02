<script lang="ts">
	import { useHybridLocalStorage } from '$lib/state/hybrid/useHybridLocalStorage.svelte';
	import { handleError, navigate, parseState } from '$lib/util.svelte';
	import { CharacterAgent, initialCharacterState } from '$lib/ai/agents/characterAgent';
	import { LLMProvider } from '$lib/ai/llmProvider';
	import { initialStoryState, type Story, StoryAgent } from '$lib/ai/agents/storyAgent';
	import LoadingModal from '$lib/components/ui/loading/LoadingModal.svelte';
	import { goto } from '$app/navigation';
	import {
		CharacterStatsAgent,
		initialCharacterStatsState,
		type NPCState
	} from '$lib/ai/agents/characterStatsAgent';
	import { onMount } from 'svelte';
	import type { AIConfig } from '$lib';
	import type { RelatedStoryHistory } from '$lib/ai/agents/summaryAgent';
	import QuickstartStoryGenerationModal from '$lib/components/modals/system/QuickstartStoryGenerationModal.svelte';
	import type { LLM } from '$lib/ai/llm';
	import isPlainObject from 'lodash.isplainobject';
	import { UndoManager } from '$lib/state/undoManager';
	import {
		initialCharacterTransformState,
		initialEventEvaluationState
	} from '$lib/ai/agents/eventAgent';
	import type { CharacterChangedInto, EventEvaluation } from '$lib/ai/agents/eventAgent';
	import type { PlayerCharactersIdToNamesMap } from '$lib/ai/agents/gameAgent';
	import { createDefaultTime, type GameTime } from '$lib/types/gameTime';
	import AiGenerationSettings from '$lib/components/modals/settings/AiGenerationSettings.svelte';
	import OutputFeaturesModal from '$lib/components/modals/settings/OutputFeaturesModal.svelte';
	import SystemPromptsModal from '$lib/components/modals/settings/SystemPromptsModal.svelte';

	const apiKeyState = useHybridLocalStorage<string>('apiKeyState', '');
	const aiLanguage = useHybridLocalStorage<string>('aiLanguage');
	//TODO migrate all AI settings into this object to avoid too many vars in local storage
	const aiConfigState = useHybridLocalStorage<AIConfig>('aiConfigState', {
		disableAudioState: false,
		useFallbackLlmState: false
	});
	let showGenerationSettingsModal = $state<boolean>(false);
	let showOutputFeaturesModal = $state<boolean>(false);
	let showSystemPromptsModal = $state<boolean>(false);

	const gameActionsState = useHybridLocalStorage('gameActionsState', []);
	const historyMessagesState = useHybridLocalStorage('historyMessagesState', []);
	const characterState = useHybridLocalStorage('characterState', initialCharacterState);
	const inventoryState = useHybridLocalStorage('inventoryState', {});
	const characterStatsState = useHybridLocalStorage('characterStatsState', initialCharacterStatsState);
	const npcState = useHybridLocalStorage<NPCState>('npcState', {});
	const storyState = useHybridLocalStorage('storyState', initialStoryState);
	const isGameEnded = useHybridLocalStorage('isGameEnded', false);
	const rollDifferenceHistoryState = useHybridLocalStorage('rollDifferenceHistoryState', []);
	// campaign removed
	const characterActionsState = useHybridLocalStorage('characterActionsState');
	const levelUpState = useHybridLocalStorage('levelUpState');
	const customMemoriesState = useHybridLocalStorage<string>('customMemoriesState');
	const customGMNotesState = useHybridLocalStorage<string>('customGMNotesState');
	const skillsProgressionState = useHybridLocalStorage('skillsProgressionState', {});
	const characterTransformState = useHybridLocalStorage<CharacterChangedInto>(
		'characterTransformState',
		initialCharacterTransformState
	);

	const relatedStoryHistoryState = useHybridLocalStorage<RelatedStoryHistory>(
		'relatedStoryHistoryState',
		{ relatedDetails: [] }
	);
	const relatedActionHistoryState = useHybridLocalStorage<string[]>('relatedActionHistoryState', []);
	const eventEvaluationState = useHybridLocalStorage<EventEvaluation>(
		'eventEvaluationState',
		initialEventEvaluationState
	);
	const playerCharactersIdToNamesMapState = useHybridLocalStorage<PlayerCharactersIdToNamesMap>(
		'playerCharactersIdToNamesMapState',
		{}
	);
	const gameTimeState = useHybridLocalStorage<GameTime | null>('gameTimeState', null);

	let isGeneratingState = $state(false);
	let quickstartModalOpen = $state(false);
	let llm: LLM;
	let storyAgent: StoryAgent | undefined = $state();

	onMount(async () => {
		if (apiKeyState.value) {
			provideLLM();
		}
	});

	const provideLLM = () => {
		llm = LLMProvider.provideLLM(
			{
				temperature: 2,
				apiKey: apiKeyState.value,
				language: aiLanguage.value
			},
			aiConfigState.value?.useFallbackLlmState
		);
		storyAgent = new StoryAgent(llm);
	};

	const onQuickstartClicked = () => {
		provideLLM();
		if (apiKeyState.value) {
			quickstartModalOpen = true;
		}
	};

	function clearStates() {
		historyMessagesState.reset();
		gameActionsState.reset();
		characterState.reset();
		characterStatsState.reset();
		storyState.reset();
		isGameEnded.reset();
		rollDifferenceHistoryState.reset();
		npcState.reset();
		inventoryState.reset();
		// campaign states removed
		characterActionsState.reset();
		levelUpState.reset();
		relatedStoryHistoryState.reset();
		relatedActionHistoryState.reset();
		customMemoriesState.reset();
		customGMNotesState.reset();
		characterTransformState.reset();
		skillsProgressionState.reset();
		eventEvaluationState.reset();
		playerCharactersIdToNamesMapState.reset();
		gameTimeState.reset();

		// Clear undo stack and conversation state when starting new tale/importing settings
		UndoManager.clearUndoStack();

		// Clear conversation state
		try {
			localStorage.removeItem('conversationState');
		} catch (error) {
			console.warn('Failed to clear conversation state:', error);
		}
	}

	async function onQuickstartNew(story: string | Story | undefined) {
		clearStates();
		isGeneratingState = true;
		let newStoryState;
		try {
			if (story && isPlainObject(story)) {
				newStoryState = story as Story;
			} else {
				const overwriteStory = !story ? {} : { main_scenario: story as string };
				newStoryState = await storyAgent!.generateRandomStorySettings(overwriteStory);
			}
			if (newStoryState) {
				storyState.value = newStoryState;
				const characterAgent = new CharacterAgent(llm);
				const newCharacterState = await characterAgent.generateCharacterDescription(
					$state.snapshot(storyState.value)
				);
				if (newCharacterState) {
					characterState.value = newCharacterState;
					const characterStatsAgent = new CharacterStatsAgent(llm);
					const newCharacterStatsState = await characterStatsAgent.generateCharacterStats(
						storyState.value,
						characterState.value,
						{
							level: 1,
							resources: {
								HP: { max_value: 0, start_value: 0, game_ends_when_zero: true },
								MP: { max_value: 0, start_value: 0, game_ends_when_zero: false }
							}
						},
						true
					);
					parseState(newCharacterStatsState);
					if (newCharacterStatsState) {
						characterStatsState.value = newCharacterStatsState;
						quickstartModalOpen = false;
						await goto('/game');
					}
				}
			}
			isGeneratingState = false;
		} catch (e) {
			isGeneratingState = false;
			handleError(e as string);
		}
	}

	function onStartCustom() {
		clearStates();
		navigate('/new/tale');
	}

	// campaign start removed
</script>

{#if quickstartModalOpen}
	<QuickstartStoryGenerationModal
		{storyAgent}
		onsubmit={onQuickstartNew}
		onclose={() => (quickstartModalOpen = false)}
	/>
{/if}
{#if isGeneratingState}
	<LoadingModal loadingText="Creating Your New Tale, this may take a minute..." />
{/if}

<div class="from-base-100 to-base-200 min-h-screen bg-gradient-to-br">
	<!-- Hero Section -->
	<div class="hero py-16">
		<div class="hero-content max-w-4xl text-center">
			<div>
				<h1 class="mb-6 text-4xl font-bold sm:text-5xl">
					<span class="from-primary to-secondary bg-gradient-to-r bg-clip-text text-transparent">
						AI Configuration
					</span>
				</h1>
				<p class="text-base-content/80 mx-auto mb-6 max-w-2xl text-lg">
					Set up your AI experience and start your adventure
				</p>
				<div class="flex flex-wrap justify-center gap-2">
					<div class="badge badge-primary">🤖 AI Powered</div>
					<div class="badge badge-success">🆓 Free</div>
					<div class="badge badge-info">🔒 Private</div>
				</div>
			</div>
		</div>
	</div>

	<div class="container mx-auto max-w-6xl px-6 pb-16">
		<!-- API Key Setup Card -->
		<div class="card bg-base-100 mb-8 shadow-xl">
			<div class="card-body">
				<div class="mb-6 flex items-center gap-3">
					<div class="badge badge-primary badge-lg">Step 1</div>
					<h2 class="card-title text-2xl">API Key Setup</h2>
					{#if apiKeyState.value}
						<div class="badge badge-success gap-1">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								class="h-4 w-4 stroke-current"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								></path></svg
							>
							Connected
						</div>
					{/if}
				</div>

				<div class="form-control w-full">
					<label class="label" for="apikey">
						<span class="label-text text-lg font-semibold">Google Gemini API Key</span>
						<span class="label-text-alt">
							<div class="badge badge-ghost">Required</div>
						</span>
					</label>
					<div class="join w-full">
						<input
							type="password"
							id="apikey"
							bind:value={apiKeyState.value}
							placeholder="Paste your API key here..."
							class="input input-bordered input-lg join-item w-full {apiKeyState.value
								? 'input-success'
								: ''}"
						/>
						{#if apiKeyState.value}
							<div class="join-item bg-success text-success-content flex items-center px-4">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									class="h-6 w-6 stroke-current"
									><path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5 13l4 4L19 7"
									></path></svg
								>
							</div>
						{/if}
					</div>
					<div class="mt-2 flex items-center justify-between">
						<span class="text-base-content/60 text-sm">
							Your key is stored locally in your browser for privacy
						</span>
						<a
							target="_blank"
							href="https://github.com/JayJayBinks/infinite-tales-rpg/wiki/Create-your-free-Google-Gemini-API-Key-%F0%9F%94%91"
							class="link link-primary text-sm"
						>
							📖 Setup Guide
						</a>
					</div>
				</div>

				{#if !apiKeyState.value}
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
						<div>
							<div class="font-semibold">API Key Required</div>
							<div class="text-sm">
								You need a Google Gemini API key to start playing. It's free and takes 2 minutes to
								set up!
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Game Start Options -->
		<div class="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
			<!-- Quickstart Card -->
			<div
				class="card from-primary/10 to-secondary/10 border-primary/20 border bg-gradient-to-br shadow-lg transition-shadow hover:shadow-xl"
			>
				<div class="card-body text-center">
					<div class="mb-4 flex justify-center">
						<div class="badge badge-primary badge-lg">🚀 Recommended</div>
					</div>
					<h3 class="card-title mb-4 justify-center text-xl">Quickstart Tale</h3>
					<p class="text-base-content/70 mb-6">
						Let the AI generate a complete adventure for you. Perfect for beginners or when you want
						to jump right in!
					</p>
					<div class="card-actions justify-center">
						<button
							class="btn btn-primary btn-lg gap-2"
							onclick={onQuickstartClicked}
							disabled={!apiKeyState.value}
						>
							<span>⚡</span>
							Start Adventure
						</button>
					</div>
					{#if !apiKeyState.value}
						<div class="text-base-content/50 mt-2 text-xs">API key required</div>
					{/if}
				</div>
			</div>

			<!-- Custom Tale Card -->
			<div class="card bg-base-100 shadow-lg transition-shadow hover:shadow-xl">
				<div class="card-body text-center">
					<div class="mb-4 flex justify-center">
						<div class="badge badge-accent">✏️ Custom</div>
					</div>
					<h3 class="card-title mb-4 justify-center text-xl">Custom Tale</h3>
					<p class="text-base-content/70 mb-6">
						Create your own adventure with a custom plot. Tell the AI what kind of story you want!
					</p>
					<div class="card-actions justify-center">
						<button
							class="btn btn-accent btn-lg gap-2"
							disabled={!apiKeyState.value}
							onclick={onStartCustom}
						>
							<span>🎨</span>
							Create Tale
						</button>
					</div>
					{#if !apiKeyState.value}
						<div class="text-base-content/50 mt-2 text-xs">API key required</div>
					{/if}
				</div>
			</div>

			<!-- Campaign card removed -->
		</div>

		<div class="divider my-12">
			<div class="badge badge-ghost badge-lg">⚙️ Advanced Settings</div>
		</div>

		<!-- Advanced Settings Grid -->
		<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
			<!-- Generation Settings Card -->
			<div class="card bg-base-100 shadow-lg transition-shadow hover:shadow-xl">
				<div class="card-body text-center">
					<h3 class="card-title mb-4 justify-center">
						<span class="mr-2 text-2xl">🎛️</span>
						Generation Settings
					</h3>
					<p class="text-base-content/70 mb-4 text-sm">
						Configure AI creativity, language, and response settings
					</p>
					<div class="card-actions justify-center">
						<button
							class="btn btn-outline btn-primary"
							onclick={() => (showGenerationSettingsModal = true)}
						>
							Configure
						</button>
					</div>
				</div>
			</div>

			<!-- Output Features Card -->
			<div class="card bg-base-100 shadow-lg transition-shadow hover:shadow-xl">
				<div class="card-body text-center">
					<h3 class="card-title mb-4 justify-center">
						<span class="mr-2 text-2xl">🎯</span>
						Output Features
					</h3>
					<p class="text-base-content/70 mb-4 text-sm">
						Toggle audio and other output features
					</p>
					<div class="card-actions justify-center">
						<button
							class="btn btn-outline btn-secondary"
							onclick={() => (showOutputFeaturesModal = true)}
						>
							Customize
						</button>
					</div>
				</div>
			</div>

			<!-- System Prompts Card -->
			<div class="card bg-base-100 shadow-lg transition-shadow hover:shadow-xl">
				<div class="card-body text-center">
					<h3 class="card-title mb-4 justify-center">
						<span class="mr-2 text-2xl">📝</span>
						System Prompts
					</h3>
					<p class="text-base-content/70 mb-4 text-sm">
						Advanced: Modify AI behavior and instructions
					</p>
					<div class="card-actions justify-center">
						<button
							class="btn btn-outline btn-accent"
							onclick={() => (showSystemPromptsModal = true)}
						>
							Edit Prompts
						</button>
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
						Need Help?
					</h3>
					<p class="text-base-content/70 mb-6">
						New to AI RPGs? Check out our getting started guide or join our community for tips and
						support.
					</p>
					<div class="flex flex-wrap justify-center gap-4">
						<a
							href="https://github.com/JayJayBinks/infinite-tales-rpg/wiki"
							target="_blank"
							class="btn btn-outline gap-2"
						>
							<span>📚</span>
							Documentation
						</a>
						<a href="https://discord.gg/CUvgRQR77y" target="_blank" class="btn btn-outline gap-2">
							<span>💬</span>
							Discord Community
						</a>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

{#if showGenerationSettingsModal}
	<AiGenerationSettings onclose={() => (showGenerationSettingsModal = false)} />
{/if}

{#if showOutputFeaturesModal}
	<OutputFeaturesModal onclose={() => (showOutputFeaturesModal = false)} />
{/if}

{#if showSystemPromptsModal}
	<SystemPromptsModal onclose={() => (showSystemPromptsModal = false)} />
{/if}
