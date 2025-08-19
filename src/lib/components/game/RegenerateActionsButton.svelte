<script lang="ts">
	import LoadingIcon from '$lib/components/LoadingIcon.svelte';

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
			console.error('Erreur lors de la régénération des actions:', error);
		} finally {
			isRegenerating = false;
		}
	};
</script>

<button
	class="btn btn-{variant} btn-{size} {iconOnly ? 'btn-square' : 'gap-2'}"
	onclick={handleRegenerate}
	disabled={disabled || isRegenerating}
	aria-label="Régénérer les actions"
>
	{#if isRegenerating}
		<LoadingIcon />
		{#if !iconOnly}Génération...{/if}
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
			class="lucide lucide-refresh-cw"
		>
			<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
			<path d="M21 3v5h-5" />
			<path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
			<path d="M3 21v-5h5" />
		</svg>
		{#if !iconOnly}Régénérer actions{/if}
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
