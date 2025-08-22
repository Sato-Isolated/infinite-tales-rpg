/**
 * Reusable JSON templates and instructions
 * Standardizes JSON formatting across all agents
 */

/**
 * Creates a standardized JSON instruction with validation rules
 */
export const createJsonInstruction = (schema: string) => `
CRITICAL: Respond ONLY with valid JSON in this exact format:
${schema}

JSON RULES:
- No additional text, explanations, or formatting outside JSON
- All JSON keys must remain in English
- Enum values must be in UPPERCASE (LOW, MEDIUM, HIGH, etc.)
- Validate structure before responding
- Use null for optional empty fields
`;

/**
 * Base JSON validation rules shared across all agents
 */
export const JSON_VALIDATION_RULES = `
JSON VALIDATION CHECKLIST:
✓ Valid JSON syntax (proper quotes, brackets, commas)
✓ All required fields present
✓ Field types match specification (string, number, boolean, array, object)
✓ Enum values in correct UPPERCASE format
✓ No extra or missing fields
`;

/**
 * Game Agent JSON template with all required fields
 */
export const gameAgentJsonTemplate = `{
  "currentPlotPoint": "VALUE MUST BE ALWAYS IN ENGLISH; Brief reasoning - PLOT_ID: {plotId}",
  "gradualNarrativeExplanation": "Reasoning how story development is broken into meaningful moments",
  "plotPointAdvancingNudgeExplanation": "VALUE MUST BE ALWAYS IN ENGLISH; CURRENT_PLOT_ID: X; NEXT_PLOT_ID: Y; {Reasoning}",
  "story": "Rich narrative with HTML formatting using DaisyUI classes",
  "story_memory_explanation": "Long-term impact explanation - LONG_TERM_IMPACT: LOW|MEDIUM|HIGH",
  "image_prompt": "Detailed scene description for image generation",
  "xpGainedExplanation": "Why CHARACTER gains/doesn't gain XP",
  "time_passed_minutes": "Number (realistic duration based on guidelines)",
  "time_passed_explanation": "Brief explanation referencing time guideline category",
  "initial_game_time": "ONLY FOR INITIAL SETUP: Complete time object with day, month, year, etc.",
  "stats_update": "Array of stat changes with proper format",
  "inventory_update": "Array of item additions/removals",
  "is_character_in_combat": "Boolean",
  "is_character_restrained_explanation": "String or null",
  "currently_present_npcs_explanation": "Explanation for NPC presence",
  "currently_present_npcs": "NPC targeting object"
}`;

/**
 * Action Agent JSON template
 */
export const actionAgentJsonTemplate = `{
  "characterName": "Player character name",
  "plausibility": "Brief explanation (max 20 words)",
  "text": "Action description (max 20 words)",
  "type": "Misc|Attack|Spell|Conversation|Social_Manipulation|Investigation|Travel|Crafting",
  "related_attribute": "Exact attribute from provided list",
  "existing_related_skill_explanation": "If existing skill used instead of new",
  "related_skill": "Single skill for dice roll",
  "difficulty_explanation": "Reasoning for difficulty (max 20 words)",
  "action_difficulty": "TRIVIAL|EASY|MEDIUM|HARD|VERY_HARD|NEARLY_IMPOSSIBLE",
  "is_possible": "Boolean",
  "resource_cost": "Object or null",
  "narration_details": "Object with reasoning and enum_english (LOW|MEDIUM|HIGH)",
  "actionSideEffects": "Environmental/NPC reaction reasoning",
  "enemyEncounterExplanation": "Object with reasoning and probability enum",
  "is_interruptible": "Object with reasoning and probability enum",
  "dice_roll": "Object with modifier details"
}`;

/**
 * Summary Agent JSON template
 */
export const summaryAgentJsonTemplate = `{
  "keyDetails": "Array of important story elements to preserve",
  "story": "Chronological summary emphasizing long-term impact events",
  "timelineEvents": "Array of events with temporal context"
}`;

/**
 * Character Agent JSON template
 */
export const characterAgentJsonTemplate = `{
  "name": "Character name",
  "appearance": "Detailed physical description",
  "personality": "Character traits and motivations", 
  "background": "Character history and context",
  "image_prompt": "Character appearance for image generation"
}`;

/**
 * Campaign Agent JSON template
 */
export const campaignAgentJsonTemplate = `{
  "chapters": "Array of chapter objects with plot points",
  "currentChapter": "Current chapter number",
  "campaignTheme": "Overall campaign theme",
  "estimatedDuration": "Expected campaign length"
}`;

/**
 * Error handling template for malformed JSON
 */
export const jsonErrorFallback = `
IF JSON PARSING FAILS:
1. Check syntax (brackets, quotes, commas)
2. Verify all required fields present
3. Ensure enum values are UPPERCASE
4. Return simplified valid JSON if needed
5. Log error for debugging
`;

/**
 * Common JSON field patterns
 */
export const commonJsonPatterns = {
  reasoning: `{"reasoning": "Brief explanation", "enum_english": "ENUM_VALUE"}`,
  statsUpdate: `{"type": "{resource}_lost|{resource}_gained", "sourceName": "Name", "targetName": "Name", "value": "1d6+3", "explanation": "Reason"}`,
  inventory: `{"type": "add_item|remove_item", "item_id": "unique_id", "item_added": {"description": "...", "effect": "..."}}`,
  timeObject: `{"day": 1-30, "dayName": "Monday", "month": 1-12, "monthName": "January", "year": number, "hour": 0-23, "minute": 0-59, "timeOfDay": "dawn|morning|midday|afternoon|evening|night|deep_night"}`
};
