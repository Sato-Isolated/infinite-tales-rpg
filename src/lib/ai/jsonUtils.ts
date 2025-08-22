/**
 * Conservative JSON cleaning utilities for handling LLM responses with minimal invasiveness
 * Preserves content within JSON strings and only removes clear markdown wrappers
 */

/**
 * Attempts to repair incomplete JSON that may be truncated from streaming
 * Tries to close unclosed objects and arrays
 */
function tryRepairIncompleteJson(jsonText: string): string | null {
	try {
		// Try parsing as-is first
		JSON.parse(jsonText);
		return jsonText; // Already valid
	} catch {
		// Not valid JSON, try to repair
	}

	// Track braces and brackets to repair incomplete JSON
	let braceCount = 0;
	let bracketCount = 0;
	let lastCompletePosition = -1;

	for (let i = 0; i < jsonText.length; i++) {
		const char = jsonText[i];
		if (char === '{') braceCount++;
		else if (char === '}') braceCount--;
		else if (char === '[') bracketCount++;
		else if (char === ']') bracketCount--;

		// Track the last position where all braces/brackets were balanced
		if (braceCount === 0 && bracketCount === 0) {
			lastCompletePosition = i;
		}
	}

	// If we found a balanced position, truncate there
	if (lastCompletePosition > 0) {
		const truncated = jsonText.substring(0, lastCompletePosition + 1);
		try {
			JSON.parse(truncated);
			console.debug('Successfully truncated incomplete JSON');
			return truncated;
		} catch {
			// Truncation didn't help
		}
	}

	// Try to close unclosed braces/brackets
	let repaired = jsonText.trim();
	
	// Remove any incomplete trailing content that's clearly not JSON
	const lastValidChar = Math.max(
		repaired.lastIndexOf('}'),
		repaired.lastIndexOf(']'),
		repaired.lastIndexOf('"')
	);
	
	if (lastValidChar > 0) {
		// Find if there's incomplete content after the last valid character
		const afterLast = repaired.substring(lastValidChar + 1).trim();
		if (afterLast && !afterLast.match(/^[,\s}]]*$/)) {
			// There's incomplete content, truncate it
			repaired = repaired.substring(0, lastValidChar + 1);
		}
	}

	// Try to balance braces
	braceCount = 0;
	bracketCount = 0;
	
	for (const char of repaired) {
		if (char === '{') braceCount++;
		else if (char === '}') braceCount--;
		else if (char === '[') bracketCount++;
		else if (char === ']') bracketCount--;
	}

	// Add missing closing braces and brackets
	while (bracketCount > 0) {
		repaired += ']';
		bracketCount--;
	}
	while (braceCount > 0) {
		repaired += '}';
		braceCount--;
	}

	try {
		JSON.parse(repaired);
		console.debug('Successfully repaired incomplete JSON');
		return repaired;
	} catch {
		console.debug('Could not repair incomplete JSON');
		return null;
	}
}

/**
 * Conservative markdown code block removal - only removes clear markdown wrappers
 * Preserves any content that might be legitimate JSON data
 */
export function removeMarkdownCodeBlocks(text: string): string {
	// Only remove clear markdown code block patterns at the beginning and end
	let cleaned = text.trim();
	
	// Remove opening code block markers (only at the start)
	const openingPatterns = [
		/^```json\s*\n?/i,
		/^```javascript\s*\n?/i,
		/^```\s*\n?/
	];
	
	for (const pattern of openingPatterns) {
		cleaned = cleaned.replace(pattern, '');
	}
	
	// Remove closing code block markers (only at the end)
	cleaned = cleaned.replace(/\n?\s*```\s*$/, '');
	
	return cleaned.trim();
}

/**
 * Conservative text cleaning - only removes obvious LLM prefixes that prevent JSON parsing
 */
export function cleanLLMResponseText(text: string): string {
	let cleaned = text.trim();

	// Only remove very obvious LLM prefixes at the start
	const obviousPrefixes = [
		/^Here's?\s+the\s+JSON:?\s*/i,
		/^JSON\s+response:?\s*/i
	];

	for (const pattern of obviousPrefixes) {
		cleaned = cleaned.replace(pattern, '');
	}

	return cleaned.trim();
}

