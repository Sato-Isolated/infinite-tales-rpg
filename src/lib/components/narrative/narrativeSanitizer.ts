/**
 * Narrative Markup Sanitizer
 * 
 * Provides lightweight sanitization and normalization for narrative markup
 * Focuses on fixing common issues while maintaining readability
 */

import type { NPCState } from '$lib/ai/agents/characterStatsAgent';

/**
 * Valid markup tags supported by the parser
 */
const VALID_MARKUP_TAGS = new Set([
  'speaker',
  'character',
  'highlight',
  'location',
  'time',
  'whisper',
  'br'
]);

/**
 * Self-contained tags that don't need closing tags
 */
const SELF_CONTAINED_TAGS = new Set([
  'br',
  'transition'
]);

/**
 * Sanitize narrative markup text
 * 
 * @param input - Raw narrative text with markup
 * @param enableNormalization - Whether to apply normalization (default: true)
 * @param npcState - Optional NPC state for validation (unused in simplified version)
 * @returns Sanitized markup text
 */
export function sanitizeNarrativeMarkup(
  input: string,
  enableNormalization: boolean = true,
  npcState?: NPCState
): string {
  if (!input) return '';

  let text = input;

  if (enableNormalization) {
    // 1. Normalize whitespace in tags: [ speaker : Marie ] → [speaker:Marie]
    text = text.replace(/\[\s*([a-zA-Z]+)\s*:\s*([^\]]+?)\s*\]/g, '[$1:$2]');
    text = text.replace(/\[\s*\/\s*([a-zA-Z]+)\s*\]/g, '[/$1]');

    // 2. Normalize tag case for opening and closing tags
    text = text.replace(/\[([A-Z]+)([:\]])/gi, (match, tagName, rest) => {
      return `[${tagName.toLowerCase()}${rest}`;
    });

    text = text.replace(/\[\/([A-Z]+)\]/gi, (match, tagName) => {
      return `[/${tagName.toLowerCase()}]`;
    });

    // 3. Move trailing punctuation inside preceding closing tags
    text = text.replace(/(\[\/[^\]]+\])([,.!?;:]+)/g, '$2$1');

    // 4. Merge adjacent identical tags
    // Example: [action]ouvre[/action] [action]la porte[/action] → [action]ouvre la porte[/action]
    text = text.replace(/(\[[^\]]+\])([^[]*)\[\/([^\]]+)\]\s+\[\3\]/g, '$1$2 ');
  }

  // 5. Fix malformed tags (missing closing bracket)
  // Pattern: [speaker:Marie Hello world! → [speaker:Marie]Hello world!
  text = text.replace(/\[([a-zA-Z]+:[^\]]+?)\s+([^[\]]*?)(?=\[|$)/g, '[$1]$2');

  // 6. Auto-close unclosed speaker and character tags
  const unclosedTags: string[] = [];

  // Track unclosed speaker tags
  const speakerMatches = text.match(/\[speaker:[^\]]+\]/g);
  const speakerCloses = text.match(/\[\/speaker\]/g);
  const openSpeakers = (speakerMatches?.length || 0) - (speakerCloses?.length || 0);

  if (openSpeakers > 0) {
    for (let i = 0; i < openSpeakers; i++) {
      unclosedTags.push('[/speaker]');
    }
  }

  // Track unclosed character tags
  const characterMatches = text.match(/\[character[:\]]/g);
  const characterCloses = text.match(/\[\/character\]/g);
  const openCharacters = (characterMatches?.length || 0) - (characterCloses?.length || 0);

  if (openCharacters > 0) {
    for (let i = 0; i < openCharacters; i++) {
      unclosedTags.push('[/character]');
    }
  }

  // Add closing tags at end
  if (unclosedTags.length > 0) {
    text += unclosedTags.join('');
  }

  // 7. Fix duplicate [br] tags - prevent consecutive [br] usage
  // Replace multiple consecutive [br] tags with a single one
  text = text.replace(/(\[br\]\s*){2,}/g, '[br]');
  
  // Also handle [br] with whitespace between them
  text = text.replace(/\[br\](\s*\[br\])+/g, '[br]');

  // 8. Strip unknown tags but keep inner text
  // 8. Strip unknown tags but keep inner text
  text = text.replace(/\[([a-zA-Z]+)(?::[^\]]+)?\](.*?)\[\/\1\]/gs, (match, tagName, content) => {
    if (VALID_MARKUP_TAGS.has(tagName.toLowerCase())) {
      return match; // Keep valid tags
    }
    return content; // Strip unknown tags, keep content
  });

  // Remove standalone unknown tags
  text = text.replace(/\[([a-zA-Z]+)(?::[^\]]+)?\]/g, (match, tagName) => {
    if (VALID_MARKUP_TAGS.has(tagName.toLowerCase()) || SELF_CONTAINED_TAGS.has(tagName.toLowerCase())) {
      return match; // Keep valid tags
    }
    return ''; // Remove unknown tags
  });

  return text;
}

/**
 * Validate markup text and return issues found
 * 
 * @param input - Text to validate
 * @returns Validation result with errors and warnings
 */
export function validateMarkupText(input: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for unknown tags
  const tagMatches = input.match(/\[([a-zA-Z]+)[:\]]/g);
  if (tagMatches) {
    tagMatches.forEach(match => {
      const tagName = match.match(/\[([a-zA-Z]+)/)?.[1];
      if (tagName && !VALID_MARKUP_TAGS.has(tagName.toLowerCase()) && !SELF_CONTAINED_TAGS.has(tagName.toLowerCase())) {
        errors.push(`Unknown markup tag: [${tagName}]`);
      }
    });
  }

  // Check for unclosed tags
  const speakerOpens = (input.match(/\[speaker:[^\]]+\]/g) || []).length;
  const speakerCloses = (input.match(/\[\/speaker\]/g) || []).length;
  if (speakerOpens !== speakerCloses) {
    warnings.push(`Mismatched speaker tags: ${speakerOpens} opening, ${speakerCloses} closing`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Legacy alias for sanitizeNarrativeMarkup
 * Provides backward compatibility with existing code
 */
export function sanitizeNarrativeText(input: string): string {
  return sanitizeNarrativeMarkup(input);
}
