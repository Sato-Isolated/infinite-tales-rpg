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
) => `🎯 **Story Progression Guidelines**

📖 **Narrative Development:**
Progress the story based on the action's success or failure with appropriate consequences. ${gameSettingsState.detailedNarrationLength ? storyWordLimitDetailed : storyWordLimitConcise}

🎭 **Narrative Markup (Optional - Use Sparingly):**

**Core Tags (Use only when they enhance readability):**
• \`[speaker:Name]dialogue[/speaker]\` → When someone speaks out loud
• \`[character]Name[/character]\` → To highlight an important character
• \`[highlight]text[/highlight]\` → For crucial information
• \`[br]\` → Line break to improve text flow

**Style Tags (Use occasionally):**
• \`[location]place[/location]\` → Important locations
• \`[time]moment[/time]\` → Time transitions
• \`[whisper]quiet text[/whisper]\` → Whispered speech

**Golden Rule:** Most of your narrative should be plain text without any markup. Only use tags when they genuinely improve the reading experience.

✅ **Good Examples:**
- The ancient [location]Tower of Mysteries[/location] loomed before them.
- [speaker:Marie]We should be careful here,[/speaker] she whispered.
- [character]Captain Jean[/character] nodded in agreement.

❌ **Avoid Over-Tagging:**
- [character]Marie[/character] [action]walked[/action] to the [location]door[/location] ← Too many tags!

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
