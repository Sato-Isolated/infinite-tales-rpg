<script lang="ts">
	import type { Ability } from '$lib/ai/agents/characterStatsAgent';
	import { onMount } from 'svelte';

	let isMounted = $state(false);

	onMount(() => {
		isMounted = true;
	});

	let { ability }: { ability: Ability } = $props();
</script>

{#if isMounted}
	<fieldset class="fieldset bg-base-200 mt-3 w-full border p-4">
		<div class="grid-cols mt-2 grid truncate text-center">
			<div class="m-auto w-full">
				{#if ability.resource_cost?.cost > 0}
					<p class="badge badge-info h-fit capitalize">
						{ability.resource_cost?.cost}
						{(ability.resource_cost?.resource_key || '').replaceAll('_', ' ')}
					</p>
				{/if}
				<p class="mt-2 truncate">{ability.name}</p>
			</div>
		</div>
		<p class="m-5 mt-2">
			{ability.effect}
		</p>
	</fieldset>
{/if}
