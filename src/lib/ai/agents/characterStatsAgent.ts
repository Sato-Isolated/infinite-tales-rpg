import { stringifyPretty } from '$lib/util.svelte';
import type { LLM, LLMMessage, LLMRequest } from '$lib/ai/llm';
import type { CharacterDescription } from '$lib/ai/agents/characterAgent';
import type { Story } from '$lib/ai/agents/storyAgent';
import { 
	CharacterStatsResponseSchema, 
	LevelUpResponseSchema, 
	NPCStatsResponseSchema,
	AbilitiesResponseSchema,
	type CharacterStatsResponse,
	type LevelUpResponse,
	type NPCStatsResponse,
	type AbilitiesResponse
} from '$lib/ai/config/ResponseSchemas';

export type SpellOrAbility = {
	name: string;
	effect: string;
	resource_cost: {
		resource_key: string | undefined;
		cost: number;
	};
};

import { TROPES_CLICHE_PROMPT } from '$lib/ai/prompts/shared';
import { GEMINI_MODELS } from '../geminiProvider';
import { 
	abilityFormatForPrompt, 
	npcIDForPrompt, 
	currentlyPresentNPCSForPrompt, 
	characterStatsStateForPrompt, 
	levelUpPrompt, 
	npcStatsStateForPromptAsString,
	ATTRIBUTE_MAX_VALUE,
	ATTRIBUTE_MIN_VALUE 
} from '$lib/ai/prompts/formats';

export type Ability = {
	name: string;
	effect: string;
	resource_cost: {
		resource_key: string | undefined;
		cost: number;
	};
};

export type Resource = { max_value: number; start_value: number; game_ends_when_zero: boolean };

export type Resources = {
	[resourceKey: string]: Resource;
};

export type NPCResources = {
	current_hp: number;
	current_mp: number;
};

export type NpcID = { uniqueTechnicalNameId: string; displayName: string };

export type CharacterStats = {
	level: number;
	resources: Resources;
	attributes: { [stat: string]: number };
	skills: { [stat: string]: number };
	spells_and_abilities: Array<Ability>;
};

export type SkillsProgression = {
	[skill: string]: number;
};

export type AiLevelUp = {
	character_name: string;
	level_up_explanation: string;
	attribute: string;
	formerAbilityName?: string;
	ability: Ability;
	resources: { [resourceKey: string]: number };
};

export const initialCharacterStatsState: CharacterStats = {
	level: 0,
	resources: {},
	attributes: {},
	skills: {},
	spells_and_abilities: []
};

/**
 * Dynamic NPC rank generator - no caching
 * Generates fresh rank array on each call to prevent repetitive patterns
 */
function generateNpcRanks(): string[] {
	return ['Very Weak', 'Weak', 'Average', 'Strong', 'Boss', 'Legendary'];
}

export type Relationship = {
	target_npc_id?: string; // ID du NPC cible (undefined si relation avec le joueur)
	target_name: string; // Nom de la cible (joueur ou autre NPC)
	relationship_type: 'family' | 'friend' | 'romantic' | 'enemy' | 'acquaintance' | 'professional' | 'other';
	specific_role?: string; // Ex: "sister", "brother", "father", "mother", "colleague", "boss", etc.
	emotional_bond: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
	description: string; // Description de la relation et comment elle doit influencer les interactions
};

export type NPCState = { [uniqueTechnicalNameId: string]: NPCStats };
export type NPCStats = {
	known_names?: string[];
	is_party_member: boolean;
	resources?: NPCResources;
	class: string;
	rank_enum_english: string;
	level: number;
	spells_and_abilities: Array<Ability>;
	relationships?: Array<Relationship>; // Relations avec d'autres NPCs et le joueur
	personality_traits?: string[]; // Traits de personnalité qui influencent le comportement
	speech_patterns?: string; // Façon de parler spécifique (accent, expressions, etc.)
	background_notes?: string; // Notes sur l'histoire personnelle et les motivations
};

export class CharacterStatsAgent {
	llm: LLM;

	constructor(llm: LLM) {
		this.llm = llm;
	}

