/**
 * NPC Markup Helpers - @ Prefix System (v2.0)
 * 
 * Provides validation and reference generation for the new @ prefix narrative markup system
 * Completely avoids HTML/XML syntax confusion while maintaining backwards compatibility
 */

import type { NPCState } from '$lib/ai/agents/characterStatsAgent';

/**
 * Validates @ prefix markup tags and legacy [tag] format
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

  // Valid @ prefix tags in new system
  const VALID_AT_TAGS = new Set([
    'speaker', 'char', 'highlight', 'location', 'time', 'whisper', 'br'
  ]);

  // Valid legacy tags for backwards compatibility
  const VALID_LEGACY_TAGS = new Set([
    'speaker', 'character', 'highlight', 'location', 'time', 'whisper', 'br'
  ]);

  // Check for @ prefix tags
  const atTagMatches = text.match(/@([a-zA-Z]+)(?:[:\s]|$)/g);
  if (atTagMatches) {
    atTagMatches.forEach(match => {
      const tagName = match.match(/@([a-zA-Z]+)/)?.[1];
      if (tagName) {
        const lowerTagName = tagName.toLowerCase();

        // Check if it's a case sensitivity issue
        if (VALID_AT_TAGS.has(lowerTagName) && tagName !== lowerTagName) {
          errors.push(`@ tag should be lowercase: @${lowerTagName} instead of @${tagName}`);
          suggestions.push(`Did you mean @${lowerTagName} instead of @${tagName}? (tags are case-sensitive)`);
        }
        // Check if it's an unknown @ tag
        else if (!VALID_AT_TAGS.has(lowerTagName)) {
          errors.push(`Unknown @ markup tag: @${tagName}`);

          // Provide suggestions for common mistakes
          if (lowerTagName === 'character') {
            warnings.push('Use @char instead of @character');
            suggestions.push('Use @char:Name or Name @char for character references');
          } else {
            suggestions.push(`Use @ prefix format: @${lowerTagName}:content`);
          }
        }
      }
    });
  }

  // Check for legacy [tag] format and case sensitivity issues
  const legacyTagMatches = text.match(/\[([a-zA-Z]+)(?:[:\]])/g);
  if (legacyTagMatches) {
    legacyTagMatches.forEach(match => {
      const tagName = match.match(/\[([a-zA-Z]+)/)?.[1];
      if (tagName) {
        const lowerTagName = tagName.toLowerCase();

        // Check if it's a case sensitivity issue (valid tag but wrong case)
        if (VALID_LEGACY_TAGS.has(lowerTagName) && tagName !== lowerTagName) {
          errors.push(`Legacy tag should be lowercase: [${lowerTagName}] instead of [${tagName}]`);
          suggestions.push(`Did you mean [${lowerTagName}] instead of [${tagName}]? (tags are case-sensitive)`);
        }
        // Check if it's an unknown legacy tag
        else if (!VALID_LEGACY_TAGS.has(lowerTagName)) {
          errors.push(`Unknown legacy markup tag: [${tagName}]`);
          suggestions.push(`Use @ prefix format instead: @${lowerTagName}:content`);
        }
      }
    });
  }

  // Suggest migration to @ system if legacy tags are detected
  if (legacyTagMatches && legacyTagMatches.length > 0) {
    warnings.push('Consider using @ prefix format for better reliability');
    suggestions.push('Example: @speaker:Name:dialogue, @char:Name, @location:Place');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

/**
 * Generates markup reference guide for the @ prefix system with legacy support
 * 
 * @param npcState - Optional NPC state (not used in simplified version)
 * @returns Markup reference guide as string
 */
export function generateMarkupReferenceGuide(npcState?: NPCState): string {
  const guide = `Complete Narrative Markup Reference Guide - @ Prefix System

## 🚀 @ PREFIX MARKUP SYSTEM
**Clean, AI-optimized syntax with zero confusion**

### 1. Speaker Tag
**Usage:** @speaker:Name:dialogue
**Purpose:** Mark character dialogue with speaker name
**Example:** @speaker:Marie:Hello there!

### 2. Character Tag  
**Usage:** Name @char OR @char:Name
**Purpose:** Reference character by name
**Examples:** 
- Marie @char approaches cautiously
- @char:Marie approaches cautiously

### 3. Highlight Tag
**Usage:** @highlight:important text
**Purpose:** Emphasize important story elements
**Example:** You notice @highlight:a glowing artifact

### 4. Location Tag
**Usage:** @location:place
**Purpose:** Mark location references
**Example:** You arrive at @location:ancient_temple

### 5. Time Tag
**Usage:** @time:time reference
**Purpose:** Mark temporal transitions  
**Example:** @time:Three hours later

### 6. Whisper Tag
**Usage:** @whisper:quiet text
**Purpose:** Mark whispered or quiet dialogue
**Example:** @whisper:The guards are coming

### 7. Break Tag
**Usage:** @br
**Purpose:** Major scene transitions and time jumps ONLY
**Example:** They left the village. @br @time:Three days later, they reached the mountains.

## ✨ ADVANTAGES OF @ PREFIX SYSTEM:
- ⚡ **Zero HTML confusion** - No brackets that look like HTML
- 🎯 **AI-friendly** - Much more reliable for AI generation
- 📏 **Compact** - Shorter syntax for cleaner text
- 🔧 **Easy parsing** - Simple regex patterns
- 🚀 **Future-proof** - Designed for reliability

## Important Notes:
- Use simple character names, no UUIDs needed
- All @ tags are case-sensitive and should be lowercase
- @br tags should be used sparingly - only for major story transitions
- Unknown tags will be removed automatically
- System auto-handles malformed tags for better AI reliability`;

  // Add character context if NPCs exist
  if (npcState && Object.keys(npcState).length > 0) {
    const characters = Object.values(npcState)
      .map(npc => npc.known_names?.[0])
      .filter(Boolean);

    if (characters.length > 0) {
      return guide + `\n\n## Available Characters:\n${characters.map(name => `- ${name} (@char:${name} or ${name} @char)`).join('\n')}`;
    }
  }

  return guide;
}
