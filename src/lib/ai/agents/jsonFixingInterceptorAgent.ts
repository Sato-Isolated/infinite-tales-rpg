import { THINKING_BUDGET } from '../geminiProvider';
import type { LLM, LLMRequest } from '../llm';

export class JsonFixingInterceptorAgent {
	llm: LLM;

	constructor(llm: LLM) {
		this.llm = llm;
	}

	async fixJSON(json: string, error: string): Promise<object | undefined> {
		const agent =
			'You are JSON fixing agent, who is responsible for fixing JSON errors. ' +
			'You will be given JSON with errors and an error message and must fix it. ' +
			'CRITICAL: You MUST respond with ONLY valid JSON in the exact format specified below. Do not include any additional text, explanations, or formatting.';

		const request: LLMRequest = {
			userMessage: error,
			historyMessages: [
				{
					role: 'user',
					content: json
				}
			],
			thinkingConfig: {
				thinkingBudget: THINKING_BUDGET.FAST
			},
			systemInstruction: agent,
			temperature: 0,
			tryAutoFixJSONError: false
		};
		return (await this.llm.generateContent(request))?.content;
	}
}
