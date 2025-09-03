<script lang="ts">
	/**
	 * NarrativeMarkupParser - Converts structured narrative markup to styled HTML
	 * Replaces HTML generation in AI prompts with a cleaner, more maintainable system
	 * Enhanced with UUID resolution for NPCs and validation for unknown markup
	 */

	import type { NPCState } from '$lib/ai/agents/characterStatsAgent';
	import { createNPCUuidResolver } from './npcUuidResolver';

	interface NarrativeMarkupParserProps {
		content: string;
		npcState?: NPCState;
		enableValidation?: boolean;
	}

	let { content, npcState = {}, enableValidation = true }: NarrativeMarkupParserProps = $props();

	/**
	 * Valid markup tags that are supported by this parser
	 */
	const VALID_MARKUP_TAGS = new Set([
		'speaker',
		'character',
		'highlight',
		'location',
		'time',
		'whisper',
		'br',
		'emotion',
		'action',
		'atmosphere',
		'transition',
		'thought',
		'status',
		'badge'
	]);

	/**
	 * Parse structured narrative markup into HTML with subtle, book-like styling
	 * Focus on improving readability without breaking immersion
	 * Enhanced with NPC UUID resolution and validation
	 */
	function parseNarrativeMarkup(text: string): string {
		if (!text) return '';

		let parsed = text;
		const resolver = createNPCUuidResolver(npcState);

		// Track unknown tags for validation
		const unknownTags: string[] = [];
		const malformedTags: string[] = [];

		// Detect malformed speaker tags (missing closing tag)
		const unclosedSpeakerMatches = parsed.match(/\[speaker:[^\]]+\](?![^[]*\[\/speaker\])/g);
		if (unclosedSpeakerMatches && enableValidation) {
			unclosedSpeakerMatches.forEach(match => {
				malformedTags.push(`Unclosed speaker tag: ${match} (missing [/speaker])`);
			});
		}

		// Detect malformed character tags (missing closing tag)
		const unclosedCharacterMatches = parsed.match(/\[character:[^\]]+\](?![^[]*\[\/character\])/g);
		if (unclosedCharacterMatches && enableValidation) {
			unclosedCharacterMatches.forEach(match => {
				malformedTags.push(`Unclosed character tag: ${match} (missing [/character])`);
			});
		}

		// Character references with UUID resolution: [character:uuid]reference[/character]
		parsed = parsed.replace(
			/\[character:([^\]]+)\](.*?)\[\/character\]/gs,
			(match, uuid, content) => {
				const result = resolver.resolveUUID(uuid);
				// Note: resolver.resolveUUID() already handles warning throttling
				// so we don't need to log additional warnings here
				return `<span class="font-semibold text-secondary/90 px-1 py-0.5 bg-secondary/10 rounded" title="NPC: ${result.displayName}">${content}</span>`;
			}
		);

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
		parsed = parsed.replace(/\[br\]/gs, '<div class="divider my-2"></div>');

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

		// Validation: Check for unknown markup tags
		if (enableValidation) {
			const tagMatches = parsed.match(/\[([a-zA-Z]+)[:\]]/g);
			if (tagMatches) {
				tagMatches.forEach((match) => {
					const tagName = match.match(/\[([a-zA-Z]+)/)?.[1];
					if (tagName && !VALID_MARKUP_TAGS.has(tagName)) {
						unknownTags.push(tagName);
					}
				});
			}

			// Log unknown tags for debugging
			if (unknownTags.length > 0) {
				console.warn('Unknown markup tags detected:', unknownTags);
				console.info('Valid tags:', Array.from(VALID_MARKUP_TAGS).sort());
			}

			// Log malformed tags for debugging
			if (malformedTags.length > 0) {
				console.warn('Malformed markup tags detected:', malformedTags);
				console.info('Remember: All opening tags need closing tags, e.g., [speaker:Name]text[/speaker]');
			}

			// Optional: Strip unknown tags (uncomment if desired)
			// parsed = parsed.replace(/\[([a-zA-Z]+)(?::[^\]]+)?\](.*?)\[\/\1\]/gs, '$2');
		}

		// Paragraphs: Wrap remaining text in paragraphs
		// Split by double newlines and wrap each section
		const sections = parsed.split(/\n\s*\n/);
		const wrappedSections = sections.map((section) => {
			const trimmed = section.trim();
			if (!trimmed) return '';

			// Don't wrap if already wrapped in a div/blockquote
			if (
				trimmed.startsWith('<div') ||
				trimmed.startsWith('<blockquote') ||
				trimmed.includes('class=')
			) {
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
