<!--
	Character Component - Renders character mentions
-->
<script lang="ts">
	import type { MarkupComponentProps } from '../types';
	import type { Snippet } from 'svelte';

	let { 
		node,
		children
	}: MarkupComponentProps & { children?: Snippet } = $props();

	const characterName = $derived(node.attributes?.name || 'Unknown Character');
	const characterId = $derived(node.attributes?.id);
	const hasValidChildren = $derived(node.children && node.children.length > 0);
</script>

<span 
	class="character-mention font-semibold text-secondary/90 px-2 py-1 bg-secondary/10 rounded-md hover:bg-secondary/15 transition-colors cursor-pointer"
	title={characterId ? `Character ID: ${characterId}` : characterName}
	role="button"
	tabindex="0"
>
	{#if hasValidChildren && children}
		{@render children()}
	{:else}
		{characterName}
	{/if}
</span>