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
		//fallback to flash-exp if thinking-exp fails
		return new GeminiProvider(
			configToUse,
			new GeminiProvider(
				{ ...configToUse, model: GEMINI_MODELS.FLASH_THINKING_2_0 },
				!useFallback
					? undefined
					: new GeminiProvider({ ...configToUse, model: GEMINI_MODELS.FLASH_2_0 })
			)
		);
	}
}
