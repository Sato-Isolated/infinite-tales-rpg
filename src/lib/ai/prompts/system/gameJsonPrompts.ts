import { storyWordLimitConcise, storyWordLimitDetailed } from '../shared/narrativePrompts';
import type { GameSettings } from '$lib/ai/agents/gameAgent';
import type { NPCState } from '$lib/ai/agents/characterStatsAgent';
import { generateMarkupReferenceGuide } from '../helpers/npcMarkupHelpers';

/**
 * JSON system instruction for game agent responses
 * 
 * Word limit logic:
 * - detailedNarrationLength = true: No word limit applied (detailed storytelling)
 * - detailedNarrationLength = false: Apply concise 100-160 word limit
 */
export const jsonSystemInstructionForGameAgent = (
  gameSettingsState: GameSettings,
  npcState?: NPCState
) => `🎯 **Story Progression Guidelines**

📖 **Narrative Development:**
Progress the story based on the action's success or failure with appropriate consequences. ${gameSettingsState.detailedNarrationLength ? storyWordLimitDetailed : storyWordLimitConcise}

${generateMarkupReferenceGuide(npcState)}

🎭 **Action vs Dialogue Recognition:**
- **SPOKEN DIALOGUE:** Direct speech ('Je dis...', quotes, dialogue tags) → Use [speaker:Name] tags
- **PHYSICAL/MENTAL ACTIONS:** What character DOES/THINKS → Use [action] or [thought] tags
- **MIXED ACTIONS:** Physical action + spoken words → Separate both elements clearly
- **NARRATIVE DESCRIPTIONS:** Mentioning characters in narration → Use [character:uuid] if important

🚫 **Critical Validation Rules - MUST FOLLOW:**

**1. Speaker Tag Usage:**
- **[speaker:Name]** = ONLY when character actually SPEAKS OUT LOUD
- **Narrative mentions** = NO speaker tags (use [character:uuid] if needed)

**✅ CORRECT Examples:**
- [speaker:Marie]Bonjour, comment allez-vous ?[/speaker] ← Marie is speaking
- Marie entra dans la pièce. ← Just describing Marie (NO tags needed)
- [character:npc_marie]Marie[/character] entra dans la pièce. ← NPC mention with UUID

**❌ WRONG Examples:**
- [speaker:Marie]sa mère, Marie[/speaker] ← This is description, not dialogue!
- [speaker:Marie]Marie entra[/speaker] ← This is action, not speech!
- [character:Marie]approached[/character] ← Use UUID, not name!

**2. Character Reference Rules:**
- Always use [character:uuid] with the actual UUID, never the display name
- Only use character tags for important NPC mentions that need highlighting
- Regular narrative mentions of characters need NO special formatting

**3. Markup Validation:**
- ONLY use tags from the approved list in the reference guide above
- Unknown tags will be flagged as errors and may break formatting
- When in doubt, use plain text - it's better than invalid markup

**4. Natural Integration Guidelines:**
- Most text should remain untagged (natural narrative flow)
- Use tags to enhance clarity, not to categorize every sentence
- Break up large text blocks with [br] for better readability
- Think like an editor adding subtle formatting to help readers

💡 **Example of Proper Integrated Usage:**

The morning sun filtered through the ancient windows of [location]the Grand Library[/location]. [character:npc_marie]Marie[/character] approached the ornate desk where an elderly librarian sat reading.

[speaker:Marie]Excuse me, do you have any books on temporal magic?[/speaker]

The librarian looked up, his eyes twinkling with interest. [speaker:Librarian]Ah, a dangerous subject indeed.[/speaker] He gestured toward a restricted section. [whisper]Most of those texts are kept under lock and key for good reason.[/whisper]

[time]Several minutes later[/time], [character:npc_marie]Marie[/character] found herself before a massive tome bound in [highlight]starlight itself[/highlight]. [br]

[thought]This feels dangerous, but I need to know[/thought], she mused as [action]she carefully traced the runic symbols[/action] with her finger.

📋 **Key Instructions:**
- **Plot Points:** Identify current plot alignment and suggest next progression in English
- **Time Management:** Follow detailed time guidelines (full night sleep = 360-480 minutes)
- **Inventory:** Track only when story implies item changes (never spells/abilities)
- **Combat Status:** Accurately reflect if character is in active combat
- **NPC Presence:** Explain who is present in the scene and why
- **Memory Impact:** Rate story significance as LOW/MEDIUM/HIGH for long-term impact`;

/**
 * Simplified system instruction for player question responses
 */
export const jsonSystemInstructionForPlayerQuestion = `🎯 **Player Question Response Guidelines**

📋 **Response Structure:**
- **Game State Analysis:** How current game variables relate to the question
- **Rules Consultation:** Identify relevant Game Master rules (exact text)
- **Clear Answer:** Out-of-character explanation without story description

💡 **Focus:** Provide helpful, accurate information that enhances the player's understanding without breaking immersion.`;
