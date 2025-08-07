import type { GameActionState } from '$lib/ai/agents/gameAgent';
import type { SummaryAgent, RelatedStoryHistory } from '$lib/ai/agents/summaryAgent';
import type { Action } from '$lib/ai/agents/gameAgent';

export const getRelatedHistory = async (
	summaryAgent: SummaryAgent,
	action?: Action,
	gameActions?: GameActionState[],
	relatedStoryHistoryState?: RelatedStoryHistory,
	customMemories?: string
) => {
	let relatedHistory: string[] = [];
	const relatedHistoryWithRelevance: RelatedStoryHistory = { relatedDetails: [] };
	if (customMemories) {
		relatedHistoryWithRelevance.relatedDetails.push({
			storyReference: customMemories,
			relevanceScore: 2 //overrules other memories if conflicting
		});
	}
	relatedHistoryWithRelevance.relatedDetails.push(
		...(relatedStoryHistoryState?.relatedDetails || [])
	);

	// Special handling for "Continue The Tale" to include recent context and avoid repetition
	if (action && action.text === 'Continue The Tale') {
		// Add recent story context to avoid repetition
		if (gameActions && gameActions.length > 0) {
			const recentActions = gameActions.slice(-3); // Last 3 actions for context
			const recentStoryContent = recentActions
				.map((ga, index) => `Recent Story ${index + 1}: ${ga.story}`)
				.join('\n\n');
			
			relatedHistoryWithRelevance.relatedDetails.push({
				storyReference: `RECENT_CONTEXT_FOR_CONTINUATION:\n${recentStoryContent}\n\nIMPORTANT: Do not repeat or rehash the above recent events. Move the story forward with new developments, dialogue, or situations.`,
				relevanceScore: 1.8 // High priority to avoid repetition
			});
		}
	} else if (action && action.text !== 'Continue The Tale') {
		relatedHistoryWithRelevance.relatedDetails.push(
			...(await summaryAgent.retrieveRelatedHistory(action.text, gameActions || [])).relatedDetails
		);
	}
	
	relatedHistory = [
		...new Set(
			relatedHistoryWithRelevance.relatedDetails
				.filter((detail) => detail.relevanceScore >= 0.7)
				.sort((a, b) => b.relevanceScore - a.relevanceScore)
				.map((detail) => detail.storyReference)
		)
	];
	return relatedHistory;
};
