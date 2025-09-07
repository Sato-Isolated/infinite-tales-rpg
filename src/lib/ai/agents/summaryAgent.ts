import { stringifyPretty } from '$lib/util.svelte';
import type { LLM, LLMMessage, LLMRequest } from '$lib/ai/llm';
import type { GameActionState } from '$lib/types/actions';
import { GEMINI_MODELS } from '../geminiProvider';
import {
	SummaryResponseSchema,
	RelatedHistoryResponseSchema,
	type SummaryResponse,
	type RelatedHistoryResponse
} from '$lib/ai/config/ResponseSchemas';

export type RelatedStoryHistory = {
	relatedDetails: { storyReference: string; relevanceScore: number }[];
};

export class SummaryAgent {
	llm: LLM;

	constructor(llm: LLM) {
		this.llm = llm;
	}

	/**
	 * Keep first and last numOfLastActions and summarize everything in the middle
	 * @param historyMessages
	 * @param startSummaryAtSize Start summarizing the story when historyMessages reaches a certain size, each action has 2 parts, user and model message
	 * @param numOfLastActions number of last actions to keep for detailed memory
	 */
	async summarizeStoryIfTooLong(
		historyMessages: Array<LLMMessage>,
		startSummaryAtSize = 12 * 2,
		numOfLastActions = 3 * 2
	): Promise<{ newHistory: Array<LLMMessage>; summary: string }> {
		if (historyMessages.length < startSummaryAtSize) {
			return { newHistory: historyMessages, summary: '' };
		}
		const summaryInstructions = [
			'You are a Summary Agent for a RPG adventure, who is responsible for summarizing the most important bits of a continuous story.',
			'Summarize the story so the most important events, which have a long term impact on the story, and characters are included.',
			'Emphasize on the most important events, and include their details.',
			'IMPORTANT: Preserve temporal context and chronological order in your summary. Include time references (day/night, duration, sequence) when mentioned in the story.',
			'If you see [Time: ...] markers in the content, extract and incorporate the temporal flow into your narrative summary.',
			'',
			'🗣️ DIALOGUE MEMORY PRESERVATION (CRITICAL):',
			'- ALWAYS preserve important dialogue context and conversation topics',
			'- Include which characters have spoken and what they discussed',
			'- Note relationship changes revealed through conversations',
			'- Track promises, commitments, or revelations made in dialogue',
			'- Remember character introductions and first meetings',
			'- Preserve dialogue-based plot developments and character growth',
			'- Include conversation outcomes that affect future interactions',
			'',
			'SUMMARY FORMAT RULES:',
			'- keyDetails: Array of key story elements that have long-term impact (INCLUDE DIALOGUE CONTEXT)',
			'- story: Comprehensive narrative summary maintaining chronological order (PRESERVE CONVERSATION HISTORY)',
			'- timelineEvents: Array of significant events with their temporal context (INCLUDE IMPORTANT DIALOGUES)',
			'',
			'Generate structured summary with all required fields.'
		].join('\n');

		const agent = summaryInstructions;

		const toSummarize = historyMessages.slice(2, (numOfLastActions + 1) * -1);
		console.log('toSummarize', toSummarize);
		const request: LLMRequest = {
			userMessage: 'Summarize the following story: \n' + stringifyPretty(toSummarize),
			systemInstruction: agent,
			temperature: 1,
			model: GEMINI_MODELS.FLASH_THINKING_2_0,
			config: {
				responseSchema: SummaryResponseSchema
			}
		};
		const response = (await this.llm.generateContent(request))?.content as SummaryResponse;
		console.log('Summary returned ' + stringifyPretty(response));
		if (!response) {
			return { newHistory: historyMessages, summary: '' };
		}
		const newHistory = historyMessages.slice(0, 2);
		newHistory.push({ role: 'model', content: JSON.stringify(response) });
		historyMessages.slice(numOfLastActions * -1).forEach((message) => newHistory.push(message));
		return { newHistory: newHistory, summary: response.story };
	}

	async retrieveRelatedHistory(
		storyProgression: string,
		gameStates: GameActionState[],
		maxRelatedDetails = 3,
		additionalHistory?: string[]
	): Promise<RelatedStoryHistory> {
		// Only skip if we have very few states (less than 5) and no additional history
		// This allows dialogue tracking even in shorter sessions
		if ((!additionalHistory || additionalHistory?.length === 0) && gameStates.length < 5) {
			return { relatedDetails: [] };
		}
		const relatedHistoryInstructions = [
			'Scan the FULL STORY HISTORY and identify any SPECIFIC STORY REFERENCES from past events that are HIGHLY RELEVANT to the current STORY PROGRESSION.',
			'Focus on details that will help maintain consistency and plausibility.',
			'The RELEVANT REFERENCES must be only relevant to the current STORY PROGRESSION and not the whole story.',
			'Never reference the STORY PROGRESSION itself in your response!',
			'List the RELEVANT STORY REFERENCES including narration details from the story history.',
			'',
			'🗣️ DIALOGUE RELEVANCE PRIORITY:',
			'- Give HIGH PRIORITY to previous conversations that relate to current character interactions',
			'- Include dialogue context if the current progression involves the same characters',
			'- Reference past conversation topics if they relate to current events',
			'- Include character relationship history revealed through previous dialogues',
			'- Note if characters have met or spoken before in similar contexts',
			'',
			'RELATED HISTORY FORMAT RULES:',
			'- relatedDetails: Array of story references with relevance scores (0.0 to 1.0)',
			'- storyReference: Specific narrative detail from past events (INCLUDE DIALOGUE CONTEXT)',
			'- relevanceScore: Decimal number between 0.0 and 1.0 indicating relevance (BOOST SCORES FOR DIALOGUE RELEVANCE)',
			'',
			'Generate structured related history with relevance-scored story references.'
		].join('\n');

		const agent = relatedHistoryInstructions;

		const currentGameStateId = gameStates[gameStates.length - 1]?.id;

		// Enhanced relevance filtering that includes recent dialogue context
		const isRelevant = (state: GameActionState) => {
			// Include recent states (within last 5) for dialogue continuity
			const isRecent = state.id > currentGameStateId - 5;

			// Include older states with important memory explanations
			const hasImportantMemory = state.id <= currentGameStateId - 5 &&
				(!state.story_memory_explanation ||
					state.story_memory_explanation?.includes('HIGH') ||
					state.story_memory_explanation?.includes('MEDIUM'));

			return isRecent || hasImportantMemory;
		};

		const consideredHistory: LLMMessage[] = gameStates.filter(isRelevant).map((state) => ({
			role: 'model',
			content: state.story
		}));
		if (additionalHistory) {
			additionalHistory.forEach((note) => {
				consideredHistory.push({ role: 'model', content: note });
			});
		}
		const request: LLMRequest = {
			userMessage: 'STORY PROGRESSION:\n' + storyProgression,
			systemInstruction: agent,
			historyMessages: consideredHistory,
			model: GEMINI_MODELS.FLASH_THINKING_2_0,
			temperature: 0.1,
			config: {
				responseSchema: RelatedHistoryResponseSchema
			}
		};
		const response = (await this.llm.generateContent(request))?.content as RelatedHistoryResponse;
		console.log(storyProgression, 'Related history returned ', stringifyPretty(response));
		if (!response.relatedDetails) {
			return { relatedDetails: [] };
		}
		return response;
	}
}
