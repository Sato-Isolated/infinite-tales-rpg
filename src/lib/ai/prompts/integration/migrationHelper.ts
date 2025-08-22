/**
 * Exemple d'intégration progressive des nouvelles fonctionnalités de prompts
 * Ce fichier montre comment migrer étape par étape vers le nouveau système
 */

import type { GameAgent } from '../../agents/gameAgent';
import { ModernPromptAdapter, type ModernPromptConfig } from './modernPromptAdapter';
import type { GameSettings } from '../../agents/gameAgent';

/**
 * Configuration simple pour activer progressivement les nouvelles fonctionnalités
 */
export interface PromptMigrationSettings {
	// Phase 1 - Améliorations de base (recommandé de commencer ici)
	enableModernJson: boolean;           // Templates JSON standardisés
	enableTimeConsistency: boolean;      // Directives temporelles améliorées
	enableConciseMode: boolean;          // Version concise pour économiser tokens
	
	// Phase 2 - Améliorations intermédiaires  
	enableChainOfThought: boolean;       // Raisonnement structuré
	enableFewShotExamples: boolean;      // Exemples concrets
	
	// Phase 3 - Fonctionnalités avancées
	enableHierarchicalInstructions: boolean; // Résolution de conflits
	enableDetailedLanguage: boolean;     // Prompts de langue détaillés
}

/**
 * Présets de migration pour faciliter l'adoption
 */
export const MIGRATION_PRESETS = {
	// Désactiver toutes les nouvelles fonctionnalités (mode legacy)
	LEGACY: {
		enableModernJson: false,
		enableTimeConsistency: false,
		enableConciseMode: false,
		enableChainOfThought: false,
		enableFewShotExamples: false,
		enableHierarchicalInstructions: false,
		enableDetailedLanguage: false
	} as PromptMigrationSettings,
	
	// Phase 1 - Améliorations de base sans risque
	BASIC: {
		enableModernJson: true,
		enableTimeConsistency: true,
		enableConciseMode: true,
		enableChainOfThought: false,
		enableFewShotExamples: false,
		enableHierarchicalInstructions: false,
		enableDetailedLanguage: false
	} as PromptMigrationSettings,
	
	// Phase 2 - Qualité améliorée
	ENHANCED: {
		enableModernJson: true,
		enableTimeConsistency: true,
		enableConciseMode: true,
		enableChainOfThought: true,
		enableFewShotExamples: true,
		enableHierarchicalInstructions: false,
		enableDetailedLanguage: false
	} as PromptMigrationSettings,
	
	// Phase 3 - Toutes les fonctionnalités avancées
	FULL_MODERN: {
		enableModernJson: true,
		enableTimeConsistency: true,
		enableConciseMode: true,
		enableChainOfThought: true,
		enableFewShotExamples: true,
		enableHierarchicalInstructions: true,
		enableDetailedLanguage: false // false pour les performances par défaut
	} as PromptMigrationSettings
};

/**
 * Wrapper pour faciliter l'intégration dans GameAgent
 */
export class PromptMigrationHelper {
	
	/**
	 * Crée des instructions système modernes à partir des paramètres existants
	 */
	static buildEnhancedGameAgentInstructions(
		// Paramètres existants de votre GameAgent
		storyState: any,
		characterState: any, 
		playerCharactersGameState: any,
		inventoryState: any,
		customSystemInstruction: string,
		customStoryAgentInstruction: string,
		customCombatAgentInstruction: string,
		gameSettings: GameSettings,
		
		// Nouveau paramètre pour contrôler les améliorations
		migrationSettings: PromptMigrationSettings = MIGRATION_PRESETS.BASIC
	): string[] {
		
		// Si mode legacy, utiliser l'ancienne méthode (à implémenter)
		if (!migrationSettings.enableModernJson && 
		    !migrationSettings.enableTimeConsistency && 
		    !migrationSettings.enableConciseMode) {
			// Retourner vers l'ancien système
			return this.buildLegacyInstructions(
				storyState, characterState, playerCharactersGameState, 
				inventoryState, customSystemInstruction, customStoryAgentInstruction,
				customCombatAgentInstruction, gameSettings
			);
		}
		
		// Configuration moderne basée sur les paramètres de migration
		const modernConfig: ModernPromptConfig = {
			useChainOfThought: migrationSettings.enableChainOfThought,
			useFewShotExamples: migrationSettings.enableFewShotExamples,
			useHierarchicalInstructions: migrationSettings.enableHierarchicalInstructions,
			useConciseMode: migrationSettings.enableConciseMode,
			useEnhancedTimeGuidelines: migrationSettings.enableTimeConsistency,
			useDetailedLanguagePrompt: migrationSettings.enableDetailedLanguage,
			agentType: 'game',
			customInstructions: {
				general: customSystemInstruction,
				story: customStoryAgentInstruction,
				combat: customCombatAgentInstruction
			},
			gameSettings
		};
		
		// Utiliser l'adaptateur moderne
		return ModernPromptAdapter.buildModernGameAgentInstructions(
			storyState,
			characterState,
			playerCharactersGameState,
			inventoryState,
			customSystemInstruction,
			customStoryAgentInstruction,
			customCombatAgentInstruction,
			gameSettings,
			migrationSettings.enableConciseMode
		);
	}
	
