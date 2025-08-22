/**
 * Language prompt for JSON translation
 * Used to instruct AI to translate content while keeping JSON keys and enums in English
 */
export const LANGUAGE_PROMPT =
	'Important! Each JSON key must stay as english but the value must be translated; Enums (LOW, MEDIUM, HIGH, or any fully capitalized value) must always remain in English! Translate to following language: ';
