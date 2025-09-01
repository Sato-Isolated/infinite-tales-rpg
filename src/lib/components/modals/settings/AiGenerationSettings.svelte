<script lang="ts">
	import { useHybridLocalStorage } from '$lib/state/hybrid/useHybridLocalStorage.svelte';
	import type { AIConfig } from '$lib';

	let { onclose }: { onclose?: () => void } = $props();

	const aiConfigState = useHybridLocalStorage<AIConfig>('aiConfigState', {
		useFallbackLlmState: false,
		disableImagesState: false,
		disableAudioState: false
	});
	const temperatureState = useHybridLocalStorage<number>('temperatureState', 1);
	const aiLanguage = useHybridLocalStorage<string>('aiLanguage', '');
</script>

<dialog open class="modal z-50" style="background: rgba(0, 0, 0, 0.3);">
	<div class="modal-box flex flex-col items-center text-center">
		<h3 class="text-lg font-bold">AI Generation Settings</h3>

		<!-- Use Gemini Flash Fallback -->
		<fieldset class="mt-5 w-full sm:w-2/3">
			<div class="flex flex-col items-center gap-2">
				<span>Use Gemini Flash as fallback</span>
				<div class="flex items-center gap-2">
					<input
						type="checkbox"
						class="toggle"
						bind:checked={aiConfigState.value.useFallbackLlmState}
					/>
				</div>
				<small class="text-base-content/70 m-auto mt-2 text-xs">
					When Gemini Thinking is overloaded, Flash will be used.
				</small>
				<small class="text-base-content/70 m-auto mt-1 text-xs">
					Keep in mind that the game experience can be decreased with this option.
				</small>
			</div>
		</fieldset>

		<!-- Temperature -->
		<fieldset class="mt-5 w-full sm:w-2/3">
			Temperature: {temperatureState.value.toFixed(2)}
			<!-- Show formatted value -->
			<input
				type="range"
				min="0"
				max="2"
				step="0.05"
				id="temperature"
				bind:value={temperatureState.value}
				class="range range-info mt-2"
			/>
			<small class="text-base-content/70 m-auto mt-2 text-xs">
				Higher temperature makes the AI more creative, but also errors more likely.
			</small>
		</fieldset>

		<!-- AI Language -->
		<fieldset class="mt-5 w-full sm:w-2/3">
			AI Language
			<input
				bind:value={aiLanguage.value}
				placeholder="AI will respond in this language (e.g., 'fr', 'de', 'es'). Leave empty for English."
				class="input input-md mt-2"
			/>
			<small class="text-base-content/70 m-auto mt-2 text-xs">
				The Game UI will not be translated yet. Ensure the AI supports the entered language code.
			</small>
		</fieldset>

		<!-- Close Button -->
		<div class="modal-action mt-6">
			<button class="btn btn-info btn-md" onclick={onclose}>Close</button>
			<!-- No explicit "Save" needed as bind:value updates localStorage directly -->
		</div>
	</div>
	<!-- Optional: Click outside to close -->
	<form method="dialog" class="modal-backdrop">
		<button onclick={onclose}>close</button>
	</form>
</dialog>
