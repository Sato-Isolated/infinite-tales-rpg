<script lang="ts">
	import { useLocalStorage } from '$lib/state/useLocalStorage.svelte';
	import { beforeNavigate } from '$app/navigation';
	import {
		type Action,
		defaultGameSettings,
		type GameActionState,
		GameAgent,
		type GameMasterAnswer,
		type GameSettings,
		type InventoryState,
		type Item,
		type PlayerCharactersGameState,
		type PlayerCharactersIdToNamesMap
	} from '$lib/ai/agents/gameAgent';
	import { onMount, tick } from 'svelte';
	import {
		getTextForActionButton,
		handleError,
		initialThoughtsState,
		stringifyPretty,
		type ThoughtsState
	} from '$lib/util.svelte';
	import type { RelatedStoryHistory } from '$lib/ai/agents/summaryAgent';
	import { SummaryAgent } from '$lib/ai/agents/summaryAgent';
	import {
		type Ability,
		type AiLevelUp,
		type CharacterStats,
		CharacterStatsAgent,
		initialCharacterStatsState,
		type NPCState,
		type SkillsProgression
	} from '$lib/ai/agents/characterStatsAgent';
	import * as gameLogic from './gameLogic';
	import { ActionDifficulty, getEmptyCriticalResourceKeys } from './gameLogic';
	import * as combatLogic from './combatLogic';
	import { CombatAgent } from '$lib/ai/agents/combatAgent';
	import { LLMProvider } from '$lib/ai/llmProvider';
	import { getCurrentCharacterGameState, getRenderedGameUpdates } from './gameStateUtils';
	import GameModals from '$lib/components/game/GameModals.svelte';
	import {
		initialSystemInstructionsState,
		type LLMMessage,
		type SystemInstructionsState
	} from '$lib/ai/llm';
	import { initialStoryState, type Story } from '$lib/ai/agents/storyAgent';
	import {
		CharacterAgent,
		type CharacterDescription,
		initialCharacterState
	} from '$lib/ai/agents/characterAgent';
	import { type Campaign, CampaignAgent, type CampaignChapter } from '$lib/ai/agents/campaignAgent';
	import { ActionAgent } from '$lib/ai/agents/actionAgent';
	import LoadingIcon from '$lib/components/LoadingIcon.svelte';
	import TTSComponent from '$lib/components/TTSComponent.svelte';
	import { getXPNeededForLevel } from './levelLogic';
	import { migrateIfApplicable } from '$lib/state/versionMigration';
	import type { AIConfig } from '$lib';
	import ResourcesComponent from '$lib/components/ResourcesComponent.svelte';

	import { initializeMissingResources, refillResourcesFully } from './resourceLogic';
	import {
		advanceChapterIfApplicable,
		getGameMasterNotesForCampaignChapter,
		getNextChapterPrompt
	} from './campaignLogic';
	import { getRelatedHistory } from './memoryLogic';
	import { getLatestStoryMessagesFromHistory } from './memoryLogic/messages';
	import {
		type CharacterChangedInto,
		EventAgent,
		type EventEvaluation,
		initialEventEvaluationState
	} from '$lib/ai/agents/eventAgent';
	import {
		getSkillProgressionForDiceRoll,
		getSkillIfApplicable,
		getFreeCharacterTechnicalId,
		getCharacterTechnicalId,
		addCharacterToPlayerCharactersIdToNamesMap
	} from './characterLogic';
	import {
		addSkillProgression as addSkillProgressionHelper,
		advanceSkillIfApplicable as advanceSkillIfApplicableHelper,
		addSkillsIfApplicable as addSkillsIfApplicableHelper,
		determineProgressionForAction
	} from './skillProgressionHelpers';
	import { getDiceRollPromptAddition } from '$lib/components/interaction_modals/dice/diceRollLogic';
	import type { DiceRollResult } from '$lib/components/interaction_modals/dice/diceRollLogic';
	import type { RenderedGameUpdate } from './gameLogic';

	// Local type definition matching StoryProgressionWithImage component
	type StoryProgressionWithImageProps = {
		storyTextRef?: HTMLElement;
		story: string;
		gameUpdates?: Array<RenderedGameUpdate | undefined>;
		imagePrompt?: string;
		stream_finished?: boolean;
	};
	import StorySection from '$lib/components/game/StorySection.svelte';
	import ActionButtons from '$lib/components/game/ActionButtons.svelte';
	import StaticActionsPanel from '$lib/components/game/StaticActionsPanel.svelte';
	import ActionInputForm from '$lib/components/game/ActionInputForm.svelte';
	import { createGameController } from './gameController';
	import { createModalManager } from './modalManager.svelte';
	import TimeWidget from '$lib/components/game/TimeWidget.svelte';
	import { createDefaultTime, type GameTime } from '$lib/types/gameTime';
	import { generateStoryAppropriateTime, shouldRegenerateGameTime } from './timeLogic';

	// Element/component refs (dialogs, child components)
	let actionInputFormComponent = $state<{ clear?: () => void }>();

	//ai state
	const apiKeyState = useLocalStorage<string>('apiKeyState');
	const temperatureState = useLocalStorage<number>('temperatureState');
	const systemInstructionsState = useLocalStorage<SystemInstructionsState>(
		'systemInstructionsState',
		initialSystemInstructionsState
	);
	const aiLanguage = useLocalStorage<string>('aiLanguage');
	let isAiGeneratingState = $state(false);
	let didAIProcessDiceRollActionState = useLocalStorage<boolean>('didAIProcessDiceRollAction');
	let didAIProcessActionState = $state<boolean>(true);

	// Create modal manager après les autres états locaux
	const modalManager = createModalManager();
	let gameAgent: GameAgent,
		summaryAgent: SummaryAgent,
		characterAgent: CharacterAgent,
		characterStatsAgent: CharacterStatsAgent,
		combatAgent: CombatAgent,
		campaignAgent: CampaignAgent,
		actionAgent: ActionAgent,
		eventAgent: EventAgent;

	//game state
	const gameActionsState = useLocalStorage<GameActionState[]>('gameActionsState', []);
	const characterActionsState = useLocalStorage<Action[]>('characterActionsState', []);
	const historyMessagesState = useLocalStorage<LLMMessage[]>('historyMessagesState', []);
	const characterState = useLocalStorage<CharacterDescription>(
		'characterState',
		initialCharacterState
	);
	const characterStatsState = useLocalStorage<CharacterStats>(
		'characterStatsState',
		initialCharacterStatsState
	);
	let storyChunkState = $state<string>('');
	let thoughtsState = useLocalStorage<ThoughtsState>('thoughtsState', initialThoughtsState);

	const skillsProgressionState = useLocalStorage<SkillsProgression>('skillsProgressionState', {});
	let skillsProgressionForCurrentActionState = $state<number | undefined>(undefined);
	const inventoryState = useLocalStorage<InventoryState>('inventoryState', {});
	const storyState = useLocalStorage<Story>('storyState', initialStoryState);
	const relatedStoryHistoryState = useLocalStorage<RelatedStoryHistory>(
		'relatedStoryHistoryState',
		{ relatedDetails: [] }
	);
	const relatedActionHistoryState = useLocalStorage<string[]>('relatedActionHistoryState', []);
	const customMemoriesState = useLocalStorage<string>('customMemoriesState');
	const customGMNotesState = useLocalStorage<string>('customGMNotesState');
	const currentChapterState = useLocalStorage<number>('currentChapterState');
	const campaignState = useLocalStorage<Campaign>('campaignState', {} as Campaign);

	const npcState = useLocalStorage<NPCState>('npcState', {});
	const chosenActionState = useLocalStorage<Action>('chosenActionState', {} as Action);
	const additionalStoryInputState = useLocalStorage<string>('additionalStoryInputState', '');
	const additionalActionInputState = useLocalStorage<string>('additionalActionInputState', '');
	const isGameEnded = useLocalStorage<boolean>('isGameEnded', false);
	let playerCharactersIdToNamesMapState = useLocalStorage<PlayerCharactersIdToNamesMap>(
		'playerCharactersIdToNamesMapState',
		{}
	);
	// Use original naming and structure from GitHub
	const playerCharactersGameState = useLocalStorage<PlayerCharactersGameState>(
		'playerCharactersGameState',
		{}
	);

	let levelUpState = useLocalStorage<{
		buttonEnabled: boolean;
		dialogOpened: boolean;
		playerName: string;
	}>('levelUpState', {
		buttonEnabled: false,
		dialogOpened: false,
		playerName: ''
	});
	const currentGameActionState: GameActionState = $derived(
		(gameActionsState.value && gameActionsState.value[gameActionsState.value.length - 1]) ||
			({} as GameActionState)
	);

	const playerCharacterIdState = $derived(
		getCharacterTechnicalId(playerCharactersIdToNamesMapState.value, characterState.value.name) ||
			''
	);

	let showXLastStoryProgressions = $state<number>(0);
	const latestStoryProgressionState = $derived<StoryProgressionWithImageProps>({
		story: storyChunkState || currentGameActionState.story,
		gameUpdates: storyChunkState
			? []
			: getRenderedGameUpdates(
					currentGameActionState,
					playerCharactersGameState.value,
					playerCharactersIdToNamesMapState.value,
					playerCharacterIdState
				),
		imagePrompt: storyChunkState
			? ''
			: [currentGameActionState.image_prompt, storyState.value.general_image_prompt].join(' '),
		stream_finished: !storyChunkState
	});
	let latestStoryProgressionTextComponent = $state<HTMLElement | undefined>();

	// Wrapper function to match StorySection component signature
	const getRenderedGameUpdatesWrapper = (gameState: GameActionState, playerId: string) =>
		getRenderedGameUpdates(
			gameState,
			playerCharactersGameState.value,
			playerCharactersIdToNamesMapState.value,
			playerId
		);

	let actionsTextForTTS = $derived(
		(Array.isArray(characterActionsState.value) ? characterActionsState.value : [])
			.map((a) => getTextForActionButton(a))
			.join(' ')
	);
	//TODO const lastCombatSinceXActions: number = $derived(
	//	gameActionsState.value && (gameActionsState.value.length - (gameActionsState.value.findLastIndex(state => state.is_character_in_combat ) + 1))
	//);
	let customActionReceiver: 'Game Command' | 'Character Action' | 'GM Question' | 'Dice Roll' =
		$state('Character Action');
	const eventEvaluationState = useLocalStorage<EventEvaluation>(
		'eventEvaluationState',
		initialEventEvaluationState
	);

	// Controller instance
	let controller: ReturnType<typeof createGameController> | undefined;

	//feature toggles
	const aiConfigState = useLocalStorage<AIConfig>('aiConfigState');
	let useDynamicCombat = useLocalStorage<boolean>('useDynamicCombat', false);
	let gameSettingsState = useLocalStorage<GameSettings>('gameSettingsState', defaultGameSettings());
	const ttsVoiceState = useLocalStorage<string>('ttsVoice');
	const gameTimeState = useLocalStorage<GameTime | null>('gameTimeState', null);

	onMount(async () => {
		beforeNavigate(({ cancel }) => {
			if (!didAIProcessActionState) {
				if (!confirm('Navigation will cancel the current AI generation. Are you sure?')) {
					didAIProcessActionState = true;
					cancel();
				}
			}
		});
		const llm = LLMProvider.provideLLM(
			{
				temperature: temperatureState.value,
				language: aiLanguage.value,
				apiKey: apiKeyState.value
			},
			aiConfigState.value?.useFallbackLlmState
		);
		gameAgent = new GameAgent(llm);
		characterStatsAgent = new CharacterStatsAgent(llm);
		combatAgent = new CombatAgent(llm);
		summaryAgent = new SummaryAgent(llm);
		campaignAgent = new CampaignAgent(llm);
		actionAgent = new ActionAgent(llm);
		eventAgent = new EventAgent(llm);
		characterAgent = new CharacterAgent(llm);

		// Create controller after agents are ready
		controller = createGameController({
			agents: {
				gameAgent,
				summaryAgent,
				actionAgent,
				combatAgent,
				campaignAgent,
				eventAgent,
				characterAgent,
				characterStatsAgent
			},
			modals: modalManager,
			state: {
				getCurrentGameActionState: () => currentGameActionState,
				isGameEnded,
				isAiGeneratingState: {
					get: () => isAiGeneratingState,
					set: (v: boolean) => (isAiGeneratingState = v)
				},
				didAIProcessActionState: {
					get: () => didAIProcessActionState,
					set: (v: boolean) => (didAIProcessActionState = v)
				},
				resetShowXLastStoryProgressions: () => (showXLastStoryProgressions = 0),
				storyChunkReset: () => (storyChunkState = ''),
				playerCharacterId: playerCharacterIdState,
				playerCharactersGameState, // Use the correct naming from original GitHub
				playerCharactersIdToNamesMapState,
				npcState,
				inventoryState,
				systemInstructionsState,
				storyState,
				historyMessagesState,
				characterActionsState,
				thoughtsState,
				gameActionsState,
				characterState,
				characterStatsState,
				eventEvaluationState,
				relatedStoryHistoryState,
				relatedActionHistoryState,
				customMemoriesState,
				customGMNotesState,
				additionalStoryInputState,
				additionalActionInputState,
				chosenActionState,
				gameSettingsState,
				gameTimeState,
				useDynamicCombat
			},
			helpers: {
				addCampaignAdditionalStoryInput,
				getGameMasterNotesForCampaignChapter,
				getCurrentCampaignChapter,
				openDiceRollDialog,
				handleError,
				resetStatesAfterActionProcessed,
				checkGameEnded,
				getRelatedHistoryForStory,
				checkForNewNPCs,
				checkForLevelUp,
				onStoryStreamUpdate,
				onThoughtStreamUpdate,
				applyGameEventEvaluation,
				getCurrentDiceRollResult: () =>
					modalManager.diceRollDialog?.returnValue as DiceRollResult | undefined,
				setGMQuestion: (text: string) => modalManager.setGMQuestion(text),
				setCustomDiceRollNotation: (notation: string) =>
					modalManager.setCustomDiceRollNotation(notation),
				setCustomActionImpossibleReason: (reason) =>
					modalManager.setCustomActionImpossibleReason(reason),
				setItemForSuggestActions: (item: any) => modalManager.setItemForSuggestActions(item),
				setLevelUpState: (state) => {
					modalManager.setLevelUpDialogOpened(state.dialogOpened);
					modalManager.setLevelUpPlayerName(state.playerName);
					modalManager.setLevelUpButtonEnabled(state.buttonEnabled);
				}
				// Remove complex reactivity callback - not needed with useLocalStorage
			},
			skills: {
				skillsProgressionForCurrentActionState: {
					get: () => skillsProgressionForCurrentActionState,
					set: (v) => (skillsProgressionForCurrentActionState = v)
				},
				addSkillProgression,
				advanceSkillIfApplicable,
				determineProgressionForAction,
				addSkillsIfApplicable
			}
		});

		migrateStates();
		const currentCharacterName = characterState.value.name;
		let characterId = getCharacterTechnicalId(
			playerCharactersIdToNamesMapState.value,
			currentCharacterName
		);
		if (!characterId) {
			characterId = getFreeCharacterTechnicalId(playerCharactersIdToNamesMapState.value);
			addCharacterToPlayerCharactersIdToNamesMap(
				playerCharactersIdToNamesMapState.value,
				characterId,
				currentCharacterName
			);
		}
		// Initialize the player's resource state if it doesn't exist.
		playerCharactersGameState.value[characterId] = {
			...$state.snapshot(characterStatsState.value.resources),
			XP: { current_value: 0, max_value: 0, game_ends_when_zero: false }
		};
		if (relatedStoryHistoryState.value.relatedDetails.length === 0) {
			getRelatedHistoryForStory();
		}

		// Start game when not already started
		if (!currentGameActionState?.story) {
			await controller!.sendAction({
				characterName: characterState.value.name,
				text: GameAgent.getStartingPrompt()
			});
			if (gameActionsState.value.length > 0) {
				const { updatedGameActionsState, updatedPlayerCharactersGameState } = refillResourcesFully(
					$state.snapshot(characterStatsState.value.resources),
					playerCharacterIdState,
					characterState.value.name,
					$state.snapshot(gameActionsState.value),
					$state.snapshot(playerCharactersGameState.value)
				);
				gameActionsState.value = updatedGameActionsState;
				playerCharactersGameState.value = updatedPlayerCharactersGameState;
			}
		} else {
			await initializeGameFromSavedState();
		}
	});

	async function initializeGameFromSavedState() {
		// Apply previously saved game actions
		//TODO what happens when character transformed, if stat existed before damage/heal will be applied
		gameLogic.applyGameActionStates(
			playerCharactersGameState.value,
			playerCharactersIdToNamesMapState.value,
			npcState.value,
			inventoryState.value,
			$state.snapshot(gameActionsState.value)
		);
		const { updatedGameActionsState, updatedPlayerCharactersGameState } =
			initializeMissingResources(
				$state.snapshot(characterStatsState.value.resources),
				playerCharacterIdState,
				characterState.value.name,
				$state.snapshot(gameActionsState.value),
				$state.snapshot(playerCharactersGameState.value)
			);
		gameActionsState.value = updatedGameActionsState;
		playerCharactersGameState.value = updatedPlayerCharactersGameState;
		tick().then(() => document.getElementById('user-input')?.scrollIntoView(false));
		if (!Array.isArray(characterActionsState.value) || characterActionsState.value.length === 0) {
			const { thoughts, actions } = await actionAgent.generateActions(
				currentGameActionState,
				historyMessagesState.value,
				storyState.value,
				characterState.value,
				characterStatsState.value,
				inventoryState.value,
				systemInstructionsState.value.generalSystemInstruction,
				systemInstructionsState.value.actionAgentInstruction,
				await getRelatedHistory(
					summaryAgent,
					undefined,
					undefined,
					relatedStoryHistoryState.value,
					customMemoriesState.value
				),
				gameSettingsState.value?.aiIntroducesSkills,
				currentGameActionState.is_character_restrained_explanation,
				additionalActionInputState.value
			);
			characterActionsState.value = actions;
			thoughtsState.value.actionsThoughts = thoughts;
		}
		// legacy renderGameState call removed
		if (!didAIProcessDiceRollActionState.value) {
			openDiceRollDialog();
		}
		checkForLevelUp();
	}

	// getActionPromptForCombat removed; handled by controller

	const advanceSkillIfApplicable = (skillName: string) =>
		advanceSkillIfApplicableHelper(
			skillName,
			characterStatsState,
			skillsProgressionState,
			characterState.value.name,
			gameActionsState
		);

	const addSkillProgression = (skillName: string, skillProgression: number) =>
		addSkillProgressionHelper(skillsProgressionState, skillName, skillProgression);

	const addSkillsIfApplicable = (actions: Action[]) =>
		addSkillsIfApplicableHelper(
			actions,
			!!gameSettingsState.value?.aiIntroducesSkills,
			characterStatsState
		);

	function openDiceRollDialog() {
		//TODO showModal can not be used because it hides the dice roll
		didAIProcessDiceRollActionState.value = false;
		if (!modalManager.diceRollDialog) return;
		modalManager.diceRollDialog.show();
		modalManager.diceRollDialog.addEventListener('close', function sendWithManuallyRolled() {
			if (!modalManager.diceRollDialog) return;
			modalManager.diceRollDialog.removeEventListener('close', sendWithManuallyRolled);
			const result = modalManager.diceRollDialog.returnValue as DiceRollResult | undefined;

			const skillName = getSkillIfApplicable(characterStatsState.value, chosenActionState.value);
			if (skillName && result) {
				skillsProgressionForCurrentActionState = getSkillProgressionForDiceRoll(result);
			}

			additionalStoryInputState.value =
				getDiceRollPromptAddition(result) + '\n' + (additionalStoryInputState.value || '');
			controller!.sendAction(chosenActionState.value, false);
		});
	}

	function handleAIError() {
		if (!didAIProcessDiceRollActionState.value) {
			openDiceRollDialog();
		}
	}

	async function handleImpossibleAction(tryAnyway: boolean) {
		if (tryAnyway) {
			if (modalManager.customActionImpossibleReasonState === 'not_enough_resource') {
				chosenActionState.value = {
					...chosenActionState.value,
					action_difficulty:
						chosenActionState.value.action_difficulty === ActionDifficulty.simple
							? ActionDifficulty.medium
							: chosenActionState.value.action_difficulty,
					dice_roll: {
						modifier: chosenActionState.value.dice_roll!.modifier!,
						modifier_explanation:
							chosenActionState.value.dice_roll!.modifier_explanation! +
							` -3 for trying without enough ${chosenActionState.value.resource_cost?.resource_key?.replaceAll('_', ' ')}`,
						modifier_value:
							(Number.parseInt(
								chosenActionState.value.dice_roll?.modifier_value as unknown as string
							) || 0) - 3
					}
				};
			}
			//either not enough resource or impossible, anyway no resource cost
			let costString = 'No resource cost';
			if (chosenActionState.value.resource_cost) {
				chosenActionState.value.resource_cost.cost = 0;
				costString = `\n${chosenActionState.value.resource_cost?.resource_key} cost: 0`;
			}
			additionalStoryInputState.value += costString;
			await controller!.sendAction(chosenActionState.value, true);
		}
		actionInputFormComponent?.clear?.();
		modalManager.setCustomActionImpossibleReason(undefined);
	}

	//TODO depends on getActionPromptForCombat
	// getCombatAndNPCState extracted into controller

	//TODO sendAction should not be handled here so it can be externally called
	async function checkGameEnded() {
		const emptyResourceKeys = getEmptyCriticalResourceKeys(
			playerCharactersGameState.value[playerCharacterIdState]
		);
		if (!isGameEnded.value && emptyResourceKeys.length > 0) {
			isGameEnded.value = true;
			await controller!.sendAction({
				characterName: characterState.value.name,
				text: GameAgent.getGameEndedPrompt(emptyResourceKeys)
			});
		}
	}

	function resetStatesAfterActionProcessed() {
		chosenActionState.reset();
		additionalStoryInputState.reset();
		additionalActionInputState.reset();
		characterActionsState.reset();
		relatedActionHistoryState.reset();
		relatedStoryHistoryState.reset();
		skillsProgressionForCurrentActionState = undefined;
		// actions previously rendered imperatively; no longer needed
		// cleared via component
		didAIProcessDiceRollActionState.value = true;
	}

	function checkForNewNPCs(newState: GameActionState) {
		const newNPCsIds = gameLogic.getNewNPCs(newState.currently_present_npcs, npcState.value);
		if (newNPCsIds.length > 0) {
			characterStatsAgent
				.generateNPCStats(
					storyState.value,
					getLatestStoryMessages(),
					newNPCsIds.map((id) => id.uniqueTechnicalNameId),
					characterStatsState.value,
					systemInstructionsState.value.generalSystemInstruction
				)
				.then((newState: NPCState) => {
					if (newState) {
						combatLogic.addResourceValues(newState);
						newNPCsIds.forEach((id) => {
							if (newState[id.uniqueTechnicalNameId]) {
								newState[id.uniqueTechnicalNameId].known_names = [id.displayName];
							}
						});
						npcState.value = { ...npcState.value, ...newState };
						console.log(stringifyPretty(npcState.value));
					}
				});
		}
	}

	function checkForLevelUp() {
		levelUpState.value.buttonEnabled = false;
		const neededXP = getXPNeededForLevel(characterStatsState.value.level);

		if (
			neededXP &&
			playerCharactersGameState.value[playerCharacterIdState]?.XP.current_value >= neededXP
		) {
			levelUpState.value.buttonEnabled = true;
		}
	}

	async function addCampaignAdditionalStoryInput(action: Action, additionalStoryInput: string) {
		// If the game is played in campaign mode
		if (campaignState.value?.chapters?.length > 0) {
			//advance the chapter if applicable.
			const { newAdditionalStoryInput, newChapter } = await advanceChapterIfApplicable(
				action,
				additionalStoryInput,
				didAIProcessActionState,
				campaignState.value,
				currentChapterState.value,
				currentGameActionState,
				gameActionsState.value,
				campaignAgent,
				historyMessagesState.value
			);
			additionalStoryInput = newAdditionalStoryInput;

			if (newChapter) {
				currentChapterState.value += 1;
				currentGameActionState.currentPlotPoint = 'PLOT_ID: 1';
				const { prompt, updatedStory } = getNextChapterPrompt(
					campaignState.value,
					currentChapterState.value,
					storyState.value
				);
				additionalStoryInput += prompt;
				storyState.value = updatedStory;
			}
		}
		return additionalStoryInput;
	}

	// Helper to prepare additional story input by incorporating combat prompts
	// prepareAdditionalStoryInput extracted into controller

	const applyGameEventEvaluation = (evaluated: EventEvaluation) => {
		if (!evaluated) {
			return;
		}
		const changeInto = evaluated?.character_changed?.changed_into;
		if (changeInto && changeInto !== eventEvaluationState.value.character_changed?.changed_into) {
			evaluated.character_changed!.aiProcessingComplete = false;
			eventEvaluationState.value = {
				...eventEvaluationState.value,
				character_changed: evaluated.character_changed
			};
		}
		const abilities = evaluated?.abilities_learned?.abilities
			?.filter(
				(a) => !characterStatsState.value?.spells_and_abilities.some((b) => b.name === a.name)
			)
			.filter(
				(newAbility) =>
					!eventEvaluationState.value.abilities_learned?.abilities?.some(
						(existing) =>
							existing.uniqueTechnicalId === newAbility.uniqueTechnicalId ||
							existing.name === newAbility.name
					)
			);
		if (abilities && abilities.length > 0) {
			evaluated.abilities_learned!.aiProcessingComplete = false;
			eventEvaluationState.value = {
				...eventEvaluationState.value,
				abilities_learned: { ...evaluated?.abilities_learned, abilities }
			};
		}
	};

	// Helper to process the AI story progression and update game state accordingly.
	// processStoryProgression extracted into controller

	function getRelatedHistoryForStory() {
		summaryAgent
			.retrieveRelatedHistory(currentGameActionState.story, gameActionsState.value, 2)
			.then((relatedHistory) => {
				if (relatedHistory) {
					relatedStoryHistoryState.value = relatedHistory;
				} else {
					relatedStoryHistoryState.reset();
				}
			});
	}

	// Main sendAction function that orchestrates the action processing.
	// sendAction extracted into controller

	// renderGameState removed; replaced by declarative components

	function levelUpClicked(playerName: string) {
		const shouldOpenDialog = controller!.levelUpClicked(playerName);
		if (shouldOpenDialog) {
			modalManager.setLevelUpDialogOpened(true);
		}
	}

	// addActionButton removed

	const getLatestStoryMessages = (numOfActions = 2) =>
		getLatestStoryMessagesFromHistory(historyMessagesState.value, numOfActions);

	const handleItemUseChosen = async (item: Action & Item & { item_id: string }) => {
		modalManager.setItemForSuggestActions(controller!.handleItemUseChosen(item));
	};

	const handleTargetedSpellsOrAbility = async (action: Action, targets: string[]) => {
		await controller!.handleTargetedSpellsOrAbility(action, targets);
	};

	const handleCustomDiceRollClosed = () => {
		controller!.handleCustomDiceRollClosed();
		modalManager.setCustomDiceRollNotation('');
		actionInputFormComponent?.clear?.();
	};

	const handleLevelUpModalClosed = (aiLevelUp: AiLevelUp) => {
		controller!.handleLevelUpModalClosed(aiLevelUp);
		modalManager.resetLevelUpState();
	};

	const handleSuggestItemActionClosed = (action?: Action) => {
		controller!.handleSuggestItemActionClosed(action);
		modalManager.setItemForSuggestActions(undefined);
	};

	const getCurrentCampaignChapter = (): CampaignChapter | undefined =>
		campaignState.value?.chapters.find(
			(chapter) => chapter.chapterId === currentChapterState.value
		);

	const generateActionFromCustomInput = async (action: Action) => {
		await controller!.generateActionFromCustomInput(action);
	};

	const handleCustomActionSubmit = async (text: string, mustGenerateCustomAction = false) => {
		await controller!.onCustomActionSubmitted(text, mustGenerateCustomAction, customActionReceiver);
	};
	const handleGMQuestionClosed = (
		closedByPlayer: boolean,
		gmAnswerStateAsContext?: GameMasterAnswer
	) => {
		if (closedByPlayer) {
			actionInputFormComponent?.clear?.();
		}
		if (gmAnswerStateAsContext) {
			const context = '\nGM Context:\n' + stringifyPretty(gmAnswerStateAsContext);
			additionalStoryInputState.value += context;
			additionalActionInputState.value += context;
			historyMessagesState.value.push({
				role: 'user',
				content: stringifyPretty(gmAnswerStateAsContext)
			});
		}
		modalManager.resetGMQuestion();
	};

	// handleUtilityAction moved to controller

	function onDeleteItem(item_id: string): void {
		delete inventoryState.value[item_id];
		if (gameActionsState.value[gameActionsState.value.length - 1].inventory_update) {
			gameActionsState.value[gameActionsState.value.length - 1].inventory_update.push({
				item_id,
				type: 'remove_item'
			});
		}
	}

	function getEventToConfirm(gamEvent: CharacterChangedInto): {
		title: string;
		description: string;
	} {
		return controller!.getEventToConfirm(gamEvent);
	}

	async function confirmCharacterChangeEvent(
		changedInto: CharacterChangedInto,
		confirmed: boolean
	) {
		await controller!.confirmCharacterChangeEvent(changedInto, confirmed);
	}

	const confirmAbilitiesLearned = (abilities?: Ability[]) => {
		controller!.confirmAbilitiesLearned(abilities);
	};

	function onStoryStreamUpdate(storyChunk: string, isComplete: boolean): void {
		if (!storyChunkState && !isComplete) {
			latestStoryProgressionTextComponent?.scrollIntoView();
			const time = new Date().toLocaleTimeString();
			console.log('First story chunk received at:', time);
			if (gameActionsState.value.length === 1) {
				//TODO workaround because of the scrollIntoView not working properly for second story
				setTimeout(() => {
					console.log('For second story chunk, scroll again');
					latestStoryProgressionTextComponent?.scrollIntoView();
				}, 50);
			}
		}
		storyChunkState = storyChunk;
		isAiGeneratingState = false;
	}

	function onThoughtStreamUpdate(thoughtChunk: string, isComplete: boolean): void {
		if (!thoughtsState.value.storyThoughts && !isComplete) {
			const time = new Date().toLocaleTimeString();
			console.log('First thought chunk received at:', time);
		}
		// Ensure we always append to a defined string
		if (!thoughtsState.value.storyThoughts) {
			thoughtsState.value.storyThoughts = '';
		}
		thoughtsState.value.storyThoughts += thoughtChunk;
	}

	function migrateStates() {
		characterStatsState.value = migrateIfApplicable(
			'characterStatsState',
			$state.snapshot(characterStatsState.value)
		);
		gameActionsState.value = migrateIfApplicable(
			'gameActionsState',
			$state.snapshot(gameActionsState.value)
		);
		gameSettingsState.value = migrateIfApplicable(
			'gameSettingsState',
			$state.snapshot(gameSettingsState.value)
		);
	}
