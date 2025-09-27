<script module lang="ts">
	import type { RenderedGameUpdate } from '../../routes/game/gameLogic';
	
	export interface StoryProgressionProps {
		storyTextRef?: HTMLElement;
		story: string;
		gameUpdates?: Array<RenderedGameUpdate | undefined>;
		stream_finished?: boolean;
	}
</script>

<script lang="ts">
	import { marked } from 'marked';

	let {
		storyTextRef = $bindable(),
		story,
		gameUpdates = [],
		stream_finished = true
	}: StoryProgressionProps = $props();

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
		{#each gameUpdates as gameUpdate}
			{#if gameUpdate}
				<p class="m-1 text-center text-sm capitalize">
					{gameUpdate.text} <span class={gameUpdate.color}>{gameUpdate.resourceText}</span>
				</p>
			{/if}
		{/each}
	</div>
</article>