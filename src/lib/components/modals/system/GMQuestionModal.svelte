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
	import { getSafetyLevelFromStory } from '$lib/ai/config/contentRatingToSafety';
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
			getSafetyLevelFromStory(storyState.value), // Use tale's content rating
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
	<dialog open class="modal animate-fade-in z-100" style="background: rgba(0, 0, 0, 0.4);">
		<div
			class="modal-box animate-scale-in flex flex-col transition-all duration-300 ease-out max-w-4xl w-full max-h-[90vh]"
		>
			<!-- Enhanced Header with GM Avatar and Question Type -->
			<div class="flex items-center justify-between mb-4 p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border border-base-300">
				<div class="flex items-center gap-3">
					<div class="avatar placeholder">
						<div class="bg-primary text-primary-content rounded-full w-12 h-12">
							<span class="text-xl">🧙</span>
						</div>
					</div>
					<div>
						<h3 class="text-lg font-bold text-base-content">Game Master Assistant</h3>
						{#if gmAnswerState?.answerType}
							<div class="badge badge-sm badge-outline">
								{gmAnswerState.answerType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
							</div>
						{/if}
					</div>
				</div>
				{#if gmAnswerState?.confidence !== undefined}
					<div class="flex items-center gap-2">
						<span class="text-xs text-base-content/70">Confidence:</span>
						<div class="badge badge-sm" class:badge-success={gmAnswerState.confidence >= 80}
							class:badge-warning={gmAnswerState.confidence >= 50 && gmAnswerState.confidence < 80}
							class:badge-error={gmAnswerState.confidence < 50}>
							{gmAnswerState.confidence}%
						</div>
					</div>
				{/if}
			</div>

			<!-- Enhanced Answer Display -->
			<div class="flex-1 overflow-y-auto space-y-4">
				<!-- Main Answer -->
				<div class="card bg-base-100 shadow-sm border border-base-300">
					<div class="card-body p-4">
						<h4 class="card-title text-base text-primary mb-2">
							<span class="text-base">💬</span> Answer
						</h4>
						<div class="prose max-w-none text-base-content">
							<p class="whitespace-pre-wrap">{gmAnswerState?.answerToPlayer || 'The AI did not return a response...'}</p>
						</div>
					</div>
				</div>

				<!-- Enhanced Related Questions -->
				{#if gmAnswerState?.relatedQuestions && gmAnswerState.relatedQuestions.length > 0}
					<div class="card bg-base-100 shadow-sm border border-base-300">
						<div class="card-body p-4">
							<h4 class="card-title text-base text-secondary mb-3">
								<span class="text-base">🔗</span> Related Questions
							</h4>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-2">
								{#each gmAnswerState.relatedQuestions as relatedQ}
									<button class="btn btn-sm btn-outline btn-secondary normal-case justify-start text-left p-2 h-auto min-h-[2rem]"
										onclick={() => {
											// Could implement quick question functionality here
											console.log('Quick question:', relatedQ);
										}}>
										<span class="text-xs">❓</span>
										<span class="text-xs flex-1">{relatedQ}</span>
									</button>
								{/each}
							</div>
						</div>
					</div>
				{/if}

				<!-- Enhanced Suggested Actions -->
				{#if gmAnswerState?.suggestedActions && gmAnswerState.suggestedActions.length > 0}
					<div class="card bg-base-100 shadow-sm border border-base-300">
						<div class="card-body p-4">
							<h4 class="card-title text-base text-accent mb-3">
								<span class="text-base">⚡</span> Suggested Actions
							</h4>
							<div class="space-y-2">
								{#each gmAnswerState.suggestedActions as action}
									<div class="alert alert-info py-2 px-3">
										<span class="text-info">🎯</span>
										<span class="text-sm">{action}</span>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{/if}

				<!-- Collapsible Sections -->
				<div class="space-y-3">
					<!-- Game State Analysis -->
					<details class="collapse collapse-arrow bg-base-200 border border-base-300">
						<summary class="collapse-title hover:bg-base-300 transition-colors duration-200">
							<div class="flex items-center gap-2">
								<span class="text-base">🎮</span>
								<span class="font-medium">Game State Analysis</span>
							</div>
						</summary>
						<div class="collapse-content">
							<div class="p-4 bg-base-100 rounded-lg mt-2">
								<p class="text-sm whitespace-pre-wrap">{gmAnswerState?.game_state_considered || 'No analysis available'}</p>
							</div>
						</div>
					</details>

					<!-- Rules Considered -->
					<details class="collapse collapse-arrow bg-base-200 border border-base-300">
						<summary class="collapse-title hover:bg-base-300 transition-colors duration-200">
							<div class="flex items-center gap-2">
								<span class="text-base">📋</span>
								<span class="font-medium">Rules Considered</span>
								{#if gmAnswerState?.rules_considered}
									<div class="badge badge-sm badge-neutral">{gmAnswerState.rules_considered.length}</div>
								{/if}
							</div>
						</summary>
						<div class="collapse-content">
							<div class="p-4 bg-base-100 rounded-lg mt-2">
								<ul class="space-y-2">
									{#each gmAnswerState?.rules_considered || [] as rule}
										<li class="flex items-start gap-2">
											<span class="text-primary mt-1">•</span>
											<span class="text-sm flex-1">{rule.startsWith('-') ? rule.slice(1).trim() : rule}</span>
										</li>
									{/each}
								</ul>
							</div>
						</div>
					</details>

					<!-- Sources -->
					{#if gmAnswerState?.sources && gmAnswerState.sources.length > 0}
						<details class="collapse collapse-arrow bg-base-200 border border-base-300">
							<summary class="collapse-title hover:bg-base-300 transition-colors duration-200">
								<div class="flex items-center gap-2">
									<span class="text-base">📚</span>
									<span class="font-medium">Sources</span>
									<div class="badge badge-sm badge-neutral">{gmAnswerState.sources.length}</div>
								</div>
							</summary>
							<div class="collapse-content">
								<div class="p-4 bg-base-100 rounded-lg mt-2">
									<div class="flex flex-wrap gap-2">
										{#each gmAnswerState.sources as source}
											<div class="badge badge-outline badge-sm">{source}</div>
										{/each}
									</div>
								</div>
							</div>
						</details>
					{/if}

					<!-- GM Thoughts -->
					{#if gmThoughtsState}
						<details class="collapse collapse-arrow bg-base-200 border border-base-300">
							<summary class="collapse-title hover:bg-base-300 transition-colors duration-200">
								<div class="flex items-center gap-2">
									<span class="text-base">💭</span>
									<span class="font-medium">GM Thoughts</span>
								</div>
							</summary>
							<div class="collapse-content">
								<div class="p-4 bg-base-100 rounded-lg mt-2">
									<p class="text-sm whitespace-pre-wrap font-mono text-base-content/80">{gmThoughtsState}</p>
								</div>
							</div>
						</details>
					{/if}
				</div>

				<!-- Follow-up Suggestions -->
				{#if gmAnswerState?.followUpSuggestions && gmAnswerState.followUpSuggestions.length > 0}
					<div class="card bg-gradient-to-br from-info/10 to-success/10 shadow-sm border border-info/30">
						<div class="card-body p-4">
							<h4 class="card-title text-base text-info mb-3">
								<span class="text-base">💡</span> Follow-up Suggestions
							</h4>
							<div class="space-y-2">
								{#each gmAnswerState.followUpSuggestions as suggestion}
									<div class="alert alert-success py-2 px-3">
										<span class="text-success">💫</span>
										<span class="text-sm">{suggestion}</span>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{/if}

				<!-- Clarification Notice -->
				{#if gmAnswerState?.requiresClarification}
					<div class="alert alert-warning">
						<span class="text-warning">⚠️</span>
						<span class="text-sm">This question was ambiguous. Consider providing more specific details for a more accurate answer.</span>
					</div>
				{/if}
			</div>

			<!-- Enhanced Action Buttons -->
			<div class="flex flex-col sm:flex-row gap-3 mt-4 pt-4 border-t border-base-300">
				<button
					class="btn btn-primary btn-sm flex-1 hover:shadow-lg transition-all duration-200"
					onclick={() => onclose?.(true, { question, ...gmAnswerState })}
				>
					<span class="text-base">📝</span>
					Add to Context
				</button>
				<button
					class="btn btn-ghost btn-sm flex-1 hover:shadow-lg transition-all duration-200"
					onclick={() => onclose?.(true)}
				>
					<span class="text-base">✅</span>
					Close
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
