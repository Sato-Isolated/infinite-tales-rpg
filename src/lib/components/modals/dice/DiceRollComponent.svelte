<script lang="ts">
	import DiceBox from '@3d-dice/dice-box';
	import * as diceRollLogic from '$lib/game/logic/diceRollLogic';
	import type { Action, GameSettings } from '$lib/ai/agents/gameAgent';
	import {
		detectWebGLCapabilities,
		determineDiceSimulationMode,
		logWebGLInfo,
		getDiceSimulationModeDescription,
		type WebGLCapabilities
	} from '$lib/utils/webglDetection';
	type Props = { diceRollDialog: HTMLDialogElement; action: Action; resetState: boolean };

	import { useHybridLocalStorage } from '$lib/state/hybrid/useHybridLocalStorage.svelte';
	import { onMount } from 'svelte';
	import { getRandomInteger } from '$lib/util.svelte';
	import {
		type CharacterStats,
		initialCharacterStatsState
	} from '$lib/ai/agents/characterStatsAgent';
	import { defaultGameSettings } from '$lib/ai/agents/gameAgent';

	let { diceRollDialog = $bindable(), action, resetState }: Props = $props();

	// State management avec valeurs initiales explicites
	const rolledValueState = useHybridLocalStorage<number | undefined>('rolledValueState', undefined);
	const rollDifferenceHistoryState = useHybridLocalStorage<number[]>(
		'rollDifferenceHistoryState',
		[]
	);
	const difficultyState = useHybridLocalStorage<'Easy' | 'Default'>('difficultyState', 'Default');
	const useKarmicDice = useHybridLocalStorage<boolean>('useKarmicDice', true);
	const diceRollRequiredValueState = useHybridLocalStorage<number | undefined>(
		'diceRollRequiredValueState',
		undefined
	);
	const gameSettingsState = useHybridLocalStorage<GameSettings>(
		'gameSettingsState',
		defaultGameSettings()
	);

	// WebGL detection and simulation mode
	let webglCapabilities = $state<WebGLCapabilities | null>(null);
	let simulationMode = $state<'3d' | '2d'>('2d');
	let simulationModeReason = $state<string>('Detecting capabilities...');

	// UI state (non-persistent)
	let isRolling = $state<boolean>(false);
	let isMounted = $state(false);
	let diceBox: any;

	// Action tracking pour reset automatique
	let previousActionId = $state<string | undefined>();

	// Derived states for modifiers and calculations
	let modifierReasonState = $derived<string>(action?.dice_roll?.modifier_explanation || '');
	let modifierState = $derived<number>(
		Number.parseInt(action?.dice_roll?.modifier_value as unknown as string) || 0
	);
	let karmaModifierState = $derived(
		!useKarmicDice.value
			? 0
			: diceRollLogic.getKarmaModifier(
					rollDifferenceHistoryState.value,
					diceRollRequiredValueState.value ?? 20
				)
	);

	const characterStatsState = useHybridLocalStorage<CharacterStats>(
		'characterStatsState',
		initialCharacterStatsState
	);

	let generalAttributeModifier = $derived(
		() => characterStatsState.value.attributes[action?.related_attribute ?? ''] ?? 0
	);
	let specificSkillModifier = $derived(
		() => characterStatsState.value.skills[action?.related_skill ?? ''] ?? 0
	);

	// Derived states for better UX
	const totalModifier = $derived(getModifier());
	const hasRolled = $derived(rolledValueState.value !== undefined);
	const canContinue = $derived(hasRolled && !isRolling);
	const rollResult = $derived((rolledValueState.value ?? 0) + totalModifier);

	const diceRollResultState = $derived(
		diceRollLogic.determineDiceRollResult(
			diceRollRequiredValueState.value ?? 20,
			rolledValueState.value ?? 0,
			getModifier()
		)
	);

	let diceRollPromptAddition = $derived(
		diceRollLogic.getDiceRollPromptAddition(diceRollResultState)
	);

	// Result state for styling
	const isSuccess = $derived(diceRollResultState?.includes('success'));
	const isFailure = $derived(diceRollResultState?.includes('failure'));

	// Reset quand resetState devient true
	$effect(() => {
		if (resetState) {
			rolledValueState.reset(); // reset to undefined
			diceRollRequiredValueState.reset(); // reset to undefined
			previousActionId = undefined;
		}
	});

	// Détection de changement d'action pour reset automatique
	$effect(() => {
		if (isMounted && action) {
			// Créer un ID unique pour l'action basé sur ses propriétés
			const currentActionId = JSON.stringify({
				text: action.text,
				characterName: action.characterName,
				dice_roll: action.dice_roll,
				action_difficulty: action.action_difficulty
			});

			if (previousActionId !== undefined && previousActionId !== currentActionId) {
				// Nouvelle action détectée, reset les valeurs
				rolledValueState.value = undefined;
				diceRollRequiredValueState.value = undefined;
			}

			previousActionId = currentActionId;
		}
	});

	// Initialisation de la valeur requise pour le lancement
	$effect(() => {
		if (isMounted && action && diceRollRequiredValueState.value === undefined && !resetState) {
			if (action.is_possible === false) {
				rollDifferenceHistoryState.reset();
				diceRollRequiredValueState.value = 99;
			} else {
				diceRollRequiredValueState.value = diceRollLogic.getRequiredValue(
					action?.action_difficulty,
					difficultyState.value
				);
			}
		}
	});

	onMount(async () => {
		// Detect WebGL capabilities first
		webglCapabilities = detectWebGLCapabilities();
		logWebGLInfo(webglCapabilities);

		// Determine simulation mode based on user preference and capabilities
		const modeResult = determineDiceSimulationMode(
			gameSettingsState.value.diceSimulationMode,
			webglCapabilities
		);
		simulationMode = modeResult.mode;
		simulationModeReason = modeResult.reason;

		try {
			// Initialize DiceBox with appropriate configuration
			const diceBoxConfig: any = {
				assetPath: '/assets/dice-box/',
				suspendSimulation: simulationMode === '2d'
			};

			console.log(
				`🎲 Initializing dice with ${simulationMode.toUpperCase()} mode:`,
				simulationModeReason
			);

			diceBox = new DiceBox('#dice-box', diceBoxConfig);
			await diceBox.init();
			isMounted = true;
		} catch (error) {
			console.error('Error initializing dice box:', error);

			// Fallback to 2D mode if 3D initialization fails
			if (simulationMode === '3d') {
				console.warn('3D dice initialization failed, falling back to 2D mode');
				simulationMode = '2d';
				simulationModeReason = 'Fallback: 3D initialization failed';

				try {
					diceBox = new DiceBox('#dice-box', {
						assetPath: '/assets/dice-box/',
						suspendSimulation: true
					} as any);
					await diceBox.init();
					isMounted = true;
				} catch (fallbackError) {
					console.error('Even 2D dice initialization failed:', fallbackError);
					simulationModeReason = 'Error: Dice initialization failed completely';
				}
			}
		}
	});

	function getModifier() {
		const modifier =
			modifierState + karmaModifierState + generalAttributeModifier() + specificSkillModifier();
		if (modifier > 10) {
			return 10;
		}
		if (modifier < -10) {
			return -10;
		}
		return modifier;
	}

	function getRollResult() {
		const rolledValue = rolledValueState.value;
		if (rolledValue === undefined) return '? + ? = ?';
		return `${rolledValue} + ${getModifier()} = ${rollResult}`;
	}

	const handleRoll = async (evt: MouseEvent & { currentTarget: HTMLButtonElement }) => {
		if (isRolling || hasRolled || !diceBox) return;

		isRolling = true;
		evt.currentTarget.disabled = true;

		try {
			let result: number;

			if (simulationMode === '2d') {
				// Use random number generation for 2D mode
				result = getRandomInteger(1, 20);
				// Add a small delay to simulate rolling time
				await new Promise((resolve) => setTimeout(resolve, 500));
			} else {
				// Use 3D physics simulation
				const results = await diceBox.roll('1d20');
				result = results[0].value;
			}

			// Assigner la valeur seulement après le roll réussi
			rolledValueState.value = result;
		} catch (error) {
			console.error('Error rolling dice:', error);
			// Fallback to random number if dice roll fails
			rolledValueState.value = getRandomInteger(1, 20);
		} finally {
			isRolling = false;
		}
	};

	const handleClose = () => {
		if (diceBox) {
			diceBox.clear();
		}

		// Sauvegarder le résultat seulement si on a vraiment lancé
		const finalResult = rolledValueState.value;
		if (finalResult !== undefined) {
			const requiredValue = diceRollRequiredValueState.value ?? 20;
			rollDifferenceHistoryState.value = [
				...rollDifferenceHistoryState.value.slice(-2),
				finalResult + getModifier() - requiredValue
			];
		}

		diceRollDialog.close($state.snapshot(diceRollResultState));
	};
