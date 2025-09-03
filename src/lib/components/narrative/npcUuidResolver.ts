/**
 * NPC UUID Resolution Service
 * 
 * Handles mapping of NPC UUIDs to display names for narrative markup
 * Integrates with existing NPCState system and provides validation
 */

import type { NPCState } from '$lib/ai/agents/characterStatsAgent';

export interface NPCReference {
  uuid: string;
  displayName: string;
  knownNames: string[];
}

export interface NPCResolutionResult {
  displayName: string;
  isValid: boolean;
  fallbackName?: string;
}

/**
 * NPC UUID Resolver - handles character reference resolution in narrative markup
 */
export class NPCUuidResolver {
  private npcState: NPCState;
  private npcReferences: Map<string, NPCReference>;
  private loggedUnknownUUIDs: Set<string> = new Set();

  constructor(npcState: NPCState) {
    this.npcState = npcState;
    this.npcReferences = this.buildNPCReferences();
  }

  /**
   * Build internal mapping of UUID to NPC references
   */
  private buildNPCReferences(): Map<string, NPCReference> {
    const references = new Map<string, NPCReference>();

    Object.entries(this.npcState).forEach(([uuid, npcStats]) => {
      if (!npcStats) return;

      // Get the primary display name (first known name or fallback to UUID)
      const displayName = npcStats.known_names?.[0] || uuid;
      const knownNames = npcStats.known_names || [uuid];

      references.set(uuid, {
        uuid,
        displayName,
        knownNames
      });
    });

    return references;
  }

  /**
   * Resolve a UUID to display name
   */
  resolveUUID(uuid: string): NPCResolutionResult {
    const reference = this.npcReferences.get(uuid);

    if (reference) {
      return {
        displayName: reference.displayName,
        isValid: true
      };
    }

    // Fallback: check if the "UUID" is actually a known name
    for (const [actualUuid, ref] of this.npcReferences) {
      if (ref.knownNames.includes(uuid)) {
        // Only log this warning once per UUID per session
        if (!this.loggedUnknownUUIDs.has(uuid)) {
          console.warn(`NPC reference "${uuid}" should use UUID "${actualUuid}" instead of name`);
          this.loggedUnknownUUIDs.add(uuid);
        }
        return {
          displayName: ref.displayName,
          isValid: true,
          fallbackName: uuid
        };
      }
    }

    // Invalid UUID - return as-is but mark as invalid
    // Only log warning once per unknown UUID to prevent console spam
    if (!this.loggedUnknownUUIDs.has(uuid)) {
      console.warn(`Unknown NPC UUID: "${uuid}". Using as fallback display name.`);
      this.loggedUnknownUUIDs.add(uuid);
    } else {
      // Use debug logging for subsequent references to avoid spam
      console.debug(`Using fallback display name for unknown NPC: "${uuid}"`);
    }
    
    return {
      displayName: uuid,
      isValid: false,
      fallbackName: uuid
    };
  }

  /**
   * Get all available NPC references for AI context
   */
  getAllNPCReferences(): NPCReference[] {
    return Array.from(this.npcReferences.values());
  }

  /**
   * Get NPC context string for AI prompts
   */
  getNPCContextForAI(): string {
    const references = this.getAllNPCReferences();

    if (references.length === 0) {
      return '🔸 **Available NPCs:** None currently in the game state.\n⚠️ **Important:** Do NOT use [character:uuid] markup since no NPCs are registered. Use plain text for all character mentions.';
    }

    const npcList = references.map(ref => {
      const names = ref.knownNames.length > 1
        ? ` (aka: ${ref.knownNames.slice(1).join(', ')})`
        : '';
      return `  • [character:${ref.uuid}] → "${ref.displayName}"${names}`;
    }).join('\n');

    return `🔸 **Available NPCs for Character Tags:**
${npcList}

**Usage:** Use [character:uuid]reference text[/character] for NPC mentions in dialogue or action descriptions.
**Important:** Always use the UUID, never use the display name in the tag.`;
  }

  /**
   * Validate if a UUID exists in current game state
   */
  isValidUUID(uuid: string): boolean {
    return this.npcReferences.has(uuid);
  }

  /**
   * Get a map of all valid UUIDs for validation
   */
  getValidUUIDs(): Set<string> {
    return new Set(this.npcReferences.keys());
  }

  /**
   * Update the resolver with new NPC state
   */
  updateNPCState(newNpcState: NPCState): void {
    this.npcState = newNpcState;
    this.npcReferences = this.buildNPCReferences();
    // Note: We intentionally preserve loggedUnknownUUIDs to prevent warning spam
    // even after NPC state updates
  }

  /**
   * Clear the warning cache - useful for debugging or testing
   */
  clearWarningCache(): void {
    this.loggedUnknownUUIDs.clear();
  }

  /**
   * Get the set of UUIDs that have generated warnings (for debugging)
   */
  getLoggedUnknownUUIDs(): Set<string> {
    return new Set(this.loggedUnknownUUIDs);
  }
}

/**
 * Factory function to create NPC UUID resolver
 */
export function createNPCUuidResolver(npcState: NPCState): NPCUuidResolver {
  return new NPCUuidResolver(npcState);
}

/**
 * Utility function to extract UUIDs from character markup tags
 */
export function extractCharacterUUIDs(text: string): string[] {
  const matches = text.match(/\[character:([^\]]+)\]/g);
  if (!matches) return [];

  return matches.map(match => {
    const uuidMatch = match.match(/\[character:([^\]]+)\]/);
    return uuidMatch ? uuidMatch[1] : '';
  }).filter(Boolean);
}

/**
 * Validate markup text against available NPCs
 */
export function validateNPCMarkup(text: string, resolver: NPCUuidResolver): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const uuids = extractCharacterUUIDs(text);

  uuids.forEach(uuid => {
    const result = resolver.resolveUUID(uuid);
    if (!result.isValid) {
      errors.push(`Unknown NPC UUID: "${uuid}"`);
    }
    if (result.fallbackName) {
      warnings.push(`NPC reference "${uuid}" should use UUID instead of name`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
