import type { LLM, LLMMessage } from '$lib/ai/llm';
import type { Story } from '$lib/ai/agents/storyAgent';
import type { CharacterDescription } from '$lib/ai/agents/characterAgent';
import type { CompanionCharacter } from '$lib/types/companion';

export interface NarrativeContext {
	timeSkipDetected?: {
		duration: string;
		timeType: 'days' | 'months' | 'years';
		narrative: string;
	};
	relationshipChanges?: {
		companionId: string;
		companionName: string;
		oldRelationship?: string;
		newRelationship: string;
		evidence: string;
	}[];
	lifeEvents?: {
		type: 'marriage' | 'childbirth' | 'adoption' | 'death' | 'separation' | 'promotion' | 'trauma' | 'achievement';
		participants: string[];
		description: string;
		impact: 'low' | 'medium' | 'high';
	}[];
	newCompanions?: {
		name: string;
		relationToExisting: string;
		justification: string;
		suggestedRole: string;
	}[];
	characterEvolutions?: {
		companionId: string;
		changes: CharacterEvolutionChanges;
	}[];
}

export interface CharacterEvolutionChanges {
	backgroundUpdates?: {
		newBackground: string;
		changedElements: string[];
		reasoning: string;
	};
	personalityEvolution?: {
		newPersonality: string;
		evolvedTraits: string[];
		reasoning: string;
	};
	appearanceChanges?: {
		newAppearance: string;
		ageChange?: number;
		physicalChanges: string[];
		reasoning: string;
	};
	skillEvolution?: {
		newSkills: string[];
		lostSkills: string[];
		improvedAreas: string[];
		reasoning: string;
	};
	goalMotivationUpdates?: {
		newGoals: string;
		newMotivations: string;
		changedPerspective: string;
		reasoning: string;
	};
}

export class NarrativeEvolutionAgent {
	constructor(private llm: LLM) {}

