import type { GameActionState } from '$lib/types/actions';
import type { SummaryAgent, RelatedStoryHistory } from '$lib/ai/agents/summaryAgent';
import type { Action } from '$lib/types/action';

/**
 * Enhanced memory retrieval with dialogue-aware filtering
 */
export const getRelatedHistory = async (
	summaryAgent: SummaryAgent,
	action?: Action,
	gameActions?: GameActionState[],
	relatedStoryHistoryState?: RelatedStoryHistory,
	customMemories?: string
) => {
	let relatedHistory: string[] = [];
	const relatedHistoryWithRelevance: RelatedStoryHistory = { relatedDetails: [] };

	// Custom memories always have highest priority
	if (customMemories) {
		relatedHistoryWithRelevance.relatedDetails.push({
			storyReference: customMemories,
			relevanceScore: 2 //overrules other memories if conflicting
		});
	}

	// Add existing related history
	relatedHistoryWithRelevance.relatedDetails.push(
		...(relatedStoryHistoryState?.relatedDetails || [])
	);

	// Retrieve related history from summary agent
	if (action && (action.text || '').trim().toLowerCase() !== 'continue the tale') {
		relatedHistoryWithRelevance.relatedDetails.push(
			...(await summaryAgent.retrieveRelatedHistory(action.text, gameActions || [])).relatedDetails
		);
	}

	// Enhanced filtering with dialogue-aware thresholds
	const filteredDetails = relatedHistoryWithRelevance.relatedDetails.filter((detail) => {
		// Check if this detail contains dialogue-related content
		const isDialogueContent = isDialogueRelatedContent(detail.storyReference);

		// Use lower threshold for dialogue content to preserve conversations better
		const threshold = isDialogueContent ? 0.5 : 0.7;

		return detail.relevanceScore >= threshold;
	});

	relatedHistory = [
		...new Set(
			filteredDetails
				.sort((a, b) => b.relevanceScore - a.relevanceScore)
				.map((detail) => detail.storyReference)
		)
	];
	return relatedHistory;
};

/**
 * Check if a story reference contains dialogue-related content
 * @param storyReference The story reference text to analyze
 * @returns Boolean indicating if the content is dialogue-related
 */
function isDialogueRelatedContent(storyReference: string): boolean {
	const dialogueKeywords = [
		// Direct dialogue indicators
		'"', "'", 'said', 'says', 'asked', 'asks', 'replied', 'replies', 'whispered', 'shouted',
		'exclaimed', 'murmured', 'spoke', 'speaking', 'talked', 'talking', 'conversation',
		'dialogue', 'discussion', 'chat', 'interview', 'greeting', 'introduction',

		// Character interaction indicators  
		'told', 'tells', 'explained', 'explains', 'mentioned', 'mentions', 'revealed',
		'reveals', 'confessed', 'confesses', 'admitted', 'admits', 'agreed', 'agrees',
		'disagreed', 'disagrees', 'argued', 'argues', 'discussed', 'discusses',

		// Meeting and relationship indicators
		'met', 'meet', 'meeting', 'introduced', 'introduction', 'encounter', 'encountered',
		'approached', 'approach', 'relationship', 'friendship', 'alliance', 'negotiation',
		'promise', 'promised', 'commitment', 'committed', 'trust', 'trusted'
	];

	const lowerCaseRef = storyReference.toLowerCase();

	return dialogueKeywords.some(keyword => lowerCaseRef.includes(keyword));
}
