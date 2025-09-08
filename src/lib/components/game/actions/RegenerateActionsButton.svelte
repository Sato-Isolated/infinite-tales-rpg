<script lang="ts">
	import LoadingIcon from '$lib/components/ui/loading/LoadingIcon.svelte';

	interface Props {
		regenerateActions: () => Promise<void>;
		disabled?: boolean;
		variant?: 'primary' | 'secondary' | 'accent' | 'neutral' | 'ghost';
		size?: 'sm' | 'md' | 'lg';
		iconOnly?: boolean;
	}

	const {
		regenerateActions,
		disabled = false,
		variant = 'neutral',
		size = 'md',
		iconOnly = false
	}: Props = $props();

	let isRegenerating = $state(false);

	const handleRegenerate = async () => {
		if (isRegenerating || disabled) return;

		try {
			isRegenerating = true;
			await regenerateActions();
		} catch (error) {
			console.error('Error while regenerating actions:', error);
		} finally {
			isRegenerating = false;
		}
	};
</script>

<button
	class="btn btn-{variant} btn-{size} {iconOnly ? 'btn-square' : 'gap-2'}
	focus:ring-primary focus:ring-opacity-50 transition-all
	duration-200 ease-in-out hover:scale-105
	hover:rotate-12 hover:shadow-md focus:ring-2
	active:scale-95 active:rotate-6 active:shadow-sm
	disabled:hover:scale-100 disabled:hover:rotate-0 disabled:hover:shadow-none"
	onclick={handleRegenerate}
	disabled={disabled || isRegenerating}
	aria-label="Regenerate actions"
>
	{#if isRegenerating}
		<LoadingIcon />
		{#if !iconOnly}Generating...{/if}
	{:else}
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="lucide lucide-refresh-cw {isRegenerating ? 'animate-spin' : ''}"
		>
			<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
			<path d="M21 3v5h-5" />
			<path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
			<path d="M3 21v-5h5" />
		</svg>
		{#if !iconOnly}Regenerate actions{/if}
	{/if}
</button>

<style>
	.btn {
		transition: all 0.2s ease-in-out;
	}

	.btn:hover:not(:disabled) {
		transform: translateY(-1px);
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
