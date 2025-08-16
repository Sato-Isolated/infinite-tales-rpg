import type { LLMMessage } from '$lib/ai/llm';

/**
 * Returns the last N story messages, replacing JSON content with the `story` field when present.
 * Falls back to raw message if content is not parsable JSON.
 */
export function getLatestStoryMessagesFromHistory(
	historyMessages: LLMMessage[],
	numOfActions = 2
): LLMMessage[] {
	const slice = historyMessages.slice(numOfActions * -2);
	return slice.map((message) => {
		try {
			return { ...message, content: JSON.parse(message.content).story } as LLMMessage;
		} catch {
			return message;
		}
	});
}
