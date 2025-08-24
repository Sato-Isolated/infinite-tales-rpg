<script lang="ts">
	// Import necessary components and types
	import type { AIConfig } from '$lib';
	import TTSComponent from '$lib/components/ui/media/TTSComponent.svelte';
	import StoryProgressionWithImage, {
		type StoryProgressionWithImageProps
	} from '$lib/components/game/story/StoryProgressionWithImage.svelte';
	import * as gameLogic from '$lib/game/logic/gameLogic';
	import type { GameActionState } from '$lib/ai/agents/gameAgent';
	import type { Story } from '$lib/ai/agents/storyAgent';
	import type { RenderedGameUpdate } from '$lib/game/logic/gameLogic';

	// Modern Svelte 5 props pattern with bindable support
	interface Props {
		currentGameActionState: GameActionState;
		gameActions?: GameActionState[];
		latestStoryProgressionState: StoryProgressionWithImageProps;
		showXLastStoryProgressions: number;
		setShowXLastStoryProgressions: (n: number) => void;
		getRenderedGameUpdates: (
			gameState: GameActionState,
			playerId: string
		) => (RenderedGameUpdate | undefined)[];
		storyState: Story;
		isGameEnded: boolean;
		playerCharacterIdState: string;
		storyTextRef?: HTMLElement;
	}

	// Use a single $props() call with bindable props
	let {
		currentGameActionState,
		gameActions = [],
		latestStoryProgressionState,
		showXLastStoryProgressions,
		setShowXLastStoryProgressions,
		getRenderedGameUpdates,
		storyState,
		isGameEnded,
		playerCharacterIdState,
		storyTextRef = $bindable()
	}: Props = $props();

	// Derived state for previous story actions
	const previousStoryActions = $derived.by(() => {
		if (!latestStoryProgressionState.stream_finished) {
			return [currentGameActionState];
		}
		const startIndex = Math.max(0, gameActions.length - 2 + showXLastStoryProgressions * -1);
		const endIndex = gameActions.length - 1;
		return gameActions.slice(startIndex, endIndex);
	});

	// Optimized event handler
	const handleShowPrev = () => setShowXLastStoryProgressions(showXLastStoryProgressions + 1);
</script>

<div id="story" class="bg-base-100 mt-4 justify-items-center rounded-lg p-4 shadow-md">
	<button onclick={handleShowPrev} class="btn-xs w-full">Show Previous Story</button>
	{#if currentGameActionState?.story}
		{#each previousStoryActions as gameActionState (gameActionState.id)}
			<StoryProgressionWithImage
				story={gameActionState.story}
				imagePrompt="{gameActionState.image_prompt} {storyState.general_image_prompt}"
				gameUpdates={getRenderedGameUpdates(gameActionState, playerCharacterIdState)}
			/>
			{#if (gameActionState as any)?.fallbackUsed}
				<small class="text-sm text-red-500"> For this action the fallback LLM was used.</small>
			{/if}
		{/each}
	{/if}
	<StoryProgressionWithImage
		bind:storyTextRef
		story={latestStoryProgressionState.story}
		imagePrompt={latestStoryProgressionState.imagePrompt}
		gameUpdates={latestStoryProgressionState.gameUpdates}
		stream_finished={latestStoryProgressionState.stream_finished}
	/>
	{#if latestStoryProgressionState.stream_finished && (currentGameActionState as any)?.fallbackUsed}
		<small class="text-sm text-red-500"> For this action the fallback LLM was used.</small>
	{/if}
	{#if isGameEnded}
		<StoryProgressionWithImage story={gameLogic.getGameEndedMessage()} />
	{/if}
</div>

<style>
	/* Local styles placeholder */
</style>
