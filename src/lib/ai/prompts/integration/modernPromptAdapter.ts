/**
 * Modern Prompt Adapter
 * Intègre progressivement les nouveaux templates dans le système existant
 */

import {
	createJsonInstruction,
	gameAgentJsonTemplate,
	actionAgentJsonTemplate,
	summaryAgentJsonTemplate,
	characterAgentJsonTemplate,
	JSON_VALIDATION_RULES
} from '../templates/jsonTemplates';

import {
	buildHierarchicalInstructions,
	INSTRUCTION_HIERARCHY,
	INSTRUCTION_VALIDATION
} from '../templates/instructionHierarchy';

import {
	UNIVERSAL_CHAIN_OF_THOUGHT,
	GAME_AGENT_CHAIN_OF_THOUGHT,
	ACTION_AGENT_CHAIN_OF_THOUGHT,
	COMBAT_AGENT_CHAIN_OF_THOUGHT,
	addChainOfThought
} from '../templates/chainOfThoughtPrompts';

import {
	getFewShotExamples
} from '../templates/fewShotExamples';

import {
	TIME_CONSISTENCY_PROMPT,
	DETAILED_TIME_GUIDELINES
} from '../templates/timeConsistency';

import {
	systemBehaviourConcise
} from '../system/gameMasterBehaviour';

import {
	LANGUAGE_PROMPT,
	DETAILED_LANGUAGE_PROMPT
} from '../shared/languagePrompt';

export type AgentType = 'game' | 'action' | 'combat' | 'story' | 'character' | 'campaign' | 'summary';

export interface ModernPromptConfig {
	// Quelle version utiliser pour chaque amélioration
	useChainOfThought: boolean;
	useFewShotExamples: boolean;
	useHierarchicalInstructions: boolean;
	useConciseMode: boolean;
	useEnhancedTimeGuidelines: boolean;
	useDetailedLanguagePrompt: boolean;
	
	// Configuration spécifique
	agentType: AgentType;
	customInstructions?: {
		general?: string;
		story?: string;
		action?: string;
		combat?: string;
	};
	
	// Compatibilité avec l'existant
	gameSettings?: any;
}

export class ModernPromptAdapter {
	/**
	 * Construit un système d'instructions moderne en utilisant les nouveaux templates
	 */
	static buildModernSystemInstructions(
		baseInstructions: string[],
		config: ModernPromptConfig
	): string[] {
		let instructions = [...baseInstructions];
		
		// 1. Ajouter la hiérarchie d'instructions si activée
		if (config.useHierarchicalInstructions) {
			instructions = buildHierarchicalInstructions(
				instructions,
				config.customInstructions || {}
			);
		}
		
		// 2. Ajouter le Chain-of-Thought approprié
		if (config.useChainOfThought) {
			let cotPrompt = UNIVERSAL_CHAIN_OF_THOUGHT;
			
			switch (config.agentType) {
				case 'game':
					cotPrompt = GAME_AGENT_CHAIN_OF_THOUGHT;
					break;
				case 'action':
					cotPrompt = ACTION_AGENT_CHAIN_OF_THOUGHT;
					break;
				case 'combat':
					cotPrompt = COMBAT_AGENT_CHAIN_OF_THOUGHT;
					break;
			}
			
			instructions.push(cotPrompt);
		}
		
		// 3. Ajouter les Few-Shot Examples
		if (config.useFewShotExamples) {
			// Mapper les types d'agent aux types supportés par getFewShotExamples
			const supportedTypes = ['game', 'action', 'combat', 'character', 'summary'] as const;
			type SupportedAgentType = typeof supportedTypes[number];
			
			const mappedType: SupportedAgentType = supportedTypes.includes(config.agentType as SupportedAgentType) 
				? config.agentType as SupportedAgentType
				: 'game'; // fallback pour 'story' et 'campaign'
				
			const examples = getFewShotExamples(mappedType);
			if (examples) {
				instructions.push(examples);
			}
		}
		
		// 4. Ajouter les directives temporelles améliorées
		if (config.useEnhancedTimeGuidelines) {
			instructions.push(TIME_CONSISTENCY_PROMPT);
			instructions.push(DETAILED_TIME_GUIDELINES);
		}
		
		// 5. Ajouter les instructions JSON appropriées
		let jsonTemplate = '';
		switch (config.agentType) {
			case 'game':
				jsonTemplate = gameAgentJsonTemplate;
				break;
			case 'action':
				jsonTemplate = actionAgentJsonTemplate;
				break;
			case 'combat':
				// Utiliser gameAgentJsonTemplate pour le combat aussi
				jsonTemplate = gameAgentJsonTemplate;
				break;
			case 'character':
				jsonTemplate = characterAgentJsonTemplate;
				break;
			case 'summary':
				jsonTemplate = summaryAgentJsonTemplate;
				break;
			default:
				jsonTemplate = createJsonInstruction('Respond with valid JSON');
		}
		
		instructions.push(jsonTemplate);
		instructions.push(JSON_VALIDATION_RULES);
		
		// 6. Ajouter les instructions de langue appropriées
		const languagePrompt = config.useDetailedLanguagePrompt 
			? DETAILED_LANGUAGE_PROMPT 
			: LANGUAGE_PROMPT;
		instructions.push(languagePrompt);
		
		// 7. Ajouter la validation finale
		instructions.push(INSTRUCTION_VALIDATION);
		
		return instructions;
	}
	
