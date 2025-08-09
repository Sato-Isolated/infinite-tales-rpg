import { describe, it, expect, beforeEach } from 'vitest';
import { getNewNPCs, getUnifiedNewEntities } from '../entityUtils';
import type { Targets } from '$lib/ai/agents/gameAgent';
import { getEntityCoordinator, resetEntityCoordinator } from '$lib/services/entityCoordinator';

function buildTargets(names: Array<{ id: string; name: string }>): Targets {
	return {
		hostile: [],
		neutral: names.map(n => ({ uniqueTechnicalNameId: n.id, displayName: n.name })),
		friendly: []
	};
}

describe('entityUtils deduplication', () => {
	beforeEach(() => {
		resetEntityCoordinator();
	});

	it('filters out NPCs whose displayName matches existing companion names (getNewNPCs)', () => {
		const ec = getEntityCoordinator();
		// Create a companion entity named "Aria Stark"
		ec.createEntity(
			'companion',
			{
				name: 'Aria Stark',
				class: 'Rogue',
				race: 'Human',
				gender: 'Female',
				alignment: 'Neutral',
				appearance: 'Agile and swift',
				personality: 'Clever',
				background: 'From the North',
				motivation: 'Adventure'
			} as any,
			{ HP: { max_value: 30, current_value: 30, game_ends_when_zero: true } } as any,
			0
		);

		const targets = buildTargets([
			{ id: 'npc-1', name: 'Aria Stark' }, // duplicate by name
			{ id: 'npc-2', name: 'Bob the Merchant' }
		]);

		const result = getNewNPCs(targets);
		expect(result.map(r => r.uniqueTechnicalNameId)).toEqual(['npc-2']);
	});

	it('filters out NPCs whose displayName matches existing companion names (getUnifiedNewEntities)', () => {
		const ec = getEntityCoordinator();
		// Create a companion entity named "Li-Ming"
		ec.createEntity(
			'companion',
			{
				name: "Li-Ming",
				class: 'Wizard',
				race: 'Human',
				gender: 'Female',
				alignment: 'Neutral',
				appearance: 'Robed mage',
				personality: 'Curious',
				background: 'Wanderer',
				motivation: 'Knowledge'
			} as any,
			{ HP: { max_value: 25, current_value: 25, game_ends_when_zero: true } } as any,
			0
		);

		const targets = buildTargets([
			{ id: 'npc-10', name: "Li Ming" }, // variation without hyphen should conflict
			{ id: 'npc-11', name: 'Ragnar' }
		]);

		const result = getUnifiedNewEntities(targets);
		expect(result.map(r => r.uniqueTechnicalNameId)).toEqual(['npc-11']);
	});
});
