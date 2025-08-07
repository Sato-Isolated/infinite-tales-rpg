import type { LLM, LLMMessage } from '$lib/ai/llm';
import type { Story } from '$lib/ai/agents/storyAgent';
import type { CharacterDescription } from '$lib/ai/agents/characterAgent';
import type { NPCStats, CharacterStats } from '$lib/ai/agents/characterStatsAgent';
import type { CompanionCharacter, MemoryEvent } from '$lib/types/companion';
import { 
	NPCToCompanionAgent, 
	type NPCRecruitmentContext, 
	type NPCToCompanionAnalysis 
} from '$lib/ai/agents/npcToCompanionAgent';
import { CharacterStatsAgent } from '$lib/ai/agents/characterStatsAgent';
import { v4 as uuidv4 } from 'uuid';

export class NPCToCompanionService {
	private npcToCompanionAgent: NPCToCompanionAgent;
	private characterStatsAgent: CharacterStatsAgent;

	constructor(llm: LLM) {
		this.npcToCompanionAgent = new NPCToCompanionAgent(llm);
		this.characterStatsAgent = new CharacterStatsAgent(llm);
	}

	/**
	 * Analyser si un NPC peut être recruté comme compagnon
	 */
	async analyzeNPCRecruitment(
		storyState: Story,
		storyHistory: LLMMessage[],
		npcName: string,
		npcData: NPCStats,
		playerCharacter: CharacterDescription,
		recruitmentReason: string = "Player wants to recruit this NPC as a companion"
	): Promise<NPCToCompanionAnalysis> {
		const recruitmentContext: NPCRecruitmentContext = {
			npcName,
			npcData,
			recruitmentReason,
			relationshipContext: this.extractRelationshipContext(storyHistory, npcName)
		};

		return await this.npcToCompanionAgent.analyzeNPCForRecruitment(
			storyState,
			storyHistory,
			recruitmentContext,
			playerCharacter
		);
	}

	/**
	 * Convertir un NPC en CompanionCharacter complet basé sur l'analyse
	 */
	async convertNPCToCompanion(
		analysis: NPCToCompanionAnalysis,
		npcData: NPCStats,
		storyState: Story
	): Promise<CompanionCharacter> {
		// Générer des stats de compagnon enrichies basées sur l'analyse
		const companionStats = await this.generateCompanionStats(
			analysis.characterDescription,
			npcData,
			storyState
		);

		// Créer le compagnon complet
		return this.createCompanionFromAnalysis(analysis, companionStats);
	}

	/**
	 * Processus complet : analyser et convertir un NPC en une seule opération
	 */
	async recruitNPCAsCompanion(
		storyState: Story,
		storyHistory: LLMMessage[],
		npcName: string,
		npcData: NPCStats,
		playerCharacter: CharacterDescription,
		recruitmentReason?: string
	): Promise<{
		success: boolean;
		companion?: CompanionCharacter;
		analysis: NPCToCompanionAnalysis;
		message: string;
	}> {
		try {
			// Étape 1: Analyser le NPC
			const analysis = await this.analyzeNPCRecruitment(
				storyState,
				storyHistory,
				npcName,
				npcData,
				playerCharacter,
				recruitmentReason
			);

			// Étape 2: Vérifier si le recrutement est possible
			if (!analysis.canBeRecruited || analysis.recruitmentLikelihood === 'very_low') {
				return {
					success: false,
					analysis,
					message: `${analysis.characterDescription.name} cannot be recruited: ${analysis.reasoningForDecision}`
				};
			}

			// Étape 3: Convertir en compagnon
			const companion = await this.convertNPCToCompanion(analysis, npcData, storyState);

			return {
				success: true,
				companion,
				analysis,
				message: `${companion.character_description.name} has successfully joined your party!`
			};

		} catch (error) {
			console.error('Error recruiting NPC as companion:', error);
			return {
				success: false,
				analysis: {
					canBeRecruited: false,
					recruitmentLikelihood: 'very_low',
					reasoningForDecision: 'Technical error occurred during recruitment analysis',
					characterDescription: { name: npcName } as CharacterDescription,
					initialLoyalty: 0,
					initialTrust: 0,
					initialRelationshipStatus: 'stranger',
					foundingMemories: [],
					personalityTraits: [],
					motivationForJoining: '',
					potentialConcerns: [],
					suggestedInitialDialogue: ''
				},
				message: `Failed to recruit ${npcName}: ${error instanceof Error ? error.message : 'Unknown error'}`
			};
		}
	}

