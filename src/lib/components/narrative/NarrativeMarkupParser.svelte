<script lang="ts">
	/**
	 * NarrativeMarkupParser - Converts structured narrative markup to styled HTML
	 * Replaces HTML generation in AI prompts with a cleaner, more maintainable system
	 */

	interface NarrativeMarkupParserProps {
		content: string;
	}

	let { content }: NarrativeMarkupParserProps = $props();

	/**
	 * Parse structured narrative markup into HTML with DaisyUI classes
	 */
	function parseNarrativeMarkup(text: string): string {
		if (!text) return '';

		let parsed = text;

		// Dialogue: [dialogue:Speaker]Text[/dialogue]
		parsed = parsed.replace(
			/\[dialogue:([^\]]+)\](.*?)\[\/dialogue\]/gs,
			'<div class="border-l-4 border-primary pl-4 py-2 mb-3 bg-base-200/30 rounded-r-lg"><strong class="text-primary text-sm uppercase tracking-wide">$1:</strong> <em class="text-primary font-medium">\'$2\'</em></div>'
		);

		// Action: [action]Text[/action]
		parsed = parsed.replace(
			/\[action\](.*?)\[\/action\]/gs,
			'<div class="border-l-3 border-info pl-3 py-1 mb-2 bg-info/5"><span class="font-semibold text-info">*$1*</span></div>'
		);

		// Atmosphere: [atmosphere]Text[/atmosphere]
		parsed = parsed.replace(
			/\[atmosphere\](.*?)\[\/atmosphere\]/gs,
			'<blockquote class="text-sm italic text-base-content/70 border-l-4 border-accent pl-4 my-3 bg-base-200/50 p-3 rounded-r-lg">$1</blockquote>'
		);

		// Emphasis: [emphasis]Text[/emphasis]
		parsed = parsed.replace(
			/\[emphasis\](.*?)\[\/emphasis\]/gs,
			'<strong class="font-bold text-primary">$1</strong>'
		);

		// Thought: [thought]Text[/thought]
		parsed = parsed.replace(
			/\[thought\](.*?)\[\/thought\]/gs,
			'<em class="italic text-secondary">$1</em>'
		);

		// Transition: [transition]
		parsed = parsed.replace(
			/\[transition\]/gs,
			'<div class="divider my-6 text-base-content/50">• • •</div>'
		);

		// Status effects with types: [status:success]Text[/status]
		parsed = parsed.replace(
			/\[status:success\](.*?)\[\/status\]/gs,
			'<div class="border-l-3 border-success pl-3 py-1 mb-2 bg-success/5"><span class="text-success font-semibold">✓ $1</span></div>'
		);

		parsed = parsed.replace(
			/\[status:warning\](.*?)\[\/status\]/gs,
			'<div class="border-l-3 border-warning pl-3 py-1 mb-2 bg-warning/5"><span class="text-warning font-semibold">⚠ $1</span></div>'
		);

		parsed = parsed.replace(
			/\[status:error\](.*?)\[\/status\]/gs,
			'<div class="border-l-3 border-error pl-3 py-1 mb-2 bg-error/5"><span class="text-error font-semibold">✗ $1</span></div>'
		);

		// Badge/Status effects: [badge]Text[/badge]
		parsed = parsed.replace(
			/\[badge\](.*?)\[\/badge\]/gs,
			'<div class="badge badge-accent mb-2">$1</div>'
		);

		// Paragraphs: Wrap remaining text in paragraphs
		// Split by double newlines and wrap each section
		const sections = parsed.split(/\n\s*\n/);
		const wrappedSections = sections.map(section => {
			const trimmed = section.trim();
			if (!trimmed) return '';
			
			// Don't wrap if already wrapped in a div/blockquote
			if (trimmed.startsWith('<div') || trimmed.startsWith('<blockquote') || trimmed.includes('class=')) {
				return trimmed;
			}
			
			return `<p class="text-base-content leading-relaxed mb-4">${trimmed}</p>`;
		});

		return wrappedSections.filter(s => s).join('\n\n');
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
