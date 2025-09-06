<script lang="ts">
	import type { Action } from '$lib/types/action';
	import type { Targets } from '$lib/ai/agents/gameAgent';
	import { getNPCDisplayName } from '$lib/util.svelte';

	let {
		targets,
		action,
		onclose,
		dialogRef = $bindable()
	}: {
		targets: Targets;
		action: Action;
		onclose: (action: Action, targets: string[]) => void;
		dialogRef: HTMLDialogElement;
	} = $props();

	let targetForm: HTMLFormElement;
	let customTargetState = $state<string>();

	function mapTargets(): string[] {
		const mappedTargets = Array.from(targetForm.elements)
			.filter(
				(elm): elm is HTMLInputElement =>
					elm instanceof HTMLInputElement && elm.checked && !!elm.value
			)
			.map((elm) => {
				elm.checked = false;
				return elm.value as string;
			});
		if (customTargetState) {
			mappedTargets.push(customTargetState);
		}
		customTargetState = undefined;
		return mappedTargets;
	}
</script>

<dialog bind:this={dialogRef} class="modal z-100" style="background: rgba(0, 0, 0, 0.3);">
	<div class="modal-box flex flex-col items-center">
		<form method="dialog">
			<span class="m-auto">Choose Targets</span>
			<button class="btn btn-circle btn-ghost btn-sm absolute top-2 right-2">✕</button>
		</form>
		<form bind:this={targetForm} class="mt-3 flex flex-col items-start">
			<div>
				<label class="label cursor-pointer">
					<input type="checkbox" class="checkbox" value="Self" />
					<span class="ml-2 capitalize">Self</span>
				</label>
			</div>
			<div>
				<label class="label cursor-pointer">
					<input type="checkbox" class="checkbox" value={''} />
					<span class="ml-2 capitalize">No specific target</span>
				</label>
			</div>
			<span class="m-auto mt-3">Hostile:</span>
			{#if targets?.hostile?.length === 0}
				<span class="m-auto mt-2">-</span>
			{/if}
			{#each targets?.hostile as target}
				<div>
					<label class="label cursor-pointer">
						<input type="checkbox" class="checkbox" value={getNPCDisplayName(target)} />
						<span class="ml-2 capitalize"
							>{getNPCDisplayName(target).replaceAll('_', ' ').replaceAll('id', '')}</span
						>
					</label>
				</div>
			{/each}
			<span class="m-auto mt-3">Friendly:</span>
			{#if targets?.friendly?.length === 0}
				<span class="m-auto mt-2">-</span>
			{/if}
			{#each targets?.friendly as target}
				<div>
					<label class="label cursor-pointer">
						<input type="checkbox" class="checkbox" value={getNPCDisplayName(target)} />
						<span class="ml-2 capitalize"
							>{getNPCDisplayName(target).replaceAll('_', ' ').replaceAll('id', '')}</span
						>
					</label>
				</div>
			{/each}
			<span class="m-auto mt-3">Neutral:</span>
			{#if targets?.neutral?.length === 0}
				<span class="m-auto mt-2">-</span>
			{/if}
			{#each targets?.neutral as target}
				<div>
					<label class="label cursor-pointer">
						<input type="checkbox" class="checkbox" value={getNPCDisplayName(target)} />
						<span class="ml-2 capitalize"
							>{getNPCDisplayName(target).replaceAll('_', ' ').replaceAll('id', '')}</span
						>
					</label>
				</div>
			{/each}
			<div class="mt-5 w-full items-center">
				<label for="customTargetState" class="capitalize">Custom Target</label>
				<input
					id="customTargetState"
					class="input input-md mt-3"
					bind:value={customTargetState}
					placeholder="Enter any target"
				/>
			</div>
			<button
				type="submit"
				class="btn btn-neutral btn-md m-auto mt-5"
				onclick={() => {
					dialogRef.close();
					onclose(action, mapTargets());
				}}
			>
				Continue
			</button>
		</form>
	</div>
</dialog>
