import { describe, it, expect } from 'vitest';
import { mapStatsUpdateToGameLogic } from '../resourceUtils';
import type { StatsUpdate } from '$lib/ai/agents/combatAgent';

function makeXPUpdate(val: string): StatsUpdate {
	return {
		sourceName: 'Tester',
		targetName: 'Hero',
		type: 'xp_gained',
		value: { result: val }
	} as unknown as StatsUpdate;
}

describe('resourceUtils mapStatsUpdateToGameLogic', () => {
	it('maps SMALL|MEDIUM|HIGH XP to numeric values', () => {
		const small = mapStatsUpdateToGameLogic(makeXPUpdate('SMALL'));
		const med = mapStatsUpdateToGameLogic(makeXPUpdate('MEDIUM'));
		const high = mapStatsUpdateToGameLogic(makeXPUpdate('HIGH'));

		expect(typeof small.value.result).toBe('number');
		expect(typeof med.value.result).toBe('number');
		expect(typeof high.value.result).toBe('number');
		// ensure ordering SMALL < MEDIUM < HIGH according to scale
		expect(small.value.result).toBeLessThan(med.value.result);
		expect(med.value.result).toBeLessThan(high.value.result);
	});

	it('keeps value when not a known XP token', () => {
		const upd = mapStatsUpdateToGameLogic(makeXPUpdate('UNKNOWN'));
		expect(upd.value.result).toBe('UNKNOWN');
	});
});
