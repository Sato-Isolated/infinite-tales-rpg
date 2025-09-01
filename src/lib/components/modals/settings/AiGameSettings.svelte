<script lang="ts">
	import { defaultGameSettings, type GameSettings } from '$lib/ai/agents/gameAgent';
	import { useHybridLocalStorage } from '$lib/state/hybrid/useHybridLocalStorage.svelte';

	let { onclose }: { onclose?: () => void } = $props();
	let gameSettingsState = useHybridLocalStorage<GameSettings>('gameSettingsState', defaultGameSettings());

	const useDynamicCombat = useHybridLocalStorage<boolean>('useDynamicCombat', false);
</script>

<dialog open class="modal z-50" style="background: rgba(0, 0, 0, 0.3);">
	<div class="modal-box flex flex-col items-center text-center">
		<h3 class="text-lg font-bold">AI Settings</h3>

		<fieldset class="mt-5 w-full sm:w-2/3">
			<legend class="fieldset-legend">Dynamic Combat</legend>
			<input
				type="checkbox"
				id="useDynamicCombat"
				bind:checked={useDynamicCombat.value}
				class="toggle m-auto mt-2 text-center"
			/>
			<small class="text-base-content/70 m-auto mt-2 text-xs">
				Enable for reactions for every NPC during combat.<br />
				Disable for faster, story-focused combat.
			</small>
		</fieldset>

		<fieldset class="fieldset mt-5 w-full sm:w-2/3">
			<legend class="fieldset-legend">Detailed Narration Length</legend>
			<input
				type="checkbox"
				bind:checked={gameSettingsState.value.detailedNarrationLength}
				class="toggle m-auto mt-2 text-center"
			/>
			<small class="text-base-content/70 m-auto mt-2 text-xs">
				Enabled longer detailed narration, disabled shorter concise length
			</small>
		</fieldset>

		<fieldset class="fieldset mt-5 w-full sm:w-2/3">
			<legend class="fieldset-legend">AI creates new skills</legend>
			<input
				type="checkbox"
				bind:checked={gameSettingsState.value.aiIntroducesSkills}
				class="toggle m-auto mt-2 text-center"
			/>
			<small class="text-base-content/70 m-auto mt-2 text-xs">
				When no existing skill fits the action, the AI will create a new one.
			</small>
		</fieldset>

		<fieldset class="fieldset mt-5 w-full sm:w-2/3">
			<legend class="fieldset-legend">Generate Ambient Dialogue</legend>
			<input
				type="checkbox"
				bind:checked={gameSettingsState.value.generateAmbientDialogue}
				class="toggle m-auto mt-2 text-center"
			/>
			<small class="text-base-content/70 m-auto mt-2 text-xs">
				AI will naturally include overheard conversations between NPCs, students, or bystanders to
				create a living world atmosphere.
			</small>
		</fieldset>

		<fieldset class="fieldset mt-5 w-full sm:w-2/3">
			<legend class="fieldset-legend">Random events</legend>
			<select
				bind:value={gameSettingsState.value.randomEventsHandling}
				class="select select-md mt-2 text-center"
			>
				<option value="none">None</option>
				<option value="probability">Probability</option>
				<option value="ai_decides">AI decides</option>
			</select>
			<small class="text-base-content/70 m-auto mt-2 text-xs">
				E.g. travel or spell channelling is interrupted
				<br />
				None: action is never interrupted
				<br />
				Probability: E.g. 75% ambush in dangerous area
				<br />
				AI decides: based on context
			</small>
		</fieldset>

		<!-- Close Button -->
		<div class="modal-action mt-6">
			<button class="btn btn-info btn-md" onclick={onclose}>Close</button>
		</div>
	</div>
	<!-- Optional: Click outside to close -->
	<form method="dialog" class="modal-backdrop">
		<button onclick={onclose}>close</button>
	</form>
</dialog>
