import { stringifyPretty } from '$lib/util.svelte';
import { ActionDifficulty, getEmptyCriticalResourceKeys } from '$lib/game/logic/gameLogic';
import type { Action } from '$lib/types/action';
import type { InventoryState } from '$lib/types/inventory';
import type { PlayerCharactersGameState } from '$lib/types/players';
import type { ResourcesWithCurrentValue } from '$lib/types/resources';
import type { GameSettings } from '$lib/types/gameSettings';
import type { Story } from '$lib/ai/agents/storyAgent';
import type { LLMMessage } from '$lib/ai/llm';
import { getCombatNarrationPrompt } from '$lib/ai/prompts/shared/narrationSystem';

// Base combat agent prompts
export const COMBAT_AGENT_BASE_PROMPT = "You are RPG combat agent, you decide which actions the NPCs take in response to the player character's action and what the consequences of these actions are.";

export const COMBAT_NPC_ACTION_RULES = '\n You must not apply self damage to player character because of a failed action unless explicitly stated!\n You must include an action for each NPC from the list. You must also describe one action for player character, even if the action is a failure.\n You must include the results of the actions as stats_update for each action. NPCs can never be finished off with a single attack!';

export const COMBAT_STATS_UPDATE_RULES_TEMPLATE = `Only for the player character {characterName} use the following resources:\n {playerResources}\n\nFor stats_update regarding NPC, you must exactly use resourceKey "hp" or "mp", and no deviations of that.`;

export const COMBAT_INVENTORY_CONTEXT_TEMPLATE = "The following is the character's inventory, if an item is relevant in the current situation then apply it's effect.\n{inventory}";

export const COMBAT_STORY_CONTEXT_TEMPLATE = 'The following is a description of the story setting to keep the actions consistent on.\n{storyState}';

export const COMBAT_FINAL_INSTRUCTION = 'Generate structured combat resolution with actions and stat updates for all participants.';

export const COMBAT_CUSTOM_INSTRUCTION_TEMPLATE = 'Following instructions overrule all others: {customInstruction}';

// Action message templates
export const COMBAT_ACTION_MESSAGE_TEMPLATE = `player character named {characterName} takes following action: {actionText}
Decide the action and consequences for each of the following NPCs. It can be a spell, ability or any other action. Important: You must reuse the exact nameIds that are given!
{npcsList}`;

// Additional story input prompts
export const ADDITIONAL_STORY_NO_SINGLE_KILL_PROMPT = '\nNPCs can never be finished off with a single attack!';

export const ADDITIONAL_STORY_NO_STATS_UPDATE_PROMPT = '\nYou must not apply stats_update for following actions, as this was already done!';

export const ADDITIONAL_STORY_ACTIONS_TEMPLATE = '\nDescribe the following actions in the story progression:\n{actions}';

export const ADDITIONAL_STORY_IMPORTANCE_PREFIX = '\n\nMost important! ';

// NPC health state prompts
export const NPC_ALIVE_STATUS_TEMPLATE = '\n Following NPCs are still alive after the attacks!\n{aliveNPCs}';

export const NPC_DEAD_STATUS_TEMPLATE = '\n Following NPCs have died, describe their death in the story progression.\n{deadNPCs}';

export const PLAYER_ALIVE_STATUS_TEMPLATE = '\n Player Characters {aliveCharacters} are alive after the attacks!';

// Combat addition prompts
export const COMBAT_SUGGESTIONS_PROMPT = '\nOnly suggest combat actions given the situation';

export const COMBAT_DIFFICULTY_CONSTRAINTS_TEMPLATE = '\nOnly use following difficulties: {difficulties}';

export const COMBAT_DICE_BONUS_RULE = '\nOnly apply bonus to dice_roll';

// Utility functions for building complete prompts

