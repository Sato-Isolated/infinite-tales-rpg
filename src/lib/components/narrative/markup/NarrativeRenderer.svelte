<!--
	Modern Narrative Renderer
	Renders parsed XML markup nodes as styled Svelte components
-->
<script lang="ts">
	import type { NarrativeRendererProps, ParseResult } from './types';
	import { MarkupParser } from './parser';
	
	// Composants spécialisés
	import SpeakerComponent from './components/SpeakerComponent.svelte';
	import CharacterComponent from './components/CharacterComponent.svelte';
	import HighlightComponent from './components/HighlightComponent.svelte';
	import LocationComponent from './components/LocationComponent.svelte';
	import TimeComponent from './components/TimeComponent.svelte';
	import WhisperComponent from './components/WhisperComponent.svelte';
	import ActionComponent from './components/ActionComponent.svelte';
	import ThoughtComponent from './components/ThoughtComponent.svelte';
	import BreakComponent from './components/BreakComponent.svelte';
	import LineBreakComponent from './components/LineBreakComponent.svelte';

	let { 
		content, 
		showErrors = false,
		onParseError
	}: NarrativeRendererProps = $props();

	const parser = new MarkupParser();
	
	const parseResult = $derived((): ParseResult => {
		const result = parser.parse(content);
		if (result.errors.length > 0 && onParseError) {
			onParseError(result.errors);
		}
		return result;
	});

	const hasErrors = $derived(parseResult().errors.filter((e: any) => e.severity === 'error').length > 0);
	const hasWarnings = $derived(parseResult().warnings.filter((w: any) => w.severity === 'warning').length > 0);
	const errorList = $derived(parseResult().errors.filter((e: any) => e.severity === 'error'));
	const warningList = $derived(parseResult().warnings.filter((w: any) => w.severity === 'warning'));
</script>

{#snippet renderNodeRecursive(node: any)}
	{#if node.type === 'text'}
		<span class="narrative-text">{node.content}</span>
	{:else if node.type === 'speaker'}
		<SpeakerComponent {node}>
			{#if node.children && node.children.length > 0}
				{#each node.children as child}
					{@render renderNodeRecursive(child)}
				{/each}
			{/if}
		</SpeakerComponent>
	{:else if node.type === 'character'}
		<CharacterComponent {node}>
			{#if node.children && node.children.length > 0}
				{#each node.children as child}
					{@render renderNodeRecursive(child)}
				{/each}
			{/if}
		</CharacterComponent>
	{:else if node.type === 'highlight'}
		<HighlightComponent {node}>
			{#if node.children && node.children.length > 0}
				{#each node.children as child}
					{@render renderNodeRecursive(child)}
				{/each}
			{/if}
		</HighlightComponent>
	{:else if node.type === 'location'}
		<LocationComponent {node}>
			{#if node.children && node.children.length > 0}
				{#each node.children as child}
					{@render renderNodeRecursive(child)}
				{/each}
			{/if}
		</LocationComponent>
	{:else if node.type === 'time'}
		<TimeComponent {node}>
			{#if node.children && node.children.length > 0}
				{#each node.children as child}
					{@render renderNodeRecursive(child)}
				{/each}
			{/if}
		</TimeComponent>
	{:else if node.type === 'whisper'}
		<WhisperComponent {node}>
			{#if node.children && node.children.length > 0}
				{#each node.children as child}
					{@render renderNodeRecursive(child)}
				{/each}
			{/if}
		</WhisperComponent>
	{:else if node.type === 'action'}
		<ActionComponent {node}>
			{#if node.children && node.children.length > 0}
				{#each node.children as child}
					{@render renderNodeRecursive(child)}
				{/each}
			{/if}
		</ActionComponent>
	{:else if node.type === 'thought'}
		<ThoughtComponent {node}>
			{#if node.children && node.children.length > 0}
				{#each node.children as child}
					{@render renderNodeRecursive(child)}
				{/each}
			{/if}
		</ThoughtComponent>
	{:else if node.type === 'break'}
		<BreakComponent />
	{:else if node.type === 'line-break'}
		<LineBreakComponent {node} />
	{/if}
{/snippet}

<div class="narrative-content" class:has-errors={hasErrors}>
	{#each parseResult().nodes as node}
		{@render renderNodeRecursive(node)}
	{/each}

	{#if showErrors && (hasErrors || hasWarnings)}
		<div class="error-section mt-4 p-3 bg-error/10 border border-error/20 rounded">
			{#if hasErrors}
				<h4 class="text-error font-semibold mb-2">Parsing Errors</h4>
				<ul class="text-error text-sm space-y-1">
					{#each errorList as error}
						<li>
							<strong>Position {error.position}:</strong> {error.message}
							{#if error.suggestion}
								<br><em class="text-error/70">Suggestion: {error.suggestion}</em>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}

			{#if hasWarnings}
				<h4 class="text-warning font-semibold mb-2 {hasErrors ? 'mt-4' : ''}">Warnings</h4>
				<ul class="text-warning text-sm space-y-1">
					{#each warningList as warning}
						<li>
							<strong>Position {warning.position}:</strong> {warning.message}
							{#if warning.suggestion}
								<br><em class="text-warning/70">Suggestion: {warning.suggestion}</em>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>

<style>
	.narrative-content {
		font-size: 1rem;
		line-height: 1.75;
		color: hsl(var(--bc));
	}

	.narrative-text {
		margin-right: 0.25rem;
	}

	.has-errors {
		border-left: 4px solid hsl(var(--er));
		padding-left: 1rem;
	}

	/* Ensure proper spacing between components */
	.narrative-content :global(.speaker-dialogue + .narrative-text) {
		margin-left: 0;
	}
</style>