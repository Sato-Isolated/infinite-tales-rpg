/**
 * Safety settings types for user-configurable AI content filtering
 * Used to control how strict content filtering is during RPG generation
 * 
 * NOTE: SafetyLevel is now exported from the consolidated content rating config
 * to ensure consistency across the application
 */

export type { SafetyLevel } from '$lib/ai/config/contentRatingToSafety';