	/**
	 * Méthode pour tester les améliorations avec A/B testing
	 */
	static comparePromptVersions(
		// Mêmes paramètres que buildEnhancedGameAgentInstructions
		storyState: any,
		characterState: any,
		playerCharactersGameState: any,
		inventoryState: any,
		customSystemInstruction: string,
		customStoryAgentInstruction: string,
		customCombatAgentInstruction: string,
		gameSettings: GameSettings
	) {
		const legacy = this.buildEnhancedGameAgentInstructions(
			storyState, characterState, playerCharactersGameState, inventoryState,
			customSystemInstruction, customStoryAgentInstruction, customCombatAgentInstruction,
			gameSettings, MIGRATION_PRESETS.LEGACY
		);
		
		const modern = this.buildEnhancedGameAgentInstructions(
			storyState, characterState, playerCharactersGameState, inventoryState,
			customSystemInstruction, customStoryAgentInstruction, customCombatAgentInstruction,
			gameSettings, MIGRATION_PRESETS.ENHANCED
		);
		
		return {
			legacy: {
				instructions: legacy,
				tokenCount: legacy.join(' ').length / 4, // Estimation approximative
				features: 'Legacy system'
			},
			modern: {
				instructions: modern,
				tokenCount: modern.join(' ').length / 4,
				features: 'Modern JSON + Time + Chain-of-Thought + Few-Shot'
			}
		};
	}
	
	/**
	 * Fallback vers l'ancien système (à connecter avec votre code existant)
	 */
	private static buildLegacyInstructions(
		storyState: any,
		characterState: any,
		playerCharactersGameState: any,
		inventoryState: any,
		customSystemInstruction: string,
		customStoryAgentInstruction: string,
		customCombatAgentInstruction: string,
		gameSettings: GameSettings
	): string[] {
		// Ici vous pourriez appeler votre méthode existante
		// Par exemple: return existingGameAgent.getGameAgentSystemInstructionsFromStates(...)
		
		return [
			"🔄 LEGACY MODE - Using original prompt system",
			"⚠️ Consider migrating to modern prompts for better performance"
		];
	}
}

/**
 * Exemple d'utilisation simple dans votre GameAgent
 */
export const INTEGRATION_EXAMPLE = `
// Dans votre GameAgent.ts, remplacez cette ligne:
// const gameAgent = this.getGameAgentSystemInstructionsFromStates(...)

// Par cette ligne pour activer les améliorations de base:
const gameAgent = PromptMigrationHelper.buildEnhancedGameAgentInstructions(
  storyState, characterState, playerCharactersGameState, inventoryState,
  customSystemInstruction, customStoryAgentInstruction, customCombatAgentInstruction,
  gameSettings,
  MIGRATION_PRESETS.BASIC  // Ou ENHANCED, ou FULL_MODERN
);

// Pour tester la différence:
const comparison = PromptMigrationHelper.comparePromptVersions(
  storyState, characterState, playerCharactersGameState, inventoryState,
  customSystemInstruction, customStoryAgentInstruction, customCombatAgentInstruction,
  gameSettings
);
console.log('Token reduction:', 
  comparison.legacy.tokenCount - comparison.modern.tokenCount
);
`;

/**
 * Configuration recommandée pour démarrer
 */
export const RECOMMENDED_STARTER_CONFIG: PromptMigrationSettings = {
	enableModernJson: true,        // ✅ Améliore la structure des réponses  
	enableTimeConsistency: true,   // ✅ Meilleure gestion du temps
	enableConciseMode: true,       // ✅ Économie de tokens (~30-60%)
	enableChainOfThought: false,   // ⏳ Activer après tests des 3 premières
	enableFewShotExamples: false,  // ⏳ Activer après tests des 3 premières
	enableHierarchicalInstructions: false, // ⏳ Pour plus tard
	enableDetailedLanguage: false  // ⏳ Seulement si besoin spécifique
};
