/**
 * NPC Markup Helpers (Simplified Version)
 * 
 * Provides validation and reference generation for the simplified narrative markup system
 * without UUID dependencies. Now uses simple name-based character references.
 */

import type { NPCState } from '$lib/ai/agents/characterStatsAgent';

/**
 * Validates markup tags for known tags
 * 
 * @param text - Text to validate  
 * @returns Validation result with errors
 */
export function validateMarkupTags(text: string): {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
  suggestions?: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Valid markup tags in simplified system
  const VALID_TAGS = new Set([
    'speaker', 'character', 'highlight', 'location', 'time', 'whisper', 'br'
  ]);

  // Check for unknown tags and case sensitivity issues
  const tagMatches = text.match(/\[([a-zA-Z]+)(?:[:\]])/g);
  if (tagMatches) {
    tagMatches.forEach(match => {
      const tagName = match.match(/\[([a-zA-Z]+)/)?.[1];
      if (tagName) {
        const lowerTagName = tagName.toLowerCase();

        // Check if it's a case sensitivity issue (valid tag but wrong case)
        if (VALID_TAGS.has(lowerTagName) && tagName !== lowerTagName) {
          errors.push(`Tag should be lowercase: [${lowerTagName}] instead of [${tagName}]`);
          suggestions.push(`Did you mean [${lowerTagName}] instead of [${tagName}]? (tags are case-sensitive)`);
        }
        // Check if it's an unknown tag
        else if (!VALID_TAGS.has(lowerTagName)) {
          errors.push(`Unknown markup tag: [${tagName}]`);

          // Provide suggestions for common mistakes
          if (lowerTagName === 'name') {
            warnings.push('Did you mean [speaker:Name] instead of [name:Name]?');
            suggestions.push('Use [speaker:Name] instead of [name:Name]');
          } else if (lowerTagName === 'char') {
            warnings.push('Did you mean [character] instead of [char]?');
            suggestions.push('Use [character] instead of [char]');
          }
        }
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

/**
 * Generates markup reference guide for the simplified system
 * 
 * @param npcState - Optional NPC state (not used in simplified version)
 * @returns Markup reference guide as string
 */
export function generateMarkupReferenceGuide(npcState?: NPCState): string {
  const guide = `Complete Narrative Markup Reference Guide

## Core Markup Tags (7 tags total)

### 1. Speaker Tag
**Usage:** [speaker:Name]dialogue[/speaker]
**Purpose:** Mark character dialogue with speaker name
**Example:** [speaker:Marie]Hello there![/speaker]

### 2. Character Tag  
**Usage:** [character]name[/character]
**Purpose:** Reference character by name (simple name-based system)
**Example:** [character]Marie[/character] approaches cautiously

### 3. Highlight Tag
**Usage:** [highlight]important text[/highlight]  
**Purpose:** Emphasize important story elements
**Example:** You notice [highlight]a glowing artifact[/highlight]

### 4. Location Tag
**Usage:** [location]place name[/location]
**Purpose:** Mark location references
**Example:** You arrive at [location]the ancient temple[/location]

### 5. Time Tag
**Usage:** [time]time reference[/time]
**Purpose:** Mark temporal transitions  
**Example:** [time]Three hours later[/time]

### 6. Whisper Tag
**Usage:** [whisper]quiet text[/whisper]
**Purpose:** Mark whispered or quiet dialogue
**Example:** [whisper]The guards are coming[/whisper]

### 7. Break Tag
**Usage:** [br]
**Purpose:** Major scene transitions and time jumps ONLY
**Example:** They left the village. [br] Three days later, they reached the mountains.
**IMPORTANT:** Maximum ONE [br] per paragraph. NEVER use consecutive [br] tags.

## Important Notes:
- Use simple character names in [character] tags, no UUIDs needed
- All tags are case-sensitive and should be lowercase
- [br] tags should be used sparingly - only for major story transitions
- NEVER use multiple [br] tags together: ❌ [br][br] or [br] [br]
- Unknown tags will be removed automatically
- System auto-closes unclosed tags for better AI reliability`;

  // Add character context if NPCs exist
  if (npcState && Object.keys(npcState).length > 0) {
    const characters = Object.values(npcState)
      .map(npc => npc.known_names?.[0])
      .filter(Boolean);

    if (characters.length > 0) {
      return guide + `\n\n## Available Characters:\n${characters.map(name => `- ${name}`).join('\n')}`;
    }
  }

  return guide;
}