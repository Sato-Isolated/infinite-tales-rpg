import { handleError } from '../util.svelte';
import {
	type Content,
	type GenerateContentResponse,
	type GenerationConfig,
	GoogleGenAI,
	type Part
} from '@google/genai';
import { JsonFixingInterceptorAgent } from './agents/jsonFixingInterceptorAgent';
import {
	LLM,
	type LLMconfig,
	type LLMMessage,
	type LLMRequest,
	LANGUAGE_PROMPT
} from '$lib/ai/llm';
import { errorState } from '$lib/state/errorState.svelte';

// Consolidated components for reduced complexity
import { GeminiConfigBuilder, ModelCapabilities, CONFIG_PRESETS, THINKING_BUDGETS } from './config/GeminiConfigBuilder.js';
import { ErrorUtils } from './errors/GeminiErrorHandler.js';

// Consolidated model constants from ModelCapabilities
export const GEMINI_MODELS = {
	FLASH_THINKING_2_5: 'gemini-2.5-flash-preview-05-20',
	FLASH_THINKING_2_0: 'gemini-2.0-flash-thinking-exp-01-21',
	FLASH_2_0: 'gemini-2.0-flash'
} as const;

export const getThoughtsFromResponse = (response: GenerateContentResponse): string => {
	let thoughts = '';
	let responsePart;
	if (response?.candidates?.[0]?.content?.parts?.length || 0 > 0) {
		responsePart = response!.candidates![0].content!.parts![0];
	}
	if (responsePart && 'thought' in responsePart && typeof responsePart.thought === 'string') {
		thoughts = responsePart.thought;
	}
	return thoughts;
};

/**
 * Default configuration for Gemini JSON responses
 * Used by llmProvider.ts for default LLM config
 */
export const defaultGeminiJsonConfig: GenerationConfig = {
	temperature: 1.0,
	responseMimeType: 'application/json',
	topP: 0.95,
	topK: 32
};

/**
 * Consolidated GeminiProvider using new unified components
 * Replaces 563+ lines of manual JSON parsing with structured SDK output
 */
export class GeminiProvider extends LLM {
	genAI: GoogleGenAI;
	jsonFixingInterceptorAgent: JsonFixingInterceptorAgent;
	fallbackLLM?: LLM;
	private configBuilder: GeminiConfigBuilder;

	constructor(
		llmConfig: LLMconfig,
		fallbackLLM?: LLM
	) {
		super(llmConfig);
		this.fallbackLLM = fallbackLLM;
		this.genAI = new GoogleGenAI({ apiKey: llmConfig.apiKey || '' });
		this.jsonFixingInterceptorAgent = new JsonFixingInterceptorAgent(this);
		this.configBuilder = new GeminiConfigBuilder();
	}

	getDefaultTemperature(): number {
		const model = this.llmConfig.model || GEMINI_MODELS.FLASH_THINKING_2_5;
		return ModelCapabilities.getDefaultTemperature(model);
	}

	getMaxTemperature(): number {
		const model = this.llmConfig.model || GEMINI_MODELS.FLASH_THINKING_2_5;
		return ModelCapabilities.getMaxTemperature(model);
	}

	// Consolidated capability methods using ModelCapabilities
	isThinkingModel(model: string): boolean {
		return ModelCapabilities.supportsThinking(model);
	}

	supportsThinkingBudget(model: string): boolean {
		return ModelCapabilities.supportsThinkingBudget(model);
	}

	supportsReturnThoughts(model: string): boolean {
		return ModelCapabilities.supportsThinking(model); // Same as thinking support
	}

	supportsStructuredOutput(model: string): boolean {
		return ModelCapabilities.supportsStructuredOutput(model);
	}

	/**
	 * Simulates streaming effect by progressively sending text chunks
	 * @param text Complete text to stream
	 * @param callback Function to call with each chunk
	 * @param chunkSize Number of characters per chunk
	 * @param delay Milliseconds between chunks
	 */
	private async simulateStreaming(
		text: string,
		callback: (chunk: string, isComplete: boolean) => void,
		chunkSize: number = 50,
		delay: number = 30
	): Promise<void> {
		console.log('🎬 Starting simulated streaming...', { textLength: text.length, chunkSize, delay });

		for (let i = 0; i < text.length; i += chunkSize) {
			const chunk = text.slice(0, i + chunkSize);
			console.log(`📺 Streaming chunk: ${i + chunkSize}/${text.length} chars`);
			callback(chunk, false);

			// Add small delay to simulate streaming
			if (i + chunkSize < text.length) {
				await new Promise(resolve => setTimeout(resolve, delay));
			}
		}

		// Send final complete text
		console.log('🏁 Streaming simulation complete');
		callback(text, true);
	}

