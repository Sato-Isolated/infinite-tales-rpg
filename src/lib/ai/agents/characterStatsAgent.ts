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
import type { SafetyLevel } from '$lib/types/safetySettings';
import { GeminiProvider } from '$lib/ai/geminiProvider';
import { GEMINI_MODELS } from '../geminiProvider';
import {
	buildCharacterStatsAgentInstructions,
	buildCharacterStatsHistoryMessages,
	buildLevelUpAgentInstructions,
	buildLevelUpHistoryMessages,
	buildLevelUpUserMessage,
	buildNPCAgentInstructions,
	buildNPCUserMessage,
	buildAbilitiesAgentInstructions,
	buildAbilitiesHistoryMessages,
	buildAbilitiesPartialPrompt,
	CHARACTER_STATS_USER_MESSAGE
} from './characterStatsAgentPrompts';

export type SpellOrAbility = {
	name: string;
	effect: string;
	resource_cost: {
		resource_key: string | undefined;
		cost: number;
	};
};

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
	target_npc_id?: string; // Target NPC ID (undefined if relationship with player)
	target_name: string; // Target name (player or other NPC)
	relationship_type: 'family' | 'friend' | 'romantic' | 'enemy' | 'acquaintance' | 'professional' | 'other';
	specific_role?: string; // Ex: "sister", "brother", "father", "mother", "colleague", "boss", etc.
	emotional_bond: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
	description: string; // Relationship description and how it should influence interactions
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
	relationships?: Array<Relationship>; // Relationships with other NPCs and the player
	personality_traits?: string[]; // Personality traits that influence behavior
	speech_patterns?: string; // Specific way of speaking (accent, expressions, etc.)
	background_notes?: string; // Notes on personal history and motivations
};

export class CharacterStatsAgent {
	llm: LLM;
	ATTRIBUTE_MAX_VALUE: number;
	constructor(llm: LLM) {
		this.llm = llm;
		this.ATTRIBUTE_MAX_VALUE = 10;
	}

	/**
	 * Configure safety level on the provider if it's a GeminiProvider
	 */
	private configureSafetyLevel(safetyLevel?: SafetyLevel): void {
		if (safetyLevel && this.llm instanceof GeminiProvider) {
			this.llm.setSafetyLevel(safetyLevel);
		}
	}

