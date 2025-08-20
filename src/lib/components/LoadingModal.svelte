<script lang="ts">
	import LoadingIcon from '$lib/components/LoadingIcon.svelte';
	let { loadingText = 'Asking the AI' } = $props();
</script>

<dialog class="modal z-999 animate-fade-in" open style="background: rgba(0, 0, 0, 0.3);">
	<div class="modal-box flex flex-col items-center animate-scale-in transition-all duration-300 ease-out">
		<LoadingIcon />
		<span class="mt-2 text-center animate-pulse">{loadingText}</span>
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
