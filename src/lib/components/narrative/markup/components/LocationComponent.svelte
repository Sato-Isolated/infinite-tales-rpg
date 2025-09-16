<!--
	Location Component - Renders location references
-->
<script lang="ts">
	import type { MarkupComponentProps } from '../types';
	import type { Snippet } from 'svelte';

	let { 
		node,
		children
	}: MarkupComponentProps & { children?: Snippet } = $props();

	const locationName = $derived(node.attributes?.name || 'Unknown Location');
	const hasValidChildren = $derived(node.children && node.children.length > 0);
</script>

<span 
	class="location-mention font-medium text-accent/90 italic px-1 py-0.5 hover:bg-accent/10 rounded transition-colors"
	title="Location: {locationName}"
>
	{#if hasValidChildren && children}
		{@render children()}
	{:else}
		{locationName}
	{/if}
</span>