/**
 * Tests for the NPC relationships system
 */

import { describe, it, expect } from 'vitest';
import type { NPCState } from '$lib/ai/agents/characterStatsAgent';
import { 
	addRelationship, 
	createFamilyRelationship, 
	validateFamilyRelationships, 
	getRelationship 
} from '../npcLogic';

describe('NPC relationships system', () => {
	it('should create correct bidirectional family relationships', () => {
		const npcState: NPCState = {
			"marie": {
				known_names: ["Marie"],
				is_party_member: false,
				class: "Test",
				rank_enum_english: "Weak",
				level: 1,
				spells_and_abilities: [],
				relationships: []
			},
			"pierre": {
				known_names: ["Pierre"], 
				is_party_member: false,
				class: "Test",
				rank_enum_english: "Weak",
				level: 1,
				spells_and_abilities: [],
				relationships: []
			}
		};

		createFamilyRelationship(
			npcState,
			"marie", "Marie", "sister",
			"pierre", "Pierre", "brother"
		);

		// Verify that Marie has Pierre as brother
		const marieRelation = getRelationship(npcState, "marie", "Pierre");
		expect(marieRelation).toBeDefined();
		expect(marieRelation?.specific_role).toBe("brother");
		expect(marieRelation?.relationship_type).toBe("family");

		// Verify that Pierre has Marie as sister  
		const pierreRelation = getRelationship(npcState, "pierre", "Marie");
		expect(pierreRelation).toBeDefined();
		expect(pierreRelation?.specific_role).toBe("sister");
		expect(pierreRelation?.relationship_type).toBe("family");
	});

	it('should validate consistent family relationships', () => {
		const npcState: NPCState = {
			"marie": {
				known_names: ["Marie"],
				is_party_member: false,
				class: "Test", 
				rank_enum_english: "Weak",
				level: 1,
				spells_and_abilities: [],
				relationships: []
			},
			"pierre": {
				known_names: ["Pierre"],
				is_party_member: false,
				class: "Test",
				rank_enum_english: "Weak", 
				level: 1,
				spells_and_abilities: [],
				relationships: []
			}
		};

		createFamilyRelationship(
			npcState,
			"marie", "Marie", "sister", 
			"pierre", "Pierre", "brother"
		);

		const errors = validateFamilyRelationships(npcState);
		expect(errors).toHaveLength(0);
	});

	it('should detect inconsistent family relationships', () => {
		const npcState: NPCState = {
			"marie": {
				known_names: ["Marie"],
				is_party_member: false,
				class: "Test",
				rank_enum_english: "Weak",
				level: 1, 
				spells_and_abilities: [],
				relationships: [{
					target_npc_id: "pierre",
					target_name: "Pierre",
					relationship_type: "family",
					specific_role: "sister", // Marie says Pierre is her sister
					emotional_bond: "positive",
					description: "Test"
				}]
			},
			"pierre": {
				known_names: ["Pierre"],
				is_party_member: false,
				class: "Test",
				rank_enum_english: "Weak",
				level: 1,
				spells_and_abilities: [],
				relationships: [{
					target_npc_id: "marie",
					target_name: "Marie",
					relationship_type: "family", 
					specific_role: "father", // Pierre says Marie is his father
					emotional_bond: "positive",
					description: "Test"
				}]
			}
		};

		const errors = validateFamilyRelationships(npcState);
		expect(errors.length).toBeGreaterThan(0);
		expect(errors[0]).toContain("Inconsistent family relationship");
	});

	it('should not create duplicate relationships', () => {
		const npcState: NPCState = {
			"marie": {
				known_names: ["Marie"],
				is_party_member: false,
				class: "Test",
				rank_enum_english: "Weak", 
				level: 1,
				spells_and_abilities: [],
				relationships: []
			}
		};

		const relationship = {
			target_name: "Pierre",
			relationship_type: "family" as const,
			specific_role: "brother",
			emotional_bond: "positive" as const,
			description: "Test"
		};

		addRelationship(npcState, "marie", relationship);
		addRelationship(npcState, "marie", relationship); // Same relationship added twice

		expect(npcState.marie.relationships).toHaveLength(1);
	});
});