	async generateCharacterStats(
		storyState: Story,
		characterState: CharacterDescription,
		statsOverwrites: Partial<CharacterStats> | undefined = undefined,
		isAdaptiveOverwrite: boolean = false,
		transformInto?: string
	): Promise<CharacterStats> {
		const agentInstruction = [
			'You are RPG character stats agent, generating the starting stats for a character according to game system, adventure and character description.\n' +
				'Attributes and skills should be determined based on character description.\n' +
				'Scale the attributes, skills and abilities according to the level. A low level character has attributes and skills -1 to 1.\n' +
				'If there is a HP resource or deviation, it must be greater than 20.\n'
		];
		if (statsOverwrites) {
			let statsPrompt =
				'You must reuse the EXISTING STATS exactly as given, e.g. EXISTING STAT of 150 must stay as 150; fill in other values if needed.';
			if (isAdaptiveOverwrite) {
				statsPrompt =
					'Adapt and refine the EXISTING STATS, especially spells and abilities, based on the Character description.\n';
			}
			if (transformInto) {
				statsPrompt =
					'Determine if following transformation completely changes or just adapts the character; ' +
					'If complete transformation ignore the EXISTING STATS and generate all new, else just adapt the EXISTING STATS;\nTransform into:\n' +
					transformInto;
			}
			statsPrompt += '\nEXISTING STATS:\n' + stringifyPretty(statsOverwrites);
			agentInstruction.push(statsPrompt);
		}
		agentInstruction.push(
			'You are generating character stats according to game system requirements. Respond with a structured JSON object containing all required character data.'
		);
		if (!statsOverwrites?.level) {
			statsOverwrites = { ...statsOverwrites, level: 1 };
		}
		const request: LLMRequest = {
			userMessage:
				'Create the character according to the descriptions.\nScale the stats and abilities according to the level.\n',
			historyMessages: [
				{
					role: 'user',
					content: 'Description of the story: ' + stringifyPretty(storyState)
				},
				{
					role: 'user',
					content: 'Description of the character: ' + stringifyPretty(characterState)
				}
			],
			systemInstruction: agentInstruction,
			config: {
				responseSchema: CharacterStatsResponseSchema
			}
		};
		const stats = this.mapStats(
			(await this.llm.generateContent(request))?.content as CharacterStatsResponse
		);
		console.log(stats);
		return stats;
	}

	mapAbility = (ability: Ability): Ability => {
		if (!ability.resource_cost) {
			ability.resource_cost = { cost: 0, resource_key: undefined };
		}
		return ability;
	};

	mapStats = (stats: CharacterStats): CharacterStats => {
		stats.spells_and_abilities = stats.spells_and_abilities.map(this.mapAbility);
		return stats;
	};

	async levelUpCharacter(
		storyState: Story,
		historyMessages: LLMMessage[],
		characterState: CharacterDescription,
		characterStats: CharacterStats
	): Promise<AiLevelUp> {
		const latestHistoryTextOnly = historyMessages.map((m: LLMMessage) => m.content).join('\n');
		// do not consider skills when leveling up
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { ['skills']: _, ...characterStatsMapped } = characterStats;
		// filter out attributes that are already at 10
		characterStatsMapped.attributes = Object.keys(characterStatsMapped.attributes)
			.filter((a) => characterStatsMapped.attributes[a] < ATTRIBUTE_MAX_VALUE)
			.reduce(
				(acc, a) => {
					acc[a] = characterStatsMapped.attributes[a];
					return acc;
				},
				{} as { [stat: string]: number }
			);

		const agentInstruction = [
			'You are RPG character stats agent, leveling up a character according to game system, adventure and character description.\n' +
				'Name one existing attribute to be increased, you must reuse the exact attribute name. ' +
				'Also invent a new ability or increase one ability by one level granting an improved effect or more damage. Describe what improved from the last ability level.\n' +
				'In addition, all resources are to be meaningfully increased according to GAME rules',
			'Current character stats:\n' + stringifyPretty(characterStatsMapped),
			'The level up must be based on the story progression, in which area the player acted well:\n' +
				latestHistoryTextOnly,
			'Generate structured level up data according to the character progress.'
		];

		const request: LLMRequest = {
			userMessage: 'Character has leveled up to level: ' + (characterStats.level + 1),
			historyMessages: [
				{
					role: 'user',
					content: 'Description of the story: ' + stringifyPretty(storyState)
				},
				{
					role: 'user',
					content: 'Description of the character: ' + stringifyPretty(characterState)
				}
			],
			systemInstruction: agentInstruction,
			config: {
				responseSchema: LevelUpResponseSchema
			}
		};
		console.log(stringifyPretty(request));
		const aiLevelUp = (await this.llm.generateContent(request))?.content as LevelUpResponse;
		aiLevelUp.ability = this.mapAbility(aiLevelUp.ability);
		aiLevelUp.character_name = characterState.name;
		return aiLevelUp;
	}

