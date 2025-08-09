import { CharacterAgent, type CharacterDescription } from '$lib/ai/agents/characterAgent';
import { CharacterStatsAgent, type CharacterStats } from '$lib/ai/agents/characterStatsAgent';
import type { Story } from '$lib/ai/agents/storyAgent';
import type { LLM } from '$lib/ai/llm';
import type {
	CompanionCharacter,
	CompanionTemplate,
	initialCompanionMemory,
	initialPersonalityEvolution,
	initialRelationshipData
} from '$lib/types/companion';
import { v4 as uuidv4 } from 'uuid';

export class CompanionCreationService {
	private characterAgent: CharacterAgent;
	private characterStatsAgent: CharacterStatsAgent;

	constructor(llm: LLM) {
		this.characterAgent = new CharacterAgent(llm);
		this.characterStatsAgent = new CharacterStatsAgent(llm);
	}

	async createCompanionFromTemplate(
		storyContext: Story,
		playerCharacter: CharacterDescription,
		template: CompanionTemplate
	): Promise<CompanionCharacter> {
		// Générer la description du compagnon basée sur le template
		const companionDescription = await this.generateCompanionDescription(
			storyContext,
			playerCharacter,
			template
		);

		// Générer les stats du compagnon
		const companionStats = await this.characterStatsAgent.generateCharacterStats(
			storyContext,
			companionDescription
		);

		// Créer le compagnon complet
		return this.createCompanionFromDescriptionAndStats(
			companionDescription,
			companionStats,
			template
		);
	}

	async createRandomCompanion(
		storyContext: Story,
		playerCharacter: CharacterDescription
	): Promise<CompanionCharacter> {
		// Choisir un template aléatoire basé sur le contexte de l'histoire
		const template = this.selectRandomTemplate(storyContext);
		
		return this.createCompanionFromTemplate(storyContext, playerCharacter, template);
	}

	async createCustomCompanion(
		storyContext: Story,
		companionDescription: CharacterDescription,
		companionStats?: Partial<CharacterStats>
	): Promise<CompanionCharacter> {
		// Générer les stats si pas fournies
		let finalStats: CharacterStats;
		if (companionStats) {
			finalStats = await this.characterStatsAgent.generateCharacterStats(
				storyContext,
				companionDescription,
				companionStats
			);
		} else {
			finalStats = await this.characterStatsAgent.generateCharacterStats(
				storyContext,
				companionDescription
			);
		}

		// Template par défaut pour compagnon custom
		const defaultTemplate: CompanionTemplate = {
			role: 'guide',
			relationship: 'mysterious_ally',
			personality_base: 'pragmatic'
		};

		return this.createCompanionFromDescriptionAndStats(
			companionDescription,
			finalStats,
			defaultTemplate
		);
	}

	private async generateCompanionDescription(
		storyContext: Story,
		playerCharacter: CharacterDescription,
		template: CompanionTemplate
	): Promise<CharacterDescription> {
		// Créer un contexte pour la génération qui inclut le template
		const companionPrompt = this.buildCompanionPrompt(playerCharacter, template);
		
		// Utiliser le CharacterAgent existant avec le contexte modifié
		return await this.characterAgent.generateCharacterDescription(
			{
				...storyContext,
				companion_context: companionPrompt
			},
			{
				class: this.mapRoleToClass(template.role),
				personality: this.buildPersonalityFromTemplate(template),
				background: this.buildBackgroundFromTemplate(template, playerCharacter)
			}
		);
	}

