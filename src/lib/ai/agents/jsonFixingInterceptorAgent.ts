import { THINKING_BUDGET } from '../geminiProvider';
import type { LLM, LLMRequest } from '../llm';

/**
 * Maximum allowed size for JSON input to prevent resource exhaustion
 */
const MAX_JSON_SIZE = 50000; // 50KB limit
const MAX_ERROR_MESSAGE_SIZE = 1000; // 1KB limit

/**
 * Sanitizes input to prevent prompt injection attacks
 */
function sanitizeInput(input: string, maxLength: number): string {
	if (typeof input !== 'string') {
		throw new Error('Input must be a string');
	}

	// Truncate if too long
	if (input.length > maxLength) {
		input = input.substring(0, maxLength);
	}

	// Remove potential prompt injection patterns
	const sanitized = input
		// Remove system prompt markers
		.replace(/\[SYSTEM\]|\[ASSISTANT\]|\[USER\]/gi, '')
		// Remove instruction-like patterns
		.replace(/ignore\s+previous\s+instructions/gi, '')
		.replace(/you\s+are\s+now/gi, '')
		.replace(/forget\s+your\s+role/gi, '')
		// Remove script tags and javascript
		.replace(/<script[^>]*>.*?<\/script>/gis, '')
		.replace(/javascript:/gi, '')
		// Remove potential code injection
		.replace(/eval\s*\(/gi, '')
		.replace(/function\s*\(/gi, '');

	return sanitized;
}

/**
 * Validates that input appears to be valid JSON structure
 */
function validateJSONStructure(json: string): void {
	// Basic structural validation - must start with { or [
	const trimmed = json.trim();
	if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
		throw new Error('Input does not appear to be valid JSON structure');
	}

	// Check for balanced braces/brackets (basic validation)
	let braceCount = 0;
	let bracketCount = 0;
	for (const char of trimmed) {
		if (char === '{') braceCount++;
		if (char === '}') braceCount--;
		if (char === '[') bracketCount++;
		if (char === ']') bracketCount--;
	}

	if (braceCount !== 0 || bracketCount !== 0) {
		throw new Error('JSON structure appears to have unbalanced braces/brackets');
	}
}

export class JsonFixingInterceptorAgent {
	llm: LLM;

	constructor(llm: LLM) {
		this.llm = llm;
	}

	async fixJSON(json: string, error: string): Promise<object | undefined> {
		try {
			// Input validation and sanitization
			if (!json || !error) {
				throw new Error('JSON and error message are required');
			}

			// Size limits to prevent resource exhaustion
			if (json.length > MAX_JSON_SIZE) {
				throw new Error(`JSON input too large. Maximum size: ${MAX_JSON_SIZE} characters`);
			}

			if (error.length > MAX_ERROR_MESSAGE_SIZE) {
				throw new Error(
					`Error message too large. Maximum size: ${MAX_ERROR_MESSAGE_SIZE} characters`
				);
			}

			// Validate JSON structure
			validateJSONStructure(json);

			// Sanitize inputs to prevent prompt injection
			const sanitizedJson = sanitizeInput(json, MAX_JSON_SIZE);
			const sanitizedError = sanitizeInput(error, MAX_ERROR_MESSAGE_SIZE);

			const agent =
				'You are a JSON repair assistant. Your ONLY task is to fix syntax errors in JSON data. ' +
				'You MUST respond with ONLY valid JSON. Do not include explanations, code, or other text. ' +
				'If the JSON cannot be repaired safely, respond with: {"error": "unrepairable"}';

			const request: LLMRequest = {
				userMessage: `Fix this JSON syntax error: ${sanitizedError}`,
				historyMessages: [
					{
						role: 'user',
						content: sanitizedJson
					}
				],
				thinkingConfig: {
					thinkingBudget: THINKING_BUDGET.FAST
				},
				systemInstruction: agent,
				temperature: 0,
				tryAutoFixJSONError: false
			};

			const result = await this.llm.generateContent(request);

			// Validate the response is actually JSON
			if (result?.content) {
				try {
					JSON.parse(JSON.stringify(result.content));
					return result.content;
				} catch (parseError) {
					console.warn('AI response was not valid JSON, returning undefined');
					return undefined;
				}
			}

			return undefined;
		} catch (error) {
			console.error('JSON fixing failed:', error);
			return undefined;
		}
	}
}
