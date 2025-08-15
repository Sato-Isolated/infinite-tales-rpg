import { GameAgent, type Action, type GameActionState, type InventoryState, type PlayerCharactersGameState, type PlayerCharactersIdToNamesMap } from '$lib/ai/agents/gameAgent';
import type { LLMMessage, SystemInstructionsState } from '$lib/ai/llm';
import type { Story } from '$lib/ai/agents/storyAgent';
import type { CharacterDescription } from '$lib/ai/agents/characterAgent';
import type { CharacterStats, NPCState } from '$lib/ai/agents/characterStatsAgent';
import { CombatAgent } from '$lib/ai/agents/combatAgent';
import type { ActionAgent } from '$lib/ai/agents/actionAgent';
import type { SummaryAgent } from '$lib/ai/agents/summaryAgent';
import type { CampaignAgent, CampaignChapter } from '$lib/ai/agents/campaignAgent';
import type { EventAgent, EventEvaluation, CharacterChangedInto } from '$lib/ai/agents/eventAgent';
import * as gameLogic from './gameLogic';
import * as npcLogic from './npcLogic';
import { getLatestStoryMessagesFromHistory } from './memoryLogic/messages';
import { CombatAgent as CombatAgentStatic } from '$lib/ai/agents/combatAgent';
import { stringifyPretty } from '$lib/util.svelte';
import type { ThoughtsState } from '$lib/util.svelte';
import type { DiceRollResult } from '$lib/components/interaction_modals/dice/diceRollLogic';
import { getSkillIfApplicable, applyCharacterChange, addCharacterToPlayerCharactersIdToNamesMap } from './characterLogic';
import { refillResourcesFully } from './resourceLogic';
import type { Ability } from '$lib/ai/agents/characterStatsAgent';

export type ControllerCtx = {
  agents: {
    gameAgent: GameAgent;
    summaryAgent: SummaryAgent;
    actionAgent: ActionAgent;
    combatAgent: CombatAgent;
    campaignAgent: CampaignAgent;
    eventAgent: EventAgent;
    characterAgent: import('$lib/ai/agents/characterAgent').CharacterAgent;
    characterStatsAgent: import('$lib/ai/agents/characterStatsAgent').CharacterStatsAgent;
  };
  state: {
    // primitives or getters to always read latest
    getCurrentGameActionState: () => GameActionState;
    isGameEnded: { value: boolean };
    isAiGeneratingState: { get: () => boolean; set: (v: boolean) => void };
    didAIProcessActionState: { get: () => boolean; set: (v: boolean) => void };
    resetShowXLastStoryProgressions: () => void;
    storyChunkReset: () => void;

    playerCharacterId: string;
    playerCharactersGameState: PlayerCharactersGameState;
    playerCharactersIdToNamesMapState: { value: PlayerCharactersIdToNamesMap };
    npcState: { value: NPCState };
    inventoryState: { value: InventoryState };
    systemInstructionsState: { value: SystemInstructionsState };
    storyState: { value: Story };
    historyMessagesState: { value: LLMMessage[] };
    characterActionsState: { value: Action[] };
    thoughtsState: { value: ThoughtsState };
    gameActionsState: { value: GameActionState[] };
    characterState: { value: CharacterDescription };
    characterStatsState: { value: CharacterStats };
    eventEvaluationState: { value: EventEvaluation };
    relatedStoryHistoryState: { value: { relatedDetails: Array<{ storyReference: string; relevanceScore: number }> } };
    relatedActionHistoryState: { value: string[] };
    customMemoriesState: { value: string | undefined };
    customGMNotesState: { value: string | undefined };
    additionalStoryInputState: { value: string };
    additionalActionInputState: { value: string };
    chosenActionState: { value: Action };
    gameSettingsState: { value: any };
    useDynamicCombat: { value: boolean };
  };
  helpers: {
    addCampaignAdditionalStoryInput: (action: Action, additionalStoryInput: string) => Promise<string>;
    getGameMasterNotesForCampaignChapter: (chapter: CampaignChapter | undefined, currentPlotPoint?: string) => string[];
    getCurrentCampaignChapter: () => CampaignChapter | undefined;
    openDiceRollDialog: () => void;
    handleError: (e: string) => void;
    resetStatesAfterActionProcessed: () => void;
    checkGameEnded: () => Promise<void>;
    getRelatedHistoryForStory: () => void;
    checkForNewNPCs: (newState: GameActionState) => void;
    checkForLevelUp: () => void;
    onStoryStreamUpdate: (chunk: string, isComplete: boolean) => void;
    onThoughtStreamUpdate: (chunk: string, isComplete: boolean) => void;
    applyGameEventEvaluation: (evaluated: any) => void;
    getCurrentDiceRollResult: () => DiceRollResult | undefined;
    setGMQuestion: (text: string) => void;
    setCustomDiceRollNotation: (notation: string) => void;
    setCustomActionImpossibleReason: (reason: 'not_enough_resource' | 'not_plausible' | undefined) => void;
  };
  skills: {
    skillsProgressionForCurrentActionState: { get: () => number | undefined; set: (v: number | undefined) => void };
    addSkillProgression: (skillName: string, progression: number) => void;
    advanceSkillIfApplicable: (skillName: string) => void;
    determineProgressionForAction: (action: Action, existing?: number) => number;
    addSkillsIfApplicable: (actions: Action[]) => void;
  };
};

