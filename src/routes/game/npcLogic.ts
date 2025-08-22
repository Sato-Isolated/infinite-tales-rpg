import type { NPCState, Relationship } from '$lib/ai/agents/characterStatsAgent';
import type { Targets } from '$lib/ai/agents/gameAgent';
import { getAllNpcsIds } from './gameLogic';

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
 * Ajoute une relation entre deux NPCs ou entre un NPC et le joueur
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
	
	// Vérifier si la relation existe déjà pour éviter les doublons
	const existingRelation = npc.relationships.find(
		r => r.target_name === relationship.target_name && 
		r.relationship_type === relationship.relationship_type
	);
	
	if (!existingRelation) {
		npc.relationships.push(relationship);
	}
}

/**
 * Trouve la relation d'un NPC avec une cible spécifique
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
 * Valide la cohérence des relations familiales entre NPCs
 */
export function validateFamilyRelationships(npcState: NPCState): string[] {
	const errors: string[] = [];
	
	Object.entries(npcState).forEach(([npcId, npc]) => {
		if (!npc.relationships) return;
		
		npc.relationships.forEach(relationship => {
			if (relationship.relationship_type === 'family') {
				// Vérifier que les relations familiales sont cohérentes
				if (relationship.target_npc_id) {
					const targetNpc = npcState[relationship.target_npc_id];
					if (targetNpc?.relationships) {
						const reciprocalRelation = targetNpc.relationships.find(
							r => r.target_npc_id === npcId && r.relationship_type === 'family'
						);
						
						if (!reciprocalRelation) {
							errors.push(
								`Relation familiale manquante: ${npcId} considère ${relationship.target_name} comme ${relationship.specific_role}, mais la relation réciproque n'existe pas`
							);
						} else {
							// Valider que les rôles sont compatibles
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
									`Relation familiale incohérente: ${npcId} (${relationship.specific_role}) et ${relationship.target_name} (${reciprocalRelation.specific_role})`
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
 * Génère un contexte relationnel pour l'IA concernant un NPC spécifique
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
	
	let context = `\n=== CONTEXTE RELATIONNEL POUR ${npcId} ===\n`;
	
	npc.relationships.forEach(rel => {
		const emotionalTone = {
			'very_negative': 'déteste profondément',
			'negative': 'n\'aime pas',
			'neutral': 'a une relation neutre avec',
			'positive': 'apprécie',
			'very_positive': 'adore'
		}[rel.emotional_bond];
		
		if (rel.target_npc_id) {
			context += `• ${rel.specific_role || rel.relationship_type} de ${rel.target_name} - ${emotionalTone} cette personne\n`;
		} else {
			context += `• Relation avec ${playerName}: ${rel.specific_role || rel.relationship_type} - ${emotionalTone} le joueur\n`;
		}
		
		if (rel.description) {
			context += `  └─ ${rel.description}\n`;
		}
	});
	
	if (npc.speech_patterns) {
		context += `• Façon de parler: ${npc.speech_patterns}\n`;
	}
	
	if (npc.personality_traits && npc.personality_traits.length > 0) {
		context += `• Traits de personnalité: ${npc.personality_traits.join(', ')}\n`;
	}
	
	if (npc.background_notes) {
		context += `• Contexte personnel: ${npc.background_notes}\n`;
	}
	
	context += "=== FIN CONTEXTE RELATIONNEL ===\n";
	
	return context;
}

/**
 * Crée des relations familiales bidirectionnelles
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
	// Relation de npc1 vers npc2
	addRelationship(npcState, npc1Id, {
		target_npc_id: npc2Id,
		target_name: npc2Name,
		relationship_type: 'family',
		specific_role: npc2Role,
		emotional_bond: emotionalBond,
		description: description || `Relation familiale: ${npc1Role} de ${npc2Name}`
	});
	
	// Relation réciproque de npc2 vers npc1
	addRelationship(npcState, npc2Id, {
		target_npc_id: npc1Id,
		target_name: npc1Name,
		relationship_type: 'family',
		specific_role: npc1Role,
		emotional_bond: emotionalBond,
		description: description || `Relation familiale: ${npc2Role} de ${npc1Name}`
	});
}