	async generateCharacterStats(
		storyState: Story,
		characterState: CharacterDescription,
		statsOverwrites: Partial<CharacterStats> | undefined = undefined,
		isAdaptiveOverwrite: boolean = false,
		transformInto?: string
	): Promise<CharacterStats> {
		const agentInstruction = [
			'# Role\nYou are an expert RPG character stats designer. Create balanced, flavorful stats that match the character and the world. Prefer concise, grounded numbers over generic or inflated values.\n',
			'# Goals\n- Stats must strongly reflect the character’s biography, class/archetype, and the story’s tone.\n- Ensure internal consistency: resources ↔ abilities, attributes ↔ skills, level ↔ overall power.\n- Produce engaging but gameable numbers (not all 0s or all max).\n',
			'# Output Contract (JSON schema hints)\nYou MUST follow the response schema provided by the tool. Important structure reminders: \n- resources: array of { key: string; max_value: number; start_value: number; game_ends_when_zero: boolean }\n  • key should be lowercase snake_case (e.g., "hp", "mp", "stamina").\n  • start_value ≤ max_value; integers; max_value typically 20–200 depending on genre.\n- attributes: array of { name: string; value: number }\n  • integer values; low-level range typically −1..1 (occasionally up to 3 for standout strengths).\n- skills: array of { name: string; value: number }\n  • integer values; same scale idea as attributes; keep consistent with level.\n- spells_and_abilities: array of { name, effect, resource_cost: { resource_key, cost } }\n  • If an ability consumes a resource, resource_key MUST match an existing resources[].key.\n  • If free to use, set cost = 0 and resource_key can be omitted or null/undefined.\n',
			'# Balancing & Scaling Rules\n- Use the given level to scale all numbers. At level 1: attributes/skills ≈ −1..1; a single standout can be 2 or 3 max.\n- Do NOT min-max everything; include 1–2 clear strengths, a few neutrals, and 1 small weakness tied to backstory.\n- Resources should suit the archetype (e.g., warriors more HP/stamina; mages more MP; rogues more stamina/energy).\n- If HP (or equivalent) exists, set max_value > 20.\n- Ability effects must reference the character theme and clearly state what they do (damage, control, utility, support).\n',
			'# Quality Checklist (enforce before finalizing)\n- [ ] All arrays follow the schema.\n- [ ] resource_cost.resource_key exists in resources or cost = 0.\n- [ ] start_value ≤ max_value for every resource.\n- [ ] Attribute/skill names are consistent with the character and setting.\n- [ ] No duplicate names; numbers are integers; no NaN/Infinity.\n- [ ] Avoid modern copyrighted names and ensure safe content.\n'
		];
		if (statsOverwrites) {
			// Logic moved to buildCharacterStatsAgentInstructions
		}
		// Final instruction moved to buildCharacterStatsAgentInstructions
		if (!statsOverwrites?.level) {
			statsOverwrites = { ...statsOverwrites, level: 1 };
		}
		const request: LLMRequest = {
			userMessage: CHARACTER_STATS_USER_MESSAGE,
			historyMessages: buildCharacterStatsHistoryMessages(storyState, characterState),
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

	mapStats = (resp: CharacterStatsResponse): CharacterStats => {
		// Defensive defaults and conversion from array-based schema to object maps
		const level = resp?.level ?? 1;
		const resourcesArr = Array.isArray(resp?.resources) ? resp.resources : [];
		const attributesArr = Array.isArray(resp?.attributes) ? resp.attributes : [];
		const skillsArr = Array.isArray(resp?.skills) ? resp.skills : [];
		const abilitiesArr = Array.isArray(resp?.spells_and_abilities) ? resp.spells_and_abilities : [];

		const resources = resourcesArr.reduce<Record<string, { max_value: number; start_value: number; game_ends_when_zero: boolean }>>((acc, r) => {
			if (!r || typeof r.key !== 'string') return acc;
			acc[r.key] = {
				max_value: Number.isFinite(r.max_value) ? r.max_value : 0,
				start_value: Number.isFinite(r.start_value) ? r.start_value : 0,
				game_ends_when_zero: !!r.game_ends_when_zero
			};
			return acc;
		}, {});

		const attributes = attributesArr.reduce<Record<string, number>>((acc, a) => {
			if (!a || typeof a.name !== 'string') return acc;
			acc[a.name] = Number.isFinite(a.value) ? a.value : 0;
			return acc;
		}, {});

		const skills = skillsArr.reduce<Record<string, number>>((acc, s) => {
			if (!s || typeof s.name !== 'string') return acc;
			acc[s.name] = Number.isFinite(s.value) ? s.value : 0;
			return acc;
		}, {});

		const spells_and_abilities = abilitiesArr.map(this.mapAbility);

		return { level, resources, attributes, skills, spells_and_abilities };
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
			.filter((a) => characterStatsMapped.attributes[a] < this.ATTRIBUTE_MAX_VALUE)
			.reduce(
				(acc, a) => {
					acc[a] = characterStatsMapped.attributes[a];
					return acc;
				},
				{} as { [stat: string]: number }
			);

		const agentInstruction = buildLevelUpAgentInstructions(
			characterStatsMapped,
			latestHistoryTextOnly
		);

		const request: LLMRequest = {
			userMessage: buildLevelUpUserMessage(characterStats.level + 1),
			historyMessages: buildLevelUpHistoryMessages(storyState, characterState),
			systemInstruction: agentInstruction,
			config: {
				responseSchema: LevelUpResponseSchema
			}
		};
		console.log(stringifyPretty(request));
		const resp = (await this.llm.generateContent(request))?.content as LevelUpResponse;
		const mapped: AiLevelUp = {
			character_name: characterState.name,
			level_up_explanation: resp?.level_up_explanation ?? '',
			attribute: resp?.attribute ?? '',
			formerAbilityName: resp?.formerAbilityName,
			ability: this.mapAbility(resp?.ability as Ability),
			resources: (Array.isArray(resp?.resources) ? resp.resources : []).reduce<Record<string, number>>((acc, r) => {
				if (!r || typeof r.key !== 'string') return acc;
				acc[r.key] = Number.isFinite(r.value) ? r.value : 0;
				return acc;
			}, {})
		};
		return mapped;
	}

	async generateNPCStats(
		storyState: Story,
		historyMessages: LLMMessage[],
		npcsToGenerate: Array<string>,
		characterStats: CharacterStats,
		customSystemInstruction: string,
		safetyLevel: 'strict' | 'balanced' | 'permissive'
	): Promise<NPCState> {
		const latestHistoryTextOnly = historyMessages.map((m: LLMMessage) => m.content).join('\n');
		const agent = buildNPCAgentInstructions(
			storyState,
			latestHistoryTextOnly,
			characterStats.level,
			customSystemInstruction
		);
		const action = buildNPCUserMessage(npcsToGenerate);

		// Configure provider with safety level before making request
		this.configureSafetyLevel(safetyLevel);

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
		const usePartialAsBasePrompt = buildAbilitiesPartialPrompt(abilities);
		const agentInstruction = buildAbilitiesAgentInstructions(abilities);

		const request: LLMRequest = {
			userMessage: usePartialAsBasePrompt,
			historyMessages: buildAbilitiesHistoryMessages(storyState, characterState, characterStats),
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