export function createGameController(ctx: ControllerCtx) {
  async function getActionPromptForCombat(playerAction: Action) {
    const currentGameActionState = ctx.state.getCurrentGameActionState();
    const allNpcsDetailsAsList = gameLogic
      .getAllTargetsAsList(currentGameActionState.currently_present_npcs)
      .map((technicalId) => ({ technicalId, ...ctx.state.npcState.value[technicalId] }));

    const determinedActionsAndStatsUpdate = await ctx.agents.combatAgent.generateActionsFromContext(
      playerAction,
      ctx.state.playerCharactersGameState[ctx.state.playerCharacterId],
      ctx.state.inventoryState.value,
      allNpcsDetailsAsList,
      ctx.state.systemInstructionsState.value.generalSystemInstruction,
      ctx.state.systemInstructionsState.value.combatAgentInstruction,
      getLatestStoryMessagesFromHistory(ctx.state.historyMessagesState.value),
      ctx.state.storyState.value
    );

    gameLogic.applyGameActionState(
      ctx.state.playerCharactersGameState,
      ctx.state.playerCharactersIdToNamesMapState.value,
      ctx.state.npcState.value,
      ctx.state.inventoryState.value,
      structuredClone(determinedActionsAndStatsUpdate)
    );

    const aliveNPCs = allNpcsDetailsAsList
      .filter((npc: any) => npc?.resources && npc.resources.current_hp > 0)
      .map((npc: any) => npc.technicalId);

    const additionalStoryInput = CombatAgentStatic.getAdditionalStoryInput(
      determinedActionsAndStatsUpdate.actions,
      [],
      aliveNPCs,
      ctx.state.playerCharactersGameState
    );

    return { additionalStoryInput, determinedActionsAndStatsUpdate } as const;
  }

  async function getCombatAndNPCState(action: Action) {
    const currentGameActionState = ctx.state.getCurrentGameActionState();
    let additionalStoryInput = '';
    let allCombatDeterminedActionsAndStatsUpdate: any | undefined;
    if (!ctx.state.isGameEnded.value && currentGameActionState.is_character_in_combat) {
      if (ctx.state.useDynamicCombat.value) {
        const combatObject = await getActionPromptForCombat(action);
        additionalStoryInput += combatObject.additionalStoryInput;
        allCombatDeterminedActionsAndStatsUpdate = combatObject.determinedActionsAndStatsUpdate;
      }
    }
    const deadNPCs = npcLogic.removeDeadNPCs(ctx.state.npcState.value);
    additionalStoryInput += CombatAgentStatic.getNPCsHealthStatePrompt(deadNPCs);
    return { additionalStoryInput, allCombatDeterminedActionsAndStatsUpdate } as const;
  }

  async function prepareAdditionalStoryInput(action: Action, initialAdditionalStoryInput: string) {
    const currentGameActionState = ctx.state.getCurrentGameActionState();
    let additionalStoryInput = initialAdditionalStoryInput || '';
    const combatAndNPCState = await getCombatAndNPCState(action);
    additionalStoryInput += combatAndNPCState.additionalStoryInput;

    additionalStoryInput = await ctx.helpers.addCampaignAdditionalStoryInput(action, additionalStoryInput);

    const gmNotes = ctx.helpers.getGameMasterNotesForCampaignChapter(
      ctx.helpers.getCurrentCampaignChapter(),
      currentGameActionState.currentPlotPoint
    );
    if (ctx.state.customGMNotesState.value) gmNotes.unshift(ctx.state.customGMNotesState.value);
    additionalStoryInput += GameAgent.getPromptForGameMasterNotes(gmNotes);

    if (action.type?.toLowerCase() === 'crafting') {
      additionalStoryInput += GameAgent.getCraftingPrompt();
    }
    // Side-effects additions informed by latest dice roll result (if any)
    additionalStoryInput = gameLogic.addAdditionsFromActionSideeffects(
      action,
      additionalStoryInput,
      ctx.state.gameSettingsState.value.randomEventsHandling,
      currentGameActionState.is_character_in_combat,
      (ctx.helpers.getCurrentDiceRollResult() ?? 'regular_success') as DiceRollResult
    );
    if (!additionalStoryInput.includes('sudo')) {
      additionalStoryInput += '\n\nBefore responding always review the system instructions and apply the given rules.';
    }
    ctx.state.additionalStoryInputState.value = additionalStoryInput;
    return { finalAdditionalStoryInput: additionalStoryInput, combatAndNPCState } as const;
  }

  async function processStoryProgression(
    action: Action,
    additionalStoryInput: string,
    relatedHistory: string[],
    isCharacterInCombat: boolean,
    combatAndNPCState: { additionalStoryInput: string; allCombatDeterminedActionsAndStatsUpdate?: any }
  ) {
    const { newState, updatedHistoryMessages } = await ctx.agents.gameAgent.generateStoryProgression(
      ctx.helpers.onStoryStreamUpdate,
      ctx.helpers.onThoughtStreamUpdate,
      action,
      additionalStoryInput,
      ctx.state.systemInstructionsState.value.generalSystemInstruction,
      ctx.state.systemInstructionsState.value.storyAgentInstruction,
      isCharacterInCombat ? ctx.state.systemInstructionsState.value.combatAgentInstruction : '',
      ctx.state.historyMessagesState.value,
      ctx.state.storyState.value,
      ctx.state.characterState.value,
      ctx.state.playerCharactersGameState,
      ctx.state.inventoryState.value,
      relatedHistory,
      ctx.state.gameSettingsState.value
    );

    if (!newState?.story) return;

    ctx.helpers.checkForNewNPCs(newState);
    npcLogic.addNPCNamesToState(newState.currently_present_npcs, ctx.state.npcState.value);
    if (combatAndNPCState.allCombatDeterminedActionsAndStatsUpdate) {
      newState.stats_update =
        combatAndNPCState.allCombatDeterminedActionsAndStatsUpdate?.stats_update || newState.stats_update;
      gameLogic.applyInventoryUpdate(ctx.state.inventoryState.value, newState);
    } else {
      gameLogic.applyGameActionState(
        ctx.state.playerCharactersGameState,
        ctx.state.playerCharactersIdToNamesMapState.value,
        ctx.state.npcState.value,
        ctx.state.inventoryState.value,
        structuredClone(newState)
      );
    }
    console.log('new state', stringifyPretty(newState));
    ctx.state.historyMessagesState.value = updatedHistoryMessages;

    const skillName = getSkillIfApplicable(ctx.state.characterStatsState.value, action);
    if (skillName) {
      const existing = ctx.skills.skillsProgressionForCurrentActionState.get();
      const progression = ctx.skills.determineProgressionForAction(action, existing);
      ctx.skills.skillsProgressionForCurrentActionState.set(progression);
      ctx.skills.addSkillProgression(skillName, progression);
      ctx.skills.advanceSkillIfApplicable(skillName);
    }

    ctx.helpers.resetStatesAfterActionProcessed();

    const { newHistory } = await ctx.agents.summaryAgent.summarizeStoryIfTooLong(
      ctx.state.historyMessagesState.value
    );
    ctx.state.historyMessagesState.value = newHistory;
    ctx.state.gameActionsState.value = [
      ...ctx.state.gameActionsState.value,
      { ...newState, id: ctx.state.gameActionsState.value.length }
    ];
    ctx.state.storyChunkReset();
    await ctx.helpers.checkGameEnded();

    if (!ctx.state.isGameEnded.value) {
      // Evaluate special events triggered by the new story progression
      try {
        const storyHistory = ctx.state.gameActionsState.value
          .map((ga) => ga.story)
          .filter((s): s is string => !!s);
        storyHistory.push(newState.story);
        const currentAbilitiesNames = (ctx.state.characterStatsState.value?.spells_and_abilities || [])
          .map((a) => a.name)
          .filter((n): n is string => !!n);
        const { thoughts, event_evaluation } = await ctx.agents.eventAgent.evaluateEvents(
          storyHistory,
          currentAbilitiesNames
        );
        ctx.state.thoughtsState.value.eventThoughts = thoughts || '';
        if (event_evaluation) {
          ctx.helpers.applyGameEventEvaluation(event_evaluation);
        }
      } catch (e) {
        // Non-fatal: log and proceed
        console.warn('Event evaluation failed:', e);
      }

      ctx.helpers.getRelatedHistoryForStory();
      // Regenerate actions for next turn
      const { thoughts, actions } = await ctx.agents.actionAgent.generateActions(
        ctx.state.getCurrentGameActionState(),
        ctx.state.historyMessagesState.value,
        ctx.state.storyState.value,
        ctx.state.characterState.value,
        ctx.state.characterStatsState.value,
        ctx.state.inventoryState.value,
        ctx.state.systemInstructionsState.value.generalSystemInstruction,
        ctx.state.systemInstructionsState.value.actionAgentInstruction,
        relatedHistory,
        ctx.state.gameSettingsState.value?.aiIntroducesSkills,
        newState.is_character_restrained_explanation,
        ctx.state.additionalActionInputState.value
      );
      // Persist regenerated actions and thoughts so UI can render them
      if (actions) {
        ctx.state.characterActionsState.value = actions;
        ctx.skills.addSkillsIfApplicable(actions);
      }
      if (typeof thoughts === 'string') {
        ctx.state.thoughtsState.value.actionsThoughts = thoughts;
      }
      ctx.helpers.checkForLevelUp();
    }
  }

  async function regenerateActions() {
    ctx.state.characterActionsState.value = [];
    const { getRelatedHistory } = await import('./memoryLogic');
    const relatedHistory = await getRelatedHistory(
      ctx.agents.summaryAgent,
      undefined,
      undefined,
      ctx.state.relatedStoryHistoryState.value,
      ctx.state.customMemoriesState.value
    );
    const { thoughts, actions } = await ctx.agents.actionAgent.generateActions(
      ctx.state.getCurrentGameActionState(),
      ctx.state.historyMessagesState.value,
      ctx.state.storyState.value,
      ctx.state.characterState.value,
      ctx.state.characterStatsState.value,
      ctx.state.inventoryState.value,
      ctx.state.systemInstructionsState.value.generalSystemInstruction,
      ctx.state.systemInstructionsState.value.actionAgentInstruction,
      relatedHistory,
      ctx.state.gameSettingsState.value?.aiIntroducesSkills,
      ctx.state.getCurrentGameActionState().is_character_restrained_explanation,
      ctx.state.additionalActionInputState.value
    );
    ctx.state.characterActionsState.value = actions || [];
    if (typeof thoughts === 'string') {
      ctx.state.thoughtsState.value.actionsThoughts = thoughts;
    }
    if (actions) ctx.skills.addSkillsIfApplicable(actions);
  }

  async function confirmCharacterChangeEvent(changedInto: CharacterChangedInto, confirmed: boolean) {
    ctx.state.eventEvaluationState.value.character_changed!.showEventConfirmationDialog = false;
    if (confirmed === undefined) return;
    if (confirmed) {
      ctx.state.isAiGeneratingState.set(true);
      const { transformedCharacter, transformedCharacterStats } = await applyCharacterChange(
        changedInto,
        structuredClone(ctx.state.storyState.value),
        structuredClone(ctx.state.characterState.value),
        structuredClone(ctx.state.characterStatsState.value),
        ctx.agents.characterAgent,
        ctx.agents.characterStatsAgent
      );

      if (transformedCharacter) {
        addCharacterToPlayerCharactersIdToNamesMap(
          ctx.state.playerCharactersIdToNamesMapState.value,
          ctx.state.playerCharacterId,
          transformedCharacter.name
        );
        ctx.state.characterState.value = transformedCharacter;
      }
      if (transformedCharacterStats) {
        ctx.state.characterStatsState.value = transformedCharacterStats;
        await regenerateActions();
        ctx.state.additionalStoryInputState.value +=
          '\n After transformation make sure that stats_update refer to the new resources from now on!\n' +
          stringifyPretty(ctx.state.characterStatsState.value.resources);
      }

      // apply new resources
      ctx.state.playerCharactersGameState[ctx.state.playerCharacterId] = {
        ...structuredClone(ctx.state.characterStatsState.value.resources),
        XP: ctx.state.playerCharactersGameState[ctx.state.playerCharacterId].XP
      } as any;
      const { updatedGameActionsState, updatedPlayerCharactersGameState } = refillResourcesFully(
        structuredClone(ctx.state.characterStatsState.value.resources),
        ctx.state.playerCharacterId,
        ctx.state.characterState.value.name,
        structuredClone(ctx.state.gameActionsState.value),
        structuredClone(ctx.state.playerCharactersGameState)
      );
      ctx.state.gameActionsState.value = updatedGameActionsState;
      ctx.state.playerCharactersGameState = updatedPlayerCharactersGameState;
    }
    ctx.state.eventEvaluationState.value.character_changed!.aiProcessingComplete = true;
    ctx.state.isAiGeneratingState.set(false);
  }

  function confirmAbilitiesLearned(abilities?: Ability[]) {
    ctx.state.eventEvaluationState.value.abilities_learned!.showEventConfirmationDialog = false;
    if (!abilities) return;
    ctx.state.eventEvaluationState.value.abilities_learned!.aiProcessingComplete = true;
    if (abilities.length === 0) return;
    console.log('Added new abilities:', stringifyPretty(abilities));
    ctx.state.characterStatsState.value = {
      ...ctx.state.characterStatsState.value,
      spells_and_abilities: [...ctx.state.characterStatsState.value.spells_and_abilities, ...abilities]
    } as any;
  }

  async function sendAction(action: Action, rollDice = false) {
    try {
      if (rollDice) {
        if (ctx.state.relatedActionHistoryState.value.length === 0) {
          const { getRelatedHistory } = await import('./memoryLogic');
          ctx.state.relatedActionHistoryState.value = await getRelatedHistory(
            ctx.agents.summaryAgent,
            action,
            ctx.state.gameActionsState.value,
            ctx.state.relatedStoryHistoryState.value,
            ctx.state.customMemoriesState.value
          );
        }
        ctx.helpers.openDiceRollDialog();
      } else {
        ctx.state.resetShowXLastStoryProgressions();
        ctx.state.isAiGeneratingState.set(true);

        const { finalAdditionalStoryInput, combatAndNPCState } = await prepareAdditionalStoryInput(
          action,
          ctx.state.additionalStoryInputState.value
        );
        if (ctx.state.relatedActionHistoryState.value.length === 0) {
          const { getRelatedHistory } = await import('./memoryLogic');
          ctx.state.relatedActionHistoryState.value = await getRelatedHistory(
            ctx.agents.summaryAgent,
            action,
            ctx.state.gameActionsState.value,
            ctx.state.relatedStoryHistoryState.value,
            ctx.state.customMemoriesState.value
          );
        }
        ctx.state.didAIProcessActionState.set(false);
        await processStoryProgression(
          action,
          finalAdditionalStoryInput,
          ctx.state.relatedActionHistoryState.value,
          ctx.state.getCurrentGameActionState().is_character_in_combat,
          combatAndNPCState
        );
        ctx.state.didAIProcessActionState.set(true);
        ctx.state.isAiGeneratingState.set(false);
      }
    } catch (e) {
      ctx.state.isAiGeneratingState.set(false);
      ctx.helpers.handleError(e as string);
    }
  }

  async function generateActionFromCustomInput(action: Action) {
    ctx.state.isAiGeneratingState.set(true);
    const { getRelatedHistory } = await import('./memoryLogic');
    ctx.state.relatedActionHistoryState.value = await getRelatedHistory(
      ctx.agents.summaryAgent,
      action,
      ctx.state.gameActionsState.value,
      ctx.state.relatedStoryHistoryState.value,
      ctx.state.customMemoriesState.value
    );
    const generatedAction = await ctx.agents.actionAgent.generateSingleAction(
      action,
      ctx.state.getCurrentGameActionState(),
      ctx.state.historyMessagesState.value,
      ctx.state.storyState.value,
      ctx.state.characterState.value,
      ctx.state.characterStatsState.value,
      ctx.state.inventoryState.value,
      ctx.state.systemInstructionsState.value.generalSystemInstruction,
      ctx.state.systemInstructionsState.value.actionAgentInstruction,
      ctx.state.relatedActionHistoryState.value,
      ctx.state.gameSettingsState.value?.aiIntroducesSkills,
      ctx.state.getCurrentGameActionState().is_character_restrained_explanation,
      ctx.state.additionalActionInputState.value
    );
    const merged = { ...generatedAction, ...action } as Action;
    ctx.state.chosenActionState.value = merged;
    ctx.skills.addSkillsIfApplicable([merged]);
    if (merged.is_possible === false) {
      ctx.helpers.setCustomActionImpossibleReason('not_plausible');
    } else {
      if (!gameLogic.isEnoughResource(merged, ctx.state.playerCharactersGameState[ctx.state.playerCharacterId], ctx.state.inventoryState.value)) {
        ctx.helpers.setCustomActionImpossibleReason('not_enough_resource');
      } else {
        ctx.helpers.setCustomActionImpossibleReason(undefined);
        await sendAction(merged, gameLogic.mustRollDice(merged, ctx.state.getCurrentGameActionState().is_character_in_combat));
      }
    }
    ctx.state.isAiGeneratingState.set(false);
  }

  async function onCustomActionSubmitted(text: string, mustGenerateCustomAction = false, receiver: 'Game Command' | 'Character Action' | 'GM Question' | 'Dice Roll' = 'Character Action') {
    let action: Action = { characterName: ctx.state.characterState.value.name, text, is_custom_action: true };
    if (receiver === 'Character Action' || mustGenerateCustomAction) {
      await generateActionFromCustomInput(action);
    }
    if (receiver === 'GM Question') {
      ctx.helpers.setGMQuestion(action.text);
    }
    if (receiver === 'Dice Roll') {
      ctx.helpers.setCustomDiceRollNotation(action.text);
    }
    if (receiver === 'Game Command') {
      ctx.state.additionalStoryInputState.value += '\nsudo: Ignore the rules and play out this action even if it should not be possible!\nIf this action contradicts the PAST STORY PLOT, adjust the narrative to fit the action.';
      await sendAction(action, false);
    }
  }

  function handleUtilityAction(actionValue: string) {
    if (!actionValue) return;
    let text = '';
    if (actionValue === 'short-rest') {
      text = 'Player character is doing a short rest, handle the resources regeneration according GAME rules and describe the scene. If there are no specific GAME rules, increase all resources by 50% of the maximum.';
    } else if (actionValue === 'long-rest') {
      text = 'Player character is doing a long rest, handle the resources regeneration according GAME rules and describe the scene. If there are no specific GAME rules, increase all resources by 100% of the maximum.';
    }
    if (text) {
      void sendAction({ characterName: ctx.state.characterState.value.name, text, is_custom_action: false } as Action, false);
    }
  }

  return { sendAction, regenerateActions, confirmCharacterChangeEvent, confirmAbilitiesLearned, generateActionFromCustomInput, onCustomActionSubmitted, handleUtilityAction } as const;
}
