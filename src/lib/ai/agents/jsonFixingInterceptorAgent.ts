import { THINKING_BUDGETS } from '../config/GeminiConfigBuilder';
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

	// Check for balanced braces/brackets and quotes
	let braceCount = 0;
	let bracketCount = 0;
	let quoteCount = 0;
	let escapeNext = false;

	for (const char of trimmed) {
		if (escapeNext) {
			escapeNext = false;
			continue;
		}

		if (char === '\\') {
			escapeNext = true;
			continue;
		}

		if (char === '"') {
			quoteCount++;
		} else if (char === '{') {
			braceCount++;
		} else if (char === '}') {
			braceCount--;
		} else if (char === '[') {
			bracketCount++;
		} else if (char === ']') {
			bracketCount--;
		}
	}

	if (braceCount !== 0 || bracketCount !== 0) {
		throw new Error('JSON structure appears to have unbalanced braces/brackets');
	}

	if (quoteCount % 2 !== 0) {
		throw new Error('JSON structure appears to have unterminated strings');
	}

	// Check for truncation patterns
	if (detectTruncation(trimmed)) {
		throw new Error('JSON appears to be truncated');
	}
}

/**
 * Detects if JSON appears to be truncated
 */
function detectTruncation(json: string): boolean {
	const trimmed = json.trim();

	// Check for incomplete properties (key without closing quote or value)
	const incompleteProperty = /"[^"]*$/;
	if (incompleteProperty.test(trimmed)) {
		return true;
	}

	// Check for unterminated strings in property values
	const lines = trimmed.split('\n');
	const lastLine = lines[lines.length - 1];

	// If last line ends with an incomplete string or property
	if (lastLine.includes('"') && !lastLine.match(/"[^"]*"[,}]/)) {
		return true;
	}

	return false;
}

/**
 * Creates a minimal valid JSON with recovered data when all else fails
 */
function createFallbackJSON(originalJson: string): string {
	console.log('🆘 Creating fallback JSON with partial data recovery...');

	// Try to extract any complete key-value pairs
	const extractedData: Record<string, any> = {};

	// Look for simple string properties that are complete
	const stringPattern = /"([^"]+)":\s*"([^"]+)"/g;
	let match;

	while ((match = stringPattern.exec(originalJson)) !== null) {
		const [, key, value] = match;
		extractedData[key] = value;
	}

	// Look for simple number/boolean properties
	const primitivePattern = /"([^"]+)":\s*(true|false|\d+(?:\.\d+)?)/g;
	while ((match = primitivePattern.exec(originalJson)) !== null) {
		const [, key, value] = match;
		if (value === 'true') {
			extractedData[key] = true;
		} else if (value === 'false') {
			extractedData[key] = false;
		} else {
			extractedData[key] = parseFloat(value);
		}
	}

	// If we recovered nothing, create a minimal error structure
	if (Object.keys(extractedData).length === 0) {
		return JSON.stringify({
			error: "Failed to parse JSON response",
			story: "I'm processing your request, but encountered a technical difficulty. Please try again.",
			partialResponse: originalJson.substring(0, 100) + "..."
		});
	}

	console.log(`✅ Recovered ${Object.keys(extractedData).length} properties for fallback JSON`);
	return JSON.stringify(extractedData);
}
function attemptSimpleJSONRepair(json: string): string | null {
	try {
		let repaired = json.trim();

		// Handle truncated JSON - remove incomplete properties
		if (detectTruncation(repaired)) {
			console.log('🔧 Detected truncated JSON, attempting repair...');

			// Find the last complete property
			const lines = repaired.split('\n');
			let validLines: string[] = [];
			let insideString = false;
			let escapeNext = false;

			for (const line of lines) {
				let lineValid = true;

				for (let i = 0; i < line.length; i++) {
					const char = line[i];

					if (escapeNext) {
						escapeNext = false;
						continue;
					}

					if (char === '\\') {
						escapeNext = true;
						continue;
					}

					if (char === '"') {
						insideString = !insideString;
					}
				}

				// If this line leaves us inside an incomplete string, it's truncated
				if (insideString && !line.match(/[,}\]]\s*$/)) {
					lineValid = false;
				}

				if (lineValid) {
					validLines.push(line);
				} else {
					break; // Stop at first invalid line
				}
			}

			repaired = validLines.join('\n').trim();

			// Remove trailing comma from last valid property
			repaired = repaired.replace(/,\s*$/, '');
		}

		// Common fixes
		repaired = repaired
			// Remove trailing commas
			.replace(/,(\s*[}\]])/g, '$1')
			// Fix unescaped quotes in strings (simple cases)
			.replace(/([^\\])"([^":\[\]{}]*)"([^,:\[\]{}])/g, '$1"$2\\"$3')
			// Remove incomplete properties at the end
			.replace(/,?\s*"[^"]*$/, '');

		// Try to balance braces and brackets
		let braceCount = 0;
		let bracketCount = 0;
		let quoteCount = 0;
		let escapeNext = false;

		for (const char of repaired) {
			if (escapeNext) {
				escapeNext = false;
				continue;
			}

			if (char === '\\') {
				escapeNext = true;
				continue;
			}

			if (char === '"') {
				quoteCount++;
			} else if (char === '{') {
				braceCount++;
			} else if (char === '}') {
				braceCount--;
			} else if (char === '[') {
				bracketCount++;
			} else if (char === ']') {
				bracketCount--;
			}
		}

		// If we have an odd number of quotes, we have an unterminated string
		if (quoteCount % 2 !== 0) {
			// Try to close the last string
			repaired += '"';
		}

		// Add missing closing braces
		while (braceCount > 0) {
			repaired += '}';
			braceCount--;
		}

		// Add missing closing brackets
		while (bracketCount > 0) {
			repaired += ']';
			bracketCount--;
		}

		// Test if it parses now
		JSON.parse(repaired);
		console.log('✅ Simple JSON repair successful');
		return repaired;
	} catch (error) {
		console.log('❌ Simple JSON repair failed:', error instanceof Error ? error.message : String(error));
		return null;
	}
}

