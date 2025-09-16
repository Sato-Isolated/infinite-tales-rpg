<!--
	Whisper Component - Renders whispered/quiet dialogue
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

<span class="whisper-text text-sm italic text-base-content/70 px-1">
	{#if hasValidChildren && children}
		[{@render children()}]
	{:else}
		[{node.content}]
	{/if}
</span>