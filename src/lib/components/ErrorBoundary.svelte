<script lang="ts">
	import { handleError } from '$lib/util.svelte';
	import { onMount } from 'svelte';

	interface Props {
		children: any;
		fallback?: any;
		onError?: (error: Error) => void;
	}

	let { children, fallback, onError }: Props = $props();

	let hasError = $state(false);
	let error = $state<Error | null>(null);

	// Reset error state when children change
	$effect(() => {
		children; // Create dependency
		if (hasError) {
			hasError = false;
			error = null;
		}
	});

	onMount(() => {
		// Catch unhandled promise rejections
		const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
			console.error('Unhandled promise rejection:', event.reason);
			handleError('An unexpected error occurred. Please try again.');
		};

		// Catch JavaScript runtime errors
		const handleWindowError = (event: ErrorEvent) => {
			console.error('Runtime error:', event.error);
			catchError(event.error || new Error(event.message));
		};

		window.addEventListener('unhandledrejection', handleUnhandledRejection);
		window.addEventListener('error', handleWindowError);

		return () => {
			window.removeEventListener('unhandledrejection', handleUnhandledRejection);
			window.removeEventListener('error', handleWindowError);
		};
	});

	function catchError(err: Error) {
		console.error('ErrorBoundary caught error:', err);
		hasError = true;
		error = err;

		if (onError) {
			onError(err);
		} else {
			handleError(err.message);
		}
	}

	function retry() {
		hasError = false;
		error = null;
	}
</script>

{#if hasError}
	{#if fallback}
		{@render fallback(error, retry)}
	{:else}
		<div class="alert alert-error">
			<div class="flex flex-col gap-2">
				<h3 class="font-bold">Something went wrong</h3>
				<p class="text-sm">
					{error?.message || 'An unexpected error occurred'}
				</p>
				<button class="btn btn-sm btn-primary" onclick={retry}> Try Again </button>
			</div>
		</div>
	{/if}
{:else}
	{@render children()}
{/if}