export function buildCombatAgentInstructions(
  action: Action,
  playerCharResources: ResourcesWithCurrentValue,
  inventoryState: InventoryState,
  storyState: Story,
  gameSettings: GameSettings,
  customSystemInstruction?: string,
  customCombatAgentInstruction?: string
): string[] {
  const instructions = [
    COMBAT_AGENT_BASE_PROMPT + COMBAT_NPC_ACTION_RULES,
    COMBAT_STATS_UPDATE_RULES_TEMPLATE
      .replace('{characterName}', action.characterName)
      .replace('{playerResources}', stringifyPretty(playerCharResources)),
    COMBAT_INVENTORY_CONTEXT_TEMPLATE.replace('{inventory}', stringifyPretty(inventoryState)),
    COMBAT_STORY_CONTEXT_TEMPLATE.replace('{storyState}', stringifyPretty(storyState)),
    getCombatNarrationPrompt(gameSettings),
    COMBAT_FINAL_INSTRUCTION
  ];

  if (customSystemInstruction) {
    instructions.push(COMBAT_CUSTOM_INSTRUCTION_TEMPLATE.replace('{customInstruction}', customSystemInstruction));
  }

  if (customCombatAgentInstruction) {
    instructions.push(COMBAT_CUSTOM_INSTRUCTION_TEMPLATE.replace('{customInstruction}', customCombatAgentInstruction));
  }

  return instructions;
}

export function buildCombatActionMessage(
  action: Action,
  npcsList: Array<object>
): string {
  return COMBAT_ACTION_MESSAGE_TEMPLATE
    .replace('{characterName}', action.characterName)
    .replace('{actionText}', action.text)
    .replace('{npcsList}', stringifyPretty(npcsList));
}

export function buildAdditionalStoryInput(
  actions: Array<{
    sourceId: string;
    targetId: string;
    text: string;
    explanation: string;
  }>,
  deadNPCs: string[],
  aliveNPCs: string[],
  playerCharactersGameState: PlayerCharactersGameState
): string {
  return (
    ADDITIONAL_STORY_NO_SINGLE_KILL_PROMPT +
    ADDITIONAL_STORY_NO_STATS_UPDATE_PROMPT +
    ADDITIONAL_STORY_ACTIONS_TEMPLATE.replace('{actions}', stringifyPretty(actions)) +
    ADDITIONAL_STORY_IMPORTANCE_PREFIX +
    buildNPCsHealthStatePrompt(deadNPCs, aliveNPCs, playerCharactersGameState)
  );
}

export function buildNPCsHealthStatePrompt(
  deadNPCs: Array<string>,
  aliveNPCs?: Array<string>,
  playerCharactersGameState?: PlayerCharactersGameState
): string {
  let text = '';

  if (aliveNPCs && aliveNPCs.length > 0) {
    text += NPC_ALIVE_STATUS_TEMPLATE.replace('{aliveNPCs}', stringifyPretty(aliveNPCs));
  }

  if (deadNPCs && deadNPCs.length > 0) {
    text += NPC_DEAD_STATUS_TEMPLATE.replace('{deadNPCs}', stringifyPretty(deadNPCs));
  }

  if (playerCharactersGameState) {
    const aliveChars = Object.keys(playerCharactersGameState).filter(
      (playerName) =>
        getEmptyCriticalResourceKeys(playerCharactersGameState[playerName]).length === 0
    );
    text += PLAYER_ALIVE_STATUS_TEMPLATE.replace('{aliveCharacters}', aliveChars.join(', '));
  }

  return text;
}

export function buildCombatPromptAddition(): string {
  const combatDifficulties = [
    ActionDifficulty.simple,
    ActionDifficulty.medium,
    ActionDifficulty.difficult
  ];

  return (
    COMBAT_SUGGESTIONS_PROMPT +
    COMBAT_DIFFICULTY_CONSTRAINTS_TEMPLATE.replace('{difficulties}', combatDifficulties.join('|')) +
    COMBAT_DICE_BONUS_RULE
  );
}
