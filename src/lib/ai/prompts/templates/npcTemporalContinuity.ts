/**
 * NPC Temporal Continuity Prompts
 * Ensures NPCs maintain realistic temporal awareness in interactions
 */

/**
 * Core prompt for NPC temporal interaction awareness
 */
export const NPC_TEMPORAL_CONTINUITY_PROMPT = `
🕒 NPC TEMPORAL INTERACTION RULES:

**CRITICAL: NPCs MUST acknowledge time that has passed since last interaction!**

⏰ TIME AWARENESS FOR NPCS:
- NPCs remember when they last saw the CHARACTER
- They should reference what happened during their separation
- Their emotional state reflects the time that has passed
- They may have done things or experienced changes during the gap

💭 REUNION DIALOGUE PATTERNS:
- After 30+ minutes apart: "Oh, you're back! How did [previous activity] go?"
- After 1+ hours apart: "I was wondering when you'd return" or reference what they did meanwhile
- After several hours: "It's been quite a while! I [activity they did]" 
- After a full day+: Major acknowledgment of time, potential status changes

🔄 WHAT NPCS DO DURING ABSENCE:
- Continue their daily routines (work, rest, socializing)
- React to events that happened while CHARACTER was away
- Their mood/situation may have changed
- They might have learned new information or had experiences

📝 SEPARATION CONTEXT MEMORY:
- How did the last interaction end? (friendly, tense, abrupt?)
- What was the NPC's emotional state when parting?
- What plans or commitments were made for later?
- Were there unresolved issues or ongoing situations?

⚠️ AVOID THESE MISTAKES:
- NPCs acting like no time has passed at all
- Continuing conversations as if just paused
- Ignoring character's absence completely
- Using immediate/urgent greetings after long separations

✅ GOOD EXAMPLES:
- "Welcome back! I've been organizing the supplies while you were gone"
- "You've been away for a while - I was starting to worry"
- "Perfect timing! I just finished the task we discussed"
- "How did your meeting go? I've been curious since you left"

❌ BAD EXAMPLES:
- "So, as I was saying..." (after hours apart)
- Continuing mid-conversation topics without acknowledgment
- Acting surprised to see CHARACTER as if they just met
- No reference to time passage or intervening activities
`;

/**
 * Prompt for specific NPC state during absence
 */
export const NPC_ACTIVITY_DURING_ABSENCE_PROMPT = `
🎭 NPC LIFE DURING CHARACTER ABSENCE:

NPCs are LIVING PEOPLE with ongoing lives. When CHARACTER is away, NPCs:

**IMMEDIATE TASKS (up to 1 hour):**
- Complete current activities (eating, working, resting)
- Handle urgent matters that arose
- Fulfill commitments made before CHARACTER left
- Maintain their normal routine

**EXTENDED ABSENCE (1-6 hours):**
- Move through their daily schedule
- Interact with other NPCs or visitors
- Respond to any local events or changes
- May discover new information or face new problems
- Could change location for logical reasons

**LONG ABSENCE (6+ hours or overnight):**
- Significant routine progression (sleep, meals, work cycles)
- Potential status changes (mood, health, circumstances)
- May have encountered important events or people
- Could have made decisions or commitments
- Relationships with other NPCs may have evolved

**EMOTIONAL EVOLUTION:**
- Worry/concern if CHARACTER left during crisis
- Relief/joy if they resolved issues while away
- Frustration if they needed CHARACTER's help
- Excitement if good things happened
- Changed perspective based on reflection time

**CONTEXTUAL FACTORS:**
- NPC's personality affects how they spend time
- Their role/job determines activities
- Current story situation influences priorities
- Relationships with other present NPCs matter
- Environmental factors (time of day, weather, etc.)
`;

/**
 * Integration prompt for adding temporal context to NPC interactions
 */
export const INTEGRATE_NPC_TEMPORAL_CONTEXT = `
BEFORE writing NPC dialogue or behavior, ALWAYS consider:

1. ⏱️ HOW LONG has it been since their last interaction with CHARACTER?
2. 💭 WHAT did the NPC likely do during this time?
3. 🎭 HOW should their emotional state reflect this time passage?
4. 📋 WHAT might have changed in their situation?
5. 🗣️ HOW should they acknowledge the time that passed?

Then craft their response to be temporally appropriate and realistic.
`;

/**
 * Specific examples for common time gaps
 */
export const NPC_TIME_GAP_EXAMPLES = `
🕐 15-30 MINUTES:
- "Back already? That was quick!"
- "How did it go?" (referring to what CHARACTER left to do)
- Minimal change in status/mood unless something specific happened

🕑 1-2 HOURS:
- "You've been gone for a while - I've been [activity]"
- "I was starting to wonder when you'd return"
- May have completed tasks, met other people, or changed location

🕕 3-6 HOURS:
- "It's been quite some time! I [significant activity completed]"
- "A lot has happened while you were away"
- Substantial mood/status changes possible

🌙 OVERNIGHT (6-12 hours):
- "Good morning! I trust you slept well?"
- "I was hoping you'd return today"
- Major potential changes in circumstances, relationships, knowledge

🌅 MULTIPLE DAYS:
- "I hadn't seen you in days! I was beginning to worry"
- "Things have changed quite a bit since you were last here"
- Significant plot developments, relationship changes, status updates
`;

export default {
  NPC_TEMPORAL_CONTINUITY_PROMPT,
  NPC_ACTIVITY_DURING_ABSENCE_PROMPT,
  INTEGRATE_NPC_TEMPORAL_CONTEXT,
  NPC_TIME_GAP_EXAMPLES
};