</script>

<div id="game-container" class="container mx-auto p-4">
	<!-- Widget temps en haut à droite -->
	<div class="mb-4 flex justify-end">
		<TimeWidget gameTime={gameTimeState.value} />
	</div>

	<GameModals
		{isAiGeneratingState}
		{modalManager}
		{currentGameActionState}
		playerCharactersGameState={playerCharactersGameState.value}
		playerCharactersIdToNamesMapState={playerCharactersIdToNamesMapState.value}
		characterName={characterState.value.name}
		characterStatsState={characterStatsState.value}
		inventoryState={inventoryState.value}
		storyState={storyState.value}
		eventEvaluationState={eventEvaluationState.value}
		chosenActionState={chosenActionState.value}
		didAIProcessDiceRollActionState={didAIProcessDiceRollActionState.value}
		{handleAIError}
		{handleImpossibleAction}
		{handleGMQuestionClosed}
		{confirmCharacterChangeEvent}
		{confirmAbilitiesLearned}
		handleTargetedSpellsOrAbility={(action, targets) =>
			controller!.handleTargetedSpellsOrAbility(action, targets || [])}
		{onDeleteItem}
		{handleCustomActionSubmit}
		{handleItemUseChosen}
		{handleSuggestItemActionClosed}
		handleLevelUpModalClosed={(levelUp) => controller!.handleLevelUpModalClosed(levelUp)}
		handleUtilityAction={(action) => controller!.handleUtilityAction(action)}
		{handleCustomDiceRollClosed}
		getEventToConfirm={(event) => controller!.getEventToConfirm(event)}
	/>

	<ResourcesComponent
		resources={getCurrentCharacterGameState(
			playerCharactersGameState.value,
			playerCharactersIdToNamesMapState.value,
			characterState.value.name
		)}
		currentLevel={characterStatsState.value?.level}
	/>
	<StorySection
		{currentGameActionState}
		gameActions={gameActionsState.value}
		{latestStoryProgressionState}
		storyState={storyState.value}
		isGameEnded={isGameEnded.value}
		{playerCharacterIdState}
		getRenderedGameUpdates={getRenderedGameUpdatesWrapper}
		{showXLastStoryProgressions}
		setShowXLastStoryProgressions={(n: number) => (showXLastStoryProgressions = n)}
		bind:storyTextRef={latestStoryProgressionTextComponent}
	/>

	{#if !aiConfigState.value?.disableAudioState && actionsTextForTTS}
		<div class="mt-4 flex">
			<TTSComponent
				text={actionsTextForTTS}
				voice={ttsVoiceState.value}
				hidden={!Array.isArray(characterActionsState.value) ||
					characterActionsState.value.length === 0}
			></TTSComponent>
		</div>
	{/if}
	<ActionButtons
		actions={Array.isArray(characterActionsState.value) ? characterActionsState.value : []}
		{currentGameActionState}
		sendAction={(a, roll) => {
			chosenActionState.value = $state.snapshot(a);
			controller!.sendAction(a, roll);
		}}
		isGameEnded={isGameEnded.value}
		playerResources={playerCharactersGameState.value[playerCharacterIdState]}
		inventoryState={inventoryState.value}
	/>
	{#if Object.keys(currentGameActionState).length !== 0}
		{#if !isGameEnded.value}
			{#if !Array.isArray(characterActionsState.value) || characterActionsState.value.length === 0}
				<div class="flex flex-col">
					<span class="m-auto">Generating next actions...</span>
					<div class="m-auto"><LoadingIcon /></div>
				</div>
			{/if}
			<StaticActionsPanel
				levelUpEnabled={levelUpState.value.buttonEnabled}
				handleContinue={() =>
					controller!.sendAction({
						characterName: characterState.value.name,
						text: 'Continue The Tale'
					})}
				handleLevelUp={() => levelUpClicked(characterState.value.name)}
				transformPending={!eventEvaluationState.value.character_changed?.aiProcessingComplete}
				transformLabel={eventEvaluationState.value.character_changed?.changed_into}
				handleTransform={() =>
					(eventEvaluationState.value.character_changed!.showEventConfirmationDialog = true)}
				abilitiesPending={!eventEvaluationState.value.abilities_learned?.aiProcessingComplete}
				handleLearnAbilities={() =>
					(eventEvaluationState.value.abilities_learned!.showEventConfirmationDialog = true)}
				handleOpenSpells={() => modalManager.openUseSpellsAbilitiesModal()}
				handleOpenInventory={() => modalManager.openUseItemsModal()}
				handleOpenUtility={() => modalManager.openUtilityModal()}
				busy={isAiGeneratingState}
			/>
		{/if}
		<ActionInputForm
			bind:this={actionInputFormComponent}
			bind:receiver={customActionReceiver}
			handleSubmit={(text, receiver) =>
				handleCustomActionSubmit(text, receiver === 'Character Action')}
		/>
	{/if}

	<style>
	

		canvas {
			height: 100%;
			width: 100%;
		}
	</style>
</div>
