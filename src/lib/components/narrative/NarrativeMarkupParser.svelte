<script lang="ts">
	/**
	 * NarrativeMarkupParser - Simplified narrative markup to styled HTML converter
	 * Focuses on core functionality with robust error handling
	 * No UUID dependencies - character names used directly
	 */

	interface NarrativeMarkupParserProps {
		content: string;
	}

	let { content }: NarrativeMarkupParserProps = $props();

	/**
	 * Core supported markup tags - simplified set for better AI adoption
	 */
	const CORE_MARKUP_TAGS = new Set([
		'speaker',
		'character',
		'highlight',
		'location',
		'time',
		'whisper',
		'br'
	]);

	/**
	 * Parse simplified narrative markup into HTML with clean styling
	 * Error-tolerant approach - unknown tags are silently ignored
	 * No UUID dependencies - uses character names directly
	 */
	function parseNarrativeMarkup(text: string): string {
		if (!text) return '';

		let parsed = text;

		// 1. Speaker dialogue: [speaker:Name]dialogue[/speaker]
		parsed = parsed.replace(
			/\[speaker:([^\]]+)\](.*?)\[\/speaker\]/gs,
			'<div class="border-l-2 border-primary/30 pl-3 py-1 mb-2 bg-primary/5 rounded-r"><span class="text-primary/80 text-sm font-medium">$1:</span> <span class="text-base-content italic">"$2"</span></div>'
		);

		

		// 2. Character mentions: [character]Name[/character] - no UUID needed
		parsed = parsed.replace(
			/\[character\](.*?)\[\/character\]/gs,
			'<span class="font-semibold text-secondary/90 px-1 py-0.5 bg-secondary/10 rounded">$1</span>'
		);

		parsed = parsed.replace(
			/\[specific_role:([^\]]+)\](.*?)\[\/specific_role\]/gs,
			'<span class="font-semibold text-secondary/90 px-1 py-0.5 bg-secondary/10 rounded">$2</span>'
		);

		// 3. Highlight important text: [highlight]text[/highlight]
		parsed = parsed.replace(
			/\[highlight\](.*?)\[\/highlight\]/gs,
			'<span class="font-semibold text-primary/90 px-1 py-0.5 bg-primary/10 rounded">$1</span>'
		);

		// 4. Location mentions: [location]place[/location]
		parsed = parsed.replace(
			/\[location\](.*?)\[\/location\]/gs,
			'<span class="font-medium text-accent/90 italic">$1</span>'
		);

		// 5. Time indicators: [time]temporal indicator[/time]
		parsed = parsed.replace(
			/\[time\](.*?)\[\/time\]/gs,
			'<span class="text-sm text-base-content/60 font-medium tracking-wide">$1</span>'
		);

		// 6. Whispers: [whisper]quiet text[/whisper]
		parsed = parsed.replace(
			/\[whisper\](.*?)\[\/whisper\]/gs,
			'<span class="text-sm italic text-base-content/70">[$1]</span>'
		);

		// 7. Line breaks: [br]
		parsed = parsed.replace(/\[br\]/gs, '<div class="divider">~</div>');

		// Remove unknown tags silently (error-tolerant approach)
		// This prevents broken rendering if AI uses unexpected tags
		parsed = parsed.replace(/\[([a-zA-Z]+)(?::[^\]]+)?\](.*?)\[\/\1\]/gs, '$2');
		parsed = parsed.replace(/\[([a-zA-Z]+)(?::[^\]]+)?\]/g, '');

		// Wrap in paragraphs for better readability
		const sections = parsed.split(/\n\s*\n/);
		const wrappedSections = sections.map((section) => {
			const trimmed = section.trim();
			if (!trimmed) return '';

			// Don't wrap if already contains HTML elements
			if (trimmed.includes('<div') || trimmed.includes('class=')) {
				return trimmed;
			}

			return `<p class="text-base-content leading-relaxed mb-4">${trimmed}</p>`;
		});

		return wrappedSections.filter((s) => s).join('\n\n');
	}

	const parsedContent = $derived(parseNarrativeMarkup(content));
</script>

<div class="narrative-content">
	{@html parsedContent}
</div>

<style>
	.narrative-content {
		font-size: 1rem;
		line-height: 1.75;
	}

	/* Remove bottom margin from last paragraph */
	.narrative-content :global(p:last-child) {
		margin-bottom: 0;
	}
</style>
