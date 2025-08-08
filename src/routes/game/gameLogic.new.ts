// Re-exports from modularized files for maintaining API compatibility

// Types and Enums
export { ActionDifficulty, InterruptProbability, type RenderedGameUpdate, type CompanionMention } from '$lib/types/gameTypes.js';

// Resource Utilities
export { getEmptyCriticalResourceKeys, formatItemId, isEnoughResource, mapStatsUpdateToGameLogic } from '$lib/utils/resourceUtils.js';

// Entity Management
export { getAllTargetsAsList, getAllNpcsIds, getNewNPCs, getUnifiedNewEntities, syncEntityStatsFromUpdate } from '$lib/entities/entityUtils.js';

// Action Processing
export { mustRollDice, getTargetPromptAddition, getContinueTalePromptAddition, addAdditionsFromActionSideeffects, isRandomEventCreated } from '$lib/actions/actionUtils.js';

// Rendering
export { renderStatUpdates, renderInventoryUpdate } from '$lib/rendering/gameRendering.js';

// State Management
export { applyGameActionState, applyInventoryUpdate, applyGameActionStates, getGameEndedMessage, undoLastAction } from '$lib/state/gameStateUtils.js';

// Companion System - Core Functions
export { 
	initializeGameWithCompanions, 
	recordCompanionMemoryFromGameAction, 
	processCompanionEvolution, 
	getActiveCompanions,
	shouldValidateCompanions,
	updateValidationState,
	forceNextValidation
} from '$lib/companions/companionGameLogic.js';

// Companion System - Validation
export {
	smartValidateCompanions,
	validateAndEnrichCompanionsForStoryGeneration,
	generateEnhancedCompanionPromptContext,
	checkNPCNameForCompanionConflict,
	performPeriodicCompanionMaintenance,
	cleanupNPCCompanionDuplicates
} from '$lib/companions/companionValidationUtils.js';

// Companion System - Mentions and Interactions
export {
	detectCompanionMentions,
	generateCompanionContextForPrompt,
	updateCompanionFromStatsUpdate
} from '$lib/companions/companionMentionUtils.js';

// Companion System - Narrative Evolution
export {
	processNarrativeEvolutionPostStory,
	processTimeSkipAction
} from '$lib/companions/narrativeEvolutionUtils.js';
