import { stringifyPretty } from '$lib/util.svelte';
import type { GameSettings } from '$lib/types/gameSettings';
import { getActionNarrationPrompt } from '$lib/ai/prompts/shared/narrationSystem';

// =============================================================================
// TYPES AND ENUMS
// =============================================================================

export enum InterruptProbability {
  NEVER = 'NEVER',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  ALWAYS = 'ALWAYS'
}

// =============================================================================
// ACTION AGENT PROMPT CONSTANTS
// =============================================================================

/**
 * Base system instructions for different types of action agents
 */
export const BASE_RPG_ACTION_AGENT_INSTRUCTION = `You are RPG action agent, you are given a RPG story and one action the player wants to perform; Determine difficulty, resource cost etc. for this action; Consider the story, currently_present_npcs and character stats.
Action Rules:
- Review the character's spells_and_abilities and inventory for passive attributes that could alter the dice_roll
- For puzzles, the player —not the character— must solve them. Offer a set of possible actions, including both correct and incorrect choices.
- All actions must respect: physical constraints (can't fly without magic), character abilities (can't cast spells without training), available tools (can't unlock without key/skill), and environmental factors (can't swim in lava).`;

export const BASE_RPG_ACTIONS_GENERATOR_INSTRUCTION = `You are RPG action agent. Your task: suggest contextually appropriate actions the player character can take.

EVALUATION CRITERIA:
- Current story context and narrative situation
- Character personality, skills, and available items  
- Present NPCs and their relationships with the character
- Character stats and capabilities

ACTION REQUIREMENTS:
- Actions must be specific and clearly describe what the character does
- Consider both immediate and potential long-term consequences
- Ensure actions fit the current story context and character capabilities
- Include both safe and risky options when appropriate`;

export const BASE_RPG_ITEM_ACTIONS_INSTRUCTION = `You are RPG action agent specializing in item usage. Your task: suggest specific actions the player character can take with a given item.

ITEM ACTION GUIDELINES:
- Consider the item's properties, condition, and intended use
- Suggest both conventional and creative applications  
- Account for character skills that might enhance item effectiveness
- Consider story context and currently present NPCs
- Include potential risks or limitations of item usage`;

// =============================================================================
// TEMPLATE FUNCTIONS FOR DYNAMIC PROMPTS
// =============================================================================

/**
 * Generates action generation instructions with dynamic attributes and skills
 */
export const getActionInstructionsTemplate = (
  attributes: string[],
  skills: string[],
  newSkillsAllowed: boolean
): string => {
  const newSkillRule = newSkillsAllowed
    ? `Choose or create a single skill that is more specific than the related_attribute but broad enough for multiple actions (e.g. 'Melee Combat' instead of 'Strength'). Use an exact same spelled EXISTING SKILL if applicable; otherwise, add a fitting new one.`
    : `Choose an exact same spelled single skill from EXISTING SKILLS or null if none fits; Never create a new skill;`;

  return `
ACTION GENERATION RULES:
- related_attribute: Must be an exact same spelled attribute from: ${attributes.join(', ')} - never create new Attributes!
- related_skill: ${newSkillRule} EXISTING SKILLS: ${skills.join(', ')}
- resource_cost: Set to null if no cost, otherwise use object with resource_key and cost
- narration_details: Use object format with reasoning and enum_english (LOW|MEDIUM|HIGH). LOW if it involves few steps or can be done quickly; MEDIUM|HIGH if it involves thorough planning or decisions
- enemyEncounterExplanation: Use object format with reasoning and enum_english (LOW|MEDIUM|HIGH). Brief reasoning for the probability of an enemy encounter; if probable describe enemy details; LOW probability if an encounter recently happened
- is_interruptible: Use object format with reasoning and enum_english (${Object.keys(InterruptProbability).join('|')}). Brief reasoning for the probability that this action is interrupted; e.g. travel in dangerous environment is HIGH
- dice_roll: Use dice roll prompt format with modifier details
`;
};

/**
 * Template for restraining state prompt
 */
export const getRestrainingStatePromptTemplate = (restraining_state: string): string =>
  `The character is currently affected by a restraining state: ${restraining_state}. Only suggest actions that are possible while under this effect.`;

/**
 * Template for story setting instruction
 */
export const getStorySettingInstructionTemplate = (storySettings: any): string =>
  'The suggested actions must fit to the setting of the story:' + '\n' + stringifyPretty(storySettings);

/**
 * Template for character description instruction (for single action evaluation)
 */
export const getCharacterDescriptionInstructionTemplate = (characterDescription: any): string =>
  'dice_roll can be modified by following description of the character, e.g. acting smart or with force, ...' + '\n' + stringifyPretty(characterDescription);

/**
 * Template for character description instruction (for action generation)
 */
export const getCharacterDescriptionActionsTemplate = (characterDescription: any): string =>
  'Suggest actions according to the following description of the character temper, e.g. acting smart or with force, ...' + '\n' + stringifyPretty(characterDescription);

