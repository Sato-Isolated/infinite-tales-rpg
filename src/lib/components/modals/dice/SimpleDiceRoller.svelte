<script lang="ts">
	import DiceBox from '@3d-dice/dice-box';
	import { onMount } from 'svelte';

	// Define props using Svelte 5 runes
	const { notation, onClose }: { notation: string; onClose: (result: number) => void } = $props();

	// State management using Svelte 5 runes
	let rollResult = $state<number | undefined>(undefined);
	let isRolling = $state<boolean>(false);
	let diceBox: any;

	// Notation tracking pour reset automatique
	let previousNotation = $state<string | undefined>();

	// Derived states
	const hasResult = $derived(rollResult !== undefined);
	const canContinue = $derived(hasResult && !isRolling);

	// Detect notation change for automatic reset
	$effect(() => {
		if (notation !== previousNotation) {
			rollResult = undefined;
			previousNotation = notation;
		}
	});

	const handleRoll = async () => {
		if (isRolling || !diceBox) return;

		isRolling = true;
		rollResult = undefined; // Reset to undefined instead of NaN

		try {
			await diceBox.roll(notation);
		} catch (error) {
			console.error('Error rolling dice:', error);
			isRolling = false;
		}
	};

	const handleClose = (result: number | undefined) => {
		if (diceBox) {
			diceBox.clear();
		}
		// Only call onClose if we have a valid result
		if (result !== undefined) {
			onClose(result);
		}
	};

	onMount(async () => {
		// Reset on mount to ensure a fresh state
		rollResult = undefined;

		try {
			// Ensure the dice container is ready
			const diceContainer = document.getElementById('simple-dice-box');
			if (!diceContainer) {
				console.error('Dice container not found');
				return;
			}

			diceBox = new DiceBox('#simple-dice-box', {
				assetPath: '/assets/dice-box/' // required
			});

			await diceBox.init();

			diceBox.onRollComplete = (result: Array<{ value: number }>) => {
				rollResult = result[0].value;
				isRolling = false;
			};
		} catch (error) {
			console.error('Error initializing dice box:', error);
			isRolling = false;
		}
	});
</script>

<!-- DiceBox container - positioned to be visible above everything -->
<div id="simple-dice-box" class="fixed inset-0 z-50"></div>

<!-- Modal positioned below dice but above backdrop -->
<dialog open id="dice-rolling-dialog" class="modal z-40">
	<!-- Modal backdrop -->
	<div class="modal-backdrop bg-opacity-30 z-30 bg-black"></div>

	<div class="modal-box bg-base-100 relative z-45 mx-auto max-w-md p-8 shadow-2xl">
		<!-- Header section -->
		<div class="mb-6 text-center">
			<h3 class="text-base-content mb-2 text-2xl font-bold">Dice Roll</h3>
			<div class="badge badge-primary badge-lg px-4 py-2 font-mono text-lg">
				{notation}
			</div>
		</div>

		<!-- Dice icon and roll button -->
		<div class="mb-6 flex flex-col items-center gap-6">
			<button
				id="roll-dice-button"
				class="btn btn-primary btn-lg min-h-16 gap-3 {isRolling ? 'loading' : ''}"
				onclick={handleRoll}
				disabled={isRolling}
				aria-label="Roll dice"
			>
				{#if !isRolling}
					<svg
						fill="currentColor"
						class="h-8 w-8"
						viewBox="-16 0 512 512"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M106.75 215.06L1.2 370.95c-3.08 5 .1 11.5 5.93 12.14l208.26 22.07-108.64-190.1zM7.41 315.43L82.7 193.08 6.06 147.1c-2.67-1.6-6.06.32-6.06 3.43v162.81c0 4.03 5.29 5.53 7.41 2.09zM18.25 423.6l194.4 87.66c5.3 2.45 11.35-1.43 11.35-7.26v-65.67l-203.55-22.3c-4.45-.5-6.23 5.59-2.2 7.57zm81.22-257.78L179.4 22.88c4.34-7.06-3.59-15.25-10.78-11.14L17.81 110.35c-2.47 1.62-2.39 5.26.13 6.78l81.53 48.69zM240 176h109.21L253.63 7.62C250.5 2.54 245.25 0 240 0s-10.5 2.54-13.63 7.62L130.79 176H240zm233.94-28.9l-76.64 45.99 75.29 122.35c2.11 3.44 7.41 1.94 7.41-2.1V150.53c0-3.11-3.39-5.03-6.06-3.43zm-93.41 18.72l81.53-48.7c2.53-1.52 2.6-5.16.13-6.78l-150.81-98.6c-7.19-4.11-15.12 4.08-10.78 11.14l79.93 142.94zm79.02 250.21L256 438.32v65.67c0 5.84 6.05 9.71 11.35 7.26l194.4-87.66c4.03-1.97 2.25-8.06-2.2-7.56zm-86.3-200.97l-108.63 190.1 208.26-22.07c5.83-.65 9.01-7.14 5.93-12.14L373.25 215.06zM240 208H139.57L240 383.75 340.43 208H240z"
						/>
					</svg>
				{/if}
				<span class="text-lg">
					{isRolling ? 'Rolling...' : 'Roll Dice'}
				</span>
			</button>
		</div>

		<!-- Result section -->
		<div class="mb-8 text-center">
			<p class="text-base-content/70 mb-3 text-lg">Result:</p>
			<div class="bg-base-200 flex min-h-16 items-center justify-center rounded-lg p-4">
				{#if isRolling}
					<div class="loading loading-spinner loading-lg text-primary"></div>
				{:else if hasResult}
					<output
						id="dice-roll-result"
						class="text-primary text-4xl font-bold tabular-nums"
						aria-live="polite"
					>
						{rollResult}
					</output>
				{:else}
					<span class="text-base-content/40 text-2xl">Ready to roll...</span>
				{/if}
			</div>
		</div>

		<!-- Action buttons -->
		<div class="modal-action justify-center gap-3">
			<button
				onclick={() => handleClose(rollResult)}
				id="dice-rolling-dialog-continue"
				class="btn btn-success btn-lg px-8"
				disabled={!canContinue}
				aria-label="Continue with result"
			>
				<span class="text-lg">Continue</span>
			</button>
		</div>
	</div>
</dialog>
