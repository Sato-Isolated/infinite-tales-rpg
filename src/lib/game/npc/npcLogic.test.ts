import { describe, it, expect, beforeEach } from 'vitest';
import type { NPCState, NPCStats, Relationship } from '$lib/ai/agents/characterStatsAgent';
import type { Targets } from '$lib/types/gameState';
import {
  removeDeadNPCs,
  addNPCNamesToState,
  addRelationship,
  getRelationship,
  validateFamilyRelationships,
  generateRelationshipContext,
  createFamilyRelationship
} from './npcLogic';

describe('NPC Logic', () => {
  let mockNpcState: NPCState;
  let mockTargets: Targets;

  beforeEach(() => {
    // Reset mock state before each test
    mockNpcState = {
      'john_doe': {
        is_party_member: false,
        class: 'Warrior',
        rank_enum_english: 'Veteran',
        level: 5,
        spells_and_abilities: [],
        resources: {
          current_hp: 100,
          current_mp: 50
        },
        relationships: [],
        known_names: ['John', 'Johnny'],
        speech_patterns: 'speaks formally',
        personality_traits: ['brave', 'loyal'],
        background_notes: 'A veteran warrior'
      },
      'jane_smith': {
        is_party_member: false,
        class: 'Healer',
        rank_enum_english: 'Adept',
        level: 3,
        spells_and_abilities: [],
        resources: {
          current_hp: 0,
          current_mp: 30
        },
        relationships: [],
        known_names: ['Jane'],
        speech_patterns: 'speaks softly',
        personality_traits: ['wise', 'caring'],
        background_notes: 'A skilled healer'
      },
      'bob_wilson': {
        is_party_member: false,
        class: 'Merchant',
        rank_enum_english: 'Trader',
        level: 2,
        spells_and_abilities: [],
        resources: {
          current_hp: 75,
          current_mp: 0
        },
        relationships: [],
        known_names: ['Bob'],
        speech_patterns: 'speaks gruffly',
        personality_traits: ['stubborn'],
        background_notes: 'A merchant'
      }
    };

    mockTargets = {
      hostile: [],
      friendly: [
        { displayName: 'John Doe', uniqueTechnicalNameId: 'john_doe' },
        { displayName: 'New NPC', uniqueTechnicalNameId: 'new_npc' }
      ],
      neutral: []
    };
  });

  describe('removeDeadNPCs', () => {
    it('should remove NPCs with 0 or negative HP', () => {
      const deadNpcs = removeDeadNPCs(mockNpcState);

      expect(deadNpcs).toContain('jane_smith');
      expect(deadNpcs).toHaveLength(1);
      expect(mockNpcState['jane_smith']).toBeUndefined();
      expect(mockNpcState['john_doe']).toBeDefined();
      expect(mockNpcState['bob_wilson']).toBeDefined();
    });

    it('should handle empty NPC state', () => {
      const result = removeDeadNPCs({});
      expect(result).toEqual([]);
    });

    it('should handle null/undefined NPC state', () => {
      const result = removeDeadNPCs(null as any);
      expect(result).toEqual([]);
    });

    it('should handle NPCs without resources', () => {
      const stateWithoutResources: NPCState = {
        'npc_no_resources': {
          is_party_member: false,
          class: 'Unknown',
          rank_enum_english: 'None',
          level: 1,
          spells_and_abilities: []
        }
      };

      const result = removeDeadNPCs(stateWithoutResources);
      expect(result).toEqual([]);
      expect(stateWithoutResources['npc_no_resources']).toBeDefined();
    });

    it('should remove multiple dead NPCs', () => {
      // Make John also dead
      mockNpcState['john_doe'].resources!.current_hp = -5;

      const deadNpcs = removeDeadNPCs(mockNpcState);

      expect(deadNpcs).toHaveLength(2);
      expect(deadNpcs).toContain('jane_smith');
      expect(deadNpcs).toContain('john_doe');
      expect(mockNpcState['jane_smith']).toBeUndefined();
      expect(mockNpcState['john_doe']).toBeUndefined();
      expect(mockNpcState['bob_wilson']).toBeDefined();
    });
  });

  describe('addNPCNamesToState', () => {
    it('should add new names to existing known_names array', () => {
      // John already has known_names, add a new target name
      mockTargets.friendly[0].displayName = 'Johnny Doe';

      addNPCNamesToState(mockTargets, mockNpcState);

      expect(mockNpcState['john_doe'].known_names).toContain('Johnny Doe');
      expect(mockNpcState['john_doe'].known_names).toContain('John');
      expect(mockNpcState['john_doe'].known_names).toContain('Johnny');
    });

    it('should not add duplicate names', () => {
      // Try to add existing name
      mockTargets.friendly[0].displayName = 'John';

      const originalLength = mockNpcState['john_doe'].known_names!.length;
      addNPCNamesToState(mockTargets, mockNpcState);

      expect(mockNpcState['john_doe'].known_names).toHaveLength(originalLength);
    });

    it('should initialize known_names array if not present', () => {
      // Remove known_names from Jane
      delete mockNpcState['jane_smith'].known_names;
      mockTargets.friendly = [{ displayName: 'Jane Smith', uniqueTechnicalNameId: 'jane_smith' }];

      addNPCNamesToState(mockTargets, mockNpcState);

      expect(mockNpcState['jane_smith'].known_names).toBeDefined();
      expect(mockNpcState['jane_smith'].known_names).toContain('Jane Smith');
    });

    it('should handle non-existent NPCs gracefully', () => {
      mockTargets.friendly = [{ displayName: 'Unknown NPC', uniqueTechnicalNameId: 'unknown_npc' }];

      expect(() => addNPCNamesToState(mockTargets, mockNpcState)).not.toThrow();
    });

    it('should handle empty targets', () => {
      const emptyTargets: Targets = { hostile: [], friendly: [], neutral: [] };

      expect(() => addNPCNamesToState(emptyTargets, mockNpcState)).not.toThrow();
    });
  });

  describe('addRelationship', () => {
    const mockRelationship: Relationship = {
      target_name: 'Test Target',
      relationship_type: 'friend',
      emotional_bond: 'positive',
      description: 'A good friend'
    };

    it('should add relationship to existing NPC', () => {
      addRelationship(mockNpcState, 'john_doe', mockRelationship);

      expect(mockNpcState['john_doe'].relationships).toHaveLength(1);
      expect(mockNpcState['john_doe'].relationships![0]).toEqual(mockRelationship);
    });

    it('should initialize relationships array if not present', () => {
      delete mockNpcState['john_doe'].relationships;

      addRelationship(mockNpcState, 'john_doe', mockRelationship);

      expect(mockNpcState['john_doe'].relationships).toBeDefined();
      expect(mockNpcState['john_doe'].relationships).toHaveLength(1);
    });

    it('should not add duplicate relationships', () => {
      addRelationship(mockNpcState, 'john_doe', mockRelationship);
      addRelationship(mockNpcState, 'john_doe', mockRelationship);

      expect(mockNpcState['john_doe'].relationships).toHaveLength(1);
    });

    it('should handle non-existent NPC gracefully', () => {
      expect(() => addRelationship(mockNpcState, 'unknown_npc', mockRelationship)).not.toThrow();
    });

    it('should allow multiple different relationships', () => {
      const relationship2: Relationship = {
        target_name: 'Another Target',
        relationship_type: 'enemy',
        emotional_bond: 'negative',
        description: 'An old enemy'
      };

      addRelationship(mockNpcState, 'john_doe', mockRelationship);
      addRelationship(mockNpcState, 'john_doe', relationship2);

      expect(mockNpcState['john_doe'].relationships).toHaveLength(2);
    });

    it('should allow same target with different relationship type', () => {
      const relationship2: Relationship = {
        target_name: 'Test Target',
        relationship_type: 'enemy', // Different type
        emotional_bond: 'negative',
        description: 'Former friend turned enemy'
      };

      addRelationship(mockNpcState, 'john_doe', mockRelationship);
      addRelationship(mockNpcState, 'john_doe', relationship2);

      expect(mockNpcState['john_doe'].relationships).toHaveLength(2);
    });
  });

  describe('getRelationship', () => {
    beforeEach(() => {
      const relationship: Relationship = {
        target_name: 'Jane Smith',
        relationship_type: 'friend',
        emotional_bond: 'positive',
        description: 'A trusted friend'
      };
      addRelationship(mockNpcState, 'john_doe', relationship);
    });

    it('should find existing relationship', () => {
      const relationship = getRelationship(mockNpcState, 'john_doe', 'Jane Smith');

      expect(relationship).toBeDefined();
      expect(relationship!.target_name).toBe('Jane Smith');
      expect(relationship!.relationship_type).toBe('friend');
    });

    it('should return undefined for non-existent relationship', () => {
      const relationship = getRelationship(mockNpcState, 'john_doe', 'Unknown Person');

      expect(relationship).toBeUndefined();
    });

    it('should return undefined for non-existent NPC', () => {
      const relationship = getRelationship(mockNpcState, 'unknown_npc', 'Jane Smith');

      expect(relationship).toBeUndefined();
    });

    it('should return undefined for NPC without relationships', () => {
      delete mockNpcState['bob_wilson'].relationships;

      const relationship = getRelationship(mockNpcState, 'bob_wilson', 'Jane Smith');

      expect(relationship).toBeUndefined();
    });
  });

  describe('validateFamilyRelationships', () => {
    it('should return no errors for consistent family relationships', () => {
      createFamilyRelationship(
        mockNpcState,
        'john_doe', 'John Doe', 'father',
        'jane_smith', 'Jane Smith', 'daughter',
        'positive'
      );

      const errors = validateFamilyRelationships(mockNpcState);
      expect(errors).toHaveLength(0);
    });

    it('should detect missing reciprocal family relationships', () => {
      // Add one-way family relationship
      addRelationship(mockNpcState, 'john_doe', {
        target_npc_id: 'jane_smith',
        target_name: 'Jane Smith',
        relationship_type: 'family',
        specific_role: 'daughter',
        emotional_bond: 'positive',
        description: 'My daughter'
      });

      const errors = validateFamilyRelationships(mockNpcState);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Missing family relationship');
    });

    it('should detect inconsistent family roles', () => {
      // Add inconsistent family relationships
      addRelationship(mockNpcState, 'john_doe', {
        target_npc_id: 'jane_smith',
        target_name: 'Jane Smith',
        relationship_type: 'family',
        specific_role: 'sister', // John thinks Jane is his sister
        emotional_bond: 'positive',
        description: 'My sister'
      });

      addRelationship(mockNpcState, 'jane_smith', {
        target_npc_id: 'john_doe',
        target_name: 'John Doe',
        relationship_type: 'family',
        specific_role: 'father', // Jane thinks John is her father (inconsistent!)
        emotional_bond: 'positive',
        description: 'My father'
      });

      const errors = validateFamilyRelationships(mockNpcState);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.includes('Inconsistent family relationship'))).toBe(true);
    });

    it('should accept valid family role pairs', () => {
      const validPairs = [
        ['father', 'son'], ['mother', 'daughter'],
        ['brother', 'sister'], ['sister', 'brother']
      ];

      validPairs.forEach(([role1, role2], index) => {
        const npc1Id = `npc_${index}_1`;
        const npc2Id = `npc_${index}_2`;

        mockNpcState[npc1Id] = {
          is_party_member: false,
          class: 'Test',
          rank_enum_english: 'Test',
          level: 1,
          spells_and_abilities: [],
          relationships: []
        };
        mockNpcState[npc2Id] = {
          is_party_member: false,
          class: 'Test',
          rank_enum_english: 'Test',
          level: 1,
          spells_and_abilities: [],
          relationships: []
        };

        createFamilyRelationship(
          mockNpcState,
          npc1Id, `NPC ${index} 1`, role1,
          npc2Id, `NPC ${index} 2`, role2,
          'positive'
        );
      });

      const errors = validateFamilyRelationships(mockNpcState);
      expect(errors).toHaveLength(0);
    });

    it('should handle NPCs without relationships', () => {
      delete mockNpcState['john_doe'].relationships;

      const errors = validateFamilyRelationships(mockNpcState);
      expect(errors).toHaveLength(0);
    });

    it('should handle non-family relationships', () => {
      addRelationship(mockNpcState, 'john_doe', {
        target_name: 'Jane Smith',
        relationship_type: 'friend', // Not family
        emotional_bond: 'positive',
        description: 'A good friend'
      });

      const errors = validateFamilyRelationships(mockNpcState);
      expect(errors).toHaveLength(0);
    });
  });

  describe('generateRelationshipContext', () => {
    beforeEach(() => {
      // Setup complex relationships for John
      addRelationship(mockNpcState, 'john_doe', {
        target_npc_id: 'jane_smith',
        target_name: 'Jane Smith',
        relationship_type: 'family',
        specific_role: 'sister',
        emotional_bond: 'very_positive',
        description: 'Beloved sister who always supported him'
      });

      addRelationship(mockNpcState, 'john_doe', {
        target_name: 'Player Character',
        relationship_type: 'professional',
        specific_role: 'trusted companion',
        emotional_bond: 'positive',
        description: 'Fought together in many battles'
      });
    });

    it('should generate comprehensive relationship context', () => {
      const context = generateRelationshipContext(mockNpcState, 'john_doe', 'Hero');

      expect(context).toContain('RELATIONAL CONTEXT FOR john_doe');
      expect(context).toContain('sister of Jane Smith - adores this person');
      expect(context).toContain('Relationship with Hero: trusted companion - appreciates the player');
      expect(context).toContain('Beloved sister who always supported him');
      expect(context).toContain('Fought together in many battles');
      expect(context).toContain('Speaking style: speaks formally');
      expect(context).toContain('Personality traits: brave, loyal');
      expect(context).toContain('Personal background: A veteran warrior');
      expect(context).toContain('END RELATIONAL CONTEXT');
    });

    it('should return empty string for NPC without relationships', () => {
      const context = generateRelationshipContext(mockNpcState, 'bob_wilson');

      expect(context).toBe('');
    });

    it('should handle non-existent NPC', () => {
      const context = generateRelationshipContext(mockNpcState, 'unknown_npc');

      expect(context).toBe('');
    });

    it('should handle all emotional bond types', () => {
      const emotionalBonds: Array<[string, string]> = [
        ['very_negative', 'deeply despises'],
        ['negative', 'dislikes'],
        ['neutral', 'has a neutral relationship with'],
        ['positive', 'appreciates'],
        ['very_positive', 'adores']
      ];

      emotionalBonds.forEach(([bond, expectedText], index) => {
        const npcId = `test_npc_${index}`;
        mockNpcState[npcId] = {
          is_party_member: false,
          class: 'Test',
          rank_enum_english: 'Test',
          level: 1,
          spells_and_abilities: [],
          relationships: [{
            target_name: 'Test Target',
            relationship_type: 'friend',
            emotional_bond: bond as any,
            description: 'Test relationship'
          }]
        };

        const context = generateRelationshipContext(mockNpcState, npcId);
        expect(context).toContain(expectedText);
      });
    });

    it('should handle missing optional fields gracefully', () => {
      const minimalNpc: NPCStats = {
        is_party_member: false,
        class: 'Minimal',
        rank_enum_english: 'None',
        level: 1,
        spells_and_abilities: [],
        relationships: [{
          target_name: 'Someone',
          relationship_type: 'acquaintance',
          emotional_bond: 'neutral',
          description: 'Just someone I know'
        }]
      };

      mockNpcState['minimal_npc'] = minimalNpc;

      const context = generateRelationshipContext(mockNpcState, 'minimal_npc');

      expect(context).toContain('acquaintance');
      expect(context).toContain('has a neutral relationship with');
      expect(context).not.toContain('Speaking style:');
      expect(context).not.toContain('Personality traits:');
      expect(context).not.toContain('Personal background:');
    });
  });

  describe('createFamilyRelationship', () => {
    it('should create bidirectional family relationships', () => {
      createFamilyRelationship(
        mockNpcState,
        'john_doe', 'John Doe', 'father',
        'jane_smith', 'Jane Smith', 'daughter',
        'very_positive',
        'Close family bond'
      );

      // Check John's relationship to Jane
      const johnToJane = getRelationship(mockNpcState, 'john_doe', 'Jane Smith');
      expect(johnToJane).toBeDefined();
      expect(johnToJane!.relationship_type).toBe('family');
      expect(johnToJane!.specific_role).toBe('daughter');
      expect(johnToJane!.emotional_bond).toBe('very_positive');
      expect(johnToJane!.target_npc_id).toBe('jane_smith');

      // Check Jane's relationship to John
      const janeToJohn = getRelationship(mockNpcState, 'jane_smith', 'John Doe');
      expect(janeToJohn).toBeDefined();
      expect(janeToJohn!.relationship_type).toBe('family');
      expect(janeToJohn!.specific_role).toBe('father');
      expect(janeToJohn!.emotional_bond).toBe('very_positive');
      expect(janeToJohn!.target_npc_id).toBe('john_doe');
    });

    it('should use default emotional bond if not specified', () => {
      createFamilyRelationship(
        mockNpcState,
        'john_doe', 'John Doe', 'brother',
        'bob_wilson', 'Bob Wilson', 'brother'
      );

      const relationship = getRelationship(mockNpcState, 'john_doe', 'Bob Wilson');
      expect(relationship!.emotional_bond).toBe('positive');
    });

    it('should generate default descriptions if not provided', () => {
      createFamilyRelationship(
        mockNpcState,
        'john_doe', 'John Doe', 'uncle',
        'bob_wilson', 'Bob Wilson', 'nephew'
      );

      const johnToBob = getRelationship(mockNpcState, 'john_doe', 'Bob Wilson');
      const bobToJohn = getRelationship(mockNpcState, 'bob_wilson', 'John Doe');

      expect(johnToBob!.description).toContain('Family relationship: uncle of Bob Wilson');
      expect(bobToJohn!.description).toContain('Family relationship: nephew of John Doe');
    });

    it('should handle complex family structures', () => {
      // Create a family: John (father) -> Jane (daughter), Bob (son)
      createFamilyRelationship(
        mockNpcState,
        'john_doe', 'John Doe', 'father',
        'jane_smith', 'Jane Smith', 'daughter'
      );

      createFamilyRelationship(
        mockNpcState,
        'john_doe', 'John Doe', 'father',
        'bob_wilson', 'Bob Wilson', 'son'
      );

      createFamilyRelationship(
        mockNpcState,
        'jane_smith', 'Jane Smith', 'sister',
        'bob_wilson', 'Bob Wilson', 'brother'
      );

      // Validate the entire family structure
      const errors = validateFamilyRelationships(mockNpcState);
      expect(errors).toHaveLength(0);

      // Check that John has 2 children
      expect(mockNpcState['john_doe'].relationships).toHaveLength(2);

      // Check that Jane and Bob are siblings
      const janeRel = getRelationship(mockNpcState, 'jane_smith', 'Bob Wilson');
      const bobRel = getRelationship(mockNpcState, 'bob_wilson', 'Jane Smith');

      expect(janeRel!.specific_role).toBe('brother');
      expect(bobRel!.specific_role).toBe('sister');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle corrupted NPC state gracefully', () => {
      const corruptedState = {
        'partial_npc': {
          is_party_member: false,
          class: 'Partial',
          rank_enum_english: 'None',
          level: 1,
          spells_and_abilities: []
          // Missing resources intentionally
        }
      } as any;

      // These should not throw for partial NPCs, only for null NPCs
      expect(() => removeDeadNPCs(corruptedState)).not.toThrow();
      expect(() => addNPCNamesToState(mockTargets, corruptedState)).not.toThrow();
      expect(() => validateFamilyRelationships(corruptedState)).not.toThrow();
    });

    it('should handle circular relationship references', () => {
      // Create a relationship that references itself (edge case)
      addRelationship(mockNpcState, 'john_doe', {
        target_npc_id: 'john_doe',
        target_name: 'John Doe',
        relationship_type: 'family',
        specific_role: 'twin',
        emotional_bond: 'positive',
        description: 'My twin brother from another dimension'
      });

      // Should not crash
      expect(() => validateFamilyRelationships(mockNpcState)).not.toThrow();
      expect(() => generateRelationshipContext(mockNpcState, 'john_doe')).not.toThrow();
    });

    it('should preserve existing relationships when adding new ones', () => {
      // Add initial relationship
      addRelationship(mockNpcState, 'john_doe', {
        target_name: 'First Friend',
        relationship_type: 'friend',
        emotional_bond: 'positive',
        description: 'My first friend'
      });

      const initialCount = mockNpcState['john_doe'].relationships!.length;

      // Add family relationship via createFamilyRelationship
      createFamilyRelationship(
        mockNpcState,
        'john_doe', 'John Doe', 'father',
        'jane_smith', 'Jane Smith', 'daughter'
      );

      // Should have both relationships
      expect(mockNpcState['john_doe'].relationships).toHaveLength(initialCount + 1);

      const friendRel = getRelationship(mockNpcState, 'john_doe', 'First Friend');
      const familyRel = getRelationship(mockNpcState, 'john_doe', 'Jane Smith');

      expect(friendRel).toBeDefined();
      expect(familyRel).toBeDefined();
    });
  });
});
