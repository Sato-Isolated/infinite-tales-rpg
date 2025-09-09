/**
 * Narrative and story length prompts
 * 
 * Word limit logic:
 * - When detailedNarrationLength = true: Apply detailed limit (600-1000 words, rich narrative)
 * - When detailedNarrationLength = false: Apply concise limit (100-160 words)
 * 
 * This system ensures consistent narrative length across all AI agents while providing
 * meaningful differentiation between concise and detailed storytelling modes.
 */

// Concise narration for when detailedNarrationLength = false
export const storyWordLimitConcise = 'must be between 100 and 160 words, do not exceed this range. Focus on essential plot points and key character interactions while maintaining narrative flow.';

// Detailed narration for when detailedNarrationLength = true
export const storyWordLimitDetailed = 'should be between 600 and 1000 words (approximately 3000-5000 characters). Write rich, detailed narrative with vivid descriptions, character emotions, environmental details, and immersive dialogue. Include sensory details, character thoughts and motivations, atmospheric elements, and comprehensive scene-setting. The narrative should be engaging and cinematic in scope with thorough exploration of the scene and character interactions.';

// Action-specific limits for detailed narration in action descriptions
export const actionDescriptionConcise = 'should be 30-60 words, focusing on immediate results and key details.';
export const actionDescriptionDetailed = 'should be 80-150 words, providing rich sensory details, environmental context, and character reactions.';

// Combat-specific limits for detailed narration in combat scenarios
export const combatNarrationConcise = 'should be 40-80 words, focusing on attack outcomes and immediate tactical changes.';
export const combatNarrationDetailed = 'should be 100-200 words, including detailed combat choreography, environmental effects, character emotions, and tactical nuances.';

// Character description limits for character generation
export const characterDescriptionConcise = 'should be 50-100 words, covering essential appearance and personality traits.';
export const characterDescriptionDetailed = 'should be 150-300 words, providing comprehensive physical description, personality depth, background hints, and behavioral patterns.';

// Event narration limits for event descriptions
export const eventNarrationConcise = 'should be 60-120 words, focusing on key event outcomes and immediate consequences.';
export const eventNarrationDetailed = 'should be 120-250 words, providing rich environmental context, character reactions, and detailed event progression.';

// For backward compatibility (deprecated, use storyWordLimitConcise)
export const storyWordLimit = storyWordLimitConcise;