	private createCompanionFromDescriptionAndStats(
		description: CharacterDescription,
		stats: CharacterStats,
		template: CompanionTemplate
	): CompanionCharacter {
		const companionId = uuidv4();
		const now = new Date().toISOString();

		// Déterminer les niveaux initiaux de confiance et loyauté basés sur la relation
		const { trustLevel, loyaltyLevel } = this.getInitialRelationshipLevels(template.relationship);

		return {
			id: companionId,
			character_description: description,
			character_stats: stats,
			source_type: 'template',
			source_ref: template.role,
			signature: (description.name || '').toLowerCase().replace(/[\s'`´’-]+/g, ''),
			companion_memory: {
				significant_events: [],
				personality_influences: [],
				relationship_timeline: [],
				combat_experiences: [],
				dialogue_history: []
			},
			personality_evolution: {
				baseline_personality: description.personality,
				current_personality_traits: this.initializePersonalityTraits(template),
				evolution_history: [],
				stability_factor: this.getStabilityFactor(template.personality_base)
			},
			relationship_data: {
				initial_relationship: template.relationship,
				current_status: this.mapRelationshipToStatus(template.relationship),
				relationship_milestones: [],
				shared_experiences: []
			},
			created_at: now,
			last_interaction: now,
			is_active_in_party: false,
			loyalty_level: loyaltyLevel,
			trust_level: trustLevel
		};
	}

	private buildCompanionPrompt(playerCharacter: CharacterDescription, template: CompanionTemplate): string {
		return `This character is a companion for ${playerCharacter.name}, a ${playerCharacter.race} ${playerCharacter.class}. 
		The companion should be a ${template.role} with a ${template.relationship} relationship to the player character.
		The companion's personality should be ${template.personality_base}.
		${template.background_connection || ''}`;
	}

	private mapRoleToClass(role: CompanionTemplate['role']): string {
		const roleMap: Record<string, string> = {
			warrior: 'Fighter',
			mage: 'Wizard',
			rogue: 'Thief',
			healer: 'Cleric',
			scholar: 'Sage',
			guide: 'Ranger',
			noble: 'Noble',
			merchant: 'Trader',
			outlaw: 'Rogue'
		};
		return roleMap[role] || 'Adventurer';
	}

	private buildPersonalityFromTemplate(template: CompanionTemplate): string {
		const personalityMap: Record<string, string> = {
			loyal: 'Loyal and trustworthy, always stands by friends',
			cynical: 'Cynical and world-weary, but with hidden depths',
			optimistic: 'Optimistic and cheerful, sees the best in people',
			pragmatic: 'Pragmatic and practical, focused on results',
			rebellious: 'Rebellious and free-spirited, questions authority',
			wise: 'Wise and thoughtful, offers guidance and counsel',
			naive: 'Naive and innocent, but eager to learn',
			ambitious: 'Ambitious and driven, seeks to achieve great things'
		};
		return personalityMap[template.personality_base] || 'Balanced and adaptable';
	}

	private buildBackgroundFromTemplate(template: CompanionTemplate, playerCharacter: CharacterDescription): string {
		const backgroundMap: Record<string, string> = {
			childhood_friend: `Grew up alongside ${playerCharacter.name} and shares many childhood memories`,
			mentor: `An experienced ${template.role} who took interest in guiding others`,
			rescued_companion: `Was once in dire need and was helped by someone like ${playerCharacter.name}`,
			hired_help: `A professional ${template.role} available for hire`,
			mysterious_ally: `A mysterious figure with unclear motives but helpful intentions`,
			family_member: `Related to ${playerCharacter.name} or their family`,
			rival_turned_ally: `Once competed with ${playerCharacter.name} but now fights alongside them`
		};
		return backgroundMap[template.relationship] || 'Has a complex background waiting to be revealed';
	}

	private getInitialRelationshipLevels(relationship: CompanionTemplate['relationship']): { trustLevel: number; loyaltyLevel: number } {
		const levelMap: Record<string, { trustLevel: number; loyaltyLevel: number }> = {
			childhood_friend: { trustLevel: 80, loyaltyLevel: 85 },
			mentor: { trustLevel: 70, loyaltyLevel: 60 },
			rescued_companion: { trustLevel: 65, loyaltyLevel: 75 },
			hired_help: { trustLevel: 50, loyaltyLevel: 40 },
			mysterious_ally: { trustLevel: 30, loyaltyLevel: 45 },
			family_member: { trustLevel: 90, loyaltyLevel: 95 },
			rival_turned_ally: { trustLevel: 40, loyaltyLevel: 55 }
		};
		return levelMap[relationship] || { trustLevel: 50, loyaltyLevel: 50 };
	}

	private mapRelationshipToStatus(relationship: CompanionTemplate['relationship']): 'stranger' | 'acquaintance' | 'friend' | 'close_friend' | 'companion' {
		const statusMap: Record<string, 'stranger' | 'acquaintance' | 'friend' | 'close_friend' | 'companion'> = {
			childhood_friend: 'close_friend',
			mentor: 'friend',
			rescued_companion: 'friend',
			hired_help: 'acquaintance',
			mysterious_ally: 'acquaintance',
			family_member: 'close_friend',
			rival_turned_ally: 'acquaintance'
		};
		return statusMap[relationship] || 'acquaintance';
	}

	private initializePersonalityTraits(template: CompanionTemplate): Array<{ trait_name: string; value: number; last_changed: string; influenced_by: string[] }> {
		const now = new Date().toISOString();
		const baseTraits: Record<string, number> = {};

		// Traits basés sur le rôle
		switch (template.role) {
			case 'warrior':
				baseTraits.courage = 80;
				baseTraits.loyalty = 75;
				baseTraits.honor = 70;
				break;
			case 'mage':
				baseTraits.wisdom = 80;
				baseTraits.curiosity = 75;
				baseTraits.caution = 70;
				break;
			case 'rogue':
				baseTraits.cunning = 80;
				baseTraits.self_reliance = 75;
				baseTraits.opportunism = 70;
				break;
			case 'healer':
				baseTraits.compassion = 80;
				baseTraits.patience = 75;
				baseTraits.empathy = 70;
				break;
			default:
				baseTraits.adaptability = 70;
				baseTraits.reliability = 65;
		}

		// Modifier basé sur la base de personnalité
		switch (template.personality_base) {
			case 'loyal':
				baseTraits.loyalty = (baseTraits.loyalty || 50) + 20;
				baseTraits.trust = 75;
				break;
			case 'cynical':
				baseTraits.cynicism = 80;
				baseTraits.skepticism = 75;
				break;
			case 'optimistic':
				baseTraits.optimism = 80;
				baseTraits.hope = 75;
				break;
			case 'pragmatic':
				baseTraits.pragmatism = 80;
				baseTraits.efficiency = 75;
				break;
			case 'rebellious':
				baseTraits.independence = 80;
				baseTraits.defiance = 70;
				break;
		}

		// Convertir en format de trait
		return Object.entries(baseTraits).map(([trait, value]) => ({
			trait_name: trait,
			value,
			last_changed: now,
			influenced_by: []
		}));
	}

	private getStabilityFactor(personalityBase: CompanionTemplate['personality_base']): number {
		const stabilityMap: Record<string, number> = {
			loyal: 85, // Très stable
			cynical: 90, // Très résistant au changement
			optimistic: 60, // Plus facilement influençable
			pragmatic: 75, // Moyennement stable
			rebellious: 50, // Change facilement
			wise: 80, // Stable mais peut évoluer
			naive: 40, // Très influençable
			ambitious: 65 // Peut changer selon les opportunités
		};
		return stabilityMap[personalityBase] || 70;
	}

	private selectRandomTemplate(storyContext: Story): CompanionTemplate {
		// Templates suggérés basés sur le contexte de l'histoire
		const contextualTemplates = this.getContextualTemplates(storyContext);
		
		// Sélectionner un template aléatoire
		const randomIndex = Math.floor(Math.random() * contextualTemplates.length);
		return contextualTemplates[randomIndex];
	}

	private getContextualTemplates(storyContext: Story): CompanionTemplate[] {
		const storyType = (storyContext.theme || '').toLowerCase();
		
		if (storyType.includes('dungeon') || storyType.includes('adventure')) {
			return [
				{ role: 'warrior', relationship: 'hired_help', personality_base: 'loyal' },
				{ role: 'rogue', relationship: 'mysterious_ally', personality_base: 'pragmatic' },
				{ role: 'healer', relationship: 'mentor', personality_base: 'wise' }
			];
		}
		
		if (storyType.includes('court') || storyType.includes('political')) {
			return [
				{ role: 'noble', relationship: 'rival_turned_ally', personality_base: 'ambitious' },
				{ role: 'scholar', relationship: 'mentor', personality_base: 'wise' },
				{ role: 'rogue', relationship: 'mysterious_ally', personality_base: 'cynical' }
			];
		}
		
		if (storyType.includes('wilderness') || storyType.includes('survival')) {
			return [
				{ role: 'guide', relationship: 'hired_help', personality_base: 'pragmatic' },
				{ role: 'outlaw', relationship: 'rescued_companion', personality_base: 'rebellious' },
				{ role: 'healer', relationship: 'mysterious_ally', personality_base: 'wise' }
			];
		}

		// Templates par défaut
		return [
			{ role: 'warrior', relationship: 'childhood_friend', personality_base: 'loyal' },
			{ role: 'mage', relationship: 'mentor', personality_base: 'wise' },
			{ role: 'rogue', relationship: 'mysterious_ally', personality_base: 'cynical' },
			{ role: 'healer', relationship: 'rescued_companion', personality_base: 'optimistic' }
		];
	}

	// Méthodes utilitaires pour obtenir des suggestions de templates
	getSuggestedTemplatesForStory(storyContext: Story): CompanionTemplate[] {
		return this.getContextualTemplates(storyContext);
	}

	getAllAvailableTemplates(): CompanionTemplate[] {
		const roles: CompanionTemplate['role'][] = ['warrior', 'mage', 'rogue', 'healer', 'scholar', 'guide', 'noble', 'merchant', 'outlaw'];
		const relationships: CompanionTemplate['relationship'][] = ['childhood_friend', 'mentor', 'rescued_companion', 'hired_help', 'mysterious_ally', 'family_member', 'rival_turned_ally'];
		const personalities: CompanionTemplate['personality_base'][] = ['loyal', 'cynical', 'optimistic', 'pragmatic', 'rebellious', 'wise', 'naive', 'ambitious'];

		const templates: CompanionTemplate[] = [];
		
		// Générer quelques combinaisons intéressantes
		for (let i = 0; i < Math.min(roles.length, 15); i++) {
			templates.push({
				role: roles[i % roles.length],
				relationship: relationships[i % relationships.length],
				personality_base: personalities[i % personalities.length]
			});
		}

		return templates;
	}
}
