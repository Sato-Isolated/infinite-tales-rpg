/**
 * Narrative and story length prompts
 * 
 * Word limit logic:
 * - When detailedNarrationLength = true: No word limit (detailed narrative encouraged)
 * - When detailedNarrationLength = false: Apply concise limit (100-160 words)
 */

// Concise narration for when detailedNarrationLength = false
export const storyWordLimitConcise = 'must be between 100 and 160 words, do not exceed this range.';

// For backward compatibility (deprecated, use storyWordLimitConcise)
export const storyWordLimit = storyWordLimitConcise;
