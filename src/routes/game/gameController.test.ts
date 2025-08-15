import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGameController, type ControllerCtx } from './gameController';

// Minimal helpers to build a ControllerCtx with spies/mocks
function makeCtx(overrides: Partial<ControllerCtx> = {} as any): ControllerCtx {
  const noop = () => { };
  const getFalse = () => false;
  const getUndefined = () => undefined as any;

  const defaultCtx: ControllerCtx = {
    agents: {
      // Only methods used by the paths we test need mocks
      gameAgent: {
        generateStoryProgression: vi.fn().mockResolvedValue({ newState: undefined, updatedHistoryMessages: [] })
      } as any,
      summaryAgent: {} as any,
      actionAgent: {
        generateSingleAction: vi.fn().mockResolvedValue({ text: 'mocked', is_possible: true })
      } as any,
      combatAgent: {} as any,
      campaignAgent: {} as any,
      eventAgent: {} as any,
      characterAgent: {} as any,
      characterStatsAgent: {} as any
    },
    state: {
      getCurrentGameActionState: () => ({ is_character_in_combat: false } as any),
      isGameEnded: { value: false },
      isAiGeneratingState: { get: getFalse, set: vi.fn() },
      didAIProcessActionState: { get: getFalse, set: vi.fn() },
      resetShowXLastStoryProgressions: vi.fn(),
      storyChunkReset: vi.fn(),

      playerCharacterId: 'pc1',
      playerCharactersGameState: { pc1: { XP: 0 } } as any,
      playerCharactersIdToNamesMapState: { value: {} as any },
      npcState: { value: {} as any },
      inventoryState: { value: {} as any },
      systemInstructionsState: { value: { generalSystemInstruction: '', storyAgentInstruction: '', combatAgentInstruction: '', actionAgentInstruction: '' } as any },
      storyState: { value: { title: 'tale' } as any },
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
      addCampaignAdditionalStoryInput: vi.fn(async (_a: any, v: string) => v),
      getGameMasterNotesForCampaignChapter: vi.fn(() => []),
      getCurrentCampaignChapter: vi.fn(() => undefined),
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
});
