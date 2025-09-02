<script lang="ts">
	import { onMount } from 'svelte';
	import { LLMProvider } from '$lib/ai/llmProvider';
	import {
		defaultGameSettings,
		type GameActionState,
		GameAgent,
		type GameMasterAnswer,
		type GameSettings,
		type InventoryState,
		type PlayerCharactersGameState
	} from '$lib/ai/agents/gameAgent';
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
	// campaign removed

	let {
		onclose,
		question,
		playerCharactersGameState
	}: {
		onclose?: (closedByPlayer: boolean, gmAnswerStateAsContext?: any) => void;
		question: string;
		playerCharactersGameState: PlayerCharactersGameState;
	} = $props();

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
	// campaign chapter removed
	const currentGameActionState: GameActionState = $derived(
		(gameActionsState.value && gameActionsState.value[gameActionsState.value.length - 1]) ||
			({} as GameActionState)
	);

	let gameAgent: GameAgent;
	let gmAnswerState: GameMasterAnswer | undefined = $state();
	let gmThoughtsState: string | undefined = $state();
	let isGeneratingState: boolean = $state(false);

	onMount(async () => {
		// 🚨 ATTENDRE que apiKeyState soit hydraté avec timeout pour éviter les boucles infinies
		const maxWaitTime = 3000; // 3 secondes maximum
		const startTime = Date.now();

		while (
			(!apiKeyState.storageInfo.isHydrated || apiKeyState.storageInfo.isInitializing) &&
			Date.now() - startTime < maxWaitTime
		) {
			await new Promise((resolve) => setTimeout(resolve, 50));
		}

		// Si l'hydratation n'est toujours pas terminée après le timeout, on continue quand même
		if (!apiKeyState.storageInfo.isHydrated) {
			console.warn(
				'⚠️ GMQuestionModal - Hydratation timeout - continuation avec les valeurs par défaut'
			);
		}
		if (apiKeyState.storageInfo.isInitializing) {
			console.warn(
				'⚠️ GMQuestionModal - Initialisation timeout - continuation avec les valeurs par défaut'
			);
		}

		console.log(
			'🔑 GMQuestionModal - API Key après hydratation:',
			apiKeyState.value?.length || 0,
			'caractères'
		);

		const llm = LLMProvider.provideLLM(
			{
				temperature: 0.7,
				language: aiLanguage.value,
				apiKey: apiKeyState.value
			},
			aiConfigState.value?.useFallbackLlmState
		);
		gameAgent = new GameAgent(llm);
		const summaryAgent = new SummaryAgent(llm);
		isGeneratingState = true;
		const relatedQuestionHistory = (
			await summaryAgent.retrieveRelatedHistory(question, gameActionsState.value)
		)?.relatedDetails
			.filter((detail) => detail.relevanceScore >= 0.7)
			.map((detail) => detail.storyReference);

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
		gmAnswerState = answer;
		gmThoughtsState = thoughts;
		isGeneratingState = false;
		if (!gmAnswerState) {
			onclose?.(false);
		}
	});
</script>

{#if isGeneratingState}
	<LoadingModal />
{:else}
	<dialog open class="modal animate-fade-in z-100" style="background: rgba(0, 0, 0, 0.3);">
		<div
			class="modal-box animate-scale-in flex flex-col items-center text-center transition-all duration-300 ease-out"
		>
			<span class="m-auto font-bold">Game Master Answer</span>
			<p class="mt-4 max-h-48 overflow-y-scroll">{gmAnswerState?.answerToPlayer}</p>
			<details
				class="collapse-arrow textarea bg-base-200 textarea-md collapse mt-4 overflow-y-scroll border
				transition-all duration-200 ease-in-out hover:shadow-md"
			>
				<summary class="collapse-title hover:bg-base-300 capitalize transition-colors duration-200">
					<p>Considered Game State</p>
				</summary>
				<p>{gmAnswerState?.game_state_considered || 'The AI did not return a response...'}</p>
			</details>
			<details
				class="collapse-arrow textarea bg-base-200 textarea-md collapse mt-4 overflow-y-scroll border
				transition-all duration-200 ease-in-out hover:shadow-md"
			>
				<summary class="collapse-title hover:bg-base-300 capitalize transition-colors duration-200">
					<p>Considered Rules</p>
				</summary>
				<ul class="text-start">
					{#each gmAnswerState?.rules_considered || [] as rule}
						<li class="mt-1 ml-2 list-item">
							{rule.startsWith('-') ? rule : '- ' + rule}
						</li>
					{/each}
				</ul>
			</details>
			{#if gmThoughtsState}
				<details
					class="collapse-arrow textarea bg-base-200 textarea-md collapse mt-4 overflow-y-scroll border
					transition-all duration-200 ease-in-out hover:shadow-md"
				>
					<summary
						class="collapse-title hover:bg-base-300 capitalize transition-colors duration-200"
					>
						<p>Thoughts</p>
					</summary>
					<p>{gmThoughtsState}</p>
				</details>
			{/if}
			<div class="mt-3 flex w-full flex-row gap-2">
				<button
					class="btn btn-info btn-md hover:bg-info-focus
					focus:ring-info focus:ring-opacity-50 flex-1
					transition-all duration-200 ease-in-out
					hover:scale-105 hover:shadow-lg
					focus:ring-2 active:scale-95 active:shadow-sm"
					onclick={() => onclose?.(true, { question, ...gmAnswerState })}>Add to context</button
				>
				<button
					class="btn btn-info btn-md hover:bg-info-focus
					focus:ring-info focus:ring-opacity-50 flex-1
					transition-all duration-200 ease-in-out
					hover:scale-105 hover:shadow-lg
					focus:ring-2 active:scale-95 active:shadow-sm"
					onclick={() => onclose?.(true)}>Close</button
				>
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

	@keyframes scale-in {
		from {
			transform: scale(0.8);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}

	.animate-fade-in {
		animation: fade-in 0.2s ease-out;
	}

	.animate-scale-in {
		animation: scale-in 0.3s ease-out;
	}
</style>
