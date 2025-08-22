/**
 * Language prompt for JSON translation
 * Used to instruct AI to translate content while keeping JSON keys and enums in English
 * Optimized for clarity and conciseness
 */
export const LANGUAGE_PROMPT =
	'TRANSLATION RULES: JSON keys → English | Enum values (CAPITALS) → English | All other content → [TARGET_LANGUAGE]. Target: ';

/**
 * Detailed language instruction for complex scenarios
 */
export const DETAILED_LANGUAGE_PROMPT = 
	'Important! Each JSON key must stay as english but the value must be translated; Enums (LOW, MEDIUM, HIGH, or any fully capitalized value) must always remain in English! Translate to following language: ';

/**
 * Language validation checklist
 */
export const LANGUAGE_VALIDATION = `
LANGUAGE VALIDATION:
✓ JSON keys remain in English (e.g., "story", "characterName")
✓ Enum values stay UPPERCASE English (e.g., "HIGH", "MEDIUM", "LOW")
✓ String content translated to target language
✓ Technical terms appropriately localized
✓ Cultural context preserved where relevant
`;
