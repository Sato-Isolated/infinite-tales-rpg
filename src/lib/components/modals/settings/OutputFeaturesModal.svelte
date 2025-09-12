<!-- src/lib/components/OutputFeaturesModal.svelte -->
<script lang="ts">


	let { onclose }: { onclose: () => void } = $props();

</script>

<dialog open class="modal z-50" style="background: rgba(0, 0, 0, 0.3);">
	<div class="modal-box flex flex-col items-center text-center">
		<h3 class="text-lg font-bold">Output Features & Media Settings</h3>

		<p class="mt-5 text-sm text-base-content/70">
			Output features settings will be available here in future updates.
		</p>

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
