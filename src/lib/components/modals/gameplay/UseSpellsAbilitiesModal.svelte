<script lang="ts">
	import TargetModal from './TargetModal.svelte';
	import { type Ability } from '$lib/ai/agents/characterStatsAgent';
	import type { Action } from '$lib/types/playerAction';
	import type { ResourcesWithCurrentValue } from '$lib/types/resources';
	import type { Targets } from '$lib/types/gameState';
	let {
		abilities,
		playerName,
		resources,
		targets,
		onclose,
		dialogRef = $bindable()
	}: {
		abilities: Array<Ability>;
		playerName: string;
		resources: ResourcesWithCurrentValue;
		targets: Targets;
		onclose: (action: Action, targets: string[]) => void;
		dialogRef: HTMLDialogElement;
	} = $props();

	// dialog ref is mutated at runtime; make it reactive
	let targetModalRef = $state<any>();
	let abilityActionState = $state({} as Action);

	function mapAbilityToAction(ability: Ability) {
		abilityActionState = {
			characterName: playerName,
			...ability,
			type: 'Spell',
			text: playerName + ' casts ' + ability.name + ': ' + ability.effect
		};
	}
</script>

{#if targets}
	<TargetModal bind:dialogRef={targetModalRef} {targets} action={abilityActionState} {onclose}
	></TargetModal>
{/if}
<dialog bind:this={dialogRef} class="modal z-100" style="background: rgba(0, 0, 0, 0.3);">
	<div class="modal-box flex flex-col items-center">
		<form method="dialog">
			<span class="m-auto">Spells & Abilities</span>
			<button class="btn btn-circle btn-ghost btn-sm absolute top-2 right-2">✕</button>
		</form>
		{#each abilities as ability (ability.name)}
			<fieldset class="mt-3 w-full">
				<details class="collapse-arrow textarea bg-base-200 textarea-md collapse border">
					<summary class="collapse-title capitalize">
						<div class="flex h-full flex-col justify-between text-center">
							<!-- Top: Badge always at the top -->
							<div>
								{#if ability.resource_cost?.cost > 0}
									<p class="badge badge-info h-fit overflow-auto break-all">
										{ability.resource_cost?.cost}
										{(ability.resource_cost?.resource_key || '').replaceAll('_', ' ')}
									</p>
								{/if}
							</div>

							<!-- Middle: Ability name -->
							<div class="mt-3 flex flex-col items-center">
								<p class="mt-2 truncate">{ability.name}</p>
							</div>

							<!-- Bottom: Cast Button always at the bottom -->
							<div>
								<button
									type="button"
									class="components btn btn-neutral no-animation btn-md mt-2"
									disabled={ability.resource_cost?.cost > 0 &&
										ability.resource_cost?.cost >
											(resources?.[ability.resource_cost?.resource_key || '']?.current_value || 0)}
									onclick={() => {
										mapAbilityToAction(ability);
										dialogRef.close();
										targetModalRef.showModal();
									}}
								>
									Cast
								</button>
							</div>
						</div>
					</summary>
					<div class="collapse-content">
						<p class="m-5 mt-2 text-center">
							{ability.effect}
						</p>
					</div>
				</details>
			</fieldset>
		{/each}
	</div>
</dialog>


