<!--
	Action Component - Renders action descriptions
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

<span class="action-text font-medium text-warning/80 italic px-1">
	{#if hasValidChildren && children}
		{@render children()}
	{:else}
		{node.content}
	{/if}
</span>