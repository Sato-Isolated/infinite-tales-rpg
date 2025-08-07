import { stringifyPretty } from '$lib/util.svelte';
import type { LLM, LLMMessage, LLMRequest } from '$lib/ai/llm';
import type { CharacterDescription } from '$lib/ai/agents/characterAgent';
import type { NPCStats } from '$lib/ai/agents/characterStatsAgent';
import type { Story } from '$lib/ai/agents/storyAgent';
import type { CompanionCharacter, MemoryEvent } from '$lib/types/companion';
import { GEMINI_MODELS } from '../geminiProvider';

export type NPCRecruitmentContext = {
	npcName: string;
	npcData: NPCStats;
	recruitmentReason: string;
	relationshipContext: string;
};

export type NPCToCompanionAnalysis = {
	canBeRecruited: boolean;
	recruitmentLikelihood: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
	reasoningForDecision: string;
	characterDescription: CharacterDescription;
	initialLoyalty: number;
	initialTrust: number;
	initialRelationshipStatus: 'stranger' | 'acquaintance' | 'friend' | 'close_friend' | 'companion';
	foundingMemories: MemoryEvent[];
	personalityTraits: Array<{
		trait_name: string;
		value: number;
		reasoning: string;
	}>;
	motivationForJoining: string;
	potentialConcerns: string[];
	suggestedInitialDialogue: string;
};

const npcToCompanionAnalysisPrompt = `{
	"canBeRecruited": boolean; Based on the story context and interactions, can this NPC realistically be recruited?,
	"recruitmentLikelihood": "very_low" | "low" | "medium" | "high" | "very_high"; How likely is the NPC to accept,
	"reasoningForDecision": string; Detailed explanation of why the NPC would or wouldn't join,
	"characterDescription": {
		"name": string; Use the NPC's established name from the story,
		"class": string; Based on NPC data and story context,
		"race": string; Determined from story descriptions,
		"gender": string; From story context,
		"appearance": string; Detailed appearance based on story descriptions and context,
		"alignment": string; Based on actions and behavior in the story,
		"personality": string; Rich personality based on all interactions and dialogue,
		"background": string; Complete background story based on how they appeared in the adventure,
		"motivation": string; What drives them, based on their actions in the story
	},
	"initialLoyalty": number; 0-100 based on relationship built through the story,
	"initialTrust": number; 0-100 based on interactions and shared experiences,
	"initialRelationshipStatus": "stranger" | "acquaintance" | "friend" | "close_friend" | "companion",
	"foundingMemories": array of significant events from the story that would form their core memories,
	"personalityTraits": array of {
		"trait_name": string; Key personality trait,
		"value": number; 0-100 strength of this trait,
		"reasoning": string; Why this trait exists based on story events
	},
	"motivationForJoining": string; Specific reason why they would join the party,
	"potentialConcerns": array of strings; What might make them hesitant or cause future conflicts,
	"suggestedInitialDialogue": string; What they might say when asked to join
}`;

export class NPCToCompanionAgent {
	llm: LLM;

	constructor(llm: LLM) {
		this.llm = llm;
	}

	async analyzeNPCForRecruitment(
		storyState: Story,
		storyHistory: LLMMessage[],
		npcContext: NPCRecruitmentContext,
		playerCharacter: CharacterDescription
	): Promise<NPCToCompanionAnalysis> {
		const historyText = this.extractRelevantHistoryForNPC(storyHistory, npcContext.npcName);
		
		const agentInstruction = [
			'You are an expert RPG character analyst specializing in NPC recruitment and companion development.',
			'Your task is to analyze whether an NPC can become a companion and generate their complete character profile.',
			'Base all decisions and character traits on the actual story events and interactions.',
			'',
			'CRITICAL INSTRUCTIONS:',
			'- Only approve recruitment if there are logical, story-based reasons',
			'- NPCs who were enemies, indifferent, or barely interacted should have low recruitment likelihood',
			'- NPCs who were helped, saved, or had positive interactions are more likely to join',
			'- The personality MUST reflect their actual behavior in the story',
			'- Background should tell the story of how they appeared in this adventure',
			'- Founding memories should be actual events from the story history',
			'',
			'STORY CONTEXT:',
			`Adventure Setting: ${stringifyPretty(storyState)}`,
			'',
			'PLAYER CHARACTER:',
			`${stringifyPretty(playerCharacter)}`,
			'',
			'NPC DATA:',
			`Name: ${npcContext.npcName}`,
			`Current Stats: ${stringifyPretty(npcContext.npcData)}`,
			`Recruitment Context: ${npcContext.recruitmentReason}`,
			`Relationship Context: ${npcContext.relationshipContext}`,
			'',
			'STORY HISTORY WITH THIS NPC:',
			historyText,
			'',
			'Always respond with the following JSON format:',
			npcToCompanionAnalysisPrompt
		];

		const request: LLMRequest = {
			userMessage: `Analyze whether ${npcContext.npcName} can be recruited as a companion based on the story history and generate their complete companion profile.`,
			systemInstruction: agentInstruction,
			model: GEMINI_MODELS.FLASH_THINKING_2_0
		};

		const analysis = await this.llm.generateContent(request);
		return analysis?.content as NPCToCompanionAnalysis;
	}

