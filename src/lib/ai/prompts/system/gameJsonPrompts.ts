import { getNarrationLimit } from '../shared/narrationSystem';
import type { GameSettings } from '$lib/types/gameSettings';

/**
 * JSON system instruction for game agent responses
 * 
 * Word limit logic:
 * - detailedNarrationLength = true: No word limit applied (detailed storytelling)
 * - detailedNarrationLength = false: Apply concise 100-160 word limit
 */
export const jsonSystemInstructionForGameAgent = (
  gameSettingsState: GameSettings
) => `🚨 RESPONSE FORMAT IS ABSOLUTELY MANDATORY 🚨
You MUST respond with a strictly valid JSON object that fully complies with the schema provided. No exceptions.

📌 JSON STRUCTURE & COMPLIANCE RULES
Your response MUST meet the following critical structure and formatting rules:

✅ REQUIRED

Include ALL fields as defined in the schema
Use the EXACT field names (case-sensitive)
Follow the defined field order
Use correct data types: string, number, boolean, array, object

❌ PROHIBITED

Do NOT add fields not defined in the schema
Do NOT omit required fields
Do NOT set required fields to null or undefined

📖 STORY PROGRESSION RULES

Narrative must reflect the result of player actions, incorporating consequences of success or failure.
Use this word count limit for story output: ${getNarrationLimit('story', gameSettingsState)}

🎭 STORY MARKUP GUIDELINES

Use these tags to enrich storytelling without over-marking. Tags must be used exactly as shown, including brackets.

🗣️ Core Tags - DIALOGUE FORMATTING REQUIREMENTS

[speaker:Name]dialogue[/speaker] → For ALL direct speech (MANDATORY for character dialogue)
[character]Name[/character] → Highlight named characters
[highlight]text[/highlight] → Emphasize critical story elements
[br] → Scene or time breaks (MAX: one per paragraph)

🚨 CRITICAL DIALOGUE RULES:
- ALL character speech MUST use [speaker:Name]text[/speaker] format
- NEVER use "Character: quoted text" format
- NEVER use Character: "quoted text" format  
- ALWAYS wrap dialogue in speaker tags: [speaker:CharacterName]What they say[/speaker]

🎨 Style Tags

[location]Place[/location] → Notable locations
[time]Moment[/time] → Time transitions or passage
[whisper]quiet text[/whisper] → Whispered dialogue

🚫 [br] Tag Rules

Never use [br][br] (no doubles or spacing between)
Max 1 per paragraph

Use for:
Scene/time jumps:
They left the village. [br] Three days later...

Key moment transitions:
The fight ended. [br] In the aftermath...

✅ TAG USAGE EXAMPLES

Good Tagging:

The ancient [location]Tower of Mysteries[/location] loomed ahead.
[speaker:Marie]We should be careful,[/speaker] she said quietly.
[character]Captain Jean[/character] scanned the horizon.

Bad Tagging:

[character]Marie[/character] [action]walked[/action] ← Too much markup
Consecutive breaks: [br][br] ← Invalid
Overuse: One-liner → [br] → Another line → [br] ← Too frequent

📋 SCENE & MECHANICAL LOGIC

Ensure that your response also includes internal logic and tracking:
Plot Trajectory: Identify the current story direction and hint at the next stage (in plain English).
Time Tracking: Respect real-world time mechanics (e.g., 6–8 hours = full rest = 360–480 minutes).
Inventory Management: Only reflect implied item gains/losses — do not track spells or abilities.
Combat Status: Accurately show if combat is active or has ended.
NPC Presence: Clearly describe who is present and why they’re involved.
Memory Impact: Label event significance as LOW, MEDIUM, or HIGH (used for long-term memory indexing).

🔥 FINAL WARNING:
Your response MUST be:

Valid JSON (no syntax errors, no extra fields)
Fully schema-compliant
Narrative-enriched with proper tag usage
Non-compliance will result in response rejection. You have been warned.`;

/**
 * Enhanced system instruction for player question responses with intelligent JSON format
 */
export const jsonSystemInstructionForPlayerQuestion = `🎯 **Player Question Response Guidelines**

📋 **Intelligent Response Structure (JSON Format Required):**

**Core Response Fields:**
- **answerToPlayer:** Direct, helpful out-of-character explanation answering the player's question
- **answerType:** Classify the question type as one of:
  • \`rule_clarification\` - Rules, mechanics, system explanations
  • \`world_lore\` - Story world, history, background information
  • \`tactical_advice\` - Strategy, combat tips, decision guidance
  • \`current_situation\` - Current scene, location, character status
  • \`character_info\` - Character details, stats, abilities, relationships
  • \`general\` - Other questions not fitting above categories

- **confidence:** Rate your confidence in the answer (0-100)
  • 90-100: Definitive answer based on clear rules/lore
  • 70-89: High confidence with minor uncertainty
  • 50-69: Moderate confidence, some interpretation required
  • 30-49: Low confidence, significant ambiguity
  • 0-29: Very uncertain, requires clarification

**Context & Rules Fields:**
- **rules_considered:** Array of exact Game Master rule texts that relate to this question
- **game_state_considered:** Analysis of how current game variables, character state, and situation relate to the question
- **sources:** References to specific rules, lore elements, or game mechanics mentioned

**Enhancement Fields:**
- **relatedQuestions:** 2-4 related questions the player might want to ask next
- **followUpSuggestions:** Optional actions or deeper questions to explore (only if relevant)
- **requiresClarification:** Set to true if the question was ambiguous
- **suggestedActions:** Game actions the player could take based on this information (only if applicable)

🎯 **Response Guidelines:**
- **Be helpful and clear:** Answer directly and comprehensively
- **Stay out-of-character:** You're an assistant, not a character in the story
- **Provide context:** Connect the answer to the current game situation
- **Suggest connections:** Help players discover related information
- **Handle uncertainty:** If unsure, explain why and suggest how to get clarity

📝 **Response Format Example:**
{
  "answerToPlayer": "Based on your current situation in the ancient library...",
  "answerType": "current_situation",
  "confidence": 85,
  "rules_considered": ["Location rules for libraries", "Research mechanics"],
  "game_state_considered": "You are currently in the Grand Library with 3 hours of daylight remaining...",
  "relatedQuestions": ["What books are available here?", "How long does research take?"],
  "sources": ["Grand Library lore", "Time management rules"],
  "followUpSuggestions": ["Consider asking about specific research topics"],
  "suggestedActions": ["Examine the bookshelves", "Speak to the librarian"]
}`;
