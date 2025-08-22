/**
 * Time consistency prompts and guidelines
 * Standardizes temporal handling across all agents
 */

/**
 * Core time management rules for all agents
 */
export const TIME_CONSISTENCY_PROMPT = `
TIME MANAGEMENT RULES:

🕐 REALISTIC DURATION
- Sleep: 6-8 hours (360-480 minutes), not 15-20 minutes
- Meals: 15-30 minutes for quick, 45-60 for formal
- Travel: Consider distance and terrain realistically
- Combat: 5-15 minutes for most encounters
- Conversations: 5-15 minutes for brief, 30+ for deep

⏰ CONTEXTUAL FACTORS
- Character condition affects action speed
- Environmental conditions impact duration
- Complexity of task determines time needed
- Interruptions and complications add time

📅 TEMPORAL CONSISTENCY
- Track day/night cycles accurately
- Maintain seasonal progression
- Consider fatigue accumulation over time
- Reference previous temporal context

🔄 NARRATIVE PACING
- Balance realism with story flow
- Use time passage to build tension
- Allow for natural rest and recovery periods
- Create meaningful temporal consequences
`;

/**
 * Detailed time guidelines by action category
 */
export const DETAILED_TIME_GUIDELINES = `
TIME GUIDELINES BY ACTIVITY:

💤 REST & RECOVERY
- Full night sleep: 360-480 minutes (6-8 hours)
- Short nap: 30-90 minutes
- Meditation/prayer: 15-60 minutes
- Resting between activities: 5-15 minutes

🍽️ EATING & DRINKING
- Quick snack: 5-10 minutes
- Regular meal: 20-30 minutes
- Formal feast: 60-120 minutes
- Drinks at tavern: 30-90 minutes

🚶 TRAVEL & MOVEMENT
- Walking in city: 2-5 minutes per district
- Cross-country travel: 6-8 hours per day
- Dungeon exploration: 10-30 minutes per room
- Climbing/swimming: Double normal movement time

⚔️ COMBAT & CONFLICT
- Brief skirmish: 3-8 minutes
- Standard combat: 8-15 minutes
- Epic boss battle: 15-30 minutes
- Large-scale battle: 30+ minutes

💬 SOCIAL INTERACTIONS
- Brief exchange: 2-5 minutes
- Standard conversation: 10-20 minutes
- Negotiation: 20-45 minutes
- Deep discussion: 30-90 minutes

🔍 INVESTIGATION & EXPLORATION
- Quick search: 5-15 minutes
- Thorough investigation: 30-60 minutes
- Research in library: 60-180 minutes
- Solving complex puzzle: 15-45 minutes

🛠️ CRAFTING & WORK
- Simple repair: 15-30 minutes
- Craft basic item: 60-180 minutes
- Complex creation: 4-8 hours
- Enchanting: 2-4 hours

🧙 MAGIC & RITUALS
- Simple spell: Instant to 1 minute
- Complex ritual: 15-60 minutes
- Major magical working: 2-8 hours
- Spell research: 4-12 hours
`;

/**
 * Temporal context builder for maintaining consistency
 */
export const TEMPORAL_CONTEXT_BUILDER = `
TEMPORAL CONTEXT INTEGRATION:

📋 BEFORE DETERMINING TIME:
1. Review recent history for established timeline
2. Consider character's current condition and fatigue
3. Assess environmental factors (weather, lighting, etc.)
4. Evaluate action complexity and potential complications

⚖️ TIME CALCULATION PROCESS:
1. Identify base time for action type
2. Apply modifiers for character condition
3. Consider environmental factors
4. Account for success/failure impact
5. Ensure consistency with established timeline

📊 CONSISTENCY CHECKS:
✓ Does this align with recent time passages?
✓ Are day/night cycles maintained?
✓ Is fatigue accumulation realistic?
✓ Do time jumps make narrative sense?
✓ Will this create scheduling conflicts?

🔄 TEMPORAL CONSEQUENCES:
- Track cumulative fatigue over long periods
- Consider meal timing and hunger effects
- Account for sleep deprivation impacts
- Maintain realistic healing timeframes
`;

/**
 * Helper for extracting time from previous context
 */
export const TIME_CONTEXT_EXTRACTION = `
EXTRACTING TEMPORAL CONTEXT:

🔍 LOOK FOR:
- Previous time_passed_minutes values
- Day/night cycle references
- Seasonal or weather mentions
- Character fatigue indicators
- Recent meal or rest references

📝 INTEGRATE BY:
- Adding new time to previous timestamps
- Maintaining established daily schedules
- Respecting character's natural rhythms
- Preserving narrative temporal flow

⚠️ RED FLAGS:
- Sudden major time jumps without explanation
- Activities taking unrealistic durations
- Ignoring established schedules or appointments
- Breaking day/night cycle consistency
`;

/**
 * Time validation checklist
 */
export const TIME_VALIDATION_CHECKLIST = `
TIME VALIDATION CHECKLIST:

✅ REALISM CHECK:
□ Duration appropriate for action complexity
□ Character condition impacts considered
□ Environmental factors accounted for
□ Success/failure affects time appropriately

✅ CONSISTENCY CHECK:
□ Aligns with recent timeline
□ Maintains day/night progression
□ Respects established schedules
□ Considers cumulative fatigue

✅ NARRATIVE CHECK:
□ Supports story pacing
□ Creates appropriate tension
□ Allows for character needs
□ Enables meaningful consequences

✅ TECHNICAL CHECK:
□ time_passed_minutes is realistic number
□ time_passed_explanation references guidelines
□ Temporal context preserved in story
□ Timeline markers included where relevant
`;

/**
 * Emergency time fallbacks for edge cases
 */
export const TIME_EMERGENCY_FALLBACKS = `
EMERGENCY TIME HANDLING:

🚨 IF UNCERTAIN:
- Default to conservative estimates
- Reference similar previous actions
- Consider "average case" scenarios
- Document assumptions for consistency

🔧 QUICK ESTIMATES:
- Simple actions: 5-15 minutes
- Complex actions: 15-45 minutes
- Major undertakings: 1-4 hours
- Epic endeavors: 4+ hours

⚡ WHEN IN DOUBT:
1. Check recent history for patterns
2. Use middle-range estimates
3. Explain reasoning clearly
4. Maintain established rhythms
`;

/**
 * Helper function to build time context string
 */
export const buildTimeContext = (
  actionType: string,
  complexity: 'simple' | 'standard' | 'complex' | 'epic',
  characterCondition: 'fresh' | 'tired' | 'exhausted',
  environmentalFactors: string[] = []
): string => {
  return `
TIME CONTEXT FOR ${actionType.toUpperCase()}:
- Action complexity: ${complexity}
- Character condition: ${characterCondition}
- Environmental factors: ${environmentalFactors.join(', ') || 'none'}
- Apply appropriate guidelines from TIME_GUIDELINES
- Ensure consistency with recent timeline
- Document reasoning in time_passed_explanation
`;
};