	/**
	 * Enhanced generateContentStream using generateContent + simulated streaming
	 * Much more reliable than real streaming with partial JSON parsing
	 */
	async generateContentStream(
		request: LLMRequest,
		storyUpdateCallback: (storyChunk: string, isComplete: boolean) => void,
		thoughtUpdateCallback?: (thoughtChunk: string, isComplete: boolean) => void
	): Promise<object | undefined> {
		console.log('🚀 generateContentStream called (using simulated streaming)');

		try {
			// Use generateContent to get complete response
			console.log('📞 Calling generateContent for complete response...');
			const result = await this.generateContent(request);

			if (!result) {
				console.log('❌ No result from generateContent');
				return undefined;
			}

			console.log('✅ Complete response received:', Object.keys(result.content));

			// Handle thoughts if available
			if (result.thoughts && thoughtUpdateCallback) {
				console.log('🧠 Sending thoughts');
				thoughtUpdateCallback(result.thoughts, true);
			}

			// Extract story from the JSON response
			const story = (result.content as any)?.story;
			if (story && typeof story === 'string') {
				console.log('📖 Starting simulated streaming for story...', { storyLength: story.length });
				await this.simulateStreaming(story, storyUpdateCallback);
			} else {
				console.log('⚠️ No story found in response or story is not a string');
				// Fallback: send the entire response as text if no story field
				const fallbackText = JSON.stringify(result.content, null, 2);
				storyUpdateCallback(fallbackText, true);
			}

			console.log('✅ Simulated streaming complete, returning JSON object');
			return result.content;

		} catch (error) {
			console.error('❌ generateContentStream error:', error);

			// Enhanced error handling with consolidated error handler
			ErrorUtils.logError(error, 'generateContentStream');

			// Try fallback LLM if available and error is not recoverable
			if (this.fallbackLLM && !ErrorUtils.isRecoverable(error)) {
				console.log('🔄 Using fallback LLM for non-recoverable error');
				return await this.fallbackLLM.generateContentStream(
					request,
					storyUpdateCallback,
					thoughtUpdateCallback
				);
			}

			// Handle error gracefully with user-friendly message
			console.log('🚨 Handling error with user message');
			handleError(ErrorUtils.getUserMessage(error));
			return undefined;
		}
	}

