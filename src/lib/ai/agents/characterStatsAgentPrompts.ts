import { stringifyPretty } from '$lib/util.svelte';
import { TROPES_CLICHE_PROMPT } from '$lib/ai/prompts/shared';
import type { CharacterDescription } from '$lib/ai/agents/characterAgent';
import type { Story } from '$lib/ai/agents/storyAgent';
import type { CharacterStats, Ability } from './characterStatsAgent';

// Base prompts for character stats generation
export const ROLE_PROMPT = '# Role\nYou are an expert RPG character stats designer. Create balanced, flavorful stats that match the character and the world. Prefer concise, grounded numbers over generic or inflated values.\n';

export const GOALS_PROMPT = '# Goals\n- Stats must strongly reflect the character\'s biography, class/archetype, and the story\'s tone.\n- Ensure internal consistency: resources ↔ abilities, attributes ↔ skills, level ↔ overall power.\n- Produce engaging but gameable numbers (not all 0s or all max).\n';

export const OUTPUT_CONTRACT_PROMPT = '# Output Contract (JSON schema hints)\nYou MUST follow the response schema provided by the tool. Important structure reminders: \n- resources: array of { key: string; max_value: number; start_value: number; game_ends_when_zero: boolean }\n  • key should be lowercase snake_case (e.g., "hp", "mp", "stamina").\n  • start_value ≤ max_value; integers; max_value typically 20–200 depending on genre.\n- attributes: array of { name: string; value: number }\n  • integer values; low-level range typically −1..1 (occasionally up to 3 for standout strengths).\n- skills: array of { name: string; value: number }\n  • integer values; same scale idea as attributes; keep consistent with level.\n- spells_and_abilities: array of { name, effect, resource_cost: { resource_key, cost } }\n  • If an ability consumes a resource, resource_key MUST match an existing resources[].key.\n  • If free to use, set cost = 0 and resource_key can be omitted or null/undefined.\n';

export const BALANCING_RULES_PROMPT = '# Balancing & Scaling Rules\n- Use the given level to scale all numbers. At level 1: attributes/skills ≈ −1..1; a single standout can be 2 or 3 max.\n- Do NOT min-max everything; include 1–2 clear strengths, a few neutrals, and 1 small weakness tied to backstory.\n- Resources should suit the archetype (e.g., warriors more HP/stamina; mages more MP; rogues more stamina/energy).\n- If HP (or equivalent) exists, set max_value > 20.\n- Ability effects must reference the character theme and clearly state what they do (damage, control, utility, support).\n';

export const QUALITY_CHECKLIST_PROMPT = '# Quality Checklist (enforce before finalizing)\n- [ ] All arrays follow the schema.\n- [ ] resource_cost.resource_key exists in resources or cost = 0.\n- [ ] start_value ≤ max_value for every resource.\n- [ ] Attribute/skill names are consistent with the character and setting.\n- [ ] No duplicate names; numbers are integers; no NaN/Infinity.\n- [ ] Avoid modern copyrighted names and ensure safe content.\n';

// Conditional prompts for overwrites and transformations
export const OVERWRITES_PROMPT = '# Overwrites\nYou MUST preserve the EXACT values of provided fields. If a value is given (e.g., 150), keep it 150. Fill only missing pieces.\n';

export const ADAPTIVE_OVERWRITE_PROMPT = '# Adaptive Overwrite\nRefine EXISTING STATS to better match the character and world, especially spells and abilities.\nPreserve strong numbers unless they clearly contradict the character/story; adjust minimally and justify implicitly via names/effects.\n';

export const TRANSFORMATION_PROMPT_TEMPLATE = '# Transformation\nDecide if the transformation is complete or partial.\n- If complete: ignore EXISTING STATS and generate a coherent new set.\n- If partial: adapt EXISTING STATS with minimal necessary changes.\nTransform into: {transformInto}\n';

export const FINAL_INSTRUCTION_PROMPT = '# Final instruction\nGenerate character stats strictly matching the provided JSON schema. Do not include commentary outside the JSON.';

export const CHARACTER_STATS_USER_MESSAGE = 'Create balanced, character-faithful stats now. Output JSON only.';

// Level up prompts
export const LEVEL_UP_AGENT_INSTRUCTION_TEMPLATE = `You are RPG character stats agent, leveling up a character according to game system, adventure and character description.
Name one existing attribute to be increased, you must reuse the exact attribute name. Also invent a new ability or increase one ability by one level granting an improved effect or more damage. Describe what improved from the last ability level.
In addition, all resources are to be meaningfully increased according to GAME rules`;

export const LEVEL_UP_STATS_PROMPT_TEMPLATE = 'Current character stats:\n{characterStats}';

export const LEVEL_UP_STORY_CONTEXT_PROMPT_TEMPLATE = 'The level up must be based on the story progression, in which area the player acted well:\n{storyContext}';

export const LEVEL_UP_FINAL_INSTRUCTION = 'Generate structured level up data according to the character progress.';

export const LEVEL_UP_USER_MESSAGE_TEMPLATE = 'Character has leveled up to level: {newLevel}';

// NPC generation prompts
export const NPC_AGENT_BASE_PROMPT = 'You are RPG NPC stats agent, generating the stats for NPCs according to game system, adventure and story progression.';

export const NPC_STORY_DESCRIPTION_TEMPLATE = 'Description of the adventure: {storyDescription}';

