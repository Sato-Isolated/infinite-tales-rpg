<script lang="ts">
	import {
		type Action,
		GameAgent,
		type InventoryState,
		type Item,
		type ItemWithId
	} from '$lib/ai/agents/gameAgent';
	import AIGeneratedImage from '$lib/components/AIGeneratedImage.svelte';
	import { formatItemId } from '../../../routes/game/gameLogic';
	import { useLocalStorage } from '$lib/state/useLocalStorage.svelte';
	import type { AIConfig } from '$lib';
	import CraftingModal from '$lib/components/interaction_modals/CraftingModal.svelte';

	let {
		inventoryState,
		onDeleteItem,
		playerName,
		storyImagePrompt,
		onclose,
		oncrafting,
		dialogRef = $bindable()
	}: {
		inventoryState: InventoryState;
		onDeleteItem: (item_id: string) => void;
		playerName: string;
		storyImagePrompt: string;
		onclose;
		oncrafting: (actionText: string | undefined) => void;
		dialogRef;
	} = $props();

	const aiConfigState = useLocalStorage<AIConfig>('aiConfigState');
	let craftingDialogState = $state<boolean>(false);

	function mapToAction(item_id: string, item: Item): ItemWithId & Action {
		return {
			...item,
			item_id,
			type: 'Misc.',
			characterName: playerName,
			text: playerName + ' uses ' + item_id + ': ' + item.effect
		};
	}

	function mapToCraftingAction(
		selectedItems: ItemWithId[],
		craftDescription?: string
	): string | undefined {
		if (!selectedItems || selectedItems.length === 0) {
			return undefined;
		}
		let prompt = `${playerName} attempts to craft, combining items:\n${selectedItems
			.map((item) => item.item_id + ' - ' + item.description)
			.join('\n')}.\n`;

		if (craftDescription) {
			prompt += `Crafting description: ${craftDescription}\n\n`;
		}
		return prompt;
	}
</script>

{#if craftingDialogState}
	<CraftingModal
		inventory={inventoryState}
		onclose={(selectedItems, craftDescription) => {
			craftingDialogState = false;
			oncrafting(mapToCraftingAction(selectedItems, craftDescription));
		}}
	></CraftingModal>
{/if}

<dialog bind:this={dialogRef} class="modal z-99" style="background: rgba(0, 0, 0, 0.3);">
	<div class="modal-box flex flex-col items-center">
		<form method="dialog">
			<span class="m-auto">Inventory</span>
			<button class="btn btn-circle btn-ghost btn-sm absolute top-2 right-2">✕</button>
		</form>
		<button
			class="components btn btn-neutral no-animation btn-md m-auto mt-2"
			onclick={() => {
				craftingDialogState = true;
				dialogRef.close();
				onclose();
			}}
		>
			Crafting
		</button>
		{#each Object.entries(inventoryState || {}) as [item_id, item] (item_id)}
			<fieldset class="mt-3 w-full">
				<details class="collapse-arrow textarea bg-base-200 textarea-md collapse border">
					<summary class="collapse-title capitalize">
						<div
							class:sm:grid-cols-6={!aiConfigState.value?.disableImagesState}
							class="grid grid-cols-1 truncate text-center"
						>
							<div class="m-auto sm:col-span-3">
								{#if !aiConfigState.value?.disableImagesState}
									<AIGeneratedImage
										noLogo={true}
										enhance={false}
										imageClassesString="w-[90px] sm:w-[100px] h-[90px] sm:h-[100px] m-auto"
										imagePrompt={GameAgent.getItemImagePrompt(
											formatItemId(item_id),
											item,
											storyImagePrompt
										)}
										showGenerateButton={false}
									></AIGeneratedImage>
								{/if}
							</div>
							<div class="m-auto w-full sm:col-span-2">
								<p class="mt-2 truncate capitalize">
									{formatItemId(item_id)}
								</p>
								<button
									type="button"
									class="components btn btn-neutral no-animation btn-md mt-2"
									onclick={() => {
										dialogRef.close();
										onclose(mapToAction(item_id, item));
									}}
								>
									Suggest Actions
								</button>
							</div>
						</div>
					</summary>
					<div class="collapse-content flex flex-col items-center justify-center">
						<p class="m-5 mt-2">
							{item.effect}
						</p>
						<p class="m-5 mt-2">
							{item.description}
						</p>
						<button
							class="components btn btn-error no-animation btn-sm m-auto mt-2"
							onclick={() => onDeleteItem(item_id)}
						>
							Delete
						</button>
					</div>
				</details>
			</fieldset>
		{/each}
	</div>
</dialog>