/**
 * Template for inventory instruction (for single action evaluation)
 */
export const getInventoryInstructionTemplate = (inventoryState: any): string =>
  'dice_roll can be modified by items from the inventory:' + '\n' + stringifyPretty(inventoryState);

/**
 * Template for inventory instruction (for action generation)
 */
export const getInventoryActionsTemplate = (inventoryState: any): string =>
  'As an action, the character can make use of items from the inventory:' + '\n' + stringifyPretty(inventoryState);

/**
 * Template for inventory item combination instruction
 */
export const getInventoryItemCombinationTemplate = (inventoryState: any): string =>
  'As an action, the character could also combine the item with other items from the inventory:' + '\n' + stringifyPretty(inventoryState);

/**
 * Template for resource modifier instruction
 */
export const getResourceModifierInstructionTemplate = (resources: any): string =>
  'dice_roll modifier can be applied based on high or low resources:' + '\n' + stringifyPretty(resources);

/**
 * Template for custom instruction override
 */
export const getCustomInstructionOverrideTemplate = (customInstruction: string): string =>
  'Following instructions overrule all others: ' + customInstruction;

/**
 * Template for related history instruction
 */
export const getRelatedHistoryInstructionTemplate = (relatedHistory: string[]): string =>
  'The actions must be plausible with PAST STORY PLOT;\n' +
  'Never suggest actions to investigate PAST STORY PLOT as they are already known;\n' +
  'Avoid suggesting actions that would lead to repeating dialogues or conversations that have already occurred;\n' +
  'If PAST STORY PLOT contradict each other, the earliest takes precedence, and the later conflicting detail must be ignored;\nPAST STORY PLOT:\n' +
  relatedHistory.join('\n');

// =============================================================================
// USER MESSAGE TEMPLATES
// =============================================================================

/**
 * Templates for single action user messages
 */
export const SINGLE_ACTION_USER_MESSAGE_PREFIX = 'The player wants to perform following action, you must use these exact words as action text: ';

export const SINGLE_ACTION_USER_MESSAGE_SUFFIX = "\nDo NOT paraphrase, translate or reword the action text. If you must return a 'text' field, copy it EXACTLY as provided, character-for-character.\n" +
  'Determine the difficulty and resource cost with considering their personality, skills, items, story summary and following game state\n';

/**
 * Templates for action generation user messages
 */
export const ACTIONS_USER_MESSAGE_PREFIX = 'Suggest specific actions the CHARACTER can take, considering their personality, skills and items.\n' +
  'Each action must clearly describe what the character does and how they do it. \n The actions must be directly related to the current story: ';

export const ACTIONS_USER_MESSAGE_SUFFIX = '\nThe actions must be plausible in the current situation, e.g. before investigating, a tense situation must be resolved.';

/**
 * Templates for item action user messages
 */
export const ITEM_ACTIONS_USER_MESSAGE_PREFIX = 'Suggest specific actions the CHARACTER can take with the item:\n';

export const ITEM_ACTIONS_USER_MESSAGE_MIDDLE = '\nEach action must clearly describe what the character does and how they do it. \n The actions must be directly related to the current story: ';

export const ITEM_ACTIONS_USER_MESSAGE_SUFFIX = '\nThe actions must be plausible in the current situation, e.g. before investigating, a combat or tense situation must be resolved.';

/**
 * Template for related history addition to user messages
 */
export const RELATED_HISTORY_USER_MESSAGE_ADDITION = '\n\nFollowing is related past story plot, check if the action is possible in this context, it must be plausible in this moment and not just hypothetically;\n' +
  'If no history detail directly contradicts the action, it is possible.\n' +
  'Avoid actions that would lead to repeating dialogues or conversations that have already occurred.\n';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Builds the complete agent instruction array for single action evaluation
 */
export const buildSingleActionAgentInstructions = (
  storySettings: any,
  characterDescription: any,
  inventoryState: any,
  characterResources: any,
  attributes: string[],
  skills: string[],
  newSkillsAllowed: boolean,
  gameSettings: GameSettings,
  customSystemInstruction?: string,
  customActionAgentInstruction?: string
): string[] => {
  const instructions = [
    BASE_RPG_ACTION_AGENT_INSTRUCTION,
    getStorySettingInstructionTemplate(storySettings),
    getCharacterDescriptionInstructionTemplate(characterDescription),
    getInventoryInstructionTemplate(inventoryState),
    getResourceModifierInstructionTemplate(characterResources),
    getActionInstructionsTemplate(attributes, skills, newSkillsAllowed),
    getActionNarrationPrompt(gameSettings)
  ];

  if (customSystemInstruction) {
    instructions.push(getCustomInstructionOverrideTemplate(customSystemInstruction));
  }
  if (customActionAgentInstruction) {
    instructions.push(getCustomInstructionOverrideTemplate(customActionAgentInstruction));
  }

  return instructions;
};

/**
 * Builds the complete agent instruction array for action generation
 */
