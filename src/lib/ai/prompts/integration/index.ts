/**
 * Integration module exports
 * Modern prompt system integration tools
 */

// Core adapter for modern prompt features
export { ModernPromptAdapter, type ModernPromptConfig, type AgentType } from './modernPromptAdapter';

// Migration helper for easy integration
export { 
	PromptMigrationHelper, 
	MIGRATION_PRESETS, 
	RECOMMENDED_STARTER_CONFIG,
	type PromptMigrationSettings 
} from './migrationHelper';

// Integration examples and documentation
export { INTEGRATION_EXAMPLE } from './migrationHelper';

/**
 * Quick start guide for developers
 */
export const QUICK_START = {
	// For immediate integration (minimal risk)
	BASIC_INTEGRATION: `
		import { PromptMigrationHelper, MIGRATION_PRESETS } from '$lib/ai/prompts/integration';
		
		// Replace your existing prompt building with:
		const gameAgent = PromptMigrationHelper.buildEnhancedGameAgentInstructions(
			storyState, characterState, playerCharactersGameState, inventoryState,
			customSystemInstruction, customStoryAgentInstruction, customCombatAgentInstruction,
			gameSettings,
			MIGRATION_PRESETS.BASIC
		);
	`,
	
	// For quality improvements (moderate testing)
	ENHANCED_INTEGRATION: `
		// Use ENHANCED preset for better AI decisions
		const gameAgent = PromptMigrationHelper.buildEnhancedGameAgentInstructions(
			// ... same parameters
			MIGRATION_PRESETS.ENHANCED
		);
	`,
	
	// For custom configuration
	CUSTOM_INTEGRATION: `
		const customConfig = {
			enableModernJson: true,
			enableTimeConsistency: true,
			enableConciseMode: true,
			enableChainOfThought: true,
			enableFewShotExamples: false,
			enableHierarchicalInstructions: false,
			enableDetailedLanguage: false
		};
		
		const gameAgent = PromptMigrationHelper.buildEnhancedGameAgentInstructions(
			// ... parameters
			customConfig
		);
	`
};

/**
 * Performance benefits overview
 */
export const BENEFITS_OVERVIEW = {
	TOKEN_REDUCTION: "30-60% fewer tokens with concise mode",
	JSON_RELIABILITY: "Standardized templates reduce parsing errors",
	TIME_CONSISTENCY: "Realistic durations for all game actions",
	DECISION_QUALITY: "Chain-of-Thought improves AI logic",
	RESPONSE_COHERENCE: "Few-Shot examples increase consistency",
	CONFLICT_RESOLUTION: "Hierarchical instructions handle edge cases",
	BACKWARDS_COMPATIBILITY: "Drop-in replacement for existing system"
};

/**
 * Migration phases for safe adoption
 */
export const MIGRATION_PHASES = {
	PHASE_1: {
		name: "Safety First",
		preset: "BASIC",
		duration: "15-30 minutes",
		features: ["Modern JSON", "Time consistency", "Token optimization"],
		risk: "Minimal"
	},
	PHASE_2: {
		name: "Quality Enhancement", 
		preset: "ENHANCED",
		duration: "1-2 hours",
		features: ["Chain-of-Thought", "Few-Shot examples", "All Phase 1 features"],
		risk: "Low"
	},
	PHASE_3: {
		name: "Full Modern",
		preset: "FULL_MODERN", 
		duration: "2-4 hours",
		features: ["Instruction hierarchy", "Advanced optimizations", "All previous features"],
		risk: "Low"
	}
};

export default {
	QUICK_START,
	BENEFITS_OVERVIEW,
	MIGRATION_PHASES
};