/**
 * Conservative JSON extraction - tries to preserve content as much as possible
 */
export function extractJsonConservatively(text: string): string {
	if (!text || typeof text !== 'string') {
		throw new Error('Input text is required and must be a string');
	}

	console.debug('Attempting to extract JSON from text (length:', text.length, ')');
	console.debug('First 200 chars:', text.substring(0, 200));

	// Step 1: Try parsing as-is (most conservative)
	try {
		JSON.parse(text.trim());
		console.debug('JSON extracted as-is without cleaning');
		return text.trim();
	} catch {
		// Continue to cleaning steps
	}

	// Step 2: Remove only markdown code blocks
	let cleaned = removeMarkdownCodeBlocks(text);
	try {
		JSON.parse(cleaned);
		console.debug('JSON extracted after removing markdown code blocks');
		return cleaned;
	} catch {
		// Continue to next step
	}

	// Step 3: Remove obvious LLM prefixes
	cleaned = cleanLLMResponseText(cleaned);
	try {
		JSON.parse(cleaned);
		console.debug('JSON extracted after removing LLM prefixes');
		return cleaned;
	} catch {
		// Continue to next step
	}

	// Step 4: Try to repair incomplete JSON (for streaming issues)
	const firstBrace = cleaned.indexOf('{');
	if (firstBrace !== -1) {
		const fromFirstBrace = cleaned.substring(firstBrace);
		const repairedJson = tryRepairIncompleteJson(fromFirstBrace);
		if (repairedJson) {
			try {
				JSON.parse(repairedJson);
				console.debug('JSON repaired successfully');
				return repairedJson;
			} catch {
				console.debug('Repaired JSON still invalid');
			}
		}
	}

	// Step 5: Extract content between first { and last } (most invasive)
	const lastBrace = cleaned.lastIndexOf('}');
	
	if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
		const extracted = cleaned.substring(firstBrace, lastBrace + 1);
		console.debug('Extracted text between braces:', extracted.substring(0, 100));
		
		try {
			JSON.parse(extracted);
			console.debug('JSON extracted by finding braces boundaries');
			return extracted;
		} catch (parseError) {
			console.debug('Final parse attempt failed:', parseError);
		}
	}
	
	// Step 6: Try to extract from original text (fallback for streaming issues)
	const originalFirstBrace = text.indexOf('{');
	const originalLastBrace = text.lastIndexOf('}');
	
	if (originalFirstBrace !== -1 && originalLastBrace !== -1 && originalFirstBrace < originalLastBrace) {
		const originalExtracted = text.substring(originalFirstBrace, originalLastBrace + 1);
		console.debug('Trying original text extraction:', originalExtracted.substring(0, 100));
		
		try {
			JSON.parse(originalExtracted);
			console.debug('JSON extracted from original text boundaries');
			return originalExtracted;
		} catch {
			console.debug('Original text extraction also failed');
		}
	}
	
	console.error('All JSON extraction attempts failed for text:', text.substring(0, 500));
	throw new Error('Could not extract valid JSON from text');
}

/**
 * Main JSON extraction function - uses conservative approach with minimal cleaning
 * This is the main function that should be used by LLM providers
 */
export function extractAndCleanJson(text: string): string {
	return extractJsonConservatively(text);
}

/**
 * Safe JSON parsing that uses the conservative cleaning utilities
 * Returns parsed object or throws with detailed error information
 */
export function parseCleanedJson(text: string): object {
	const cleaned = extractAndCleanJson(text);
	
	try {
		return JSON.parse(cleaned);
	} catch (parseError) {
		const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
		console.error('JSON parsing failed after conservative cleaning:', {
			originalText: text.substring(0, 100) + '...',
			cleanedText: cleaned.substring(0, 100) + '...',
			error: errorMsg
		});
		throw new Error(`JSON parsing failed: ${errorMsg}`);
	}
}
