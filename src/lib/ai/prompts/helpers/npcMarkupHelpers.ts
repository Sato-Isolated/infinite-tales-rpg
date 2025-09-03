/**
 * NPC Context Injection Utilities
 * 
 * Provides helper functions to inject NPC context and markup validation
 * into AI prompts for consistent character reference handling
 */

import type { NPCState } from '$lib/ai/agents/characterStatsAgent';
import { createNPCUuidResolver } from '$lib/components/narrative/npcUuidResolver';

/**
 * Generate NPC context section for AI prompts
 */
export function generateNPCContextForPrompt(npcState: NPCState): string {
  const resolver = createNPCUuidResolver(npcState);
  return resolver.getNPCContextForAI();
}

/**
 * Generate complete markup reference guide
 */
export function generateMarkupReferenceGuide(npcState?: NPCState): string {
  const npcContext = npcState ? generateNPCContextForPrompt(npcState) : '';

  return `📚 **Complete Narrative Markup Reference Guide**

✨ **Available Markup Tags** (use sparingly and naturally):

• **[speaker:Name]dialogue[/speaker]** → When someone speaks (identify the speaker)
  Example: [speaker:Marie]Je pense que tu as raison.[/speaker]

• **[character:uuid]character reference[/character]** → NPC mentions using UUID
  Example: [character:npc_001]approached the mysterious figure[/character]
  ⚠️ **CRITICAL: ONLY use UUIDs of NPCs listed below in the Available NPCs section**
  ⚠️ **If an NPC is not listed, DO NOT use character markup - use plain text instead**

• **[highlight]important element[/highlight]** → Key information the reader should notice
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

• **[thought]internal monologue[/thought]** → Character's inner thoughts
  Example: [thought]This doesn't feel right[/thought], he mused silently.

• **[transition]** → Scene breaks and major transitions
  Example: [transition]

• **[br]** → Break large text blocks into smaller paragraphs for easier reading
  Example: The ancient spell required precise concentration.[br]As she began the incantation...

• **[status:success/warning/error]text[/status]** → Game state indicators
  Example: [status:success]The spell succeeded brilliantly![/status]

• **[badge]temporary effect[/badge]** → Temporary status effects
  Example: [badge]Blessed[/badge]

${npcContext}

🚫 **Critical Validation Rules:**

1. **Speaker Tags:** [speaker:Name] = ONLY when character actually SPEAKS + MUST have closing tag
   ✅ [speaker:Marie]Bonjour![/speaker] ← Marie is speaking with proper closing tag
   ❌ [speaker:Marie]Marie entered[/speaker] ← This is action, not speech!
   ❌ [speaker:Marie]Bonjour! ← MISSING [/speaker] closing tag!

2. **Character Tags:** Use UUIDs, not names - AND ONLY FOR REGISTERED NPCs + MUST have closing tag
   ✅ [character:npc_001]approached cautiously[/character] ← Valid UUID with closing tag
   ❌ [character:Marie]approached cautiously[/character] ← Use UUID, not name!
   ❌ [character:fenrir]mysterious figure[/character] ← UUID not in Available NPCs list!
   ❌ [character:npc_001]approached cautiously ← MISSING [/character] closing tag!
   ✅ The mysterious figure approached ← Use plain text for unregistered characters

3. **ALL MARKUP TAGS MUST BE PROPERLY CLOSED:**
   ✅ [highlight]text[/highlight] ← Proper opening and closing
   ✅ [location]place[/location] ← Proper opening and closing
   ❌ [highlight]text ← MISSING closing tag [/highlight]
   ❌ [location]place ← MISSING closing tag [/location]

3. **ALL MARKUP TAGS MUST BE PROPERLY CLOSED:**
   ✅ [highlight]text[/highlight] ← Proper opening and closing
   ✅ [location]place[/location] ← Proper opening and closing
   ❌ [highlight]text ← MISSING closing tag [/highlight]
   ❌ [location]place ← MISSING closing tag [/location]

4. **Case Sensitivity:** ALL markup tags must be lowercase
   ✅ [time]Three hours later[/time] ← Correct lowercase
   ❌ [Time]Three hours later[/Time] ← WRONG - uppercase will be flagged as invalid!
   ❌ [Speaker:Marie]Hello[/Speaker] ← WRONG - use lowercase [speaker:Marie]

5. **Unknown Tags:** Only use tags from the approved list above
   ❌ [custom:something] ← This will be flagged as invalid

6. **Length Limits:** Keep markup content concise and focused
   ✅ [highlight]Ancient Codex[/highlight] ← Short, specific
   ❌ [highlight]The ancient tome lay open on the marble table, its yellowed pages filled with arcane symbols and mysterious incantations that seemed to glow with their own inner light[/highlight] ← Too long!
   
   **Recommended lengths:**
   • [speaker] dialogue: 1-3 sentences maximum
   • [highlight]: 1-5 words for key terms/items
   • [location]: 1-4 words for place names
   • [time]: 1-6 words for temporal markers
   • [emotion]: 1-3 words for feelings
   • [action]: 1-2 sentences for significant actions
   • [atmosphere]: 1-2 sentences maximum

6. **Length Limits:** Keep markup content concise and focused
   ✅ [highlight]Ancient Codex[/highlight] ← Short, specific
   ❌ [highlight]The ancient tome lay open on the marble table, its yellowed pages filled with arcane symbols and mysterious incantations that seemed to glow with their own inner light[/highlight] ← Too long!
   
   **Recommended lengths:**
   • [speaker] dialogue: 1-3 sentences maximum
   • [highlight]: 1-5 words for key terms/items
   • [location]: 1-4 words for place names
   • [time]: 1-6 words for temporal markers
   • [emotion]: 1-3 words for feelings
   • [action]: 1-2 sentences for significant actions
   • [atmosphere]: 1-2 sentences maximum

7. **Natural Flow:** Most text should remain untagged
   - Use tags to enhance clarity, not to categorize every sentence
   - Think like an editor adding subtle formatting to help readers
   - **Rule of thumb:** Less than 20% of your text should be inside markup tags

8. **NEW CHARACTER RULE:** Only use [character:uuid] for NPCs listed in Available NPCs section
   - If introducing a new character NOT in the list, use plain text only
   - New characters will be automatically registered by the system
   - Do NOT create character markup for unregistered NPCs

💡 **Quality Guidelines:**
- Most of your text should flow naturally without markup
- Use tags sparingly to enhance readability, not overwhelm
- Break up large text blocks with [br] for better readability
- Prioritize story flow over technical formatting
- **Keep individual markup segments short and focused**`;
}

