<!-- src/lib/components/OutputFeaturesModal.svelte -->
<script lang="ts">
	import { useLocalStorage } from '$lib/state/useLocalStorage.svelte';
	import type { AIConfig } from '$lib';

	let { onclose }: { onclose: () => void } = $props();

	// --- State Management ---
	// Assuming a default structure for AIConfig
	const aiConfigState = useLocalStorage<AIConfig>('aiConfigState', {
		useFallbackLlmState: false,
		disableImagesState: false,
		disableAudioState: false
	});
	// TTS removed
</script>

<dialog open class="modal z-50" style="background: rgba(0, 0, 0, 0.3);">
	<div class="modal-box flex flex-col items-center text-center">
		<h3 class="text-lg font-bold">Output Features & Media Settings</h3>

		<!-- Disable Image Generation -->
		<label class="form-control mt-5 w-full sm:w-2/3">
			<div class="flex flex-col items-center gap-2">
				<span>Disable Image Generation</span>
				<input
					type="checkbox"
					class="toggle toggle-info"
					bind:checked={aiConfigState.value.disableImagesState}
				/>
			</div>
		</label>

	<!-- TTS removed -->

		<!-- Close Button -->
		<div class="modal-action mt-6">
			<button class="btn btn-info" onclick={onclose}>Close</button>
		</div>
	</div>
	<!-- Optional: Click outside to close -->
	<form method="dialog" class="modal-backdrop">
		<button onclick={onclose}>close</button>
	</form>
</dialog>
