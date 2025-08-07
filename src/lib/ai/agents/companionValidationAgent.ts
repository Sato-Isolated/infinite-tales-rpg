import type { LLM, LLMRequest } from '$lib/ai/llm';
import { stringifyPretty } from '$lib/util.svelte';
import type { CompanionCharacter } from '$lib/types/companion';
import type { CharacterDescription } from './characterAgent';

export interface CompanionValidationResult {
	isValid: boolean;
	missingFields: string[];
	enrichedData?: Partial<CompanionCharacter>;
	suggestions?: string[];
}

export interface CompanionEnrichmentContext {
	storyHistory: string[];
	currentStory: string;
	interactionHistory?: string[];
	characterDescription?: CharacterDescription;
}

export class CompanionValidationAgent {
	llm: LLM;

	constructor(llm: LLM) {
		this.llm = llm;
	}

	/**
	 * Valide si les données d'un compagnon sont suffisamment détaillées pour l'IA
	 */
	async validateCompanionData(
		companion: CompanionCharacter,
		context?: CompanionEnrichmentContext
	): Promise<CompanionValidationResult> {
		const systemInstruction = [
			'You are a Companion Data Validation Agent.',
			'Your task is to validate if companion data is detailed enough for AI narrative generation.',
			'Check if fields contain meaningful, detailed information that can guide story generation.',
			'Identify missing or incomplete fields that need enrichment.',
			`Companion data to validate: ${stringifyPretty(companion)}`,
			...(context ? [
				'Context for validation:',
				`Story history: ${stringifyPretty(context.storyHistory.slice(-3))}`,
				`Current story: ${context.currentStory}`,
				...(context.characterDescription ? [`Player character: ${stringifyPretty(context.characterDescription)}`] : [])
			] : []),
			'Validation criteria:',
			'- appearance: Must be detailed physical description (not just "tall" or "blonde")',
			'- personality: Must include traits, quirks, behavioral patterns',
			'- background: Must provide narrative context and history',
			'- abilities: Should be clearly defined with effects',
			'- relationships: Should reflect story interactions'
		];

		const userMessage = `
Validate this companion's data completeness and narrative usability.

Return JSON format:
{
	"is_valid": boolean,
	"missing_fields": ["field1", "field2"],
	"field_analysis": {
		"appearance": { "is_detailed": boolean, "issue": "description" },
		"personality": { "is_detailed": boolean, "issue": "description" },
		"background": { "is_detailed": boolean, "issue": "description" },
		"abilities": { "is_detailed": boolean, "issue": "description" }
	},
	"enrichment_needed": boolean,
	"suggestions": ["suggestion1", "suggestion2"]
}`;

		const request: LLMRequest = {
			userMessage,
			historyMessages: [],
			systemInstruction
		};

		const response = await this.llm.generateContent(request);
		const validation = response?.content as any;

		return {
			isValid: validation.is_valid,
			missingFields: validation.missing_fields || [],
			suggestions: validation.suggestions || []
		};
	}

	/**
	 * Enrichit automatiquement les données d'un compagnon basé sur le contexte narratif
	 */
	async enrichCompanionData(
		companion: CompanionCharacter,
		context: CompanionEnrichmentContext
	): Promise<Partial<CompanionCharacter>> {
		const systemInstruction = [
			'You are a Companion Data Enrichment Agent.',
			'Your task is to enrich incomplete companion data based on story context.',
			'Create detailed, consistent information that fits the narrative.',
			'Maintain consistency with existing data - never contradict what already exists.',
			`Current companion data: ${stringifyPretty(companion)}`,
			'Story context for enrichment:',
			`Story history: ${stringifyPretty(context.storyHistory.slice(-5))}`,
			`Current story: ${context.currentStory}`,
			...(context.interactionHistory ? [`Interaction history: ${stringifyPretty(context.interactionHistory)}`] : []),
			...(context.characterDescription ? [`Player character context: ${stringifyPretty(context.characterDescription)}`] : [])
		];

		const userMessage = `
Based on the story context, enrich the companion's incomplete data fields.
Only fill in missing or vague information - never override detailed existing data.

Focus on:
- Detailed physical appearance if missing or vague
- Rich personality traits based on story interactions
- Background story that fits the narrative
- Abilities that match their story role

Return JSON format matching CompanionCharacter structure but only with enriched fields:
{
	"character_description": {
		"appearance": "detailed physical description if needed",
		"personality": "enriched personality traits if needed", 
		"background": "enhanced background if needed"
	},
	"character_stats": {
		"spells_and_abilities": [enriched abilities if needed]
	}
}`;

		const request: LLMRequest = {
			userMessage,
			historyMessages: [],
			systemInstruction
		};

		const response = await this.llm.generateContent(request);
		return response?.content as Partial<CompanionCharacter>;
	}

	/**
	 * Vérifie si les données du compagnon sont cohérentes avec l'histoire récente
	 */
	async checkCompanionConsistency(
		companion: CompanionCharacter,
		storyHistory: string[],
		currentStory: string
	): Promise<{
		isConsistent: boolean;
		inconsistencies: string[];
		suggestedUpdates?: Partial<CompanionCharacter>;
	}> {
		const systemInstruction = [
			'You are a Companion Consistency Checker.',
			'Compare companion data with recent story events to detect inconsistencies.',
			'Identify contradictions between companion attributes and story descriptions.',
			`Companion to check: ${stringifyPretty(companion)}`,
			'Recent story context:',
			...storyHistory.slice(-3).map((story, i) => `Story ${i + 1}: ${story}`),
			`Current story: ${currentStory}`
		];

		const userMessage = `
Check for inconsistencies between companion data and story descriptions.
Look for:
- Appearance contradictions
- Personality conflicts  
- Ability mismatches
- Relationship inconsistencies

Return JSON:
{
	"is_consistent": boolean,
	"inconsistencies": ["description of each inconsistency"],
	"suggested_updates": {
		"field": "corrected value based on story"
	}
}`;

		const request: LLMRequest = {
			userMessage,
			historyMessages: [],
			systemInstruction
		};

		const response = await this.llm.generateContent(request);
		const result = response?.content as any;

		return {
			isConsistent: result.is_consistent,
			inconsistencies: result.inconsistencies || [],
			suggestedUpdates: result.suggested_updates
		};
	}
}
