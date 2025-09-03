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
) => `🎯 **Story Progression Guidelines**

📖 **Narrative Development:**
Progress the story based on the action's success or failure with appropriate consequences. ${gameSettingsState.detailedNarrationLength ? storyWordLimitDetailed : storyWordLimitConcise}

🎭 **Action vs Dialogue Recognition:**
- **SPOKEN DIALOGUE:** Direct speech ('Je dis...', quotes, dialogue tags) → Use dialogue formatting
- **PHYSICAL/MENTAL ACTIONS:** What character DOES/THINKS → Use action description
- **MIXED ACTIONS:** Physical action + spoken words → Separate both elements
- **NARRATIVE DESCRIPTIONS:** Mentioning characters in narration → NO special tags needed

🚫 **Critical: Speaker Tag Usage Rules:**
- **[speaker:Name]** = ONLY when character actually SPEAKS
- **Narrative mentions** = NO tags (just normal text)

**✅ CORRECT Examples:**
- [speaker:Marie]Bonjour, comment allez-vous ?[/speaker] ← Marie is speaking
- Marie entra dans la pièce. ← Just describing Marie (NO tags)
- C'était sa mère, Marie, qui attendait près de la porte. ← Describing (NO tags)

**❌ WRONG Examples:**
- [speaker:Marie]sa mère, Marie[/speaker] ← This is description, not dialogue!
- [speaker:Marie]Marie entra[/speaker] ← This is action, not speech!

📚 **Narrative Formatting - Subtle Enhancement for Better Readability:**

Your narration should flow naturally like a well-formatted book, enhanced with discrete visual markers that improve reading comprehension without breaking immersion. Think of these as typographical refinements rather than rigid formatting rules.

✨ **Readability Enhancement Tags** (use sparingly and naturally):

• **[speaker:Name]dialogue[/speaker]** → When someone speaks, gently identify the speaker
  Example: [speaker:Marie]Je pense que tu as raison.[/speaker]

• **[highlight]important element[/highlight]** → For key information the reader should notice
  Example: The ancient [highlight]Codex of Shadows[/highlight] lay open on the table.

• **[location]place name[/location]** → Help readers orient themselves in space
  Example: They entered the [location]Grand Library of Astoria[/location].

• **[time]temporal indicator[/time]** → Mark time passage or important moments
  Example: [time]Three hours later[/time], the spell was finally complete.

• **[whisper]quiet words[/whisper]** → For hushed, secretive, or internal speech
  Example: [whisper]I don't think anyone saw us[/whisper], she breathed.

• **[emotion]feeling[/emotion]** → Subtle emotional context when it adds clarity
  Example: A wave of [emotion]profound relief[/emotion] washed over him.

• **[action]significant deed[/action]** → Important physical actions that drive the story
  Example: With deliberate precision, [action]she drew the ritual circle[/action].

• **[atmosphere]environmental mood[/atmosphere]** → Setting descriptions that establish tone
  Example: [atmosphere]The air grew thick with ancient magic and forgotten whispers.[/atmosphere]

• **[br]** → Break large text blocks into smaller paragraphs for easier reading
  Example: The ancient spell required precise concentration. Years of study had led to this moment.[br]As she began the incantation, the air itself seemed to hold its breath.

� **Example of Proper Markup Usage:**

The morning sun filtered through the ancient windows of [location]the Grand Library[/location]. Marie approached the ornate desk where an elderly librarian sat reading.

[speaker:Marie]Excuse me, do you have any books on temporal magic?[/speaker]

The librarian looked up, his eyes twinkling with interest. [speaker:Librarian]Ah, a dangerous subject indeed.[/speaker] He gestured toward a restricted section. [whisper]Most of those texts are kept under lock and key for good reason.[/whisper]

[time]Several minutes later[/time], Marie found herself before a massive tome bound in what appeared to be [highlight]starlight itself[/highlight]. As she opened it, [emotion]a chill of anticipation[/emotion] ran down her spine. The pages seemed to shimmer with otherworldly knowledge.

[action]She carefully traced the runic symbols[/action] with her finger, feeling the latent magic respond to her touch. [atmosphere]The air around her grew thick with temporal energy, and for a moment, she could swear she heard whispers from both past and future.[/atmosphere]

🚫 **Common Mistakes to Avoid:**
- **Redundant speaker names:** Don't use both [speaker:Name] and mention the name again in narrative
- **Over-tagging:** Most text should flow naturally without markup - use tags sparingly
- **Breaking dialogue flow:** Keep conversations natural, don't tag every line
- **Excessive highlighting:** Only highlight truly important story elements
- **SPEAKER TAGS FOR DESCRIPTIONS:** Never use [speaker:] for narrative descriptions or character mentions
- **NARRATION CONFUSION:** Simple character mentions in narration need NO special formatting

�💡 **Natural Integration Guidelines:**
- Most of your text should remain untagged (normal narrative flow)
- Use tags to enhance clarity, not to categorize every sentence
- **Break up large text blocks:** Use [br] to create smaller, digestible paragraphs instead of long walls of text
- Prioritize readability - if a tag doesn't improve understanding, skip it
- Think like an editor adding subtle formatting to help readers follow the story
- Maintain the natural rhythm and beauty of prose

🎯 **Quality Focus:** Your goal is to create an engaging narrative that reads smoothly while giving readers helpful visual cues for better comprehension and immersion.

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