	/** Safely parse JSON content that may include code fences or extra text */
	private safeParseJson<T = any>(content: any): T | {} {
		try {
			if (!content) return {};
			if (typeof content === 'object') return content as T;
			let text = String(content).trim();
			// Strip code fences if present
			if (text.startsWith('```')) {
				text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '');
				// remove trailing fence
				text = text.replace(/```\s*$/i, '').trim();
			}
			// Ensure we start at first '{'
			const firstBrace = text.indexOf('{');
			if (firstBrace > 0) {
				text = text.slice(firstBrace);
			}
			// If any non-JSON trailing text exists after the last '}', cut it
			const lastBrace = text.lastIndexOf('}');
			if (lastBrace !== -1 && lastBrace < text.length - 1) {
				text = text.slice(0, lastBrace + 1);
			}
			return JSON.parse(text) as T;
		} catch (e) {
			console.error('safeParseJson failed, returning empty object. Raw:', content);
			return {};
		}
	}

	async analyzeNarrativeContext(
		currentStory: string,
		storyHistory: LLMMessage[],
		currentCompanions: CompanionCharacter[],
		playerCharacter: CharacterDescription
	): Promise<NarrativeContext> {
		const recentHistory = storyHistory.slice(-10).map(m => m.content).join('\n');
		
		const prompt = this.buildContextAnalysisPrompt(
			currentStory,
			recentHistory,
			currentCompanions,
			playerCharacter
		);

		const response = await this.llm.generateContent({
			userMessage: prompt,
			systemInstruction: this.getSystemPrompt(),
			tryAutoFixJSONError: true,
			temperature: 0.3
		});

		if (!response?.content) {
			return {};
		}

		return this.parseNarrativeContext(response.content);
	}

	async updateCharacterFromEvolution(
		companion: CompanionCharacter,
		evolution: CharacterEvolutionChanges,
		narrativeContext: string
	): Promise<Partial<CompanionCharacter>> {
		const updatePrompt = this.buildCharacterUpdatePrompt(
			companion,
			evolution,
			narrativeContext
		);

		const response = await this.llm.generateContent({
			userMessage: updatePrompt,
			systemInstruction: this.getCharacterUpdateSystemPrompt(),
			tryAutoFixJSONError: true,
			temperature: 0.4
		});

		if (!response?.content) {
			return {};
		}

		return this.parseCharacterUpdates(response.content);
	}

	async generateNewCompanionFromNarrativeContext(
		newCompanionInfo: NonNullable<NarrativeContext['newCompanions']>[0],
		existingCompanions: CompanionCharacter[],
		narrativeContext: string,
		playerCharacter: CharacterDescription
	): Promise<Partial<CompanionCharacter>> {

		const generationPrompt = this.buildNewCompanionPrompt(
			newCompanionInfo,
			existingCompanions,
			narrativeContext,
			playerCharacter
		);

		const response = await this.llm.generateContent({
			userMessage: generationPrompt,
			systemInstruction: this.getNewCompanionSystemPrompt(),
			tryAutoFixJSONError: true,
			temperature: 0.6
		});

		if (!response?.content) {
			return {};
		}

		return this.parseNewCompanionData(response.content);
	}

	private buildContextAnalysisPrompt(
		currentStory: string,
		recentHistory: string,
		currentCompanions: CompanionCharacter[],
		playerCharacter: CharacterDescription
	): string {
		const companionNames = currentCompanions.map(c => c.character_description.name).join(', ');
		
		return `
CURRENT STORY TO ANALYZE:
${currentStory}

RECENT HISTORY CONTEXT:
${recentHistory}

CURRENT COMPANIONS:
${companionNames}

PLAYER CHARACTER:
Name: ${playerCharacter.name}

TASK: Analyze the current story for narrative evolution that requires companion system updates. Look for:
1. Time skips or passages of time
2. Relationship changes or developments
3. Major life events (marriage, birth, death, etc.)
4. New characters that should become companions
5. Character development that requires sheet updates

Focus on concrete narrative evidence. If no significant changes are detected, return minimal JSON structure.
`;
	}

	private buildCharacterUpdatePrompt(
		companion: CompanionCharacter,
		evolution: CharacterEvolutionChanges,
		narrativeContext: string
	): string {
		return `
COMPANION TO UPDATE:
Name: ${companion.character_description.name}
Current Background: ${companion.character_description.background}
Current Personality: ${companion.character_description.personality}
Current Appearance: ${companion.character_description.appearance}
Current Goals: ${companion.character_description.motivation}

EVOLUTION CHANGES REQUIRED:
${JSON.stringify(evolution, null, 2)}

NARRATIVE CONTEXT:
${narrativeContext}

TASK: Generate updated character sheet data that reflects the evolution changes while maintaining character consistency. Update all relevant fields based on the narrative evolution.

Respond with JSON containing updated character_description fields:
{
  "character_description": {
    "background": "updated background reflecting new experiences",
    "personality": "evolved personality showing growth/change",
    "appearance": "updated appearance reflecting time passage/events",
    "goals": "new goals based on changed circumstances",
    "motivations": "updated motivations"
  }
}
`;
	}

	private buildNewCompanionPrompt(
		newCompanionInfo: NonNullable<NarrativeContext['newCompanions']>[0],
		existingCompanions: CompanionCharacter[],
		narrativeContext: string,
		playerCharacter: CharacterDescription
	): string {
		const existingNames = existingCompanions.map(c => c.character_description.name).join(', ');
		
		return `
NEW COMPANION TO CREATE:
Name: ${newCompanionInfo.name}
Relation to Existing: ${newCompanionInfo.relationToExisting}
Justification: ${newCompanionInfo.justification}
Suggested Role: ${newCompanionInfo.suggestedRole}

EXISTING COMPANIONS: ${existingNames}

PLAYER CHARACTER: ${playerCharacter.name}

NARRATIVE CONTEXT: ${narrativeContext}

TASK: Create a complete companion character that fits naturally into the established story and relationships. Consider how this new companion connects to existing characters and the overall narrative.

Generate a comprehensive character with realistic background, personality, and relationships that make sense given the story context.
`;
	}

	private parseNarrativeContext(content: any): NarrativeContext {
		const parsed = this.safeParseJson<NarrativeContext>(content);
		return (parsed || {}) as NarrativeContext;
	}

	private parseCharacterUpdates(content: any): Partial<CompanionCharacter> {
		const parsed = this.safeParseJson<Partial<CompanionCharacter>>(content);
		return (parsed || {}) as Partial<CompanionCharacter>;
	}

	private parseNewCompanionData(content: any): Partial<CompanionCharacter> {
		const parsed = this.safeParseJson<Partial<CompanionCharacter>>(content);
		return (parsed || {}) as Partial<CompanionCharacter>;
	}

	private getSystemPrompt(): string {
		return `You are a Narrative Evolution Analyst for an RPG story system. Your job is to analyze story content and detect meaningful changes that should affect character sheets, relationships, and the companion roster.

ANALYZE FOR:
1. TIME SKIPS: Look for phrases like "years later", "months pass", "time goes by", etc.
2. RELATIONSHIP EVOLUTION: Marriage, romance, friendship changes, conflicts
3. LIFE EVENTS: Births, deaths, major achievements, trauma, career changes
4. NEW IMPORTANT CHARACTERS: NPCs that should become companions based on story context
5. CHARACTER DEVELOPMENT: Evidence of personality, skill, or appearance changes

RESPOND IN VALID JSON FORMAT with the structure:
{
  "timeSkipDetected": { "duration": "X years", "timeType": "years", "narrative": "context" },
  "relationshipChanges": [{ "companionName": "Name", "newRelationship": "romantic_partner", "evidence": "story evidence" }],
  "lifeEvents": [{ "type": "marriage", "participants": ["Player", "Elena"], "description": "...", "impact": "high" }],
  "newCompanions": [{ "name": "Child Name", "relationToExisting": "child of Elena and Player", "justification": "...", "suggestedRole": "child" }],
  "characterEvolutions": [{ "companionName": "Elena", "changes": { ... } }]
}

If no significant narrative evolution is detected, return: { }`;
	}

	private getCharacterUpdateSystemPrompt(): string {
		return `You are a Character Sheet Evolution Specialist. Your job is to rewrite character descriptions, backgrounds, and personalities based on narrative evolution.

IMPORTANT RULES:
1. Keep the core essence of the character while evolving them naturally
2. Update backgrounds to reflect new experiences and time passage
3. Evolve personality based on significant life events
4. Age appearance appropriately for time skips
5. Add new skills/abilities that make narrative sense
6. Update goals and motivations based on new life circumstances

RESPOND IN VALID JSON FORMAT with updated character data.
Be specific and detailed in your changes while maintaining character consistency.

Example response:
{
  "character_description": {
    "background": "Updated background with new experiences...",
    "personality": "Evolved personality showing maturity...",
    "appearance": "Updated appearance reflecting age/events...",
    "goals": "New goals based on current situation...",
    "motivations": "Updated motivations..."
  }
}`;
	}

	private getNewCompanionSystemPrompt(): string {
		return `You are a New Companion Generator. Create complete companion characters that emerge naturally from story narrative.

IMPORTANT:
1. Make characters that fit logically into the existing story
2. Create realistic relationships with existing characters
3. Give them unique personalities that complement the group dynamic
4. Ensure their background makes narrative sense
5. Consider their role in future story development

RESPOND IN VALID JSON FORMAT with complete character data including:
- character_description (name, background, personality, appearance, goals, etc.)
- initial relationship data
- starting loyalty/trust levels
- personality traits
- suggested initial dialogue

Create compelling characters that feel natural to the established narrative.`;
	}
}
