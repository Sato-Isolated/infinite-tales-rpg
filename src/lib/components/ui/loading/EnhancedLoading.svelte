<script lang="ts">

	interface Props {
		size?: 'sm' | 'md' | 'lg';
		variant?: 'spinner' | 'dots' | 'pulse' | 'skeleton';
		text?: string;
		color?: 'primary' | 'secondary' | 'accent' | 'neutral';
		center?: boolean;
		overlay?: boolean;
		delay?: number;
	}

	const {
		size = 'md',
		variant = 'spinner',
		text = 'Loading...',
		color = 'primary',
		center = false,
		overlay = false,
		delay = 0
	}: Props = $props();

	// Delay showing loading indicator to prevent flash
	let showLoading = $state(delay === 0);

	if (delay > 0) {
		setTimeout(() => {
			showLoading = true;
		}, delay);
	}

	// Size mappings
	const sizeClasses = $derived(() => {
		switch (size) {
			case 'sm':
				return 'w-4 h-4';
			case 'lg':
				return 'w-8 h-8';
			default:
				return 'w-6 h-6';
		}
	});

	const textSizeClasses = $derived(() => {
		switch (size) {
			case 'sm':
				return 'text-sm';
			case 'lg':
				return 'text-lg';
			default:
				return 'text-base';
		}
	});

	// Color mappings
	const colorClasses = $derived(() => {
		switch (color) {
			case 'secondary':
				return 'text-secondary';
			case 'accent':
				return 'text-accent';
			case 'neutral':
				return 'text-neutral';
			default:
				return 'text-primary';
		}
	});

	// Container classes
	const containerClasses = $derived(() => {
		let classes = 'flex items-center gap-3';

		if (center) classes += ' justify-center';
		if (overlay) classes += ' fixed inset-0 bg-black/50 z-50';

		return classes;
	});
</script>

/** * Enhanced Loading Component using modern Svelte 5 patterns * Provides better UX with optimized
animations and accessibility */

{#if showLoading}
	<div class={containerClasses} role="status" aria-label={text}>
		{#if variant === 'spinner'}
			<div
				class="animate-spin rounded-full border-2 border-transparent border-t-current {sizeClasses} {colorClasses}"
				aria-hidden="true"
			></div>
		{:else if variant === 'dots'}
			<div class="flex gap-1" aria-hidden="true">
				{#each Array(3) as _, i}
					<div
						class="animate-pulse rounded-full bg-current {sizeClasses} {colorClasses}"
						style="animation-delay: {i * 0.15}s"
					></div>
				{/each}
			</div>
		{:else if variant === 'pulse'}
			<div
				class="animate-pulse rounded bg-current {sizeClasses} {colorClasses}"
				aria-hidden="true"
			></div>
		{:else if variant === 'skeleton'}
			<div class="flex animate-pulse space-x-4" aria-hidden="true">
				<div class="rounded-full bg-slate-200 {sizeClasses}"></div>
				<div class="flex-1 space-y-2 py-1">
					<div class="h-2 w-3/4 rounded bg-slate-200"></div>
					<div class="h-2 w-1/2 rounded bg-slate-200"></div>
				</div>
			</div>
		{/if}

		{#if text && variant !== 'skeleton'}
			<span class="sr-only lg:not-sr-only {textSizeClasses} {colorClasses}">
				{text}
			</span>
		{/if}
	</div>
{/if}

<style>
	/* Enhanced animations for better performance */
	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.animate-spin {
		animation: spin 1s linear infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.animate-pulse {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	/* Reduced motion support */
	@media (prefers-reduced-motion: reduce) {
		.animate-spin,
		.animate-pulse {
			animation: none;
		}
	}
</style>