/**
 * Validate if markup tags are allowed
 */
export function validateMarkupTags(text: string): {
  isValid: boolean;
  errors: string[];
  suggestions: string[];
} {
  const validTags = new Set([
    'speaker', 'character', 'highlight', 'location', 'time', 'whisper',
    'br', 'emotion', 'action', 'atmosphere', 'transition', 'thought',
    'status', 'badge'
  ]);

  const errors: string[] = [];
  const suggestions: string[] = [];

  // Find all markup tags in the text
  const tagMatches = text.match(/\[([a-zA-Z]+)(?::[^\]]+)?\]/g);

  if (tagMatches) {
    const foundTags = new Set<string>();

    tagMatches.forEach(match => {
      const tagName = match.match(/\[([a-zA-Z]+)/)?.[1];
      if (tagName) {
        foundTags.add(tagName);
        if (!validTags.has(tagName)) {
          errors.push(`Unknown markup tag: [${tagName}]`);
        }
      }
    });

    // Provide suggestions for common mistakes
    foundTags.forEach(tag => {
      if (!validTags.has(tag)) {
        // Check for case sensitivity issues
        const lowercaseTag = tag.toLowerCase();
        if (validTags.has(lowercaseTag)) {
          suggestions.push(`Did you mean [${lowercaseTag}] instead of [${tag}]? (tags are case-sensitive)`);
        } else if (tag.includes('name') || tag.includes('char')) {
          suggestions.push(`Did you mean [character:uuid] instead of [${tag}]?`);
        } else if (tag.includes('say') || tag.includes('talk')) {
          suggestions.push(`Did you mean [speaker:Name] instead of [${tag}]?`);
        }
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    suggestions
  };
}
