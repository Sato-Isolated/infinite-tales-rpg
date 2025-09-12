import type { LLM, LLMRequest } from '$lib/ai/llm';
import type { GameSettings } from '$lib/types/gameSettings';
import { CharacterDescriptionResponseSchema, type CharacterDescriptionResponse } from '$lib/ai/config/ResponseSchemas';
import {
	buildCharacterDescriptionAgentInstructions,
	buildCharacterGenerationUserMessage
} from '$lib/ai/agents/characterAgentPrompts';

export type CharacterDescription = {
	name: string;
	class: string;
	race: string;
	gender: string;
	appearance: string;
	alignment: string;
	personality: string;
	background: string;
	motivation: string;
};

export const initialCharacterState: CharacterDescription = {
	name: '',
	class: '',
	race: '',
	gender: '',
	appearance: '',
	alignment: '',
	personality: '',
	background: '',
	motivation: ''
};

export class CharacterAgent {
	llm: LLM;

	constructor(llm: LLM) {
		this.llm = llm;
	}

	async generateCharacterDescription(
		storyState: object,
		gameSettings: GameSettings,
		characterOverwrites: Partial<CharacterDescription> | undefined = undefined,
		transformInto?: string
	): Promise<CharacterDescription> {
		const agentInstruction = buildCharacterDescriptionAgentInstructions(gameSettings, transformInto);

		const preset = {
			...storyState,
			...characterOverwrites
		};

		const request: LLMRequest = {
			userMessage: buildCharacterGenerationUserMessage(preset),
			systemInstruction: agentInstruction,
			config: {
				responseSchema: CharacterDescriptionResponseSchema
			}
		};
		return (await this.llm.generateContent(request))?.content as CharacterDescriptionResponse;
	}
}