	/**
	 * Suggérer les NPCs recrutables dans la scène actuelle
	 */
	async suggestRecruitableNPCs(
		storyState: Story,
		storyHistory: LLMMessage[],
		currentNPCs: Record<string, NPCStats>,
		playerCharacter: CharacterDescription
	): Promise<Array<{
		technicalId: string;
		name: string;
		description?: string;
		suitabilityScore?: number;
		recruitmentReasons?: string[];
		recruitmentRisks?: string[];
	}>> {
		try {
			const suggestions = await this.npcToCompanionAgent.suggestRecruitableNPCs(
				storyState,
				storyHistory,
				currentNPCs,
				playerCharacter
			);

			return suggestions.map(suggestion => ({
				technicalId: suggestion.npcName,
				name: suggestion.npcName,
				description: suggestion.briefReasoning,
				suitabilityScore: this.mapPotentialToScore(suggestion.recruitmentPotential),
				recruitmentReasons: [suggestion.briefReasoning],
				recruitmentRisks: suggestion.recruitmentPotential === 'low' ? 
					['May be difficult to convince', 'Limited relationship established'] : 
					[]
			}));
		} catch (error) {
			console.error('Error suggesting recruitable NPCs:', error);
			return [];
		}
	}

	private mapPotentialToScore(potential: 'low' | 'medium' | 'high'): number {
		switch (potential) {
			case 'high': return 8;
			case 'medium': return 5;
			case 'low': return 2;
			default: return 0;
		}
	}

	/**
	 * Générer un dialogue de recrutement personnalisé
	 */
	async generateRecruitmentDialogue(
		analysis: NPCToCompanionAnalysis,
		playerCharacter: CharacterDescription,
		approachType: 'direct' | 'persuasive' | 'emotional' | 'practical' = 'direct'
	) {
		return await this.npcToCompanionAgent.generateRecruitmentDialogue(
			analysis,
			playerCharacter,
			approachType
		);
	}

	private async generateCompanionStats(
		characterDescription: CharacterDescription,
		npcData: NPCStats,
		storyState: Story
	): Promise<CharacterStats> {
		// Partir des capacités existantes du NPC et les enrichir
		const baseStats: Partial<CharacterStats> = {
			level: npcData.level,
			spells_and_abilities: npcData.spells_and_abilities,
			// Générer des attributs basés sur la classe et le niveau
			attributes: this.generateAttributesFromNPCData(npcData),
			// Générer des ressources basées sur les données NPC
			resources: this.generateResourcesFromNPCData(npcData)
		};

		// Utiliser l'agent existant pour enrichir et équilibrer les stats
		return await this.characterStatsAgent.generateCharacterStats(
			storyState,
			characterDescription,
			baseStats,
			true // Mode adaptatif pour enrichir les stats existantes
		);
	}

	private generateAttributesFromNPCData(npcData: NPCStats): { [stat: string]: number } {
		const attributes: { [stat: string]: number } = {};
		
		// Attributs basés sur la classe
		const className = npcData.class.toLowerCase();
		if (className.includes('warrior') || className.includes('fighter')) {
			attributes.strength = Math.min(npcData.level + 2, 10);
			attributes.constitution = Math.min(npcData.level + 1, 10);
			attributes.dexterity = Math.max(npcData.level - 1, -5);
		} else if (className.includes('mage') || className.includes('wizard')) {
			attributes.intelligence = Math.min(npcData.level + 2, 10);
			attributes.wisdom = Math.min(npcData.level + 1, 10);
			attributes.constitution = Math.max(npcData.level - 2, -5);
		} else if (className.includes('rogue') || className.includes('thief')) {
			attributes.dexterity = Math.min(npcData.level + 2, 10);
			attributes.intelligence = Math.min(npcData.level, 10);
			attributes.strength = Math.max(npcData.level - 1, -5);
		} else if (className.includes('cleric') || className.includes('healer')) {
			attributes.wisdom = Math.min(npcData.level + 2, 10);
			attributes.charisma = Math.min(npcData.level + 1, 10);
			attributes.constitution = Math.max(npcData.level - 1, -5);
		} else {
			// Classe générique, attributs équilibrés
			const baseValue = Math.min(Math.floor(npcData.level / 2), 5);
			attributes.strength = baseValue;
			attributes.dexterity = baseValue;
			attributes.intelligence = baseValue;
			attributes.wisdom = baseValue;
			attributes.constitution = baseValue;
			attributes.charisma = baseValue;
		}

		// Modifier selon le rang
		const rankModifier = this.getRankModifier(npcData.rank_enum_english);
		Object.keys(attributes).forEach(key => {
			attributes[key] = Math.max(-10, Math.min(10, attributes[key] + rankModifier));
		});

		return attributes;
	}

	private generateResourcesFromNPCData(npcData: NPCStats): { [resourceKey: string]: { max_value: number; start_value: number; game_ends_when_zero: boolean } } {
		const resources: { [resourceKey: string]: { max_value: number; start_value: number; game_ends_when_zero: boolean } } = {};
		
		// HP basé sur les données NPC existantes
		if (npcData.resources?.current_hp) {
			const maxHp = Math.max(npcData.resources.current_hp, npcData.level * 10 + 20);
			resources.HP = {
				max_value: maxHp,
				start_value: maxHp,
				game_ends_when_zero: true
			};
		}

		// MP si le NPC a des capacités magiques
		if (npcData.resources?.current_mp || 
			npcData.spells_and_abilities.some(ability => 
				ability.name.toLowerCase().includes('magic') || 
				ability.name.toLowerCase().includes('spell')
			)) {
			const maxMp = npcData.resources?.current_mp || npcData.level * 5 + 15;
			resources.MP = {
				max_value: Math.max(maxMp, 15),
				start_value: Math.max(maxMp, 15),
				game_ends_when_zero: false
			};
		}

		// Ressources additionnelles basées sur la classe
		const className = npcData.class.toLowerCase();
		if (className.includes('ranger') || className.includes('hunter')) {
			resources.Stamina = {
				max_value: npcData.level * 8 + 25,
				start_value: npcData.level * 8 + 25,
				game_ends_when_zero: false
			};
		} else if (className.includes('noble') || className.includes('bard')) {
			resources.Influence = {
				max_value: npcData.level * 6 + 20,
				start_value: npcData.level * 6 + 20,
				game_ends_when_zero: false
			};
		}

		return resources;
	}

