<script module lang="ts">
	import type { RenderedGameUpdate } from '$lib/game/logic/gameLogic';

	// Export the type properly so it can be imported by other components
	export interface StoryProgressionWithImageProps {
		storyTextRef?: HTMLElement;
		story: string;
		gameUpdates?: Array<RenderedGameUpdate | undefined>;
		stream_finished?: boolean;
	}
</script>

<script lang="ts">
	let {
		storyTextRef = $bindable(),
		story,
		gameUpdates = [],
		stream_finished = true
	}: StoryProgressionWithImageProps = $props();

	/**
	 * Clean AI-generated HTML and ensure DaisyUI class compatibility
	 */
	const cleanAIGeneratedHTML = (rawStory: string): string => {
		if (!rawStory) return '';

		return rawStory
			.replaceAll('\\n', '')
			.replaceAll('```html', '')
			.replaceAll('```', '')
			.replaceAll('<html>', '')
			.replaceAll('</html>', '')
			.replaceAll('_', ' ')
			.trim();
	};

	const cleanedStory = $derived(cleanAIGeneratedHTML(story));
</script>

<div bind:this={storyTextRef} class="scroll-mt-24">
	<article class="prose prose-lg max-w-none">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html cleanedStory}

		{#if !stream_finished}
			<span class="loading loading-dots loading-sm text-primary ml-2"></span>
		{/if}
	</article>

	<!-- Game updates - keep simple styling for gameplay info -->
	<div class="mt-4">
		{#each gameUpdates as gameUpdate}
			{#if gameUpdate}
				<p class="m-1 text-center text-sm capitalize">
					{gameUpdate.text} <span class={gameUpdate.color}>{gameUpdate.resourceText}</span>
				</p>
			{/if}
		{/each}
	</div>
</div>
