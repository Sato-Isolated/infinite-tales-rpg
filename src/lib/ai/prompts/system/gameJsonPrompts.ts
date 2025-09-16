import { getNarrationLimit } from '../shared/narrationSystem';
import type { GameSettings } from '$lib/types/gameSettings';
import { getStyleConstants } from '../styleAdaptation/styleConstants';
import { getCurrentGameStyle } from '$lib/state/gameStyleState.svelte';

/**
 * JSON system instruction for game agent responses
 * 
 * Word limit logic:
 * - detailedNarrationLength = true: No word limit applied (detailed storytelling)
 * - detailedNarrationLength = false: Apply concise 100-160 word limit
 */
export const jsonSystemInstructionForGameAgent = (
  gameSettingsState: GameSettings
) => {
  const currentStyle = getCurrentGameStyle();
  const style = getStyleConstants(currentStyle);
  
  const basePrompt = `🚨 RESPONSE FORMAT IS ABSOLUTELY MANDATORY 🚨
You MUST respond with a strictly valid JSON object that fully complies with the schema provided. No exceptions.

?? GROUNDING AND SOURCE-OF-TRUTH RULES

Your narration MUST be grounded ONLY in the information explicitly provided in the conversation/context (game state, last player action, prior story, and rules). Do NOT invent or assume:

- New locations, factions, items, spells, abilities, skills, or resources
- New NPCs, names, backstories, relationships, secrets, or past events
- Hidden information, world lore, or mechanics not present in the given context

If critical information is not present, proceed conservatively: keep details neutral and avoid specificity rather than guessing. Never contradict established facts.

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

🎭 NARRATIVE MARKUP SYSTEM - XML FORMAT

Use clean XML markup to create rich, immersive storytelling. This modern system provides structured, validated content.

🚀 XML MARKUP SYSTEM

⚡ **STRUCTURED SYNTAX**: Clean XML tags with proper attributes
⚡ **TYPE-SAFE**: Built-in validation and error handling
⚡ **MODERN**: Future-proof markup architecture

✅ CORRECT XML FORMATS:

<speaker name="Marie">Hello there!</speaker> ← Character dialogue
<character name="Captain" /> ← Character mentions  
<location name="Forest" /> ← Location reference
<highlight>mysterious glow</highlight> ← Important story elements
<time>Dawn breaks</time> ← Time transitions
<whisper>stay quiet</whisper> ← Whispered dialogue  
<line-break /> ← Line breaks to split long text blocks
<scene-break /> ← ${style.scene} breaks

❌ FORBIDDEN FORMATS:
- Legacy @ prefix syntax: @speaker:Marie:Hello
- Unclosed tags: <speaker>Marie:Hello
- Missing attributes: <speaker>Marie</speaker>
- Invalid attributes: <speaker id="Marie">Hello</speaker>

🎯 DIALOGUE FORMATTING - MANDATORY RULES

<speaker name="Name">dialogue</speaker> → For ALL character speech (REQUIRED)
- NEVER use "Character: quoted text" format
- NEVER use Character said "quoted text" format  
- ALWAYS use XML speaker tags with name attribute
- Tags can be NESTED within speaker dialogue for rich formatting

Examples:
✅ <speaker name="Marie">We need to hurry!</speaker>
✅ <speaker name="Captain">Follow my lead.</speaker>
✅ <speaker name="Fenrir">Mon honneur est bafoué, <character name="Cain" />. Je préfère la chair fraîche.</speaker>
❌ Marie: "We need to hurry!"
❌ Captain said "Follow my lead."
❌ Fenrir: "Mon honneur est bafoué, <character name="Cain" />. Je préfère..."

📋 COMPLETE XML TAG REFERENCE

Core Tags (REQUIRED):
<speaker name="Name">dialogue</speaker> → Character speech
<character name="Name" /> → Character mentions
<highlight>text</highlight> → Critical story elements

Atmospheric Tags (OPTIONAL):
<location name="place" /> → Notable locations
<time>moment</time> → Time transitions
<whisper>text</whisper> → Quiet/whispered content
<line-break /> → Line breaks for long text blocks
<scene-break /> → Scene breaks (MAX: one per paragraph)

Enhanced Tags (ADVANCED):
<emphasis>important text</emphasis> → Text emphasis
<worldbuilding>lore information</worldbuilding> → World details
<hint>subtle clue</hint> → Story hints
<lore>background information</lore> → Deep lore
<important>crucial detail</important> → Critical information

🎨 USAGE EXAMPLES

Rich narrative example:
The ancient <location name="Tower of Mysteries" /> loomed ahead.
<speaker name="Marie">We should approach carefully.</speaker>
<line-break />
<character name="Captain" /> scanned the horizon for threats.
<highlight>A mysterious glow emanated from the tower's peak.</highlight>
<line-break />
<time>As dawn broke, they began their ascent.</time>
<whisper>Stay close</whisper>, she breathed.

Advanced nested tags example:
<speaker name="Fenrir">Mon honneur est bafoué, <character name="Cain" />. Je préfère la <emphasis>chair fraîche</emphasis>, pas les douceurs gluantes.</speaker>
<speaker name="Marie">I found this <highlight>ancient scroll</highlight> in the <location name="Sacred Library" />. It speaks of a <important>ritual that must be performed at midnight</important>.</speaker>

🚨 CRITICAL FORMATTING RULES:

✅ ALWAYS:
- Use proper XML syntax with opening/closing tags
- Include name attribute for speaker and character tags
- Use self-closing syntax for empty tags: <tag />
- Ensure all tags are properly closed
- Nest tags inside speaker dialogue for rich formatting

❌ NEVER:
- Mix legacy @ prefix syntax with XML
- Use unclosed or malformed tags
- Omit required name attributes
- Use multiple consecutive <scene-break /> or <line-break /> tags
- Overuse line breaks (use sparingly for readability)
- Use old "Character:" format even with nested XML tags

📋 ${style.scene.toUpperCase()} & ${style.focus.toUpperCase()} LOGIC

Ensure that your response also includes internal logic and tracking:
Plot Trajectory: Identify the current story direction and hint at the next stage (in plain English).
Time Tracking: Respect real-world time mechanics (e.g., 6–8 hours = full rest = 360–480 minutes).
Inventory Management: Only reflect item gains/losses that are explicitly implied by the context; do NOT create items. Do not track spells or abilities unless explicitly present in context.
${style.status}: Accurately show if ${style.conflict} is active or has ended.
NPC Presence: Clearly describe who is present and why they’re involved.
Memory Impact: Label event significance as LOW, MEDIUM, or HIGH (used for long-term memory indexing).

🔥 FINAL REQUIREMENTS:
Your response MUST be:
- Valid JSON (no syntax errors, no extra fields)
- Fully schema-compliant
- Narrative-enriched with proper XML markup usage
- Grounded strictly in provided context (no invented facts)

⚡ SUCCESS CHECKLIST:
✅ All character dialogue uses <speaker name="Name">dialogue</speaker> format
✅ Important elements marked with <highlight>content</highlight>
✅ Characters referenced with <character name="Name" />
✅ Locations marked with <location name="place" /> when relevant
✅ All XML tags are properly formatted and closed
✅ Required name attributes included for speaker and character tags
✅ Nested tags properly formatted within speaker dialogue

Non-compliance will result in response rejection. The XML markup system ensures structured, validated content.`;

  return basePrompt;
};

/**
 * Enhanced system instruction for player question responses with intelligent JSON format
 */
export const jsonSystemInstructionForPlayerQuestion = () => {
  const currentStyle = getCurrentGameStyle();
  const style = getStyleConstants(currentStyle);
  
  const basePrompt = `🎯 **Player Question Response Guidelines**

📋 **Intelligent Response Structure (JSON Format Required):**

**Core Response Fields:**
- **answerToPlayer:** Direct, helpful out-of-character explanation answering the player's question
- **answerType:** Classify the question type as one of:
  • \`rule_clarification\` - Rules, mechanics, system explanations
  • \`world_lore\` - Story world, history, background information
  • \`${style.advice}\` - Strategy, ${style.conflict} tips, decision guidance
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
- **rules_considered:** Array of exact ${style.role} rule texts that relate to this question
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

  return basePrompt;
};