	private getRankModifier(rank: string): number {
		switch (rank) {
			case 'Very Weak': return -2;
			case 'Weak': return -1;
			case 'Average': return 0;
			case 'Strong': return 1;
			case 'Boss': return 2;
			case 'Legendary': return 3;
			default: return 0;
		}
	}

	private createCompanionFromAnalysis(
		analysis: NPCToCompanionAnalysis,
		companionStats: CharacterStats
	): CompanionCharacter {
		const companionId = uuidv4();
		const now = new Date().toISOString();

		// Convertir les foundingMemories de l'analyse
		const foundingMemories = analysis.foundingMemories.map(memory => ({
			...memory,
			id: memory.id || uuidv4(),
			timestamp: memory.timestamp || now
		}));

		return {
			id: companionId,
			character_description: analysis.characterDescription,
			character_stats: companionStats,
			companion_memory: {
				significant_events: foundingMemories,
				personality_influences: [],
				relationship_timeline: [{
					timestamp: now,
					event_type: 'first_meeting' as const,
					description: 'Recruited as a companion based on shared experiences',
					impact_on_relationship: analysis.initialLoyalty > 50 ? 30 : 15
				}],
				combat_experiences: [],
				dialogue_history: [{
					timestamp: now,
					topic: 'recruitment',
					player_stance: 'recruitment offer',
					companion_response: analysis.suggestedInitialDialogue,
					emotional_tone: analysis.initialTrust > 60 ? 'positive' : 'neutral',
					subjects_discussed: ['joining party', 'future adventures'],
					agreements: ['decided to travel together'],
					disagreements: []
				}]
			},
			personality_evolution: {
				baseline_personality: analysis.characterDescription.personality,
				current_personality_traits: analysis.personalityTraits.map(trait => ({
					trait_name: trait.trait_name,
					value: trait.value,
					last_changed: now,
					influenced_by: foundingMemories.map(m => m.id)
				})),
				evolution_history: [],
				stability_factor: this.calculateStabilityFactor(analysis.personalityTraits)
			},
			relationship_data: {
				initial_relationship: 'recruited_companion',
				current_status: analysis.initialRelationshipStatus,
				relationship_milestones: [{
					milestone_type: 'became_friends' as const,
					timestamp: now,
					description: 'Agreed to join the party after positive interactions',
					relationship_level_before: 'stranger',
					relationship_level_after: analysis.initialRelationshipStatus
				}],
				shared_experiences: foundingMemories.map(m => m.description)
			},
			created_at: now,
			last_interaction: now,
			is_active_in_party: false, // Le joueur devra les activer manuellement
			loyalty_level: analysis.initialLoyalty,
			trust_level: analysis.initialTrust
		};
	}

	private calculateStabilityFactor(personalityTraits: Array<{ trait_name: string; value: number; reasoning: string }>): number {
		// Plus les traits sont équilibrés, plus stable la personnalité
		const traitValues = personalityTraits.map(t => t.value);
		const average = traitValues.reduce((sum, val) => sum + val, 0) / traitValues.length;
		const variance = traitValues.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / traitValues.length;
		
		// Plus la variance est faible, plus la personnalité est stable
		// Convertir en facteur de stabilité entre 40 et 90
		const stabilityFactor = Math.max(40, Math.min(90, 90 - Math.floor(variance / 10)));
		return stabilityFactor;
	}

	private extractRelationshipContext(storyHistory: LLMMessage[], npcName: string): string {
		// Analyser les interactions pour déterminer le contexte relationnel
		const interactions = storyHistory
			.filter(message => message.content.toLowerCase().includes(npcName.toLowerCase()))
			.slice(-5) // Dernières 5 interactions
			.map(message => message.content)
			.join(' ');

		if (interactions.includes('save') || interactions.includes('rescue')) {
			return 'Player saved or rescued this NPC';
		} else if (interactions.includes('help') || interactions.includes('assist')) {
			return 'Player helped this NPC with something';
		} else if (interactions.includes('fight') || interactions.includes('combat')) {
			return 'Player fought alongside or against this NPC';
		} else if (interactions.includes('talk') || interactions.includes('speak')) {
			return 'Player had conversations with this NPC';
		} else {
			return 'Limited interaction between player and NPC';
		}
	}
}
