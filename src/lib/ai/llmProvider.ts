import { defaultGeminiJsonConfig, GEMINI_MODELS, GeminiProvider } from '$lib/ai/geminiProvider';
import { LLM, type LLMconfig } from '$lib/ai/llm';
import type { SafetyLevel } from '$lib/types/safetySettings';

export const defaultLLMConfig: LLMconfig = {
	provider: 'gemini',
	temperature: defaultGeminiJsonConfig.temperature,
	config: defaultGeminiJsonConfig,
	tryAutoFixJSONError: true
};

export class LLMProvider {
	static provideLLM(llmConfig: LLMconfig, safetyLevel: SafetyLevel, useFallback: boolean = false): LLM {
		const configToUse: LLMconfig = { ...defaultLLMConfig, ...llmConfig };
		//fallback to flash-exp if thinking-exp fails
		return new GeminiProvider(
			configToUse,
			safetyLevel,
			new GeminiProvider(
				{ ...configToUse, model: GEMINI_MODELS.FLASH_THINKING_2_5 },
				safetyLevel,
				!useFallback
					? undefined
					: new GeminiProvider({ ...configToUse, model: GEMINI_MODELS.FLASH_THINKING_2_0 }, safetyLevel)
			)
		);
	}
}