	async generateRecruitmentDialogue(
		analysis: NPCToCompanionAnalysis,
		playerCharacter: CharacterDescription,
		approachType: 'direct' | 'persuasive' | 'emotional' | 'practical'
	): Promise<{
		npcResponse: string;
		successChance: number;
		requiredConditions?: string[];
	}> {
		const agentInstruction = [
			'Generate a realistic recruitment dialogue for this NPC based on their analysis.',
			'The NPC should respond consistently with their established personality and relationship.',
			'',
			'NPC Analysis:',
			stringifyPretty(analysis),
			'',
			'Player Character:',
			stringifyPretty(playerCharacter),
			'',
			'Approach Type: ' + approachType,
			'',
			'Respond with JSON:',
			`{
				"npcResponse": "Complete dialogue response from the NPC, including their reasoning",
				"successChance": number; 0-100 chance they agree based on approach and relationship,
				"requiredConditions": array of strings or null; What needs to happen for them to join
			}`
		];

		const request: LLMRequest = {
			userMessage: `Generate ${analysis.characterDescription.name}'s response to being asked to join the party using a ${approachType} approach.`,
			systemInstruction: agentInstruction
		};

		const result = await this.llm.generateContent(request);
		return result?.content as {
			npcResponse: string;
			successChance: number;
			requiredConditions?: string[];
		};
	}

	private extractRelevantHistoryForNPC(storyHistory: LLMMessage[], npcName: string): string {
		const relevantMessages = storyHistory.filter(message => 
			message.content.toLowerCase().includes(npcName.toLowerCase()) ||
			message.role === 'model' // Include AI responses that might mention the NPC
		);

		if (relevantMessages.length === 0) {
			return `No significant interactions found with ${npcName} in the story history. This suggests limited relationship building.`;
		}

		const interactions = relevantMessages.map((message, index) => {
			return `[${index + 1}] ${message.role === 'user' ? 'Player' : 'Story'}: ${message.content}`;
		}).join('\n\n');

		return `Relevant story interactions with ${npcName}:\n\n${interactions}`;
	}

	// Analyser tous les NPCs présents pour suggérer des recrutements possibles
	async suggestRecruitableNPCs(
		storyState: Story,
		storyHistory: LLMMessage[],
		currentNPCs: Record<string, NPCStats>,
		playerCharacter: CharacterDescription
	): Promise<Array<{
		npcName: string;
		recruitmentPotential: 'low' | 'medium' | 'high';
		briefReasoning: string;
		suggestedApproach: 'direct' | 'persuasive' | 'emotional' | 'practical';
	}>> {
		const npcNames = Object.keys(currentNPCs).filter(npcId => {
			const npc = currentNPCs[npcId];
			// Filtrer seulement les NPCs qui sont déjà membres du groupe
			// Tous les autres NPCs sont potentiellement recrutables basé sur l'histoire narrative
			return !npc.is_party_member;
		});

		if (npcNames.length === 0) {
			return [];
		}

		const agentInstruction = [
			'Analyze which NPCs from the current scene could potentially be recruited based on the story history.',
			'Focus on NPCs who have had positive or meaningful interactions with the player.',
			'',
			'Story Context:',
			stringifyPretty(storyState),
			'',
			'Player Character:',
			stringifyPretty(playerCharacter),
			'',
			'Current NPCs:',
			stringifyPretty(currentNPCs),
			'',
			'Story History:',
			storyHistory.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n'),
			'',
			'Respond with array of:',
			`[{
				"npcName": string; The NPC's identifier,
				"recruitmentPotential": "low" | "medium" | "high",
				"briefReasoning": string; Short explanation why they might join,
				"suggestedApproach": "direct" | "persuasive" | "emotional" | "practical"
			}]`
		];

		const request: LLMRequest = {
			userMessage: 'Analyze which of the current NPCs could potentially be recruited as companions based on the story context.',
			systemInstruction: agentInstruction
		};

		const result = await this.llm.generateContent(request);
		return result?.content as Array<{
			npcName: string;
			recruitmentPotential: 'low' | 'medium' | 'high';
			briefReasoning: string;
			suggestedApproach: 'direct' | 'persuasive' | 'emotional' | 'practical';
		}>;
	}
}
