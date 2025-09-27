<script lang="ts">
	import { useLocalStorage } from '$lib/state/useLocalStorage.svelte';
	import type { AIConfig } from '$lib';
	import type { Story } from '$lib/ai/agents/storyAgent';
	import { CharacterStatsAgent } from '$lib/ai/agents/characterStatsAgent';
	import type { Ability } from '$lib/ai/agents/characterStatsAgent';
	import { onMount } from 'svelte';

	const aiConfigState = useLocalStorage<AIConfig>('aiConfigState');
	const storyState = useLocalStorage<Story>('storyState');
	let isMounted = $state(false);

	onMount(() => {
		isMounted = true;
	});

	let { ability }: { ability: Ability } = $props();
</script>

{#if isMounted}
	<div class="form-control textarea-bordered mt-3 w-full border bg-base-200">
		<div class="mt-4 grid grid-cols-1 overflow-hidden overflow-ellipsis text-center">
			<div class="m-auto w-full">
				{#if ability.resource_cost?.cost > 0}
					<p class="badge badge-info h-fit capitalize">
						{ability.resource_cost?.cost}
						{(ability.resource_cost?.resource_key || '').replaceAll('_', ' ')}
					</p>
				{/if}
				<p class="mt-2 overflow-hidden overflow-ellipsis">{ability.name}</p>
			</div>
		</div>
		<p class="m-5 mt-2">
			{ability.effect}
		</p>
	</div>
{/if}
