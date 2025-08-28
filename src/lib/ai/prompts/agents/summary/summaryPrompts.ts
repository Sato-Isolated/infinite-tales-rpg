/**
 * Summary agent prompts
 */

/**
 * Related history JSON format template
 */
export const relatedHistoryJsonFormat = '{"relatedDetails": [{"storyReference": "specific story detail", "relevanceScore": 0.85}]}';

/**
 * Related history retrieval prompt
 */
export const relatedHistoryPrompt = (maxRelatedDetails: number) =>
	'CRITICAL: You MUST respond with ONLY valid JSON in the exact format specified below. Do not include any additional text, explanations, or formatting.\n' +
	relatedHistoryJsonFormat;

/**
 * Related history agent instruction
 */
export const relatedHistoryAgentInstruction =
	'Scan the FULL STORY HISTORY and identify any SPECIFIC STORY REFERENCES from past events that are HIGHLY RELEVANT to the current STORY PROGRESSION. Focus on details that will help maintain consistency and plausibility.\n' +
	'The RELEVANT REFERENCES must be only relevant to the current STORY PROGRESSION and not the whole story.\n' +
	'Never reference the STORY PROGRESSION itself in your response!\n' +
	'List the RELEVANT STORY REFERENCES including narration details from the story history.\n' +
	'\n' +
	'🗣️ SPECIAL FOCUS ON DIALOGUE MEMORY:\n' +
	'- Pay special attention to important conversations, dialogue topics, and what characters have already discussed\n' +
	'- Include dialogue context that helps prevent repetitive conversations\n' +
	'- Reference previous character interactions and conversation outcomes\n' +
	'- Note relationship changes or revelations from past dialogues\n';

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
	'Keep the summary engaging but concise.\n' +
	'\n' +
	'🗣️ CRITICAL DIALOGUE PRESERVATION:\n' +
	'- Always preserve important dialogue context, conversation topics, and what characters have discussed\n' +
	'- Include character relationship changes revealed through conversations\n' +
	'- Note significant revelations, promises, or commitments made in dialogue\n' +
	'- Track which characters have met and spoken before\n' +
	'- Preserve conversational outcomes that affect future interactions\n' +
	'- Remember dialogue-based plot developments and character revelations\n';
