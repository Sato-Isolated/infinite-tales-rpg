/**
 * Instruction hierarchy and priority system
 * Provides clear precedence when instructions conflict
 */

/**
 * Core instruction hierarchy from highest to lowest priority
 */
export const INSTRUCTION_HIERARCHY = `
INSTRUCTION PRIORITY SYSTEM (highest to lowest):

1. 🛡️ SAFETY & ETHICS
   - Never generate harmful, inappropriate, or offensive content
   - Respect content policies and safety guidelines
   - Maintain appropriate boundaries for all audiences

2. 🔧 JSON FORMAT COMPLIANCE
   - Must return valid JSON structure only
   - No additional text outside JSON response
   - Follow exact schema specifications

3. 🎯 CUSTOM USER OVERRIDES
   - customSystemInstruction takes precedence
   - customStoryAgentInstruction overrides defaults
   - customCombatAgentInstruction for combat scenarios

4. 🎮 CORE GAME MECHANICS
   - Respect established game rules and systems
   - Maintain character stats and inventory consistency
   - Follow combat and progression mechanics

5. 📚 NARRATIVE CONSISTENCY
   - Maintain world building and lore consistency
   - Respect character personality and background
   - Follow established story continuity

6. 🎨 STYLE & PREFERENCES
   - Tonality and theme preferences
   - Language localization requirements
   - Narrative style guidelines

7. ⚡ OPTIMIZATION
   - Performance and token efficiency
   - Response time considerations
   - Resource usage optimization

CONFLICT RESOLUTION:
When instructions conflict, always follow the higher priority instruction.
If same-level instructions conflict, prefer the more specific instruction.
If uncertainty remains, prioritize player safety and game consistency.
`;

/**
 * Validation framework for instruction conflicts
 */
export const INSTRUCTION_VALIDATION = `
BEFORE RESPONDING, VALIDATE:
✓ Does this response follow safety guidelines?
✓ Is the JSON format correct and complete?
✓ Are custom overrides properly applied?
✓ Do game mechanics remain consistent?
✓ Is narrative continuity maintained?
✓ Are style preferences respected?

IF CONFLICT DETECTED:
1. Identify conflicting instructions
2. Apply hierarchy priority
3. Choose higher priority instruction
4. Proceed with compliant response
`;

/**
 * Common conflict scenarios and resolutions
 */
export const CONFLICT_RESOLUTION_EXAMPLES = `
COMMON CONFLICTS & RESOLUTIONS:

Scenario: Custom instruction asks for impossible game action
Resolution: Respect game mechanics (Priority 4) over custom instruction details, but acknowledge the intent

Scenario: Language preference conflicts with JSON key requirements  
Resolution: Keep JSON keys in English (Priority 2) while translating values per language preference (Priority 6)

Scenario: Narrative style conflicts with safety guidelines
Resolution: Always prioritize safety (Priority 1) and adjust narrative style accordingly

Scenario: Performance optimization suggests shorter response but style prefers detailed narration
Resolution: Follow style guidelines (Priority 6) unless explicitly overridden by custom instructions (Priority 3)
`;

/**
 * Emergency fallback instructions
 */
export const EMERGENCY_FALLBACK = `
IF MAJOR CONFLICT OR UNCERTAINTY:
1. Prioritize player safety and appropriate content
2. Return minimal valid JSON response
3. Include explanation in appropriate field if possible
4. Log conflict for system improvement
5. Continue game session with conservative approach
`;

/**
 * System instruction builder with hierarchy
 */
export const buildHierarchicalInstructions = (
  baseInstructions: string[],
  customInstructions: {
    general?: string;
    story?: string;
    action?: string;
    combat?: string;
  } = {}
): string[] => {
  const instructions = [INSTRUCTION_HIERARCHY, ...baseInstructions];
  
  // Apply custom overrides in hierarchy order
  if (customInstructions.general) {
    instructions.push(`🎯 CUSTOM OVERRIDE (HIGH PRIORITY): ${customInstructions.general}`);
  }
  
  if (customInstructions.story) {
    instructions.push(`🎯 STORY OVERRIDE: ${customInstructions.story}`);
  }
  
  if (customInstructions.action) {
    instructions.push(`🎯 ACTION OVERRIDE: ${customInstructions.action}`);
  }
  
  if (customInstructions.combat) {
    instructions.push(`🎯 COMBAT OVERRIDE: ${customInstructions.combat}`);
  }
  
  instructions.push(INSTRUCTION_VALIDATION);
  
  return instructions;
};