export const buildActionsGeneratorAgentInstructions = (
  actionRules: string,
  storySettings: any,
  characterDescription: any,
  inventoryState: any,
  characterResources: any,
  attributes: string[],
  skills: string[],
  newSkillsAllowed: boolean,
  gameSettings: GameSettings,
  relatedHistory?: string[],
  customSystemInstruction?: string,
  customActionAgentInstruction?: string
): string[] => {
  const instructions = [
    BASE_RPG_ACTIONS_GENERATOR_INSTRUCTION,
    actionRules,
    getStorySettingInstructionTemplate(storySettings),
    getCharacterDescriptionActionsTemplate(characterDescription),
    getInventoryActionsTemplate(inventoryState),
    getResourceModifierInstructionTemplate(characterResources),
    getActionInstructionsTemplate(attributes, skills, newSkillsAllowed),
    getActionNarrationPrompt(gameSettings)
  ];

  if (relatedHistory && relatedHistory.length > 0) {
    instructions.push(getRelatedHistoryInstructionTemplate(relatedHistory));
  }
  if (customSystemInstruction) {
    instructions.push(getCustomInstructionOverrideTemplate(customSystemInstruction));
  }
  if (customActionAgentInstruction) {
    instructions.push(getCustomInstructionOverrideTemplate(customActionAgentInstruction));
  }

  return instructions;
};

/**
 * Builds the complete agent instruction array for item action generation
 */
export const buildItemActionsAgentInstructions = (
  actionRules: string,
  storySettings: any,
  characterDescription: any,
  inventoryState: any,
  characterResources: any,
  attributes: string[],
  skills: string[],
  newSkillsAllowed: boolean,
  gameSettings: GameSettings,
  customSystemInstruction?: string,
  customActionAgentInstruction?: string
): string[] => {
  const instructions = [
    BASE_RPG_ITEM_ACTIONS_INSTRUCTION,
    actionRules,
    getStorySettingInstructionTemplate(storySettings),
    getCharacterDescriptionActionsTemplate(characterDescription),
    getInventoryItemCombinationTemplate(inventoryState),
    getResourceModifierInstructionTemplate(characterResources),
    getActionInstructionsTemplate(attributes, skills, newSkillsAllowed),
    getActionNarrationPrompt(gameSettings)
  ];

  if (customSystemInstruction) {
    instructions.push(getCustomInstructionOverrideTemplate(customSystemInstruction));
  }
  if (customActionAgentInstruction) {
    instructions.push(getCustomInstructionOverrideTemplate(customActionAgentInstruction));
  }

  return instructions;
};

/**
 * Builds user message for single action evaluation
 */
export const buildSingleActionUserMessage = (
  actionText: string,
  currentGameState: any,
  restrainingState?: string,
  additionalActionInput?: string,
  relatedHistory?: string[]
): string => {
  let userMessage =
    SINGLE_ACTION_USER_MESSAGE_PREFIX +
    actionText +
    SINGLE_ACTION_USER_MESSAGE_SUFFIX +
    stringifyPretty(currentGameState);

  if (restrainingState) {
    userMessage += '\n' + getRestrainingStatePromptTemplate(restrainingState) + '\n';
  }

  if (additionalActionInput) {
    userMessage += '\n' + additionalActionInput;
  }

  if (relatedHistory && relatedHistory.length > 0) {
    userMessage += RELATED_HISTORY_USER_MESSAGE_ADDITION + relatedHistory.join('\n');
  }

  return userMessage;
};

/**
 * Builds user message for action generation
 */
export const buildActionsGeneratorUserMessage = (
  currentGameState: any,
  isCharacterInCombat: boolean,
  combatPromptAddition: string,
  restrainingState?: string,
  additionalActionInput?: string
): string => {
  let userMessage =
    ACTIONS_USER_MESSAGE_PREFIX +
    stringifyPretty(currentGameState) +
    ACTIONS_USER_MESSAGE_SUFFIX;

  if (isCharacterInCombat) {
    userMessage += combatPromptAddition;
  }

  if (restrainingState) {
    userMessage += '\n' + getRestrainingStatePromptTemplate(restrainingState) + '\n';
  }

  if (additionalActionInput) {
    userMessage += '\n' + additionalActionInput;
  }

  return userMessage;
};

/**
 * Builds user message for item action generation
 */
export const buildItemActionsUserMessage = (
  item: any,
  currentGameState: any,
  restrainingState?: string,
  additionalActionInput?: string
): string => {
  let userMessage =
    ITEM_ACTIONS_USER_MESSAGE_PREFIX +
    stringifyPretty(item) +
    ITEM_ACTIONS_USER_MESSAGE_MIDDLE +
    stringifyPretty(currentGameState) +
    ITEM_ACTIONS_USER_MESSAGE_SUFFIX;

  if (restrainingState) {
    userMessage += '\n' + getRestrainingStatePromptTemplate(restrainingState) + '\n';
  }

  if (additionalActionInput) {
    userMessage += '\n' + additionalActionInput;
  }

  return userMessage;
};
