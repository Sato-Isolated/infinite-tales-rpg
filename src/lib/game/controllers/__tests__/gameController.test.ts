import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGameController, type ControllerCtx } from '../gameController';

// Minimal helpers to build a ControllerCtx with spies/mocks
function makeCtx(overrides: Partial<ControllerCtx> = {} as any): ControllerCtx {
	const noop = () => { };
	const getFalse = () => false;
	const getUndefined = () => undefined as any;

	const defaultCtx: ControllerCtx = {
		agents: {
			// Only methods used by the paths we test need mocks
			gameAgent: {
				generateStoryProgression: vi
					.fn()
					.mockResolvedValue({ newState: undefined, updatedHistoryMessages: [] })
			} as any,
			summaryAgent: {
				retrieveRelatedHistory: vi.fn().mockResolvedValue({ relatedDetails: [] })
			} as any,
			actionAgent: {
				generateSingleAction: vi.fn().mockResolvedValue({ text: 'mocked', is_possible: true })
			} as any,
			combatAgent: {} as any,
			eventAgent: {} as any,
			characterAgent: {} as any,
			characterStatsAgent: {} as any
		},
		state: {
			getCurrentGameActionState: () => ({ is_character_in_combat: false }) as any,
			isGameEnded: { value: false },
			isAiGeneratingState: { get: getFalse, set: vi.fn() },
			didAIProcessActionState: { get: getFalse, set: vi.fn() },
			resetShowXLastStoryProgressions: vi.fn(),
			storyChunkReset: vi.fn(),

			playerCharacterId: 'pc1',
			playerCharactersGameState: {
				value: {
					pc1: {
						XP: { current_value: 0, max_value: 0, game_ends_when_zero: false }
					}
				}
			} as any,
			playerCharactersIdToNamesMapState: { value: {} as any },
			npcState: { value: {} as any },
			inventoryState: { value: {} as any },
			systemInstructionsState: {
				value: {
					generalSystemInstruction: '',
					storyAgentInstruction: '',
					combatAgentInstruction: '',
					actionAgentInstruction: ''
				} as any
			},
			storyState: { value: { title: 'tale', content_rating: 'safe' } as any },
			historyMessagesState: { value: [] as any },
			characterActionsState: { value: [] as any },
			thoughtsState: { value: {} as any },
			gameActionsState: { value: [] as any },
			characterState: { value: { name: 'Hero' } as any },
			characterStatsState: { value: { resources: {}, spells_and_abilities: [] } as any },
			eventEvaluationState: { value: {} as any },
			relatedStoryHistoryState: { value: { relatedDetails: [] } },
			relatedActionHistoryState: { value: ['stub'] },
			customMemoriesState: { value: undefined },
			customGMNotesState: { value: undefined },
			additionalStoryInputState: { value: '' },
			additionalActionInputState: { value: '' },
			chosenActionState: { value: {} as any },
			gameSettingsState: { value: { aiIntroducesSkills: false, randomEventsHandling: 'none' } },
			gameTimeState: {
				value: {
					day: 1,
					dayName: 'Moonday',
					month: 1,
					monthName: 'Firstfall',
					year: 1000,
					hour: 12,
					minute: 0,
					timeOfDay: 'midday'
				} as any
			},
			useDynamicCombat: { value: false }
		},
		modals: {
			// Mock modal manager
			setCustomActionImpossibleReason: vi.fn(),
			setGMQuestion: vi.fn(),
			setCustomDiceRollNotation: vi.fn(),
			setItemForSuggestActions: vi.fn(),
			setLevelUpState: vi.fn()
		} as any,
		helpers: {
			addAdditionalStoryInput: vi.fn(async (_a: any, v: string) => v),
			openDiceRollDialog: vi.fn(),
			handleError: vi.fn(),
			resetStatesAfterActionProcessed: vi.fn(),
			checkGameEnded: vi.fn(async () => { }),
			getRelatedHistoryForStory: vi.fn(),
			checkForNewNPCs: vi.fn(),
			checkForLevelUp: vi.fn(),
			onStoryStreamUpdate: vi.fn(),
			onThoughtStreamUpdate: vi.fn(),
			applyGameEventEvaluation: vi.fn(),
			getCurrentDiceRollResult: vi.fn(() => 'regular_success' as any),
			setGMQuestion: vi.fn(),
			setCustomDiceRollNotation: vi.fn(),
			setCustomActionImpossibleReason: vi.fn(),
			setItemForSuggestActions: vi.fn(),
			setLevelUpState: vi.fn()
		},
		skills: {
			skillsProgressionForCurrentActionState: { get: getUndefined, set: vi.fn() },
			addSkillProgression: vi.fn(),
			advanceSkillIfApplicable: vi.fn(),
			determineProgressionForAction: vi.fn(() => 1),
			addSkillsIfApplicable: vi.fn()
		}
	};

	// Allow overriding any nested part
	return {
		...defaultCtx,
		...(overrides as any),
		agents: { ...defaultCtx.agents, ...(overrides as any).agents },
		state: { ...defaultCtx.state, ...(overrides as any).state },
		helpers: { ...defaultCtx.helpers, ...(overrides as any).helpers },
		skills: { ...defaultCtx.skills, ...(overrides as any).skills }
	} as ControllerCtx;
}

