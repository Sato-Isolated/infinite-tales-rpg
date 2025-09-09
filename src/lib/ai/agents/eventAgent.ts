import { stringifyPretty } from '$lib/util.svelte';
import type { LLM, LLMRequest } from '$lib/ai/llm';
import type { Ability } from './characterStatsAgent';
import { GEMINI_MODELS } from '../geminiProvider';
import { EventResponseSchema, type EventResponse } from '$lib/ai/config/ResponseSchemas';
import {
	buildModernEventPrompt,
	buildLegacyEventPrompt,
	buildUserMessage,
	getFallbackResponse
} from './eventAgentPrompts';

export const initialCharacterTransformState: CharacterChangedInto = {
	changed_into: '',
	description: '',
	aiProcessingComplete: true,
	showEventConfirmationDialog: false
};
export type AbilitiesLearned = {
	showEventConfirmationDialog?: boolean;
	aiProcessingComplete?: boolean;
	abilities: (Partial<Ability> & { uniqueTechnicalId: string })[];
};
const initialAbilitiesLearnedState: AbilitiesLearned = {
	showEventConfirmationDialog: false,
	aiProcessingComplete: true,
	abilities: []
};
export const initialEventEvaluationState: EventEvaluation = {
	character_changed: initialCharacterTransformState,
	abilities_learned: initialAbilitiesLearnedState
};
export type CharacterChangedInto = {
	changed_into: string;
	description: string;
	aiProcessingComplete: boolean;
	showEventConfirmationDialog: boolean;
};

export type EventEvaluation = {
	character_changed?: CharacterChangedInto;
	abilities_learned?: AbilitiesLearned;
};

export class EventAgent {
	llm: LLM;
	private useModernPrompts: boolean = false; // Disabled by default until imports work
	private maxRetries: number = 2;

	constructor(llm: LLM, useModernPrompts: boolean = false) {
		this.llm = llm;
		this.useModernPrompts = useModernPrompts;
		console.log('EventAgent: Initialized with modern prompts =', this.useModernPrompts);
	}

	/**
	 * Enable or disable modern prompt enhancements
	 */
	setModernPrompts(enabled: boolean) {
		this.useModernPrompts = enabled;
		console.log('EventAgent: Modern prompts set to', enabled);
	}

	mapResponse = (response: any): EventEvaluation => {
		return (
			response && {
				character_changed: response.character_changed,
				abilities_learned: {
					showEventConfirmationDialog: false,
					abilities: response.abilities_learned
				}
			}
		);
	};

	mapEventResponse = (response: EventResponse): EventEvaluation => {
		return {
			character_changed: response.character_changed ? {
				changed_into: response.character_changed.changed_into,
				description: response.character_changed.description,
				aiProcessingComplete: true,
				showEventConfirmationDialog: false
			} : initialCharacterTransformState,
			abilities_learned: {
				showEventConfirmationDialog: false,
				aiProcessingComplete: true,
				abilities: response.abilities_learned || []
			}
		};
	};

	/**
	 * Enhanced event evaluation with modern prompts and retry logic
	 */
	async evaluateEvents(
		storyHistory: string[],
		currentAbilitiesNames: string[]
	): Promise<{ thoughts: string; event_evaluation: EventEvaluation }> {
		// Debug logging
		console.log('EventAgent: Starting evaluation with modern prompts:', this.useModernPrompts);
		console.log('EventAgent: Story history length:', storyHistory.length);
		console.log('EventAgent: Current abilities:', currentAbilitiesNames);

		for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
			try {
				console.log(`EventAgent: Attempt ${attempt}/${this.maxRetries} starting...`);
				const response = await this.attemptEventEvaluation(storyHistory, currentAbilitiesNames, attempt);
				console.log(`EventAgent: Attempt ${attempt} succeeded!`);
				return response;
			} catch (error) {
				console.warn(`EventAgent: Attempt ${attempt}/${this.maxRetries} failed:`, error);

				if (attempt === this.maxRetries) {
					console.error('EventAgent: All retry attempts failed, using fallback');
					return getFallbackResponse();
				}

				// Wait before retry (exponential backoff)
				const waitTime = Math.pow(2, attempt) * 1000;
				console.log(`EventAgent: Waiting ${waitTime}ms before retry...`);
				await new Promise(resolve => setTimeout(resolve, waitTime));
			}
		}

		// This should never be reached due to the logic above, but TypeScript safety
		return getFallbackResponse();
	}

	/**
	 * Single attempt at event evaluation
	 */
	private async attemptEventEvaluation(
		storyHistory: string[],
		currentAbilitiesNames: string[],
		attempt: number
	): Promise<{ thoughts: string; event_evaluation: EventEvaluation }> {
		try {
			console.log(`EventAgent: Building prompt for attempt ${attempt}...`);
			const systemInstruction = this.useModernPrompts
				? buildModernEventPrompt(currentAbilitiesNames)
				: buildLegacyEventPrompt(currentAbilitiesNames);

			console.log(`EventAgent: System instruction type:`, Array.isArray(systemInstruction) ? 'array' : typeof systemInstruction);
			console.log(`EventAgent: System instruction length:`, systemInstruction.length);

			const userMessage = buildUserMessage(storyHistory, attempt);
			console.log(`EventAgent: User message length:`, userMessage.length);

			const request: LLMRequest = {
				userMessage,
				systemInstruction,
				model: GEMINI_MODELS.FLASH_THINKING_2_5,
				temperature: 0.1,
				config: {
					responseSchema: EventResponseSchema
				}
			};

			console.log(`EventAgent: Calling LLM for attempt ${attempt}...`);
			const response = await this.llm.generateContent(request);
			console.log(`EventAgent attempt ${attempt} response:`, response, 'Event evaluation', stringifyPretty(response));

			// Handle cases where Gemini API fails or returns no content
			if (!response) {
				throw new Error(`Gemini API returned no response on attempt ${attempt}`);
			}

			if (!response.content) {
				throw new Error(`Gemini API returned response without content on attempt ${attempt}`);
			}

			console.log(`EventAgent: Mapping response for attempt ${attempt}...`);
			const eventResponse = response.content as EventResponse;
			const mappedResponse = this.mapEventResponse(eventResponse);
			console.log(`EventAgent: Mapped response:`, mappedResponse);

			return {
				thoughts: response.thoughts || '',
				event_evaluation: mappedResponse
			};
		} catch (error) {
			console.error(`EventAgent: Error in attemptEventEvaluation attempt ${attempt}:`, error);
			throw error;
		}
	}
}
