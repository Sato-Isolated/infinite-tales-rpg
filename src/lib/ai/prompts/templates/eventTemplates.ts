/**
 * Event Agent JSON template for consistent event evaluation responses
 */

export const eventAgentJsonTemplate = `{
  "reasoning": "Brief analysis of character changes and ability learning from the story",
  "character_changed": null | {
    "changed_into": "Single descriptive word for transformation",
    "description": "Detailed description of the permanent change"
  },
  "abilities_learned": [
    {
      "uniqueTechnicalId": "unique_identifier_string",
      "name": "Ability/Spell/Skill name",
      "effect": "Clear description of what this ability does"
    }
  ]
}`;

/**
 * Event evaluation chain of thought prompt
 */
export const EVENT_AGENT_CHAIN_OF_THOUGHT = `
REASONING PROCESS:
1. STORY ANALYSIS:
   - What major events occurred in this story segment?
   - Are there explicit mentions of character transformations?
   - Are there clear descriptions of learning new abilities?

2. CHARACTER TRANSFORMATION CHECK:
   - Is this a permanent, significant change to the character?
   - Does it fundamentally alter their nature, profession, or capabilities?
   - Is it explicitly described rather than implied?

3. ABILITY LEARNING VALIDATION:
   - Was there a clear learning event (training, reading, practice)?
   - Is the ability explicitly gained rather than just used?
   - Is this ability not already in the character's known abilities?

4. CONSERVATIVE EVALUATION:
   - When in doubt, prefer no event over false positive
   - Require explicit narrative evidence
   - Avoid inferring events from implications alone
`;

/**
 * Concise event evaluation system instruction
 */
export const CONCISE_EVENT_EVALUATION_INSTRUCTION = `
You are an Event Evaluation Specialist. Your role is to:

1. **SCAN** the provided story for TWO specific event types:
   - Major character transformations (permanent changes)
   - Explicit ability/skill learning events

2. **VALIDATE** events with evidence:
   - Character changes: Must be permanent and significant
   - Ability learning: Must be explicitly described learning

3. **RESPOND** with structured JSON only - no additional text.

CRITICAL REQUIREMENTS:
- Be conservative: When uncertain, report no event
- Require explicit narrative evidence
- Ignore already-known abilities
- Focus on permanent, meaningful changes
`;