export class JsonFixingInterceptorAgent {
	llm: LLM;

	constructor(llm: LLM) {
		this.llm = llm;
	}

	async fixJSON(json: string, error: string, originalRequest?: any): Promise<object | undefined> {
		try {
			// Input validation and sanitization
			if (!json || !error) {
				throw new Error('JSON and error message are required');
			}

			// Check if we should attempt fixing based on retry count
			const retryCount = originalRequest?._retryCount || 0;
			if (retryCount > 3) {
				console.warn('❌ Too many retry attempts, skipping JSON fixing');
				return undefined;
			}

			// Try simple repair first (without LLM)
			console.log('🔧 Attempting simple JSON repair...');
			const simpleRepair = attemptSimpleJSONRepair(json);
			if (simpleRepair) {
				console.log('✅ Simple JSON repair successful');
				return JSON.parse(simpleRepair);
			}

			console.log('⚠️ Simple repair failed, trying LLM-based repair...');

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
					thinkingBudget: THINKING_BUDGETS.FAST
				},
				systemInstruction: agent,
				temperature: 0,
				tryAutoFixJSONError: false,
				_retryCount: retryCount + 1 // Track retries to prevent infinite loops
			};

			const result = await this.llm.generateContent(request);

			// Validate the response is actually JSON
			if (result?.content) {
				try {
					JSON.parse(JSON.stringify(result.content));
					return result.content;
				} catch (parseError) {
					console.warn('AI response was not valid JSON, trying fallback...');
					// Try fallback before giving up
					try {
						const fallbackJson = createFallbackJSON(json);
						console.log('✅ Created fallback JSON after AI repair failed');
						return JSON.parse(fallbackJson);
					} catch (fallbackError) {
						console.warn('Fallback JSON creation also failed, returning undefined');
						return undefined;
					}
				}
			}

			// If no content from AI, try fallback
			console.warn('No content from AI repair, trying fallback...');
			try {
				const fallbackJson = createFallbackJSON(json);
				console.log('✅ Created fallback JSON after AI returned no content');
				return JSON.parse(fallbackJson);
			} catch (fallbackError) {
				console.warn('Fallback JSON creation failed, returning undefined');
				return undefined;
			}
		} catch (error) {
			console.error('JSON fixing failed:', error);

			// Last resort: try to create a fallback JSON with partial data
			try {
				const fallbackJson = createFallbackJSON(json);
				console.log('✅ Created fallback JSON with partial data recovery');
				return JSON.parse(fallbackJson);
			} catch (fallbackError) {
				console.error('Even fallback JSON creation failed:', fallbackError);
				return undefined;
			}
		}
	}
}
