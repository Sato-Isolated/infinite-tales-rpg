import {
	defaultGameSettings,
	type GameActionState,
	type GameSettings
} from '$lib/ai/agents/gameAgent';

export const migrateIfApplicable = (key: string, state: unknown) => {
	if (!state) return state;
	let migrated = migrate051to06(key, state);
	migrated = migrate062to07(key, migrated);
	migrated = migrate09to10(key, migrated);
	migrated = migrate11to11_1(key, migrated);
	migrated = migrateNPCState(key, migrated);
	return migrated;
};

function migrate11to11_1(key: string, state: any) {
	if (key === 'gameSettingsState') {
		(state as GameSettings).randomEventsHandling = defaultGameSettings().randomEventsHandling;
	}
	return state;
}

function migrate09to10(key: string, state: any) {
	if (key === 'gameActionsState') {
		(state as GameActionState[]).forEach((action: any) => {
			if (action.stats_update) {
				action.stats_update.forEach((stat: any) => {
					if (stat.targetName) {
						return;
					}
					stat.targetName = stat.targetId;
					stat.sourceName = stat.sourceId;
				});
			}
		});
	}
	return state;
}

function migrate051to06(key: string, state: any) {
	if (key === 'characterStatsState') {
		//migrate saves before level feature
		if (!state.level) {
			state.level = 1;
		}
	}
	return state;
}

function migrate062to07(key: string, state: any) {
	if (key === 'characterStatsState') {
		if (state.resources.MAX_HP) {
			state.resources.HP = {
				max_value: state.resources.MAX_HP,
				start_value: state.resources.MAX_HP,
				game_ends_when_zero: true
			};
			state.resources.MP = {
				max_value: state.resources.MAX_MP,
				start_value: state.resources.MAX_MP,
				game_ends_when_zero: false
			};
			delete state.resources.MAX_HP;
			delete state.resources.MAX_MP;
		}
		state.spells_and_abilities.forEach((spell: any) => {
			if (spell.mp_cost) {
				spell.resource_cost = { cost: spell.mp_cost, resource_key: 'MP' };
				delete spell.mp_cost;
			}
		});
	}
	return state;
}

function migrateNPCState(key: string, state: any) {
	if (key === 'npcState') {
		// If the state is an array (old format), convert to object (new format)
		if (Array.isArray(state)) {
			console.log('Migrating npcState from array to object format. Previous array data will be reset to empty object.');
			return {};
		}
	}
	return state;
}
