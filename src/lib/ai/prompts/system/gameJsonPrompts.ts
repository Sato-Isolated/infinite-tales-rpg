import { statsUpdatePromptObject } from '../formats';
import { currentlyPresentNPCSForPrompt } from '../formats';
import { storyWordLimitConcise, storyWordLimitDetailed } from '../shared/narrativePrompts';
import type { GameSettings } from '$lib/ai/agents/gameAgent';

/**
 * JSON system instruction for game agent responses
 * 
 * Word limit logic:
 * - detailedNarrationLength = true: No word limit applied (detailed storytelling)
 * - detailedNarrationLength = false: Apply concise 100-160 word limit
 */
export const jsonSystemInstructionForGameAgent = (
  gameSettingsState: GameSettings
) => `CRITICAL: You MUST respond with ONLY valid JSON in the exact format specified below. Do not include any additional text, explanations, or formatting.

INVENTORY UPDATE RULES:
- Add this to the JSON if the story implies that an item is added or removed from the character's inventory
- This section is only for items and never spells or abilities  
- For each item addition or removal this object is added once, the whole inventory does not need to be tracked here
- The starting items are also listed here as add_item

JSON FORMAT:
{
  "currentPlotPoint": VALUE MUST BE ALWAYS IN ENGLISH; Identify the most relevant plotId in MAIN_SCENARIO that the story aligns with; Explain your reasoning briefly; Format "{Reasoning} - PLOT_ID: {plotId}",
  "gradualNarrativeExplanation": "Reasoning how the story development is broken down to meaningful narrative moments. Each step should represent a significant part of the process, giving the player the opportunity to make impactful choices.",
  "plotPointAdvancingNudgeExplanation": "VALUE MUST BE ALWAYS IN ENGLISH; Explain what could happen next to advance the story towards NEXT_PLOT_ID according to MAIN_SCENARIO; Include brief explanation of NEXT_PLOT_ID; Format "CURRENT_PLOT_ID: {plotId}; NEXT_PLOT_ID: {currentPlotId + 1}; {Reasoning}",
  "story": "depending on If The Action Is A Success Or Failure progress the story further with appropriate consequences. ${gameSettingsState.detailedNarrationLength ? storyWordLimitDetailed : storyWordLimitConcise} For character speech use single quotes. 

🎭 CRITICAL ACTION vs DIALOGUE DISTINCTION:
- SPOKEN DIALOGUE: When user writes direct speech ('Je dis...', quotes, dialogue tags) → Use dialogue formatting
- PHYSICAL/MENTAL ACTIONS: When user describes what character DOES/THINKS → Use action description formatting
- MIXED ACTIONS: Physical action + spoken words → Separate into action description + dialogue

Format the narration using structured markup tags for clean, lightweight output:
- [dialogue:SpeakerName]Text[/dialogue] for CHARACTER SPOKEN WORDS ONLY (not actions or descriptions)
- [action]Text[/action] for character actions, physical changes, mental states, magical effects
- [atmosphere]Text[/atmosphere] for environmental descriptions, ambiance, setting details
- [emphasis]Text[/emphasis] for key story elements that need highlighting
- [thought]Text[/thought] for character internal thoughts or mental processes
- [transition] for scene transitions and time passage
- [status:success]Text[/status] for positive outcomes and achievements
- [status:warning]Text[/status] for caution, potential dangers, or uncertain situations
- [status:error]Text[/status] for dangerous situations, failures, or threats
- [badge]Text[/badge] for status effects, magical conditions, or temporary states
- Use plain text for main narrative paragraphs (will be auto-wrapped)",
  "story_memory_explanation": "Explanation if story progression has Long-term Impact: Remember events that significantly influence character arcs, plot direction, or the game world in ways that persist or resurface later; Format: {explanation} LONG_TERM_IMPACT: LOW, MEDIUM, HIGH",
  "xpGainedExplanation": "Explain why or why nor the CHARACTER gains xp in this situation",
  "time_passed_minutes": "Number of minutes that have passed during this action (follow the detailed time guidelines provided earlier - CRUCIAL: full night sleep MUST be 360-480 minutes, not 15-20 minutes)",
  "time_passed_explanation": "Brief explanation of why this amount of time passed, referencing the specific guideline category used (e.g., 'Full night sleep', 'Brief conversation', 'Complex activity', etc.)",
  "initial_game_time": "ONLY FOR INITIAL STORY SETUP: Generate appropriate starting date and time that fits the story context. Format: {\\"day\\": 15, \\"dayName\\": \\"Monday\\", \\"month\\": 6, \\"monthName\\": \\"June\\", \\"year\\": 2024, \\"hour\\": 12, \\"minute\\": 30, \\"timeOfDay\\": \\"midday\\", \\"explanation\\": \\"Brief explanation of why this time fits the story\\"}. Omit this field for non-initial story progressions.",
  ${statsUpdatePromptObject},
  "inventory_update": [
    {
      "type": "add_item",
      "item_id": "unique_item_identifier",
      "item_added": {
        "description": "Item description",
        "effect": "Item effect description"
      }
    },
    {
      "type": "remove_item", 
      "item_id": "unique_item_identifier"
    }
  ],
  "is_character_in_combat": true if CHARACTER is in active combat else false,
  "is_character_restrained_explanation": null | string; "If not restrained null, else Briefly explain how the character has entered a TEMPORARY state or condition that SIGNIFICANTLY RESTRICTS their available actions, changes how they act, or puts them under external control? (Examples: Put to sleep, paralyzed, charmed, blinded,  affected by an illusion, under a compulsion spell)",
  "currently_present_npcs_explanation": "For each NPC explain why they are or are not present in list currently_present_npcs",
  "currently_present_npcs": List of NPCs or party members that are present in the current situation. Format: ${currentlyPresentNPCSForPrompt}
}`;

/**
 * JSON system instruction for player question responses
 */
export const jsonSystemInstructionForPlayerQuestion = `CRITICAL: You MUST respond with ONLY valid JSON in the exact format specified below. Do not include any additional text, explanations, or formatting.
{
  "game_state_considered": Brief explanation on how the game state is involved in the answer; mention relevant variables explicitly,
  "rules_considered": String Array; Identify the relevant Game Master's rules that are related to the question; Include the exact text of a rule,
  "answerToPlayer": Answer outside of character, do not describe the story, but give an explanation
}`;
