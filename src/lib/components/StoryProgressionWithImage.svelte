<script module lang="ts">
	import type { RenderedGameUpdate } from '../../routes/game/gameLogic';

	// Export the type properly so it can be imported by other components
	export interface StoryProgressionWithImageProps {
		storyTextRef?: HTMLElement;
		story: string;
		gameUpdates?: Array<RenderedGameUpdate | undefined>;
		imagePrompt?: string;
		stream_finished?: boolean;
	}
</script>

<script lang="ts">
	import AIGeneratedImage from '$lib/components/AIGeneratedImage.svelte';
	import { useLocalStorage } from '$lib/state/useLocalStorage.svelte';
	import TTSComponent from '$lib/components/TTSComponent.svelte';
	import type { AIConfig } from '$lib';

	let {
		storyTextRef = $bindable(),
		story,
		gameUpdates = [],
		imagePrompt = '',
		stream_finished = true
	}: StoryProgressionWithImageProps = $props();
	const ttsVoiceState = useLocalStorage<string>('ttsVoice');
	const aiConfigState = useLocalStorage<AIConfig>('aiConfigState');

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

{#if !aiConfigState.value?.disableAudioState}
	<div class="mt-4 flex">
		<TTSComponent
			text={stream_finished ? story?.replaceAll(/<[^>]*>/g, '').replaceAll('_', ' ') : ''}
			voice={ttsVoiceState.value}
		/>
	</div>
{/if}
<div bind:this={storyTextRef} class="scroll-mt-24">
	<article class="prose prose-lg max-w-none">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html cleanedStory}

		{#if !stream_finished}
			<span class="loading loading-dots loading-sm ml-2 text-primary"></span>
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
{#if imagePrompt?.trim() && !aiConfigState.value?.disableImagesState}
	<AIGeneratedImage showLoadingSpinner={false} {imagePrompt} showGenerateButton={false} />
{/if}
