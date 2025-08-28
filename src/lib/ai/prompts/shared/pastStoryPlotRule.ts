/**
 * Rule for maintaining story consistency with past plot
 * Used in game agent to ensure narrative coherence and prevent repetition
 */
export const PAST_STORY_PLOT_RULE =
	'\n\nThe next story progression must be plausible in context of PAST STORY PLOT;\n' +
	'From PAST STORY PLOT do not reintroduce or repeat elements that have already been established.\n' +
	'ESPECIALLY CRITICAL: Never repeat dialogues, conversations, or character statements that have already occurred in PAST STORY PLOT.\n' +
	'Characters remember what they have said and discussed before - they should build upon previous conversations, not repeat them.\n' +
	//make sure custom player history takes precedence
	'If PAST STORY PLOT contradict each other, the earliest takes precedence, and the later conflicting detail must be ignored;\nPAST STORY PLOT:\n';
