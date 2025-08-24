<script lang="ts">
	import { goto } from '$app/navigation';
	import { errorState } from '$lib/state/errorState.svelte';

	interface Props {
		onclose: () => void;
	}

	let dialog: HTMLDialogElement;
	let { onclose }: Props = $props();
</script>

<dialog
	bind:this={dialog}
	{onclose}
	class="modal animate-fade-in z-1000"
	open
	style="background: rgba(0, 0, 0, 0.3);"
>
	<div class="modal-box animate-scale-in flex flex-col transition-all duration-300 ease-out">
		<span class="text-center font-bold">Error</span>
		<span class="mt-2 max-w-sm break-words sm:max-w-md">{errorState.userMessage}</span>
		{#if errorState.exception && errorState.retryable}
			<span class="mt-3 font-bold">
				Please retry the action or reload the page. If the error persists report it in the Discord.
			</span>
		{/if}
		<button
			class="btn btn-info btn-md hover:bg-info-focus
			focus:ring-info focus:ring-opacity-50 mt-3
			transition-all duration-200 ease-in-out
			hover:scale-105 hover:shadow-lg
			focus:ring-2 active:scale-95 active:shadow-sm"
			onclick={() => {
				dialog.close();
				errorState.clear();
				goto('/game/settings/ai');
			}}
		>
			Go To Settings
		</button>
		<button
			class="btn btn-info btn-md hover:bg-info-focus
			focus:ring-info focus:ring-opacity-50 mt-3
			transition-all duration-200 ease-in-out
			hover:scale-105 hover:shadow-lg
			focus:ring-2 active:scale-95 active:shadow-sm"
			onclick={() => {
				dialog.close();
				errorState.clear();
			}}
		>
			Close
		</button>
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
