/**
 * Summary agent prompts
 */

/**
 * Related history retrieval prompt
 */
export const relatedHistoryPrompt = (maxRelatedDetails: number) => 
	'CRITICAL: You MUST respond with ONLY valid JSON in the exact format specified below. Do not include any additional text, explanations, or formatting. {"relatedDetails": [{"storyReference": string, "relevanceScore": decimal number; 0-1}] array length ' +
	maxRelatedDetails +
	'}';

/**
 * Related history agent instruction
 */
export const relatedHistoryAgentInstruction = 
	'Scan the FULL STORY HISTORY and identify any SPECIFIC STORY REFERENCES from past events that are HIGHLY RELEVANT to the current STORY PROGRESSION. Focus on details that will help maintain consistency and plausibility.\n' +
	'The RELEVANT REFERENCES must be only relevant to the current STORY PROGRESSION and not the whole story.\n' +
	'Never reference the STORY PROGRESSION itself in your response!\n' +
	'List the RELEVANT STORY REFERENCES including narration details from the story history.\n';

/**
 * Summary generation prompt
 */
export const summaryGenerationPrompt = 
	'CRITICAL: You MUST respond with ONLY valid JSON in the exact format specified below. Do not include any additional text, explanations, or formatting.\n' +
	'{"keyDetails": ["key detail 1", "key detail 2", ...], "story": "chronological story summary"}';

/**
 * Summary agent instruction
 */
export const summaryAgentInstruction = 
	'You are a story summary agent. Create a concise chronological summary of the events provided.\n' +
	'Extract key details that are important for story continuity (character development, plot elements, world changes, important relationships, etc.).\n' +
	'Focus on events that have lasting impact or could be referenced later.\n' +
	'Keep the summary engaging but concise.\n';