</script>

<div id="dice-box" class="pointer-events-none fixed inset-0 z-30"></div>

<dialog bind:this={diceRollDialog} id="dice-rolling-dialog" class="modal z-20">
	<!-- Modal backdrop -->
	<div class="modal-backdrop bg-opacity-50 bg-black"></div>

	<div class="modal-box bg-base-100 mx-auto max-w-2xl p-6 shadow-2xl">
		<!-- Header Section -->
		<div class="mb-6 flex flex-col items-center">
			<h3 class="text-base-content mb-3 text-2xl font-bold">Dice Roll Challenge</h3>
			<div class="flex items-center gap-3">
				<span class="text-base-content/70 text-lg">Difficulty Class:</span>
				<div class="badge badge-primary badge-lg px-4 py-3 text-xl font-bold">
					{diceRollRequiredValueState.value ?? '?'}
				</div>
			</div>
		</div>

		<!-- Simulation Mode Indicator -->
		<div class="mb-4 text-center">
			<div class="tooltip tooltip-bottom w-full" data-tip={simulationModeReason}>
				<div
					class="badge {simulationMode === '3d'
						? 'badge-success'
						: 'badge-info'} gap-2 px-3 py-2 text-sm"
				>
					{#if simulationMode === '3d'}
						<svg
							class="h-4 w-4"
							fill="currentColor"
							viewBox="0 0 20 20"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								fill-rule="evenodd"
								d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
								clip-rule="evenodd"
							/>
						</svg>
					{:else}
						<svg
							class="h-4 w-4"
							fill="currentColor"
							viewBox="0 0 20 20"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					{/if}
					{getDiceSimulationModeDescription(simulationMode)}
				</div>
			</div>
		</div>

		<!-- Action Details Section (for custom actions) -->
		{#if action.is_custom_action}
			<div class="card bg-base-200 mb-6 shadow-sm">
				<div class="card-body p-4">
					<h4 class="card-title mb-3 text-lg">Action Details</h4>

					<div class="space-y-3">
						<div class="alert alert-info">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								class="h-6 w-6 shrink-0 stroke-current"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								></path>
							</svg>
							<div>
								<div class="font-bold">Plausibility</div>
								<div class="text-sm">{action.plausibility}</div>
							</div>
						</div>

						<div class="alert alert-warning">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								class="h-6 w-6 shrink-0 stroke-current"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
								></path>
							</svg>
							<div>
								<div class="font-bold">Difficulty</div>
								<div class="text-sm">{action.difficulty_explanation}</div>
							</div>
						</div>

						{#if action.resource_cost?.cost}
							<div class="alert alert-error">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									class="h-6 w-6 shrink-0 stroke-current"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									></path>
								</svg>
								<div>
									<div class="font-bold">Resource Cost</div>
									<div class="text-sm">
										This action will cost <span class="text-error font-semibold">
											{action.resource_cost.cost}
											{action.resource_cost.resource_key?.replaceAll('_', ' ')}
										</span>
									</div>
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<!-- Roll Section -->
		<div class="mb-6 flex flex-col items-center gap-6">
			<button
				id="roll-dice-button"
				class="btn btn-primary btn-lg min-h-16 gap-3 {isRolling ? 'loading' : ''}"
				disabled={hasRolled || isRolling}
				onclick={handleRoll}
				aria-label="Roll twenty-sided die"
			>
				{#if !isRolling && !hasRolled}
					<svg
						fill="currentColor"
						class="h-8 w-8 {isSuccess ? 'text-success' : isFailure ? 'text-error' : ''}"
						viewBox="-16 0 512 512"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M106.75 215.06L1.2 370.95c-3.08 5 .1 11.5 5.93 12.14l208.26 22.07-108.64-190.1zM7.41 315.43L82.7 193.08 6.06 147.1c-2.67-1.6-6.06.32-6.06 3.43v162.81c0 4.03 5.29 5.53 7.41 2.09zM18.25 423.6l194.4 87.66c5.3 2.45 11.35-1.43 11.35-7.26v-65.67l-203.55-22.3c-4.45-.5-6.23 5.59-2.2 7.57zm81.22-257.78L179.4 22.88c4.34-7.06-3.59-15.25-10.78-11.14L17.81 110.35c-2.47 1.62-2.39 5.26.13 6.78l81.53 48.69zM240 176h109.21L253.63 7.62C250.5 2.54 245.25 0 240 0s-10.5 2.54-13.63 7.62L130.79 176H240zm233.94-28.9l-76.64 45.99 75.29 122.35c2.11 3.44 7.41 1.94 7.41-2.1V150.53c0-3.11-3.39-5.03-6.06-3.43zm-93.41 18.72l81.53-48.7c2.53-1.52 2.6-5.16.13-6.78l-150.81-98.6c-7.19-4.11-15.12 4.08-10.78 11.14l79.93 142.94zm79.02 250.21L256 438.32v65.67c0 5.84 6.05 9.71 11.35 7.26l194.4-87.66c4.03-1.97 2.25-8.06-2.2-7.56zm-86.3-200.97l-108.63 190.1 208.26-22.07c5.83-.65 9.01-7.14 5.93-12.14L373.25 215.06zM240 208H139.57L240 383.75 340.43 208H240z"
						/>
					</svg>
				{/if}
				<span class="text-lg">
					{isRolling ? 'Rolling...' : hasRolled ? 'Rolled!' : 'Roll d20'}
				</span>
			</button>

			<!-- Result Display -->
			<div class="w-full max-w-md">
				<div class="mb-3 text-center">
					<span class="text-base-content/70 text-lg">Roll Result:</span>
				</div>

				<div class="bg-base-200 flex min-h-16 items-center justify-center rounded-lg p-4">
					{#if isRolling}
						<div class="loading loading-spinner loading-lg text-primary"></div>
					{:else if hasRolled}
						<div class="text-center">
							<output
								id="dice-roll-result"
								class="text-2xl font-bold tabular-nums {isSuccess
									? 'text-success'
									: isFailure
										? 'text-error'
										: 'text-primary'}"
								aria-live="polite"
							>
								{getRollResult()}
							</output>
							<div class="text-base-content/60 mt-1 text-sm">
								{diceRollPromptAddition}
							</div>
						</div>
					{:else}
						<span class="text-base-content/40 text-xl">Ready to roll...</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- Modifiers Section -->
		<div class="card bg-base-200 mb-6 shadow-sm">
			<div class="card-body p-4">
				<h4 class="card-title mb-4 text-lg">Modifiers Breakdown</h4>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<!-- Attribute Modifier -->
					<div class="stat bg-base-100 rounded-lg p-3">
						<div class="stat-title text-sm">
							{action.related_attribute || 'No Attribute'}
						</div>
						<div
							class="stat-value text-lg {generalAttributeModifier() > 0
								? 'text-success'
								: generalAttributeModifier() < 0
									? 'text-error'
									: 'text-base-content'}"
						>
							{generalAttributeModifier() > 0 ? '+' : ''}{generalAttributeModifier()}
						</div>
					</div>

					<!-- Skill Modifier -->
					<div class="stat bg-base-100 rounded-lg p-3">
						<div class="stat-title text-sm">
							{action.related_skill || 'No Skill'}
						</div>
						<div
							class="stat-value text-lg {specificSkillModifier() > 0
								? 'text-success'
								: specificSkillModifier() < 0
									? 'text-error'
									: 'text-base-content'}"
						>
							{specificSkillModifier() > 0 ? '+' : ''}{specificSkillModifier()}
						</div>
					</div>

					<!-- Situational Modifier -->
					<div class="stat bg-base-100 rounded-lg p-3">
						<div class="stat-title text-sm">Situational</div>
						<div
							class="stat-value text-lg {modifierState > 0
								? 'text-success'
								: modifierState < 0
									? 'text-error'
									: 'text-base-content'}"
						>
							{modifierState > 0 ? '+' : ''}{modifierState}
						</div>
					</div>

					<!-- Karma Modifier -->
					{#if karmaModifierState > 0}
						<div class="stat bg-base-100 rounded-lg p-3">
							<div class="stat-title text-sm">Karma Bonus</div>
							<div class="stat-value text-info text-lg">
								+{karmaModifierState}
							</div>
						</div>
					{/if}
				</div>

				<!-- Total Modifier -->
				<div class="divider my-3"></div>
				<div class="flex items-center justify-between">
					<span class="text-lg font-semibold">Total Modifier:</span>
					<div
						class="badge badge-lg {totalModifier > 0
							? 'badge-success'
							: totalModifier < 0
								? 'badge-error'
								: 'badge-neutral'} text-lg font-bold"
					>
						{totalModifier > 0 ? '+' : ''}{totalModifier}
					</div>
				</div>

				{#if totalModifier === 10 || totalModifier === -10}
					<div class="alert alert-warning mt-3">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							class="h-6 w-6 shrink-0 stroke-current"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
							></path>
						</svg>
						<span>Modifier is capped at ±10</span>
					</div>
				{/if}

				{#if modifierReasonState}
					<div class="mt-3">
						<div class="mb-1 text-sm font-medium">Modifier Reason:</div>
						<div class="text-base-content/70 bg-base-100 rounded p-2 text-sm">
							{modifierReasonState}
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="modal-action justify-center gap-3">
			<button
				onclick={handleClose}
				id="dice-rolling-dialog-continue"
				class="btn btn-success btn-lg px-8"
				disabled={!canContinue}
				aria-label="Continue with roll result"
			>
				<span class="text-lg">Continue</span>
			</button>
		</div>
	</div>
</dialog>
