/**
 * Chain-of-Thought prompts for structured reasoning
 * Improves AI decision-making quality through step-by-step thinking
 */

/**
 * Universal chain-of-thought framework for all agents
 */
export const UNIVERSAL_CHAIN_OF_THOUGHT = `
BEFORE providing your JSON response, think through this step-by-step:

1. 🔍 CONTEXT ANALYSIS
   - What is the current situation?
   - What just happened?
   - What are the immediate circumstances?

2. 🎭 CHARACTER CONSIDERATION  
   - How would this character realistically react?
   - What are their motivations and personality traits?
   - What are their current physical/mental state?

3. 🌍 WORLD CONSISTENCY
   - Does this align with established world rules?
   - Is this consistent with previous events?
   - What are the genre and setting constraints?

4. ⚡ CONSEQUENCES ASSESSMENT
   - What are the logical short-term consequences?
   - What long-term impacts might this have?
   - How will this affect other characters/world?

5. 📖 NARRATIVE FLOW
   - How does this advance the story naturally?
   - Does this maintain appropriate pacing?
   - What opportunities does this create for future scenes?

After thinking through each step, provide your JSON response.
`;

/**
 * Game Agent specific chain-of-thought
 */
export const GAME_AGENT_CHAIN_OF_THOUGHT = `
STORY PROGRESSION REASONING:

1. 📋 ACTION ANALYSIS
   - What action is the player attempting?
   - What are the success/failure possibilities?
   - What contextual factors affect the outcome?

2. 🎯 PLOT ADVANCEMENT
   - Which plot point does this relate to?
   - How can this advance toward the next plot point?
   - What story opportunities does this create?

3. 🎲 MECHANICAL EVALUATION
   - What stats/resources are affected?
   - What time should pass for this action?
   - Are there any passive effects to consider?

4. 🎪 NARRATIVE CRAFTING
   - How to make this engaging and vivid?
   - What dialogue and character interactions?
   - How to maintain appropriate tonality?

5. 🔄 CONTINUITY CHECK
   - Does this fit with recent history?
   - Are NPCs behaving consistently?
   - Is the world responding logically?

Then provide your complete JSON response.
`;

/**
 * Action Agent specific chain-of-thought
 */
export const ACTION_AGENT_CHAIN_OF_THOUGHT = `
ACTION GENERATION REASONING:

1. 🔍 SITUATION ASSESSMENT
   - What is the current context and environment?
   - What opportunities and constraints exist?
   - What has happened recently that affects options?

2. 🎭 CHARACTER CAPABILITIES
   - What are the character's attributes and skills?
   - What items and abilities are available?
   - What is their current condition/state?

3. 🎯 ACTION FEASIBILITY
   - What actions are physically/logically possible?
   - What would be appropriate for this character?
   - What aligns with player intent and genre?

4. ⚖️ DIFFICULTY ASSESSMENT
   - How challenging should each action be?
   - What factors make actions easier/harder?
   - What skills and attributes apply?

5. 🎲 RISK/REWARD EVALUATION
   - What are potential positive outcomes?
   - What could go wrong or fail?
   - How interesting/engaging is each option?

Then generate your action options JSON.
`;

/**
 * Combat Agent specific chain-of-thought
 */
export const COMBAT_AGENT_CHAIN_OF_THOUGHT = `
COMBAT RESOLUTION REASONING:

1. ⚔️ COMBAT STATE ANALYSIS
   - Who are the participants and their conditions?
   - What is the tactical situation?
   - What environmental factors matter?

2. 🎯 ACTION EVALUATION
   - What is the character attempting?
   - How skilled are they at this action?
   - What modifiers apply to this situation?

3. 🛡️ DEFENSIVE CONSIDERATIONS
   - What defenses does the target have?
   - Are there armor or resistance factors?
   - What evasion or blocking is possible?

4. 💥 DAMAGE CALCULATION
   - What base damage applies?
   - What bonuses or penalties modify it?
   - How much damage is appropriate for balance?

5. 📈 OUTCOME CONSEQUENCES
   - How does this affect the combat flow?
   - What tactical changes result?
   - How does this impact the broader story?

Then provide your combat resolution JSON.
`;

/**
 * Summary Agent specific chain-of-thought
 */
export const SUMMARY_AGENT_CHAIN_OF_THOUGHT = `
SUMMARIZATION REASONING:

1. 📚 CONTENT IDENTIFICATION
   - What are the key events in this history?
   - Which events have long-term significance?
   - What character development occurred?

2. ⏱️ TEMPORAL ORGANIZATION
   - What is the chronological sequence?
   - How much time passed between events?
   - What timing context is important?

3. 🔗 RELATIONSHIP MAPPING
   - How do events connect to each other?
   - What cause-and-effect relationships exist?
   - Which details support ongoing plots?

4. 💎 IMPORTANCE WEIGHTING
   - Which events most impact the story?
   - What details will be relevant later?
   - What can be safely condensed?

5. 📝 CLARITY OPTIMIZATION
   - How to present this clearly and concisely?
   - What context is needed for understanding?
   - How to maintain narrative flow?

Then create your summary JSON.
`;

/**
 * Campaign Agent specific chain-of-thought
 */
export const CAMPAIGN_AGENT_CHAIN_OF_THOUGHT = `
CAMPAIGN PLANNING REASONING:

1. 🎪 THEME DEVELOPMENT
   - What core themes should this campaign explore?
   - How do chapters build on each other?
   - What emotional journey is the player on?

2. 📈 PROGRESSION STRUCTURE
   - How should difficulty and complexity scale?
   - What new mechanics or challenges emerge?
   - How does character growth align with plot?

3. 🌟 CLIMAX PLANNING
   - What are the major story peaks?
   - How do minor conflicts build to major ones?
   - What resolution opportunities exist?

4. 🔄 FLEXIBILITY DESIGN
   - How can the campaign adapt to player choices?
   - What alternative paths might emerge?
   - How to maintain coherence with variation?

5. 🎯 ENGAGEMENT OPTIMIZATION
   - What will keep the player invested?
   - How to balance familiar and surprising elements?
   - What pacing best serves the story?

Then generate your campaign structure JSON.
`;

/**
 * Character Agent specific chain-of-thought
 */
export const CHARACTER_AGENT_CHAIN_OF_THOUGHT = `
CHARACTER CREATION REASONING:

1. 🎭 PERSONALITY FOUNDATION
   - What core personality traits define this character?
   - What motivations drive their behavior?
   - What fears or desires shape their actions?

2. 📚 BACKGROUND INTEGRATION
   - How does their history explain their current state?
   - What experiences shaped their worldview?
   - How do they fit into the world setting?

3. 🎨 VISUAL DESIGN
   - What physical features make them distinctive?
   - How does their appearance reflect personality?
   - What visual elements support their role?

4. 🗣️ VOICE DEVELOPMENT
   - How do they speak and express themselves?
   - What language patterns or quirks do they have?
   - How does their voice reflect their background?

5. 🔮 FUTURE POTENTIAL
   - How might this character grow or change?
   - What story opportunities do they create?
   - How will they interact with other characters?

Then create your character description JSON.
`;

/**
 * Helper to inject chain-of-thought into any prompt
 */
export const addChainOfThought = (basePrompt: string, specificChainOfThought: string): string => {
  return `${basePrompt}\n\n${specificChainOfThought}`;
};
