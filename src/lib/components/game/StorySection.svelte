<script lang="ts">
	// Import necessary components and types
	import type { AIConfig } from '$lib';
	import TTSComponent from '$lib/components/TTSComponent.svelte';
	import StoryProgressionWithImage, {
		type StoryProgressionWithImageProps
	} from '$lib/components/StoryProgressionWithImage.svelte';
	import * as gameLogic from '../../../routes/game/gameLogic';
	import type { GameActionState } from '$lib/ai/agents/gameAgent';
	import type { Story } from '$lib/ai/agents/storyAgent';

	export let currentGameActionState: GameActionState;
	export let gameActions: GameActionState[] = [];
	export let latestStoryProgressionState: StoryProgressionWithImageProps;
	export let showXLastStoryProgressions: number; // parent keeps state
	export let setShowXLastStoryProgressions: (n: number) => void;
	import type { RenderedGameUpdate } from '../../../routes/game/gameLogic';
	export let getRenderedGameUpdates: (
		gameState: GameActionState,
		playerId: string
	) => (RenderedGameUpdate | undefined)[];
	export let storyState: Story;
	export let isGameEnded: boolean;
	export let playerCharacterIdState: string;
	// optional binding for scrolling to latest story chunk
	export let storyTextRef: HTMLElement | undefined;

	const handleShowPrev = () => setShowXLastStoryProgressions(showXLastStoryProgressions + 1);
</script>

<div id="story" class="bg-base-100 mt-4 justify-items-center rounded-lg p-4 shadow-md">
	<button onclick={handleShowPrev} class="btn-xs w-full">Show Previous Story</button>
	{#if currentGameActionState?.story}
		{#each !latestStoryProgressionState.stream_finished ? [currentGameActionState] : gameActions.slice(-2 + showXLastStoryProgressions * -1, -1) as gameActionState (gameActionState.id)}
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
