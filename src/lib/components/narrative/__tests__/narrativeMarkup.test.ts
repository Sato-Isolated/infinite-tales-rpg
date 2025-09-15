/**
 * Test suite for NPC UUID Resolution and Narrative Markup Systems
 * 
 * Tests the enhanced markup system with UUID resolution and validation
 */

import { describe, it, expect, vi } from 'vitest';
import { createNPCUuidResolver, extractCharacterUUIDs, validateNPCMarkup } from '$lib/components/narrative/npcUuidResolver';
import { validateMarkupTags, generateMarkupReferenceGuide } from '$lib/ai/prompts/helpers/npcMarkupHelpers';
import type { NPCState } from '$lib/ai/agents/characterStatsAgent';

// Mock NPC state for testing
const mockNPCState: NPCState = {
  'npc_001': {
    known_names: ['Marie Dubois', 'Marie'],
    is_party_member: false,
    resources: { current_hp: 100, current_mp: 50 },
    class: 'Mage',
    rank_enum_english: 'Average',
    level: 1,
    spells_and_abilities: []
  },
  'npc_002': {
    known_names: ['Jean Le Garde', 'Captain Jean'],
    is_party_member: true,
    resources: { current_hp: 85, current_mp: 40 },
    class: 'Warrior',
    rank_enum_english: 'Strong',
    level: 2,
    spells_and_abilities: []
  },
  'npc_003': {
    known_names: ['Mysterious Stranger'],
    is_party_member: false,
    resources: { current_hp: 150, current_mp: 100 },
    class: 'Unknown',
    rank_enum_english: 'Boss',
    level: 5,
    spells_and_abilities: []
  }
};

describe('NPC UUID Resolver', () => {
  it('should create resolver with valid NPC state', () => {
    const resolver = createNPCUuidResolver(mockNPCState);
    expect(resolver).toBeDefined();
  });

  it('should resolve valid UUIDs to display names', () => {
    const resolver = createNPCUuidResolver(mockNPCState);

    const result = resolver.resolveUUID('npc_001');
    expect(result.isValid).toBe(true);
    expect(result.displayName).toBe('Marie Dubois');
  });

  it('should handle invalid UUIDs gracefully', () => {
    const resolver = createNPCUuidResolver(mockNPCState);

    const result = resolver.resolveUUID('invalid_uuid');
    expect(result.isValid).toBe(false);
    expect(result.displayName).toBe('invalid_uuid');
    expect(result.fallbackName).toBe('invalid_uuid');
  });

  it('should provide fallback when using display name instead of UUID', () => {
    const resolver = createNPCUuidResolver(mockNPCState);

    const result = resolver.resolveUUID('Marie Dubois');
    expect(result.isValid).toBe(true);
    expect(result.displayName).toBe('Marie Dubois');
    expect(result.fallbackName).toBe('Marie Dubois');
  });

  it('should generate NPC context for AI prompts', () => {
    const resolver = createNPCUuidResolver(mockNPCState);
    const context = resolver.getNPCContextForAI();

    expect(context).toContain('Available NPCs for Character Tags');
    expect(context).toContain('[character:npc_001] → "Marie Dubois"');
    expect(context).toContain('[character:npc_002] → "Jean Le Garde"');
    expect(context).toContain('Always use the UUID');
  });

  it('should validate UUIDs correctly', () => {
    const resolver = createNPCUuidResolver(mockNPCState);

    expect(resolver.isValidUUID('npc_001')).toBe(true);
    expect(resolver.isValidUUID('npc_002')).toBe(true);
    expect(resolver.isValidUUID('invalid')).toBe(false);
  });

  it('should get all NPC references', () => {
    const resolver = createNPCUuidResolver(mockNPCState);
    const references = resolver.getAllNPCReferences();

    expect(references).toHaveLength(3);
    expect(references[0].uuid).toBe('npc_001');
    expect(references[0].displayName).toBe('Marie Dubois');
  });
});

describe('Character UUID Extraction', () => {
  it('should extract UUIDs from character markup', () => {
    const text = 'Hello [character:npc_001]Marie[/character] and [character:npc_002]Jean[/character]!';
    const uuids = extractCharacterUUIDs(text);

    expect(uuids).toEqual(['npc_001', 'npc_002']);
  });

  it('should handle text without character markup', () => {
    const text = 'This is just plain text with no markup.';
    const uuids = extractCharacterUUIDs(text);

    expect(uuids).toEqual([]);
  });

  it('should handle malformed character tags', () => {
    const text = 'Hello [character:]broken[/character] and [character:valid_001]good[/character]!';
    const uuids = extractCharacterUUIDs(text);

    expect(uuids).toEqual(['valid_001']);
  });
});

