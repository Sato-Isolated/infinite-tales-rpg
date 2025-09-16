/**
 * Modern XML Narrative Markup Sanitizer
 * Simple validation and error reporting for XML markup system
 * NO BACKWARDS COMPATIBILITY with old @ prefix or [tag] systems
 */

import type { ParseResult } from './markup/types';
import { MarkupParser } from './markup/parser';

/**
 * Validate XML narrative markup text
 * 
 * @param input - XML markup text to validate
 * @returns Validation result with errors and warnings
 */
export function validateXmlMarkup(input: string): {
	isValid: boolean;
	errors: string[];
	warnings: string[];
	suggestions: string[];
} {
	if (!input?.trim()) {
		return {
			isValid: true,
			errors: [],
			warnings: [],
			suggestions: []
		};
	}

	const parser = new MarkupParser();
	const result: ParseResult = parser.parse(input);

	const errors = result.errors
		.filter(e => e.severity === 'error')
		.map(e => `Position ${e.position}: ${e.message}`);

	const warnings = result.warnings
		.filter(w => w.severity === 'warning')
		.map(w => `Position ${w.position}: ${w.message}`);

	const suggestions = result.errors
		.filter(e => e.suggestion)
		.map(e => e.suggestion!);

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
		suggestions
	};
}

/**
 * Clean and normalize XML markup text
 * Basic whitespace and formatting cleanup
 * 
 * @param input - Raw XML markup text
 * @returns Cleaned markup text
 */
export function cleanXmlMarkup(input: string): string {
	if (!input) return '';

	let cleaned = input;

	// Normalize whitespace around tags
	cleaned = cleaned.replace(/\s*<\s*/g, '<');
	cleaned = cleaned.replace(/\s*>\s*/g, '>');
	cleaned = cleaned.replace(/\s*\/\s*>/g, '/>');
	
	// Fix spacing in closing tags like </ speaker > to </speaker>
	cleaned = cleaned.replace(/<\s*\/\s*/g, '</');

	// Normalize attribute spacing - fix spaces around =
	cleaned = cleaned.replace(/\s*=\s*/g, '=');
	cleaned = cleaned.replace(/=\s*"/g, '="');
	cleaned = cleaned.replace(/"\s*>/g, '">');
	cleaned = cleaned.replace(/"\s*\/>/g, '"/>');

	// Clean up excessive whitespace
	cleaned = cleaned.replace(/\s+/g, ' ');
	cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');

	return cleaned.trim();
}

/**
 * Legacy alias for compatibility - validates XML markup
 */
export function validateMarkupText(input: string) {
	return validateXmlMarkup(input);
}

/**
 * Legacy alias for compatibility - cleans XML markup
 */
export function sanitizeNarrativeMarkup(input: string): string {
	return cleanXmlMarkup(input);
}

/**
 * Legacy alias for compatibility - cleans XML markup
 */
export function sanitizeNarrativeText(input: string): string {
	return cleanXmlMarkup(input);
}
