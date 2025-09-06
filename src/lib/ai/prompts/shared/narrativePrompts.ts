/**
 * Narrative and story length prompts
 * 
 * Word limit logic:
 * - When detailedNarrationLength = true: Apply detailed limit (400-600 words, 2700+ characters)
 * - When detailedNarrationLength = false: Apply concise limit (100-160 words)
 */

// Concise narration for when detailedNarrationLength = false
export const storyWordLimitConcise = 'must be between 100 and 160 words, do not exceed this range.';

// Detailed narration for when detailedNarrationLength = true
export const storyWordLimitDetailed = 'should be between 800 and 1200 words (approximately 4000-6000 characters). Write rich, detailed narrative with vivid descriptions, character emotions, environmental details, and immersive dialogue. Include sensory details, character thoughts and motivations, atmospheric elements, and comprehensive scene-setting. The narrative should be engaging and cinematic in scope.';

// For backward compatibility (deprecated, use storyWordLimitConcise)
export const storyWordLimit = storyWordLimitConcise;
