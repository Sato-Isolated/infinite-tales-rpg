import { describe, it, expect, vi } from 'vitest';
import { getRelatedHistory } from '../memoryLogic';

const makeSummaryAgent = () => ({
  retrieveRelatedHistory: vi.fn().mockResolvedValue({ relatedDetails: [
    { storyReference: 'foo', relevanceScore: 0.9 }
  ] })
});

describe('getRelatedHistory', () => {
  it('skips retrieval when action is Continue The Tale (case-insensitive)', async () => {
    const summaryAgent: any = makeSummaryAgent();
    const related = await getRelatedHistory(summaryAgent, { text: 'Continue The Tale', characterName: 'X' } as any, []);
    expect(summaryAgent.retrieveRelatedHistory).not.toHaveBeenCalled();
    expect(Array.isArray(related)).toBe(true);
  });

  it('retrieves when action is not continue', async () => {
    const summaryAgent: any = makeSummaryAgent();
    const related = await getRelatedHistory(summaryAgent, { text: 'attack', characterName: 'X' } as any, []);
    expect(summaryAgent.retrieveRelatedHistory).toHaveBeenCalledOnce();
    expect(related).toContain('foo');
  });
});
