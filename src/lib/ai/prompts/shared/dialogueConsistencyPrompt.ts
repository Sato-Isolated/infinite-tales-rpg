/**
 * Dialogue Consistency and Anti-Repetition Prompt
 * Prevents NPCs and characters from repeating dialogues that have already occurred
 */

export const DIALOGUE_CONSISTENCY_PROMPT = `
🗣️ DIALOGUE CONSISTENCY RULES:

CRITICAL: Before writing any character dialogue, carefully review the PAST STORY PLOT and conversation history to ensure you do NOT repeat any dialogue that has already been spoken.

1. 🚫 FORBIDDEN REPETITIONS:
   - Never repeat the exact same dialogue lines that have been said before
   - Never repeat similar dialogue content even if worded slightly differently
   - Avoid repeating the same information, stories, or explanations
   - Don't have characters ask questions they've already asked
   - Avoid repeated exposition about the same topics
   - NEVER generate the same dialogue content twice in a single story response

2. ✅ ACCEPTABLE DIALOGUE PATTERNS:
   - Brief acknowledgments ("Yes", "I understand", "Agreed")
   - Character-specific catchphrases or verbal tics (if established)
   - Referencing past conversations ("As I mentioned earlier...")
   - Evolved perspectives on previously discussed topics

3. 🎭 CHARACTER MEMORY:
   - Characters remember what they've said and discussed before
   - They should build upon previous conversations, not restart them
   - If revisiting a topic, approach it from a new angle or with new information
   - Characters can change their opinions or add details, but not repeat identically

4. 🔄 DIALOGUE EVOLUTION:
   - Each conversation should advance relationships or reveal new information
   - Characters should react to recent events and changes in their situation
   - Dialogue should reflect character growth and story progression

5. 📝 BEFORE WRITING DIALOGUE:
   - Check: "Has this character said something similar before?"
   - Check: "Does this dialogue add new value to the conversation?"
   - Check: "Is this character reacting appropriately to recent events?"
   - Check: "Would this character realistically repeat this information?"
   - Check: "Am I about to write dialogue that already appears earlier in this response?"

6. 🔄 SINGLE-RESPONSE REPETITION PREVENTION:
   - NEVER repeat dialogue within the same story response
   - If a character says something, they should not say it again in the same scene
   - Ensure each line of dialogue serves a unique purpose in the narrative

IF UNCERTAIN about whether dialogue might be repetitive, err on the side of creating fresh, new dialogue that advances the story or relationships.
`;

export const DIALOGUE_MEMORY_CHECK = `
🧠 DIALOGUE MEMORY VERIFICATION:

Before generating any character speech, perform this mental check:

1. SCAN RECENT HISTORY: What has this character recently said?
2. IDENTIFY TOPICS: What subjects have been discussed?
3. CHECK REDUNDANCY: Would this dialogue repeat previous information?
4. FIND FRESH ANGLE: How can I approach this topic differently?
5. VALIDATE PROGRESSION: Does this dialogue move the story forward?

Remember: Characters are living beings with memory - they don't repeat themselves unless there's a compelling narrative reason.
`;

export const DIALOGUE_QUALITY_GUIDELINES = `
📋 HIGH-QUALITY DIALOGUE STANDARDS:

✅ GOOD DIALOGUE:
- Reveals character personality or background
- Advances the plot or relationships
- Responds to recent events or changes
- Feels natural and contextually appropriate
- Adds new information or perspective

❌ POOR DIALOGUE:
- Repeats information already shared
- Ignores recent story developments
- Feels mechanical or formulaic
- Provides no new value to the narrative
- Contradicts established character memory

🎯 GOAL: Every line of dialogue should serve a purpose and feel fresh within the established narrative context.
`;
