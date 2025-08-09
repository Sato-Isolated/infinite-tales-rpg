import { defaultGeminiJsonConfig, GEMINI_MODELS, GeminiProvider } from '$lib/ai/geminiProvider';
import { LLM, type LLMconfig } from '$lib/ai/llm';

export const defaultLLMConfig: LLMconfig = {
	provider: 'gemini',
	temperature: defaultGeminiJsonConfig.temperature,
	config: defaultGeminiJsonConfig,
	tryAutoFixJSONError: true
};

export class LLMProvider {
	static provideLLM(llmConfig: LLMconfig, useFallback: boolean = false): LLM {
		const configToUse: LLMconfig = { ...defaultLLMConfig, ...llmConfig };
		// Always provide Gemini with layered fallbacks
		return new GeminiProvider(
			configToUse,
			new GeminiProvider(
				{ ...configToUse, model: GEMINI_MODELS.FLASH_THINKING_2_0 },
				!useFallback ? undefined : new GeminiProvider({ ...configToUse, model: GEMINI_MODELS.FLASH_2_0 })
			)
		);
	}

	/**
	 * Provides a fast LLM optimized for validation tasks (companion validation, deduplication, etc.)
	 * Uses Gemini Flash 2.0 which is much faster than Thinking models for simple tasks
	 */
	static provideFastLLM(llmConfig: LLMconfig): LLM {
		const fastConfig: LLMconfig = {
			...defaultLLMConfig,
			...llmConfig,
			// Override model to use Flash 2.0 regardless of config
			model: GEMINI_MODELS.FLASH_2_0,
			// Lower temperature for more consistent validation results
			temperature: Math.min(llmConfig.temperature || 0.7, 0.7),
			config: {
				...defaultLLMConfig.config,
				...llmConfig.config,
				// Optimize for faster responses
				temperature: Math.min(llmConfig.temperature || 0.7, 0.7)
			}
		};

		// Always use Gemini Flash 2.0 for fast validation tasks
		// No fallback needed for simple validation operations
		return new GeminiProvider(fastConfig);
	}
}