	async generateNPCStats(
		storyState: Story,
		historyMessages: LLMMessage[],
		npcsToGenerate: Array<string>,
		characterStats: CharacterStats,
		customSystemInstruction: string
	): Promise<NPCState> {
		const latestHistoryTextOnly = historyMessages.map((m: LLMMessage) => m.content).join('\n');
		const agent = [
			'You are RPG NPC stats agent, generating the stats for NPCs according to game system, adventure and story progression.',
			'Description of the adventure: ' + stringifyPretty(storyState),
			'Latest story progression:\n' + latestHistoryTextOnly,
			'Scale the stats and abilities according to the player character level: ' +
				characterStats.level +
				'\n',
			'IMPORTANT: Generate meaningful relationships between NPCs and with the player character based on the story context.',
			'Family relationships must be logical and consistent (sister/brother, parent/child, etc.).',
			'Include personality traits and speech patterns that make each NPC unique and memorable.',
			'Background notes should explain WHY each NPC behaves the way they do.',
			TROPES_CLICHE_PROMPT,
			'Generate structured NPC data with all required fields for each NPC.'
		];
		if (customSystemInstruction) {
			agent.push('Following instructions overrule all others: ' + customSystemInstruction);
		}
		const action =
			'Generate the following NPCs. You must exactly reuse the uniqueTechnicalNameId given: ' +
			stringifyPretty(npcsToGenerate);
		const request: LLMRequest = {
			userMessage: action,
			systemInstruction: agent,
			model: GEMINI_MODELS.FLASH_THINKING_2_0,
			config: {
				responseSchema: NPCStatsResponseSchema
			}
		};
		const response = (await this.llm.generateContent(request))?.content as NPCStatsResponse;
		
		// Convert array response to NPCState format
		const npcState: NPCState = {};
		if (response?.npcs) {
			response.npcs.forEach((npc) => {
				npcState[npc.uniqueTechnicalNameId] = npc;
			});
		}
		
		return npcState;
	}

	async generateAbilitiesFromPartial(
		storyState: Story,
		characterState: CharacterDescription,
		characterStats: CharacterStats,
		abilities: Partial<Ability>[]
	): Promise<Ability[]> {
		const usePartialAsBasePrompt =
			'Important instruction! You must reuse the following description of abilities and fill in blank fields! ' +
			'Abilities that contradict a theme (e.g. ice spells for a fire mage) are explicitly allowed, a character can learn abilities from different fields. Do not modify them to fit! ' +
			stringifyPretty(abilities) +
			'\n';
		const agentInstruction = [
			'You are RPG character ability agent, generating new abilities without restrictions on thematic consistency. Generate them according to game system, adventure and character description.\n' +
				'Scale the ability according to the level',
			usePartialAsBasePrompt,
			'Generate structured abilities array with all required fields.'
		];

		const request: LLMRequest = {
			userMessage: usePartialAsBasePrompt,
			historyMessages: [
				{
					role: 'user',
					content: 'Description of the story: ' + stringifyPretty(storyState)
				},
				{
					role: 'user',
					content: 'Description of the character: ' + stringifyPretty(characterState)
				},
				{
					role: 'user',
					content: 'Stats of the character: ' + stringifyPretty(characterStats)
				}
			],
			systemInstruction: agentInstruction,
			config: {
				responseSchema: AbilitiesResponseSchema
			}
		};
		let response = (await this.llm.generateContent(request))?.content as AbilitiesResponse;
		if (!response) {
			return [];
		}
		if (!Array.isArray(response)) {
			response = [response];
		}
		return response.map(this.mapAbility) as Ability[];
	}
}
