<!--
	Speaker Component - Renders character dialogue
-->
<script lang="ts">
	import type { MarkupComponentProps } from '../types';
	import type { Snippet } from 'svelte';

	let { 
		node,
		children
	}: MarkupComponentProps & { children?: Snippet } = $props();

	const speakerName = $derived(node.attributes?.name || 'Unknown');
	const dialogue = $derived(node.content);
	const hasValidChildren = $derived(node.children && node.children.length > 0);
</script>

<div class="speaker-dialogue border-l-2 border-primary/30 pl-3 py-2 mb-3 bg-primary/5 rounded-r">
	<div class="speaker-name text-primary/80 text-sm font-medium mb-1">
		{speakerName}:
	</div>
	<div class="dialogue-content text-base-content italic">
		{#if hasValidChildren && children}
			<!-- Render children for nested content -->
			"{@render children()}"
		{:else}
			<!-- Fallback to plain content for simple cases -->
			"{dialogue}"
		{/if}
	</div>
</div>

<style>
	.speaker-dialogue {
		transition: all 0.2s ease;
	}

	.speaker-dialogue:hover {
		background-color: hsl(var(--p) / 0.08);
		border-color: hsl(var(--p) / 0.4);
	}
</style>