describe('gameController smoke', () => {
	let ctx: ControllerCtx;

	beforeEach(() => {
		ctx = makeCtx();
	});

	it('onCustomActionSubmitted: Game Command appends sudo and calls sendAction', async () => {
		const controller = createGameController(ctx);

		await controller.onCustomActionSubmitted('Do something impossible', false, 'Game Command');

		expect(ctx.state.additionalStoryInputState.value).toContain('sudo:');
		// sendAction is closed over; assert via side-effects
		expect(ctx.state.isAiGeneratingState.set).toHaveBeenCalledWith(true);
		expect(ctx.helpers.handleError).not.toHaveBeenCalled();
	});

	it('handleUtilityAction: short rest routes to sendAction', async () => {
		const controller = createGameController(ctx);

		controller.handleUtilityAction('short-rest');

		expect(ctx.state.isAiGeneratingState.set).toHaveBeenCalledWith(true);
		expect(ctx.helpers.handleError).not.toHaveBeenCalled();
	});

	it('handleUtilityAction: long rest routes to sendAction', async () => {
		const controller = createGameController(ctx);

		controller.handleUtilityAction('long-rest');

		expect(ctx.state.isAiGeneratingState.set).toHaveBeenCalledWith(true);
		expect(ctx.helpers.handleError).not.toHaveBeenCalled();
	});

	it('generateActionFromCustomInput preserves user text verbatim over LLM', async () => {
		// Arrange
		const localCtx = makeCtx({
			agents: {
				actionAgent: ({
					generateSingleAction: vi.fn().mockResolvedValue({
						text: 'AI changed this text',
						is_possible: true,
						action_difficulty: 'EASY'
					})
				} as any)
			}
		} as any);
		const controller = createGameController(localCtx);

		const userText = 'Open the locked chest silently';

		// Act
		await controller.generateActionFromCustomInput({
			characterName: 'Hero',
			text: userText,
			is_custom_action: true
		} as any);

		// Assert
		expect(localCtx.state.chosenActionState.value.text).toBe(userText);
	});

	it('handleTargetedSpellsOrAbility preserves user text with targets verbatim', async () => {
		// Arrange
		const localCtx = makeCtx({
			agents: {
				actionAgent: ({
					generateSingleAction: vi.fn().mockResolvedValue({
						text: 'AI different',
						is_possible: true
					})
				} as any)
			}
		} as any);
		const controller = createGameController(localCtx);

		const baseText = 'Cast healing word';
		const targets = ['Ally-1', 'Ally-2'];

		// Act
		await controller.handleTargetedSpellsOrAbility({
			characterName: 'Cleric',
			text: baseText
		} as any, targets);

		// Assert
		const chosen = localCtx.state.chosenActionState.value;
		expect(chosen.text.startsWith(baseText)).toBe(true);
		expect(chosen.text).toContain('Targets: Ally-1, Ally-2');
	});
});
