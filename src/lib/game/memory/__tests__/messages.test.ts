import { describe, it, expect } from 'vitest';
import type { LLMMessage } from '$lib/ai/llm';
import { getLatestStoryMessagesFromHistory } from '../messages';

defineSuite();

function defineSuite() {
	describe('memoryLogic/messages', () => {
		it('returns last N messages with story content when JSON', () => {
			const history: LLMMessage[] = [
				{ role: 'user', content: JSON.stringify({ story: 'First' }) },
				{ role: 'model', content: JSON.stringify({ story: 'Second' }) },
				{ role: 'model', content: 'plain text' }
			];
			const res = getLatestStoryMessagesFromHistory(history, 1);
			expect(res).toHaveLength(2);
			expect(res[0].content).toBe('Second');
			expect(res[1].content).toBe('plain text');
		});

		it('falls back to raw content when JSON parse fails', () => {
			const history: LLMMessage[] = [{ role: 'model', content: 'oops' }];
			const res = getLatestStoryMessagesFromHistory(history, 1);
			expect(res[0].content).toBe('oops');
		});
	});
}