	/**
	 * Construit des instructions system modernes pour le GameAgent
	 */
	static buildModernGameAgentInstructions(
		storyState: any,
		characterState: any,
		playerCharactersGameState: any,
		inventoryState: any,
		customSystemInstruction: string,
		customStoryAgentInstruction: string,
		customCombatAgentInstruction: string,
		gameSettings: any,
		useConciseMode: boolean = false
	): string[] {
		
		// Utiliser la version concise si demandée
		const baseSystemBehaviour = useConciseMode 
			? systemBehaviourConcise(gameSettings)
			: '';
		
		// Configuration moderne
		const config: ModernPromptConfig = {
			useChainOfThought: true,
			useFewShotExamples: true,
			useHierarchicalInstructions: true,
			useConciseMode: useConciseMode,
			useEnhancedTimeGuidelines: true,
			useDetailedLanguagePrompt: false, // Mode rapide par défaut
			agentType: 'game',
			customInstructions: {
				general: customSystemInstruction,
				story: customStoryAgentInstruction,
				combat: customCombatAgentInstruction
			},
			gameSettings
		};
		
		// Instructions de base (reprendre la logique existante mais optimisée)
		const baseInstructions = [
			baseSystemBehaviour || this.buildLegacySystemBehaviour(
				storyState, 
				characterState, 
				playerCharactersGameState, 
				inventoryState, 
				gameSettings
			)
		].filter(Boolean);
		
		return this.buildModernSystemInstructions(baseInstructions, config);
	}
	
	/**
	 * Fallback vers l'ancien système si nécessaire
	 */
	private static buildLegacySystemBehaviour(
		storyState: any,
		characterState: any,
		playerCharactersGameState: any,
		inventoryState: any,
		gameSettings: any
	): string {
		// Ici on pourrait reprendre la logique existante de construction des prompts
		// mais simplifiée pour éviter la redondance
		return "🎮 Legacy system behaviour - using existing prompt structure";
	}
	
	/**
	 * Méthode utilitaire pour migrer progressivement
	 */
	static enableModernFeatures(
		useModern: boolean,
		agentType: AgentType,
		customOptions: Partial<ModernPromptConfig> = {}
	): ModernPromptConfig {
		if (!useModern) {
			// Mode legacy - désactiver toutes les nouvelles fonctionnalités
			return {
				useChainOfThought: false,
				useFewShotExamples: false,
				useHierarchicalInstructions: false,
				useConciseMode: false,
				useEnhancedTimeGuidelines: false,
				useDetailedLanguagePrompt: false,
				agentType,
				...customOptions
			};
		}
		
		// Mode moderne - activer toutes les améliorations
		return {
			useChainOfThought: true,
			useFewShotExamples: true,
			useHierarchicalInstructions: true,
			useConciseMode: true,
			useEnhancedTimeGuidelines: true,
			useDetailedLanguagePrompt: false, // Concis par défaut pour les performances
			agentType,
			...customOptions
		};
	}
}
