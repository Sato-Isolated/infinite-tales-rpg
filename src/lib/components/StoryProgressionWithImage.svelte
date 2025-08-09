<script lang="ts">
	import { marked } from 'marked';
	import type { RenderedGameUpdate } from '../../routes/game/gameLogic';
	import { useLocalStorage } from '$lib/state/useLocalStorage.svelte';
	import type { AIConfig } from '$lib';

	type StoryProgressionWithImageProps = {
		storyTextRef?: HTMLElement;
		story: string;
		gameUpdates?: Array<RenderedGameUpdate | undefined>;
		// imagePrompt removed with AI image generation
		stream_finished?: boolean;
	};
	let {
		storyTextRef = $bindable(),
		story,
		gameUpdates = [],
		// imagePrompt removed
		stream_finished = true
	}: StoryProgressionWithImageProps = $props();
const aiConfigState = useLocalStorage<AIConfig>('aiConfigState');

	let rendered = (toRender: string) => {
		if (!toRender) return '';
		return (marked(toRender) as string)
			.replaceAll('\\n', '<br>')
			.replaceAll(' n ', '<br>')
			.replaceAll('\\&quot;', '&quot;')
			.replaceAll('```html', '')
			.replaceAll('```', '')
			.replaceAll('<html>', '')
			.replaceAll('</html>', '')
			.replaceAll('html', '')
			.replaceAll('_', ' ');
	};
</script>

<!-- TTS removed -->
<article
	bind:this={storyTextRef}
	class="prose prose-neutral m-auto mb-2 mt-2 scroll-mt-24"
	style="color: unset"
>
	<div id="story">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html rendered(story)}
	</div>
	<div id="gameUpdates mt-2">
		{#each gameUpdates.filter(Boolean) as gameUpdate}
			<p class="m-1 text-center text-sm capitalize">
				{gameUpdate!.text} <span class={gameUpdate!.color}>{gameUpdate!.resourceText}</span>
			</p>
		{/each}
	</div>
</article>
<!-- AI image generation removed -->
