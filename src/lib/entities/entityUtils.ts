import type { Targets } from '$lib/ai/agents/gameAgent.js';
import type { NpcID, NPCState } from '$lib/ai/agents/characterStatsAgent.js';
import type { StatsUpdate } from '$lib/ai/agents/combatAgent.js';
import { getEntityCoordinator } from '$lib/services/entityCoordinator.js';

function getNPCTechnicalID(npc: NpcID): string {
	return npc.uniqueTechnicalNameId;
}

export function getAllTargetsAsList(targets: Targets): Array<string> {
	if (!targets || !targets.hostile) {
		return [];
	}
	return [
		...targets.hostile.map(getNPCTechnicalID),
		...targets.neutral.map(getNPCTechnicalID),
		...targets.friendly.map(getNPCTechnicalID)
	];
}

export function getAllNpcsIds(targets: Targets): Array<NpcID> {
	if (!targets || !targets.hostile) {
		return [];
	}
	return [...targets.hostile, ...targets.neutral, ...targets.friendly];
}

export function getNewNPCs(targets: Targets, npcState?: NPCState): Array<NpcID> {
	const allNpcIds = getAllNpcsIds(targets);

	// Utiliser EntityCoordinator au lieu de NPCState
	const entityCoordinator = getEntityCoordinator();
	const existingNPCs = entityCoordinator.getAllNPCs();
	const existingNPCIds = existingNPCs.map(npc => npc.id);

	// Fallback vers l'ancien système si nécessaire (transition période)
	if (npcState && Object.keys(npcState).length > 0) {
		console.warn('⚠️ Using legacy NPCState - consider migrating to EntityCoordinator');
		return allNpcIds.filter(
			(newNPC) => !Object.keys(npcState).includes(newNPC.uniqueTechnicalNameId)
		);
	}

	// Version moderne avec EntityCoordinator
	return allNpcIds.filter(
		(newNPC) => !existingNPCIds.includes(newNPC.uniqueTechnicalNameId)
	);
}

/**
 * Version moderne qui utilise EntityCoordinator pour vérifier les entités existantes
 */
export function getUnifiedNewEntities(targets: Targets): Array<NpcID> {
	const entityCoordinator = getEntityCoordinator();
	const allTargetIds = getAllNpcsIds(targets);

	// Récupérer toutes les entités (NPCs + compagnons)
	const allNPCs = entityCoordinator.getAllNPCs();
	const allCompanions = entityCoordinator.getActiveCompanions();
	const existingEntityIds = [
		...allNPCs.map(npc => npc.id),
		...allCompanions.map(companion => companion.id)
	];

	return allTargetIds.filter(target =>
		!existingEntityIds.includes(target.uniqueTechnicalNameId)
	);
}

/**
 * Synchronise les stats d'une entité avec l'EntityCoordinator
 */
export function syncEntityStatsFromUpdate(statsUpdate: StatsUpdate): boolean {
	const entityCoordinator = getEntityCoordinator();
	const entity = entityCoordinator.findEntityByName(statsUpdate.targetName);

	if (!entity) {
		console.log(`🔍 Entity not found for stats update: ${statsUpdate.targetName}`);
		return false;
	}

	const resourceKey = statsUpdate.type.replace('_gained', '').replace('_lost', '').toUpperCase();
	const value = parseInt(statsUpdate.value.result) || 0;

	if (!entity.resources[resourceKey]) {
		console.log(`❌ Resource ${resourceKey} not found for entity ${entity.id}`);
		return false;
	}

	let newValue = entity.resources[resourceKey].current_value;

	if (statsUpdate.type.includes('_gained')) {
		newValue = Math.min(
			entity.resources[resourceKey].current_value + Math.abs(value),
			entity.resources[resourceKey].max_value
		);
	} else if (statsUpdate.type.includes('_lost')) {
		newValue = Math.max(
			entity.resources[resourceKey].current_value - Math.abs(value),
			0
		);
	}

	// Utiliser EntityCoordinator pour synchroniser
	entityCoordinator.syncEntityStats(entity.id, {
		[resourceKey]: {
			...entity.resources[resourceKey],
			current_value: newValue
		}
	});

	console.log(`✅ Synced ${resourceKey} for ${entity.id}: ${entity.resources[resourceKey].current_value} → ${newValue}`);
	return true;
}
