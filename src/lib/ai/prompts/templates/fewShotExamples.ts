/**
 * Few-shot examples for improving AI output quality
 * Provides concrete examples of expected input/output patterns
 */

/**
 * Action Agent few-shot examples
 */
export const ACTION_AGENT_FEW_SHOT_EXAMPLES = `
EXAMPLES OF PROPER ACTION GENERATION:

Example 1 - Stealth Action:
User Input: "I want to sneak past the guards"
Current Context: Guards are patrolling, shadows available, character has Stealth skill
Expected Response:
{
  "characterName": "Elara",
  "text": "Sneak past the guards",
  "type": "Investigation", 
  "related_attribute": "Dexterity",
  "related_skill": "Stealth",
  "action_difficulty": "MEDIUM",
  "plausibility": "Guards distracted, shadows provide cover",
  "difficulty_explanation": "MEDIUM because guards are alert but shadows help",
  "is_possible": true,
  "resource_cost": null,
  "narration_details": {"reasoning": "Requires careful movement and timing", "enum_english": "MEDIUM"},
  "actionSideEffects": "May alert guards if failed, could find alternate route if successful",
  "enemyEncounterExplanation": {"reasoning": "Guards present but avoidable with stealth", "enum_english": "MEDIUM"},
  "is_interruptible": {"reasoning": "Stealth requires sustained concentration", "enum_english": "HIGH"},
  "dice_roll": {"modifier": "none", "modifier_value": 0, "modifier_explanation": "Standard stealth attempt"}
}

Example 2 - Combat Action:
User Input: "I attack the orc with my sword"
Current Context: In combat, orc wounded, character has Sword skill
Expected Response:
{
  "characterName": "Marcus",
  "text": "Attack orc with sword",
  "type": "Attack",
  "related_attribute": "Strength", 
  "related_skill": "Sword Combat",
  "action_difficulty": "MEDIUM",
  "plausibility": "Direct combat action against engaged enemy",
  "difficulty_explanation": "MEDIUM because orc is wounded but still dangerous",
  "is_possible": true,
  "resource_cost": null,
  "narration_details": {"reasoning": "Combat action requires tactical positioning", "enum_english": "HIGH"},
  "actionSideEffects": "Will provoke counterattack, may finish combat if successful",
  "enemyEncounterExplanation": {"reasoning": "Already in combat with this enemy", "enum_english": "LOW"},
  "is_interruptible": {"reasoning": "Combat actions happen quickly", "enum_english": "LOW"},
  "dice_roll": {"modifier": "bonus", "modifier_value": 2, "modifier_explanation": "Opponent wounded, tactical advantage"}
}

Example 3 - Social Action:
User Input: "I try to convince the merchant to lower his prices"
Current Context: Marketplace, merchant seems greedy, character has Persuasion skill
Expected Response:
{
  "characterName": "Lydia",
  "text": "Negotiate lower prices",
  "type": "Social_Manipulation",
  "related_attribute": "Charisma",
  "related_skill": "Persuasion", 
  "action_difficulty": "HARD",
  "plausibility": "Merchants typically resist price reductions",
  "difficulty_explanation": "HARD because merchant focused on profit",
  "is_possible": true,
  "resource_cost": null,
  "narration_details": {"reasoning": "Social negotiation requires multiple arguments", "enum_english": "MEDIUM"},
  "actionSideEffects": "May improve or worsen merchant relationship",
  "enemyEncounterExplanation": {"reasoning": "Social situation, no physical threat", "enum_english": "LOW"},
  "is_interruptible": {"reasoning": "Conversation can be interrupted by events", "enum_english": "MEDIUM"},
  "dice_roll": {"modifier": "malus", "modifier_value": -1, "modifier_explanation": "Merchant has economic advantage"}
}

Now process the user's action following these patterns:
`;

/**
 * Game Agent few-shot examples
 */
