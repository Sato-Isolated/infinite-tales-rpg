import { stringifyPretty } from '$lib/util.svelte';
import type { LLM, LLMRequest } from '$lib/ai/llm';
import type { Ability } from './characterStatsAgent';
import { GEMINI_MODELS } from '../geminiProvider';
import { EventResponseSchema, type EventResponse } from '$lib/ai/config/ResponseSchemas';

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
					return this.getFallbackResponse();
				}

				// Wait before retry (exponential backoff)
				const waitTime = Math.pow(2, attempt) * 1000;
				console.log(`EventAgent: Waiting ${waitTime}ms before retry...`);
				await new Promise(resolve => setTimeout(resolve, waitTime));
			}
		}

		// This should never be reached due to the logic above, but TypeScript safety
		return this.getFallbackResponse();
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
				? this.buildModernEventPrompt(currentAbilitiesNames)
				: this.buildLegacyEventPrompt(currentAbilitiesNames);

			console.log(`EventAgent: System instruction type:`, Array.isArray(systemInstruction) ? 'array' : typeof systemInstruction);
			console.log(`EventAgent: System instruction length:`, systemInstruction.length);

			const userMessage = this.buildUserMessage(storyHistory, attempt);
			console.log(`EventAgent: User message length:`, userMessage.length);

			const request: LLMRequest = {
				userMessage,
				systemInstruction,
				model: GEMINI_MODELS.FLASH_THINKING_2_0,
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

	/**
	 * Build modern enhanced prompt system
	 */
	private buildModernEventPrompt(currentAbilitiesNames: string[]): string[] {
		// Fallback to enhanced legacy system until imports are fixed
		console.log('EventAgent: Using enhanced legacy prompts (modern imports not available)');

		const baseInstructions = [
			'🎯 EVENT EVALUATION SPECIALIST',
			'Analyze the story for TWO specific event types:',
			'1. Major character transformations (permanent changes)',
			'2. Explicit ability/skill learning events',
			'',
			'⏰ TIME MANAGEMENT: Consider realistic durations for actions.',
			'🔍 REASONING PROCESS:',
			'- What major events occurred in this story segment?',
			'- Are there explicit mentions of character transformations?',
			'- Are there clear descriptions of learning new abilities?',
			'- When in doubt, prefer no event over false positive',
			'',
			this.buildAbilityExclusionRule(currentAbilitiesNames),
			'',
			'Use the structured response schema to provide your evaluation.'
		];

		return baseInstructions;
	}

	/**
	 * Build legacy prompt system (fallback)
	 */
	private buildLegacyEventPrompt(currentAbilitiesNames: string[]): string[] {
		return [
			'Scan the FULL STORY provided and evaluate if the following events have occurred recently or are currently active. These events must be explicitly described or strongly implied by the narrative, not just hypothetical possibilities:',
			`1. **Significant Character Change ('character_changed'):** Has the character undergone a MAJOR and likely PERMANENT transformation or alteration? (Examples: Gained a new profession rank, transformed into a vampire/werewolf, became possessed by a permanent entity, received new powers from a crystal).
    *   If yes, describe the significant change.
    *   If no, state null.`,
			`2. **New Abilities Learned ('abilities_learned'):** Has the character explicitly learned or gained access to new abilities, spells, or skills? (Examples: Read a spellbook and learned 'Fireball', trained with a master and learned 'Parry', unlocked a racial trait). Ensure the story clearly states the learning event.
    *   Do not list abilities already known: ${currentAbilitiesNames.join(', ')}
    *   If yes, describe the new ability/spell/skill.
    *   If no, empty array.`,
			'Generate structured event evaluation with character changes and abilities learned.'
		];
	}

	/**
	 * Build ability exclusion rule
	 */
	private buildAbilityExclusionRule(currentAbilitiesNames: string[]): string {
		if (currentAbilitiesNames.length === 0) {
			return "CHARACTER ABILITIES: No abilities currently known.";
		}
		return `CHARACTER ABILITIES TO EXCLUDE: ${currentAbilitiesNames.join(', ')}\nDo not report these as "newly learned" since they already exist.`;
	}

	/**
	 * Build user message with context
	 */
	private buildUserMessage(storyHistory: string[], attempt: number): string {
		const baseMessage = 'Evaluate the events for STORY PROGRESSION:\n' + storyHistory.join('\n');

		if (attempt > 1) {
			return `${baseMessage}\n\n[RETRY ATTEMPT ${attempt}: Previous attempts failed, please ensure valid JSON response]`;
		}

		return baseMessage;
	}

	/**
	 * Fallback response when all attempts fail
	 */
	private getFallbackResponse(): { thoughts: string; event_evaluation: EventEvaluation } {
		return {
			thoughts: 'Event evaluation was skipped due to repeated API failures. No events detected.',
			event_evaluation: initialEventEvaluationState
		};
	}
}