	/**
	 * Enhanced generateContent using consolidated configuration builder
	 * Replaces manual config setup with structured config builder
	 */
	async generateContent(
		request: LLMRequest
	): Promise<{ thoughts: string; content: object } | undefined> {
		if (!this.llmConfig.apiKey) {
			errorState.userMessage = 'Please enter your Google Gemini API Key first in the settings.';
			return;
		}

		const modelToUse = request.model || this.llmConfig.model || GEMINI_MODELS.FLASH_THINKING_2_5;

		try {
			// Enhanced temperature handling using ModelCapabilities
			let temperature: number;
			if (request.temperature === 0 || this.llmConfig.temperature === 0) {
				temperature = 0;
			} else {
				const requestedTemp = request.temperature || this.llmConfig.temperature || this.getDefaultTemperature();
				temperature = Math.min(requestedTemp, this.getMaxTemperature());
			}

			const contents = this.buildGeminiContentsFormat(
				request.userMessage,
				request.historyMessages || []
			);

			// Handle system instruction (can be string, string[], or undefined)
			let systemInstructionString: string | undefined;
			if (Array.isArray(request.systemInstruction)) {
				systemInstructionString = request.systemInstruction.join('\n');
			} else {
				systemInstructionString = request.systemInstruction || (typeof this.llmConfig.systemInstruction === 'string' ? this.llmConfig.systemInstruction : undefined);
			}

			const systemInstruction = this.buildSystemInstruction(systemInstructionString);

			// Use consolidated configuration builder
			this.configBuilder.reset()
				.withTemperature(temperature, this.getMaxTemperature());

			// Add structured output schema if provided
			if (request.config?.responseSchema) {
				this.configBuilder.withJsonResponse(request.config.responseSchema);
			} else {
				this.configBuilder.withJsonResponse();
			}

			// Add thinking config if model supports it
			if (ModelCapabilities.supportsThinkingBudget(modelToUse)) {
				const thinkingBudget = request.thinkingConfig?.thinkingBudget || THINKING_BUDGETS.FAST;
				const includeThoughts = ModelCapabilities.supportsThinking(modelToUse);
				this.configBuilder.withThinking(thinkingBudget, includeThoughts);
			}

			// Merge with additional config
			const builtConfig = this.configBuilder.build();
			const config = {
				...this.llmConfig.config,
				...request.config,
				...builtConfig,
				systemInstruction
			};

			// Add language instruction if specified
			if (this.llmConfig.language) {
				const languageInstruction = LANGUAGE_PROMPT + this.llmConfig.language;
				if (systemInstruction?.parts) {
					systemInstruction.parts.push({ text: languageInstruction });
				}
			}

			// Call SDK generateContent directly
			const response = await this.genAI.models.generateContent({
				model: modelToUse,
				contents,
				config
			});

			// Extract thoughts from response
			const thoughts = getThoughtsFromResponse(response);

			// Parse JSON response with robust error handling
			let content: object = {};
			if (response.text) {
				try {
					content = JSON.parse(response.text);
					console.log('✅ JSON parsed successfully');
				} catch (jsonError) {
					console.error('❌ JSON parsing failed:', jsonError);
					console.log('📝 Raw response text (first 500 chars):', response.text.substring(0, 500));
					console.log('📝 Raw response text (around error position):', response.text.substring(6300, 6500));

					// Check retry count to prevent infinite loops
					const retryCount = (request._retryCount || 0) + 1;
					const maxRetries = 3;

					if (retryCount > maxRetries) {
						console.error(`❌ Max retries (${maxRetries}) exceeded, falling back to empty object`);
						content = {};
					} else {
						// Try to fix the malformed JSON using the interceptor agent
						try {
							console.log(`🔧 Attempting JSON fixing (attempt ${retryCount}/${maxRetries})...`);
							const errorMessage = jsonError instanceof Error ? jsonError.message : String(jsonError);

							// Create a new request with retry tracking
							const fixRequest = { ...request, _retryCount: retryCount };
							const fixed = await this.jsonFixingInterceptorAgent.fixJSON(response.text, errorMessage, fixRequest);
							content = fixed || {};

							if (fixed) {
								console.log('✅ JSON successfully fixed');
							} else {
								console.warn('⚠️ JSON fixing returned undefined, using empty object');
							}
						} catch (fixError) {
							console.error('❌ JSON fixing failed:', fixError);
							// Return empty object as fallback
							content = {};
						}
					}
				}
			}

			return { thoughts, content };

		} catch (error) {
			// Enhanced error handling with consolidated error handler
			ErrorUtils.logError(error, 'generateContent');

			// Try fallback LLM if available and error is not recoverable
			if (this.fallbackLLM && !ErrorUtils.isRecoverable(error)) {
				return await this.fallbackLLM.generateContent(request);
			}

			// Handle error gracefully with user-friendly message
			handleError(ErrorUtils.getUserMessage(error));
			return undefined;
		}
	}

	buildSystemInstruction(systemInstruction?: string): { parts: Part[] } | undefined {
		if (!systemInstruction) return undefined;
		return {
			parts: [{ text: systemInstruction }]
		};
	}

	buildGeminiContentsFormat(actionText: string, historyMessages: Array<LLMMessage>): Content[] {
		const contents: Content[] = [];
		if (historyMessages) {
			historyMessages.forEach((message) => {
				//TODO why can one of these not be present?
				if (message && message.role && message.content) {
					contents.push({
						role: message.role,
						parts: [{ text: message.content }]
					});
				}
			});
		}
		if (actionText) {
			const message = { role: 'user', content: actionText };
			contents.push({
				role: message.role,
				parts: [{ text: message.content || '' }]
			});
		}
		return contents;
	}
}
