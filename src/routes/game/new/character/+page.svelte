<script lang="ts">
	import { onMount } from 'svelte';
	import {
		CharacterAgent,
		type CharacterDescription,
		initialCharacterState
	} from '$lib/ai/agents/characterAgent';
	import LoadingModal from '$lib/components/ui/loading/LoadingModal.svelte';
	import { useHybridLocalStorage } from '$lib/state/hybrid/useHybridLocalStorage.svelte';
	import { getRowsForTextarea, navigate } from '$lib/util.svelte';
	import isEqual from 'fast-deep-equal';
	import { beforeNavigate, goto } from '$app/navigation';
	import { LLMProvider } from '$lib/ai/llmProvider';
	import { initialStoryState, type Story } from '$lib/ai/agents/storyAgent';
	import type { AIConfig } from '$lib';
	import type { PlayerCharactersIdToNamesMap } from '$lib/ai/agents/gameAgent';
	import {
		addCharacterToPlayerCharactersIdToNamesMap,
		getCharacterTechnicalId
	} from '$lib/game/logic/characterLogic';

	let isGeneratingState = $state(false);
	const apiKeyState = useHybridLocalStorage<string>('apiKeyState', '');
	const aiLanguage = useHybridLocalStorage<string>('aiLanguage');
	const storyState = useHybridLocalStorage<Story>('storyState', initialStoryState);
	// campaign removed
	const characterState = useHybridLocalStorage<CharacterDescription>(
		'characterState',
		initialCharacterState
	);
	const textAreaRowsDerived = $derived(getRowsForTextarea(characterState.value));

	let characterStateOverwrites: Partial<CharacterDescription> = $state({});
	const characterKeys = Object.keys(initialCharacterState) as Array<keyof CharacterDescription>;
	const aiConfigState = useHybridLocalStorage<AIConfig>('aiConfigState');
	const playerCharactersIdToNamesMapState = useHybridLocalStorage<PlayerCharactersIdToNamesMap>(
		'playerCharactersIdToNamesMapState',
		{}
	);
	let characterAgent: CharacterAgent;
	onMount(() => {
		characterAgent = new CharacterAgent(
			LLMProvider.provideLLM(
				{
					temperature: 2,
					apiKey: apiKeyState.value,
					language: aiLanguage.value
				},
				aiConfigState.value?.useFallbackLlmState
			)
		);

		beforeNavigate(() => {
			// For new character creation, we need to generate a unique ID
			let playerCharacterId = getCharacterTechnicalId(
				playerCharactersIdToNamesMapState.value,
				characterState.value.name
			);

			// If character doesn't exist yet, create a new unique ID
			if (!playerCharacterId) {
				playerCharacterId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
				console.log('Generated new player character ID:', playerCharacterId);
			}

			if (playerCharacterId) {
				addCharacterToPlayerCharactersIdToNamesMap(
					playerCharactersIdToNamesMapState.value,
					playerCharacterId,
					characterState.value.name
				);
				console.log(
					'Added character to player map:',
					characterState.value.name,
					'with ID:',
					playerCharacterId
				);
			} else {
				console.error('Player character id not found to add new name');
			}
		});
	});

	const onRandomize = async () => {
		isGeneratingState = true;
		const newState = await characterAgent.generateCharacterDescription(
			$state.snapshot(storyState.value),
			characterStateOverwrites
		);
		if (newState) {
			characterState.value = newState;
		}
		isGeneratingState = false;
	};
	const onRandomizeSingle = async (stateValue: keyof CharacterDescription) => {
		isGeneratingState = true;
		const currentCharacter = { ...characterState.value } as any;
		currentCharacter[stateValue as string] = undefined;
		const characterInput = { ...currentCharacter, ...characterStateOverwrites };
		const newState = await characterAgent.generateCharacterDescription(
			$state.snapshot(storyState.value),
			characterInput
		);
		if (newState) {
			characterState.value[stateValue] = newState[stateValue];
		}
		isGeneratingState = false;
	};
</script>

{#if isGeneratingState}
	<LoadingModal />
{/if}
<ul class="steps mt-3 w-full">
	<!--TODO  -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events  -->
	<li class="step step-primary cursor-pointer" onclick={() => goto('tale')}>Tale</li>
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events  -->
	<li class="step step-primary cursor-pointer" onclick={() => goto('systemPrompts')}>
		System Prompts
	</li>
	<li class="step step-primary">Character</li>
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events  -->
	<li class="step cursor-pointer" onclick={() => goto('characterStats')}>Stats</li>
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events  -->
	<li class="step cursor-pointer" onclick={() => goto('characterStats')}>Start</li>
</ul>
<form class="m-6 grid items-center gap-2 text-center">
	<p>Click on Randomize All to generate a random Character based on the Tale settings</p>
	<button
		class="btn btn-accent btn-md m-auto mt-3 w-1/2"
		disabled={isGeneratingState}
		onclick={onRandomize}
	>
		Randomize All
	</button>
	<button
		class="btn btn-neutral btn-md m-auto w-1/2"
		onclick={() => {
			characterState.reset();
			characterStateOverwrites = {};
		}}
	>
		Clear All
	</button>
	<button
		class="btn btn-primary btn-md m-auto w-1/2"
		onclick={() => {
			navigate('/new/tale');
		}}
	>
		Previous Step:<br /> Customize Tale
	</button>

	<button
		class="btn btn-primary btn-md m-auto w-1/2"
		onclick={() => {
			navigate('/new/characterStats');
		}}
		disabled={isEqual(characterState.value, initialCharacterState)}
	>
		Next Step:<br /> Customize Stats & Abilities
	</button>

	{#each characterKeys as stateValue}
		<fieldset class="mt-3 w-full">
			<div class="flex-row capitalize">
				{stateValue.replaceAll('_', ' ')}
				{#if characterStateOverwrites[stateValue]}
					<span class="badge badge-accent ml-2">overwritten</span>
				{/if}
			</div>
			<textarea
				bind:value={characterState.value[stateValue]}
				rows={textAreaRowsDerived ? textAreaRowsDerived[stateValue] : 2}
				placeholder=""
				oninput={(evt) => {
					characterStateOverwrites[stateValue] = (evt.currentTarget as HTMLTextAreaElement)
						.value as any;
				}}
				class="textarea textarea-md mt-2 w-full"
			>
			</textarea>
		</fieldset>
		<button
			class="btn btn-accent btn-md m-auto mt-2 w-3/4 capitalize sm:w-1/2"
			onclick={() => {
				onRandomizeSingle(stateValue);
			}}
		>
			Randomize {stateValue.replaceAll('_', ' ')}
		</button>
		<button
			class="btn btn-neutral btn-md m-auto mt-2 w-3/4 capitalize sm:w-1/2"
			onclick={() => {
				characterState.resetProperty(stateValue as keyof CharacterDescription);
				delete characterStateOverwrites[stateValue];
			}}
		>
			Clear {stateValue.replaceAll('_', ' ')}
		</button>
	{/each}
	<button
		class="btn btn-primary btn-md m-auto w-1/2"
		onclick={() => {
			navigate('/new/characterStats');
		}}
		disabled={isEqual(characterState.value, initialCharacterState)}
	>
		Next Step:<br /> Customize Stats & Abilities
	</button>
</form>
