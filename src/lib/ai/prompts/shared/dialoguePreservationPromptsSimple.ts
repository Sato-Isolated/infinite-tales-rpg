/**
 * Dialogue Preservation Prompts - Simplified Version
 * Clear and intuitive guidance for action vs dialogue distinction
 */

/**
 * Simple and clear prompt for distinguishing actions from dialogue
 */
export const ACTION_DIALOGUE_DISTINCTION_PROMPT = `
🎯 ACTION vs DIALOGUE - Simple Understanding

🗣️ DIALOGUE = What the character SAYS out loud
   • Words spoken to other characters
   • Can be in quotes: "Hello" or described: "je dis bonjour"  
   • Format as spoken dialogue with character name

🎬 ACTION = What the character DOES physically/mentally  
   • Physical movements, transformations, gestures
   • Mental states, thoughts, magical effects
   • Format as action description

🔍 Key Questions to Ask:
   • Is this something that would be HEARD by other characters? → DIALOGUE
   • Is this something that would be SEEN or FELT? → ACTION
   • Does it involve the character's mouth/voice? → Probably DIALOGUE  
   • Does it involve the character's body/mind/magic? → Probably ACTION

✅ Simple Examples:
   • "je dis bonjour" → DIALOGUE (speaking)
   • "mes yeux brillent" → ACTION (physical change)
   • "j'explique la situation" → DIALOGUE (explaining is speaking)
   • "je me lève" → ACTION (physical movement)
   • "je lui demande son nom" → DIALOGUE (asking is speaking)
   • "mes pupilles se fendis" → ACTION (physical transformation)

🎯 Mixed Input: If both action AND dialogue, show both:
   • "je me lève et dis bonjour" → Action description + Dialogue

That's it. Keep it natural and intuitive.
`;

/**
 * User's specific patterns for clarity
 */
export const USER_DIALOGUE_PATTERNS = `
🎯 User's Simple Dialogue System

📝 Text in quotes ("", '', <<>>) = Preserve exactly as dialogue
📝 Communication without quotes = Generate appropriate dialogue  
📝 Physical descriptions = Action description only

Examples:
• "je dis 'bonjour'" → Preserve "bonjour" exactly
• "j'explique comment ça marche" → Generate explanation dialogue
• "mes yeux brillent" → Action description only

Follow the user's clear intent.
`;

/**
 * Core dialogue preservation for exact quotes
 */
export const EXACT_DIALOGUE_PRESERVATION_PROMPT = `
🎯 PRESERVE EXACT DIALOGUE

When user puts text in quotes, preserve it exactly:
• Don't paraphrase or change the words
• Don't add emotions not mentioned
• Keep the exact tone and style
• Format as proper dialogue with character name

Simple rule: Respect the user's exact words when quoted.
`;

/**
 * Creative dialogue generation for non-quoted communication
 */
export const CREATIVE_DIALOGUE_GENERATION_PROMPT = `
🎨 GENERATE CREATIVE DIALOGUE

When user describes communication without quotes:
• Create appropriate dialogue based on context
• Make it natural and fitting for the situation
• Consider character personality and setting
• Generate realistic conversation

Example: "j'explique la situation" → Generate realistic explanation dialogue
`;

/**
 * Anti-confusion safeguards
 */
export const ANTI_CONFUSION_PROMPT = `
🛡️ Simple Safeguards

Before processing, ask yourself:
• Is this describing speech or physical action?
• Are there quotes to preserve exactly?
• Does this need dialogue generation?

When in doubt:
• Speech-related = dialogue
• Body/mind-related = action
• Quotes = preserve exactly
• No quotes but communication = generate dialogue
`;

/**
 * Integration for game agents
 */
export const GAME_AGENT_INTEGRATION = `
🔗 Simple Integration

1. Read user input
2. Identify: Action, Dialogue, or Mixed
3. Format appropriately
4. Continue with story

Keep it natural and follow user intent.
`;
