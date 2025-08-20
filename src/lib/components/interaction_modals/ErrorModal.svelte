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
	class="modal z-1000 animate-fade-in"
	open
	style="background: rgba(0, 0, 0, 0.3);"
>
	<div class="modal-box flex flex-col animate-scale-in transition-all duration-300 ease-out">
		<span class="text-center font-bold">Error</span>
		<span class="mt-2 max-w-sm break-words sm:max-w-md">{errorState.userMessage}</span>
		{#if errorState.exception && errorState.retryable}
			<span class="mt-3 font-bold">
				Please retry the action or reload the page. If the error persists report it in the Discord.
			</span>
		{/if}
		<button
			class="btn btn-info btn-md mt-3
			transition-all duration-200 ease-in-out
			hover:scale-105 hover:shadow-lg hover:bg-info-focus
			active:scale-95 active:shadow-sm
			focus:ring-2 focus:ring-info focus:ring-opacity-50"
			onclick={() => {
				dialog.close();
				errorState.clear();
				goto('/game/settings/ai');
			}}
		>
			Go To Settings
		</button>
		<button
			class="btn btn-info btn-md mt-3
			transition-all duration-200 ease-in-out
			hover:scale-105 hover:shadow-lg hover:bg-info-focus
			active:scale-95 active:shadow-sm
			focus:ring-2 focus:ring-info focus:ring-opacity-50"
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
