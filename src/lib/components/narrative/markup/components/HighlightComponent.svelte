<!--
	Highlight Component - Renders highlighted/important text
-->
<script lang="ts">
	import type { MarkupComponentProps } from '../types';
	import type { Snippet } from 'svelte';

	let { 
		node,
		children
	}: MarkupComponentProps & { children?: Snippet } = $props();
	
	const hasValidChildren = $derived(node.children && node.children.length > 0);
</script>

<span class="highlight-text font-semibold text-primary/90 px-2 py-1 bg-primary/10 rounded-md">
	{#if hasValidChildren && children}
		{@render children()}
	{:else}
		{node.content}
	{/if}
</span>