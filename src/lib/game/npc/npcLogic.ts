import type { NPCState, Relationship } from '$lib/ai/agents/characterStatsAgent';
import type { Targets } from '$lib/types/gameState';
import { getAllNpcsIds } from '../logic/gameLogic';

export function removeDeadNPCs(npcState: NPCState): string[] {
	if (!npcState) return [];
	return Object.keys(npcState)
		.filter((npc) => npcState[npc].resources && npcState[npc].resources.current_hp <= 0)
		.map((deadNPC) => {
			delete npcState[deadNPC];
			return deadNPC;
		});
}

export function addNPCNamesToState(npcs: Targets, npcState: NPCState) {
	getAllNpcsIds(npcs).forEach((npcId) => {
		const npc = npcState[npcId.uniqueTechnicalNameId];
		if (!npc) return;
		if (!npc.known_names) {
			npc.known_names = [];
		}
		if (!npc.known_names.includes(npcId.displayName)) {
			npc.known_names.push(npcId.displayName);
		}
	});
}

/**
 * Adds a relationship between two NPCs or between an NPC and the player
 */
export function addRelationship(
	npcState: NPCState,
	npcId: string,
	relationship: Relationship
): void {
	const npc = npcState[npcId];
	if (!npc) return;

	if (!npc.relationships) {
		npc.relationships = [];
	}

	// Check if the relationship already exists to avoid duplicates
	const existingRelation = npc.relationships.find(
		r => r.target_name === relationship.target_name &&
			r.relationship_type === relationship.relationship_type
	);

	if (!existingRelation) {
		npc.relationships.push(relationship);
	}
}

/**
 * Finds the relationship of an NPC with a specific target
 */
export function getRelationship(
	npcState: NPCState,
	npcId: string,
	targetName: string
): Relationship | undefined {
	const npc = npcState[npcId];
	if (!npc?.relationships) return undefined;

	return npc.relationships.find(r => r.target_name === targetName);
}

/**
 * Validates the consistency of family relationships between NPCs
 */
export function validateFamilyRelationships(npcState: NPCState): string[] {
	const errors: string[] = [];

	Object.entries(npcState).forEach(([npcId, npc]) => {
		if (!npc.relationships) return;

		npc.relationships.forEach(relationship => {
			if (relationship.relationship_type === 'family') {
				// Check that family relationships are consistent
				if (relationship.target_npc_id) {
					const targetNpc = npcState[relationship.target_npc_id];
					if (targetNpc?.relationships) {
						const reciprocalRelation = targetNpc.relationships.find(
							r => r.target_npc_id === npcId && r.relationship_type === 'family'
						);

						if (!reciprocalRelation) {
							errors.push(
								`Missing family relationship: ${npcId} considers ${relationship.target_name} as ${relationship.specific_role}, but the reciprocal relationship does not exist`
							);
						} else {
							// Validate that roles are compatible
							const validPairs = [
								['sister', 'brother'], ['brother', 'sister'],
								['father', 'son'], ['father', 'daughter'],
								['mother', 'son'], ['mother', 'daughter'],
								['son', 'father'], ['son', 'mother'],
								['daughter', 'father'], ['daughter', 'mother']
							];

							const isValidPair = validPairs.some(
								pair => (pair[0] === relationship.specific_role && pair[1] === reciprocalRelation.specific_role) ||
									(pair[1] === relationship.specific_role && pair[0] === reciprocalRelation.specific_role)
							);

							if (!isValidPair) {
								errors.push(
									`Inconsistent family relationship: ${npcId} (${relationship.specific_role}) and ${relationship.target_name} (${reciprocalRelation.specific_role})`
								);
							}
						}
					}
				}
			}
		});
	});

	return errors;
}

/**
 * Generates relational context for AI concerning a specific NPC
 */
export function generateRelationshipContext(
	npcState: NPCState,
	npcId: string,
	playerName: string = "CHARACTER"
): string {
	const npc = npcState[npcId];
	if (!npc?.relationships || npc.relationships.length === 0) {
		return "";
	}

	let context = `\n=== RELATIONAL CONTEXT FOR ${npcId} ===\n`;

	npc.relationships.forEach(rel => {
		const emotionalTone = {
			'very_negative': 'deeply despises',
			'negative': 'dislikes',
			'neutral': 'has a neutral relationship with',
			'positive': 'appreciates',
			'very_positive': 'adores'
		}[rel.emotional_bond];

		if (rel.target_npc_id) {
			context += `• ${rel.specific_role || rel.relationship_type} of ${rel.target_name} - ${emotionalTone} this person\n`;
		} else {
			context += `• Relationship with ${playerName}: ${rel.specific_role || rel.relationship_type} - ${emotionalTone} the player\n`;
		}

		if (rel.description) {
			context += `  └─ ${rel.description}\n`;
		}
	});

	if (npc.speech_patterns) {
		context += `• Speaking style: ${npc.speech_patterns}\n`;
	}

	if (npc.personality_traits && npc.personality_traits.length > 0) {
		context += `• Personality traits: ${npc.personality_traits.join(', ')}\n`;
	}

	if (npc.background_notes) {
		context += `• Personal background: ${npc.background_notes}\n`;
	}

	context += "=== END RELATIONAL CONTEXT ===\n";

	return context;
}

/**
 * Creates bidirectional family relationships
 */
export function createFamilyRelationship(
	npcState: NPCState,
	npc1Id: string,
	npc1Name: string,
	npc1Role: string,
	npc2Id: string,
	npc2Name: string,
	npc2Role: string,
	emotionalBond: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive' = 'positive',
	description?: string
): void {
	// Relationship from npc1 to npc2
	addRelationship(npcState, npc1Id, {
		target_npc_id: npc2Id,
		target_name: npc2Name,
		relationship_type: 'family',
		specific_role: npc2Role,
		emotional_bond: emotionalBond,
		description: description || `Family relationship: ${npc1Role} of ${npc2Name}`
	});

	// Reciprocal relationship from npc2 to npc1
	addRelationship(npcState, npc2Id, {
		target_npc_id: npc1Id,
		target_name: npc1Name,
		relationship_type: 'family',
		specific_role: npc1Role,
		emotional_bond: emotionalBond,
		description: description || `Family relationship: ${npc2Role} of ${npc1Name}`
	});
}
