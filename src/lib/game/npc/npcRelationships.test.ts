/**
 * Tests pour le système de relations NPCs
 */

import { describe, it, expect } from 'vitest';
import type { NPCState } from '$lib/ai/agents/characterStatsAgent';
import { 
	addRelationship, 
	createFamilyRelationship, 
	validateFamilyRelationships, 
	getRelationship 
} from './npcLogic';

describe('Système de relations NPCs', () => {
	it('devrait créer des relations familiales bidirectionnelles correctes', () => {
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

		// Vérifier que Marie a Pierre comme frère
		const marieRelation = getRelationship(npcState, "marie", "Pierre");
		expect(marieRelation).toBeDefined();
		expect(marieRelation?.specific_role).toBe("brother");
		expect(marieRelation?.relationship_type).toBe("family");

		// Vérifier que Pierre a Marie comme sœur  
		const pierreRelation = getRelationship(npcState, "pierre", "Marie");
		expect(pierreRelation).toBeDefined();
		expect(pierreRelation?.specific_role).toBe("sister");
		expect(pierreRelation?.relationship_type).toBe("family");
	});

	it('devrait valider les relations familiales cohérentes', () => {
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

	it('devrait détecter les relations familiales incohérentes', () => {
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
					specific_role: "sister", // Marie dit que Pierre est sa sœur
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
					specific_role: "father", // Pierre dit que Marie est son père
					emotional_bond: "positive",
					description: "Test"
				}]
			}
		};

		const errors = validateFamilyRelationships(npcState);
		expect(errors.length).toBeGreaterThan(0);
		expect(errors[0]).toContain("incohérente");
	});

	it('ne devrait pas créer de relations en double', () => {
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
		addRelationship(npcState, "marie", relationship); // Même relation ajoutée deux fois

		expect(npcState.marie.relationships).toHaveLength(1);
	});
});