export const NPC_STORY_PROGRESSION_TEMPLATE = 'Latest story progression:\n{storyProgression}';

export const NPC_LEVEL_SCALING_TEMPLATE = 'Scale the stats and abilities according to the player character level: {characterLevel}\n';

export const NPC_RELATIONSHIPS_PROMPT = 'IMPORTANT: Generate meaningful relationships between NPCs and with the player character based on the story context.\nFamily relationships must be logical and consistent (sister/brother, parent/child, etc.).\nInclude personality traits and speech patterns that make each NPC unique and memorable.\nBackground notes should explain WHY each NPC behaves the way they do.';

export const NPC_FINAL_INSTRUCTION = 'Generate structured NPC data with all required fields for each NPC.';

export const NPC_CUSTOM_INSTRUCTION_TEMPLATE = 'Following instructions overrule all others: {customInstruction}';

export const NPC_ACTION_TEMPLATE = 'Generate the following NPCs. You must exactly reuse the uniqueTechnicalNameId given: {npcsToGenerate}';

// Abilities generation prompts
export const ABILITIES_PARTIAL_PROMPT_TEMPLATE = `Important instruction! You must reuse the following description of abilities and fill in blank fields! Abilities that contradict a theme (e.g. ice spells for a fire mage) are explicitly allowed, a character can learn abilities from different fields. Do not modify them to fit! {abilities}
`;

export const ABILITIES_AGENT_INSTRUCTION_TEMPLATE = `You are RPG character ability agent, generating new abilities without restrictions on thematic consistency. Generate them according to game system, adventure and character description.
Scale the ability according to the level`;

export const ABILITIES_FINAL_INSTRUCTION = 'Generate structured abilities array with all required fields.';

// Utility functions for building complete prompts

export function buildCharacterStatsHistoryMessages(
  storyState: Story,
  characterState: CharacterDescription
): Array<{ role: 'user'; content: string }> {
  return [
    {
      role: 'user',
      content: 'Description of the story: ' + stringifyPretty(storyState)
    },
    {
      role: 'user',
      content: 'Description of the character: ' + stringifyPretty(characterState)
    }
  ];
}

export function buildLevelUpAgentInstructions(
  characterStatsMapped: Partial<CharacterStats>,
  latestHistoryTextOnly: string
): string[] {
  return [
    LEVEL_UP_AGENT_INSTRUCTION_TEMPLATE,
    LEVEL_UP_STATS_PROMPT_TEMPLATE.replace('{characterStats}', stringifyPretty(characterStatsMapped)),
    LEVEL_UP_STORY_CONTEXT_PROMPT_TEMPLATE.replace('{storyContext}', latestHistoryTextOnly),
    LEVEL_UP_FINAL_INSTRUCTION
  ];
}

export function buildLevelUpHistoryMessages(
  storyState: Story,
  characterState: CharacterDescription
): Array<{ role: 'user'; content: string }> {
  return [
    {
      role: 'user',
      content: 'Description of the story: ' + stringifyPretty(storyState)
    },
    {
      role: 'user',
      content: 'Description of the character: ' + stringifyPretty(characterState)
    }
  ];
}

export function buildLevelUpUserMessage(newLevel: number): string {
  return LEVEL_UP_USER_MESSAGE_TEMPLATE.replace('{newLevel}', newLevel.toString());
}

export function buildNPCAgentInstructions(
  storyState: Story,
  latestHistoryTextOnly: string,
  characterLevel: number,
  customSystemInstruction?: string
): string[] {
  const instructions = [
    NPC_AGENT_BASE_PROMPT,
    NPC_STORY_DESCRIPTION_TEMPLATE.replace('{storyDescription}', stringifyPretty(storyState)),
    NPC_STORY_PROGRESSION_TEMPLATE.replace('{storyProgression}', latestHistoryTextOnly),
    NPC_LEVEL_SCALING_TEMPLATE.replace('{characterLevel}', characterLevel.toString()),
    NPC_RELATIONSHIPS_PROMPT,
    TROPES_CLICHE_PROMPT,
    NPC_FINAL_INSTRUCTION
  ];

  if (customSystemInstruction) {
    instructions.push(NPC_CUSTOM_INSTRUCTION_TEMPLATE.replace('{customInstruction}', customSystemInstruction));
  }

  return instructions;
}

export function buildNPCUserMessage(npcsToGenerate: Array<string>): string {
  return NPC_ACTION_TEMPLATE.replace('{npcsToGenerate}', stringifyPretty(npcsToGenerate));
}

export function buildAbilitiesPartialPrompt(abilities: Partial<Ability>[]): string {
  return ABILITIES_PARTIAL_PROMPT_TEMPLATE.replace('{abilities}', stringifyPretty(abilities));
}

export function buildAbilitiesAgentInstructions(abilities: Partial<Ability>[]): string[] {
  const usePartialAsBasePrompt = buildAbilitiesPartialPrompt(abilities);

  return [
    ABILITIES_AGENT_INSTRUCTION_TEMPLATE,
    usePartialAsBasePrompt,
    ABILITIES_FINAL_INSTRUCTION
  ];
}

export function buildAbilitiesHistoryMessages(
  storyState: Story,
  characterState: CharacterDescription,
  characterStats: CharacterStats
): Array<{ role: 'user'; content: string }> {
  return [
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
  ];
}
