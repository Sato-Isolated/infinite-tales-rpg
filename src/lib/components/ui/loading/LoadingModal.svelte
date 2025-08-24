<script lang="ts">
	import LoadingIcon from './LoadingIcon.svelte';
	let { loadingText = 'Asking the AI' } = $props();
</script>

<dialog class="modal animate-fade-in z-999" open style="background: rgba(0, 0, 0, 0.3);">
	<div
		class="modal-box animate-scale-in flex flex-col items-center transition-all duration-300 ease-out"
	>
		<LoadingIcon />
		<span class="mt-2 animate-pulse text-center">{loadingText}</span>
	</div>
</dialog>

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes scale-in {
		from {
			transform: scale(0.8);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}

	.animate-fade-in {
		animation: fade-in 0.2s ease-out;
	}

	.animate-scale-in {
		animation: scale-in 0.3s ease-out;
	}
</style>