describe('NPC Markup Validation', () => {
  it('should validate correct NPC markup', () => {
    const resolver = createNPCUuidResolver(mockNPCState);
    const text = '[character:npc_001]Marie[/character] walked into the room.';

    const result = validateNPCMarkup(text, resolver);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect invalid NPC UUIDs', () => {
    const resolver = createNPCUuidResolver(mockNPCState);
    const text = '[character:invalid_uuid]Unknown[/character] character.';

    const result = validateNPCMarkup(text, resolver);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Unknown NPC UUID: "invalid_uuid"');
  });

  it('should warn about name usage instead of UUID', () => {
    const resolver = createNPCUuidResolver(mockNPCState);
    const text = '[character:Marie Dubois]Marie[/character] spoke softly.';

    const result = validateNPCMarkup(text, resolver);
    expect(result.isValid).toBe(true);
    expect(result.warnings).toContain('NPC reference "Marie Dubois" should use UUID instead of name');
  });
});

describe('Markup Tag Validation', () => {
  it('should validate known markup tags', () => {
    const text = '[speaker:Marie]Hello![/speaker] [highlight]important[/highlight] [location]Paris[/location]';
    const result = validateMarkupTags(text);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate new @ prefix tags', () => {
    const text = '@speaker:Marie:Hello! @highlight:important @location:Paris';
    const result = validateMarkupTags(text);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect unknown @ prefix tags', () => {
    const text = '@custom:unknown and @invalid:test';
    const result = validateMarkupTags(text);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Unknown @ markup tag: @custom');
    expect(result.errors).toContain('Unknown @ markup tag: @invalid');
  });

  it('should detect case sensitivity issues in @ tags', () => {
    const text = '@Speaker:Marie:Hello and @TIME:now';
    const result = validateMarkupTags(text);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('@ tag should be lowercase: @speaker instead of @Speaker');
    expect(result.errors).toContain('@ tag should be lowercase: @time instead of @TIME');
  });

  it('should detect unknown markup tags', () => {
    const text = '[custom:unknown]content[/custom] and [invalid]text[/invalid]';
    const result = validateMarkupTags(text);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Unknown legacy markup tag: [custom]');
    expect(result.errors).toContain('Unknown legacy markup tag: [invalid]');
  });

  it('should provide suggestions for common mistakes', () => {
    const text = '[name:Marie]content[/name] and [char:someone]text[/char]';
    const result = validateMarkupTags(text);

    expect(result.isValid).toBe(false);
    expect(result.suggestions).toBeDefined();
    expect(result.suggestions!.some(s => s.includes('@speaker:Name:dialogue'))).toBe(true);
    expect(result.suggestions!.some(s => s.includes('@char:Name'))).toBe(true);
  });

  it('should detect case sensitivity issues', () => {
    const text = '[Time]Three hours later[/Time] and [Speaker:Marie]Hello[/Speaker]';
    const result = validateMarkupTags(text);

    expect(result.isValid).toBe(false);
    // Our improved logic now correctly identifies these as case sensitivity issues, not unknown tags
    expect(result.errors).toContain('Legacy tag should be lowercase: [time] instead of [Time]');
    expect(result.errors).toContain('Legacy tag should be lowercase: [speaker] instead of [Speaker]');
    expect(result.suggestions!).toContain('Did you mean [time] instead of [Time]? (tags are case-sensitive)');
    expect(result.suggestions!).toContain('Did you mean [speaker] instead of [Speaker]? (tags are case-sensitive)');
  });

  it('should handle text without any markup', () => {
    const text = 'This is just plain text without any markup tags.';
    const result = validateMarkupTags(text);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('Markup Reference Guide Generation', () => {
  it('should generate complete markup guide without NPCs', () => {
    const emptyNPCState: NPCState = {};
    const guide = generateMarkupReferenceGuide(emptyNPCState);

    expect(guide).toContain('Complete Narrative Markup Reference Guide - @ Prefix System');
    expect(guide).toContain('@speaker:Name:dialogue');
    expect(guide).toContain('@highlight:');
    expect(guide).toContain('@ PREFIX MARKUP SYSTEM');
    expect(guide).toContain('Zero HTML confusion');
  });

  it('should generate markup guide with NPC context', () => {
    const guide = generateMarkupReferenceGuide(mockNPCState);

    expect(guide).toContain('Complete Narrative Markup Reference Guide');
    expect(guide).toContain('Available Characters:');
    expect(guide).toContain('- Marie Dubois');
    expect(guide).toContain('Zero HTML confusion');
  });
});

describe('Integration Tests', () => {
  it('should handle complex markup with multiple NPCs', () => {
    const resolver = createNPCUuidResolver(mockNPCState);
    const text = `
			[speaker:Marie]Bonjour![/speaker] said [character:npc_001]Marie[/character].
			[character:npc_002]Captain Jean[/character] nodded and replied,
			[speaker:Captain Jean]We need to move quickly.[/speaker]
			[time]An hour later[/time], they reached [location]the ancient ruins[/location].
		`;

    const validation = validateNPCMarkup(text, resolver);
    expect(validation.isValid).toBe(true);

    const tagValidation = validateMarkupTags(text);
    expect(tagValidation.isValid).toBe(true);
  });

  it('should handle mixed valid and invalid content gracefully', () => {
    const resolver = createNPCUuidResolver(mockNPCState);
    const text = `
			[speaker:Marie]Hello![/speaker]
			[character:invalid_npc]Unknown[/character]
			[custom:invalid]Bad tag[/custom]
			[highlight]Good content[/highlight]
		`;

    const npcValidation = validateNPCMarkup(text, resolver);
    expect(npcValidation.isValid).toBe(false);
    expect(npcValidation.errors).toContain('Unknown NPC UUID: "invalid_npc"');

    const tagValidation = validateMarkupTags(text);
    expect(tagValidation.isValid).toBe(false);
    expect(tagValidation.errors).toContain('Unknown legacy markup tag: [custom]');
  });
});

describe('Edge Cases', () => {
  it('should handle empty NPC state', () => {
    const resolver = createNPCUuidResolver({});
    const context = resolver.getNPCContextForAI();

    expect(context).toContain('None currently in the game state');
  });

  it('should handle NPCs without known_names', () => {
    const npcState: NPCState = {
      'npc_no_names': {
        resources: { current_hp: 100, current_mp: 50 },
        class: 'Unknown',
        rank_enum_english: 'Average',
        level: 1,
        spells_and_abilities: [],
        is_party_member: false
      }
    };

    const resolver = createNPCUuidResolver(npcState);
    const result = resolver.resolveUUID('npc_no_names');

    expect(result.isValid).toBe(true);
    expect(result.displayName).toBe('npc_no_names');
  });

  it('should handle empty strings and null values', () => {
    const resolver = createNPCUuidResolver(mockNPCState);

    const emptyResult = resolver.resolveUUID('');
    expect(emptyResult.isValid).toBe(false);

    const uuids = extractCharacterUUIDs('');
    expect(uuids).toEqual([]);

    const validation = validateMarkupTags('');
    expect(validation.isValid).toBe(true);
  });

  it('should throttle warnings for unknown NPCs to prevent console spam', () => {
    const resolver = createNPCUuidResolver(mockNPCState);

    // Spy on console.warn to count calls
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => { });

    // First resolution should log a warning
    const result1 = resolver.resolveUUID('fenrir');
    expect(result1.isValid).toBe(false);
    expect(result1.displayName).toBe('fenrir');
    expect(warnSpy).toHaveBeenCalledWith('Unknown NPC UUID: "fenrir". Using as fallback display name.');

    // Subsequent resolutions should use debug logging, not warn
    const result2 = resolver.resolveUUID('fenrir');
    expect(result2.isValid).toBe(false);
    expect(result2.displayName).toBe('fenrir');
    expect(debugSpy).toHaveBeenCalledWith('Using fallback display name for unknown NPC: "fenrir"');

    // Different unknown NPC should still get first warning
    const result3 = resolver.resolveUUID('aether');
    expect(result3.isValid).toBe(false);
    expect(result3.displayName).toBe('aether');
    expect(warnSpy).toHaveBeenCalledWith('Unknown NPC UUID: "aether". Using as fallback display name.');

    // Verify warning throttling cache
    const loggedUUIDs = resolver.getLoggedUnknownUUIDs();
    expect(loggedUUIDs.has('fenrir')).toBe(true);
    expect(loggedUUIDs.has('aether')).toBe(true);

    // Clear cache and verify warning logs again
    resolver.clearWarningCache();
    const clearedUUIDs = resolver.getLoggedUnknownUUIDs();
    expect(clearedUUIDs.size).toBe(0);

    warnSpy.mockRestore();
    debugSpy.mockRestore();
  });

  it('should detect malformed markup tags missing closing tags', () => {
    // Spy on console.warn to check for malformed tag warnings
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

    // This would be called by the actual component's parseNarrativeMarkup function
    // For now, let's test the detection regex directly
    const text = '[speaker:Fenrir][Beaucoup de petits prétentieux, cette année. Ta mère a un flair.]';
    const unclosedSpeakerMatches = text.match(/\[speaker:[^\]]+\](?![^[]*\[\/speaker\])/g);

    expect(unclosedSpeakerMatches).toEqual(['[speaker:Fenrir]']);

    warnSpy.mockRestore();
  });
});
