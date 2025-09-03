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
	 * Parse structured narrative markup into HTML with subtle, book-like styling
	 * Focus on improving readability without breaking immersion
	 */
	function parseNarrativeMarkup(text: string): string {
		if (!text) return '';

		let parsed = text;

		// Speaker dialogue: [speaker:Name]dialogue[/speaker] - Subtle dialogue formatting
		parsed = parsed.replace(
			/\[speaker:([^\]]+)\](.*?)\[\/speaker\]/gs,
			'<div class="border-l-2 border-primary/30 pl-3 py-1 mb-2 bg-primary/5 rounded-r"><span class="text-primary/80 text-sm font-medium">$1:</span> <span class="text-base-content italic">"$2"</span></div>'
		);

		// Highlight: [highlight]important text[/highlight] - Subtle emphasis for key elements
		parsed = parsed.replace(
			/\[highlight\](.*?)\[\/highlight\]/gs,
			'<span class="font-semibold text-primary/90 px-1 py-0.5 bg-primary/10 rounded">$1</span>'
		);

		// Location: [location]place name[/location] - Help with spatial orientation
		parsed = parsed.replace(
			/\[location\](.*?)\[\/location\]/gs,
			'<span class="font-medium text-accent/90 italic">$1</span>'
		);

		// Time: [time]temporal indicator[/time] - For transitions and time passage
		parsed = parsed.replace(
			/\[time\](.*?)\[\/time\]/gs,
			'<span class="text-sm text-base-content/60 font-medium tracking-wide">$1</span>'
		);

		// Whisper: [whisper]quiet dialogue[/whisper] - For subtle/quiet speech
		parsed = parsed.replace(
			/\[whisper\](.*?)\[\/whisper\]/gs,
			'<span class="text-sm italic text-base-content/70">[$1]</span>'
		);

		// Line break: [br] - Insert line breaks for better text structure using DaisyUI divider
		parsed = parsed.replace(
			/\[br\]/gs,
			'<div class="divider my-2"></div>'
		);

		// Emotion: [emotion]feeling description[/emotion] - Subtle emotional context
		parsed = parsed.replace(
			/\[emotion\](.*?)\[\/emotion\]/gs,
			'<em class="text-secondary/80">$1</em>'
		);

		// Action: [action]character action[/action] - Important physical actions
		parsed = parsed.replace(
			/\[action\](.*?)\[\/action\]/gs,
			'<span class="font-medium text-info/90">$1</span>'
		);

		// Atmosphere: [atmosphere]environmental description[/atmosphere] - Setting descriptions
		parsed = parsed.replace(
			/\[atmosphere\](.*?)\[\/atmosphere\]/gs,
			'<div class="text-base-content/80 italic border-l-2 border-accent/20 pl-3 my-2 bg-accent/5 rounded-r py-1">$1</div>'
		);

		// Transition: [transition] - Scene breaks
		parsed = parsed.replace(
			/\[transition\]/gs,
			'<div class="divider my-4 text-base-content/40">• • •</div>'
		);

		// Thought: [thought]internal monologue[/thought] - Character thoughts
		parsed = parsed.replace(
			/\[thought\](.*?)\[\/thought\]/gs,
			'<em class="text-secondary/70 font-light">($1)</em>'
		);

		// Status indicators (kept minimal for important game states)
		parsed = parsed.replace(
			/\[status:success\](.*?)\[\/status\]/gs,
			'<span class="text-success font-medium">$1</span>'
		);

		parsed = parsed.replace(
			/\[status:warning\](.*?)\[\/status\]/gs,
			'<span class="text-warning font-medium">$1</span>'
		);

		parsed = parsed.replace(
			/\[status:error\](.*?)\[\/status\]/gs,
			'<span class="text-error font-medium">$1</span>'
		);

		// Badge for temporary effects (subtle)
		parsed = parsed.replace(
			/\[badge\](.*?)\[\/badge\]/gs,
			'<span class="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-medium">$1</span>'
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
