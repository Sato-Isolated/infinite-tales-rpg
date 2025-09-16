<!--
	Modern XML-based Narrative Markup Parser
	Complete replacement of old @ prefix and [tag] systems
	NO BACKWARDS COMPATIBILITY - Clean XML-only implementation
-->
<script lang="ts">
	import NarrativeRenderer from './markup/NarrativeRenderer.svelte';

	interface NarrativeMarkupParserProps {
		content: string;
		showErrors?: boolean;
		onParseError?: (errors: any[]) => void;
	}

	let { 
		content, 
		showErrors = false,
		onParseError 
	}: NarrativeMarkupParserProps = $props();
</script>

<NarrativeRenderer 
	{content} 
	{showErrors} 
	{onParseError} 
/>