export const GAME_AGENT_FEW_SHOT_EXAMPLES = `
EXAMPLES OF PROPER STORY PROGRESSION:

Example 1 - Successful Stealth:
User Action: "Sneak past guards" (Success)
Expected Response:
{
  "currentPlotPoint": "Character successfully infiltrates compound - PLOT_ID: 3",
  "gradualNarrativeExplanation": "Breaking infiltration into steps: approach, find cover, move past guards, reach objective",
  "plotPointAdvancingNudgeExplanation": "CURRENT_PLOT_ID: 3; NEXT_PLOT_ID: 4; Character now inside, can discover the hidden documents",
  "story": "<p class='text-base-content leading-relaxed mb-4'>The shadows embrace you as you press against the cold stone wall. The guards' torchlight flickers past, casting dancing shadows that seem to welcome your presence.</p><div class='border-l-4 border-success pl-4 py-2 mb-3 bg-base-200/30 rounded-r-lg'><strong class='text-success text-sm uppercase tracking-wide'>Success:</strong> <em class='text-success font-medium'>You slip past undetected</em></div>",
  "story_memory_explanation": "Successful infiltration opens new story possibilities - LONG_TERM_IMPACT: HIGH",
   "xpGainedExplanation": "Medium XP for overcoming significant challenge and advancing plot",
  "time_passed_minutes": 15,
  "time_passed_explanation": "Careful stealth movement - Brief complex activity",
  "stats_update": [{"type": "xp_gained", "targetName": "Elara", "value": "MEDIUM", "explanation": "Successfully infiltrated guarded area"}],
  "inventory_update": [],
  "is_character_in_combat": false,
  "is_character_restrained_explanation": null,
  "currently_present_npcs": {"hostile": [], "friendly": [], "neutral": []}
}

Example 2 - Failed Diplomacy:
User Action: "Convince the king to abdicate" (Failure)
Expected Response:
{
  "currentPlotPoint": "Diplomatic mission fails, tensions escalate - PLOT_ID: 5", 
  "gradualNarrativeExplanation": "Diplomatic failure creates new challenges: guards alerted, reputation damaged, alternative approaches needed",
  "plotPointAdvancingNudgeExplanation": "CURRENT_PLOT_ID: 5; NEXT_PLOT_ID: 6; Failed diplomacy forces character toward more dangerous confrontation path",
  "story": "<p class='text-base-content leading-relaxed mb-4'>The king's face darkens as your words hang in the throne room air.</p><div class='border-l-4 border-primary pl-4 py-2 mb-3 bg-base-200/30 rounded-r-lg'><strong class='text-primary text-sm uppercase tracking-wide'>King Aldric:</strong> <em class='text-primary font-medium'>'You dare suggest I abandon my throne? Guards!'</em></div><div class='border-l-3 border-error pl-3 py-1 mb-2 bg-error/5'><span class='text-error font-semibold'>✗ Diplomatic Failure</span></div>",
  "story_memory_explanation": "Diplomatic failure with major political consequences - LONG_TERM_IMPACT: HIGH",
  "xpGainedExplanation": "No XP - diplomatic failure with negative consequences",
  "time_passed_minutes": 10,
  "time_passed_explanation": "Formal audience and failed negotiation - Brief conversation",
  "stats_update": [],
  "inventory_update": [],
  "is_character_in_combat": false,
  "is_character_restrained_explanation": null,
  "currently_present_npcs": {"hostile": ["king_aldric", "royal_guard_1", "royal_guard_2"], "friendly": [], "neutral": ["court_advisor"]}
}

Now create your story progression following these patterns:
`;

/**
 * Summary Agent few-shot examples
 */
export const SUMMARY_AGENT_FEW_SHOT_EXAMPLES = `
EXAMPLES OF PROPER SUMMARIZATION:

Example Input: Long history of tavern investigation, meeting contacts, discovering clues about smuggling ring
Expected Response:
{
  "keyDetails": [
    "Character investigated the Rusty Anchor tavern for smuggling evidence",
    "Bartender Gareth provided key information about midnight shipments", 
    "Discovered hidden compartment containing shipping manifests",
    "Learned smuggling ring connects to Lord Blackwood's estate",
    "Character's cover identity as merchant was established"
  ],
  "story": "The character spent several days investigating a suspected smuggling operation centered around the Rusty Anchor tavern. Through careful questioning and exploration, they uncovered evidence linking the operation to Lord Blackwood's estate. The investigation revealed midnight shipments and hidden manifests, establishing the character's merchant cover identity for future infiltration.",
  "timelineEvents": [
    {"event": "Initial tavern reconnaissance", "timeContext": "Evening of day 3"},
    {"event": "Contact with bartender Gareth", "timeContext": "Late night day 3"},
    {"event": "Discovery of hidden compartment", "timeContext": "Morning of day 4"},
    {"event": "Analysis of shipping manifests", "timeContext": "Afternoon day 4"}
  ]
}

Now summarize the provided history following this pattern:
`;

/**
 * Character Agent few-shot examples  
 */
export const CHARACTER_AGENT_FEW_SHOT_EXAMPLES = `
EXAMPLES OF PROPER CHARACTER CREATION:

Example Input: Create a mysterious wizard character for dark fantasy setting
Expected Response:
{
  "name": "Valdris the Twilight Scholar",
  "appearance": "Tall and gaunt with silver-streaked black hair pulled back severely. Deep violet eyes that seem to hold ancient knowledge. Wears dark robes embroidered with constellation patterns. Carries a staff topped with a crystal that shifts between purple and black.",
  "personality": "Intellectually curious but emotionally distant. Speaks precisely and rarely shows emotion. Values knowledge above relationships. Has a hidden compassionate side that emerges in crisis moments. Slightly paranoid due to past betrayals.",
  "background": "Former court wizard who discovered forbidden knowledge about dimensional magic. Exiled after a magical experiment went wrong, causing temporal distortions. Now wanders seeking redemption while researching ways to undo the damage. Haunted by the lives lost in the experiment.",
}

Now create your character following this pattern:
`;

/**
 * Combat Agent few-shot examples
 */
export const COMBAT_AGENT_FEW_SHOT_EXAMPLES = `
EXAMPLES OF PROPER COMBAT RESOLUTION:

Example 1 - Sword Attack Success:
User Action: "Attack orc with sword" (Roll: 15, Success)
Expected Response:
{
  "combatResult": "SUCCESS",
  "description": "Your blade finds its mark, slicing across the orc's torso in a spray of dark blood",
  "damage": "2d6+3",
  "targetEffects": ["wounded", "staggered"],
  "tacticalChanges": "Orc is now defensive, backing toward wall",
  "stats_update": [
    {"type": "hp_lost", "sourceName": "Marcus", "targetName": "orc_warrior", "value": "2d6+3", "explanation": "Successful sword strike"}
  ]
}

Example 2 - Spell Cast with Resource Cost:
User Action: "Cast fireball at enemy group" (Roll: 12, Success)
Expected Response:
{
  "combatResult": "SUCCESS",
  "description": "Flames erupt from your fingertips, engulfing the enemies in a roaring inferno",
  "damage": "3d6",
  "targetEffects": ["burned", "scattered"],
  "tacticalChanges": "Enemies forced to spread out, some seek cover",
  "stats_update": [
    {"type": "mp_lost", "sourceName": "Lydia", "targetName": "Lydia", "value": "15", "explanation": "Fireball spell cost"},
    {"type": "hp_lost", "sourceName": "Lydia", "targetName": "goblin_1", "value": "3d6", "explanation": "Fireball damage"},
    {"type": "hp_lost", "sourceName": "Lydia", "targetName": "goblin_2", "value": "3d6", "explanation": "Fireball damage"}
  ]
}

Now resolve the combat action following these patterns:
`;

/**
 * Helper function to get appropriate few-shot examples for an agent
 */
export const getFewShotExamples = (agentType: 'action' | 'game' | 'summary' | 'character' | 'combat'): string => {
  switch (agentType) {
    case 'action':
      return ACTION_AGENT_FEW_SHOT_EXAMPLES;
    case 'game':
      return GAME_AGENT_FEW_SHOT_EXAMPLES;
    case 'summary':
      return SUMMARY_AGENT_FEW_SHOT_EXAMPLES;
    case 'character':
      return CHARACTER_AGENT_FEW_SHOT_EXAMPLES;
    case 'combat':
      return COMBAT_AGENT_FEW_SHOT_EXAMPLES;
    default:
      return '';
  }
};
