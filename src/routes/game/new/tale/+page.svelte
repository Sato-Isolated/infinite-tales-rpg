<script lang="ts">
	import { onMount } from 'svelte';
	import {
		initialStoryState,
		type Story,
		StoryAgent,
		storyStateForPrompt
	} from '$lib/ai/agents/storyAgent';
	import LoadingModal from '$lib/components/ui/loading/LoadingModal.svelte';
	import { useLocalStorage } from '$lib/state/useLocalStorage.svelte';
	import { LLMProvider } from '$lib/ai/llmProvider';
	import { getRowsForTextarea, navigate, loadPDF, handleError } from '$lib/util.svelte';
	import isEqual from 'fast-deep-equal';
	import { goto } from '$app/navigation';
	import ImportExportSaveGame from '$lib/components/ui/data/ImportExportSaveGame.svelte';
	import { type CharacterDescription, initialCharacterState } from '$lib/ai/agents/characterAgent';
	import type { AIConfig } from '$lib';
	let isGeneratingState = $state(false);
	const apiKeyState = useLocalStorage<string>('apiKeyState');
	const aiLanguage = useLocalStorage<string>('aiLanguage');
	let storyAgent: StoryAgent;

	const storyState = useLocalStorage<Story>('storyState', { ...initialStoryState });
	const textAreaRowsDerived = $derived(getRowsForTextarea(storyState.value));
	// Allow dynamic keys like 'gameBook' used during PDF import
	let storyStateOverwrites: Partial<Story> & Record<string, any> = $state({});
	const storyKeys = Object.keys(storyStateForPrompt) as Array<keyof Story>;
	const characterState = useLocalStorage<CharacterDescription>('characterState', {
		...initialCharacterState
	});
	const aiConfigState = useLocalStorage<AIConfig>('aiConfigState');

	onMount(() => {
		storyAgent = new StoryAgent(
			LLMProvider.provideLLM(
				{
					temperature: 2,
					apiKey: apiKeyState.value,
					language: aiLanguage.value
				},
				aiConfigState.value?.useFallbackLlmState
			)
		);
	});

	function getCharacterDescription() {
		let characterDescription = $state.snapshot(characterState.value);
		if (isEqual(characterDescription, initialCharacterState)) {
			return undefined;
		}
		return characterDescription;
	}

	const onRandomize = async () => {
		isGeneratingState = true;

		const newState = await storyAgent.generateRandomStorySettings(
			storyStateOverwrites,
			getCharacterDescription()
		);
		if (newState) {
			storyState.value = newState;
		}
		isGeneratingState = false;
	};
	const onRandomizeSingle = async (stateValue: keyof Story) => {
		isGeneratingState = true;
		const currentStory = { ...storyState.value };
		// Intentionally clear a single field to ask the agent to regenerate it
		const modifiableStory = currentStory as Record<string, unknown>;
		modifiableStory[stateValue as string] = undefined;
		const agentInput = { ...modifiableStory, ...storyStateOverwrites };
		const newState = await storyAgent.generateRandomStorySettings(
			agentInput,
			getCharacterDescription()
		);
		if (newState && newState[stateValue] !== undefined) {
			// Index via keyof to satisfy TS when writing a single property
			storyState.value[stateValue] = newState[stateValue];
		}
		isGeneratingState = false;
	};

	function handleInput(evt: Event, stateValue: keyof Story) {
		const target = evt.target as HTMLTextAreaElement;
		if (target && target.value !== undefined) {
			// Type-safe assignment based on the expected type for this story property
			storyStateOverwrites[stateValue] = target.value as Story[typeof stateValue];
		}
	}

	function onUploadClicked() {
		const fileInput = document.createElement('input');
		fileInput.type = 'file';
		fileInput.accept = 'application/pdf';
		fileInput.click();
		fileInput.addEventListener('change', function (event) {
			const target = event.target as HTMLInputElement;
			const file = target?.files?.[0];
			if (file) {
				const reader = new FileReader();
				reader.onload = async () => {
					try {
						const text = await loadPDF(file);
						storyStateOverwrites = { ...storyStateOverwrites, gameBook: text };
						await onRandomize();
					} catch (error) {
						console.error('Failed to load PDF:', error);
						handleError('Failed to load PDF file. Please try again.');
					}
				};
				reader.readAsArrayBuffer(file);
			}
		});
	}
</script>

{#if isGeneratingState}
	<LoadingModal />
{/if}
<ul class="steps mt-3 w-full">
	<li class="step step-primary">Tale</li>
	<!--TODO  -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events  -->
	<li class="step cursor-pointer" onclick={() => goto('character')}>Character</li>
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions  -->
	<!-- svelte-ignore a11y_click_events_have_key_events  -->
	<li class="step cursor-pointer" onclick={() => goto('characterStats')}>Stats</li>
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions  -->
	<!-- svelte-ignore a11y_click_events_have_key_events  -->
	<li class="step cursor-pointer" onclick={() => goto('character')}>Start</li>
</ul>
<form class="m-6 grid items-center gap-2 text-center">
	<p>Quickstart: Click on Randomize All to generate a random Tale.</p>
	<p>You can also customize any setting and play the Tale suited to your liking.</p>
	<p>The custom settings will be considered for the Randomize feature.</p>
	<p>You can even create the Character first and the Tale after.</p>
	<p>
		Example: Enter 'Call of Cthulhu' as Game and click Randomize All. A random Cthulhu Tale will be
		generated.
	</p>
	<button
		class="btn btn-accent btn-md m-auto mt-3 w-1/2"
		disabled={isGeneratingState}
		onclick={onRandomize}
	>
		Randomize All
	</button>
	<button
		type="button"
		class="btn btn-neutral btn-md m-auto w-1/2"
		onclick={onUploadClicked}
		disabled={isGeneratingState}
	>
		Generate Tale from PDF
	</button>
	<button
		class="btn btn-neutral btn-md m-auto w-1/2"
		onclick={() => {
			storyState.reset();
			storyStateOverwrites = {};
		}}
	>
		Clear All
	</button>
	<ImportExportSaveGame isSaveGame={false}>
		{#snippet exportButton(onclick)}
			<button {onclick} class="btn btn-neutral btn-md m-auto w-1/2"> Export Settings </button>
		{/snippet}
		{#snippet importButton(onclick)}
			<button {onclick} class="btn btn-neutral btn-md m-auto w-1/2"> Import Settings </button>
		{/snippet}
	</ImportExportSaveGame>
	<button
		class="btn btn-primary btn-md m-auto w-1/2"
		onclick={() => {
			navigate('/new/character');
		}}
	>
		Next Step:<br /> Customize Character
	</button>
	{#if storyState.value}
		{#each storyKeys as stateValue}
			<fieldset class="mt-3 w-full">
				<div class=" flex-row capitalize">
					{stateValue.replaceAll('_', ' ')}
					{#if storyStateOverwrites[stateValue]}
						<span class="badge badge-accent ml-2">overwritten</span>
					{/if}
				</div>

				<textarea
					bind:value={storyState.value[stateValue]}
					rows={textAreaRowsDerived ? textAreaRowsDerived[stateValue] : 2}
					oninput={(evt) => handleInput(evt, stateValue)}
					placeholder={storyStateForPrompt[stateValue]}
					class="textarea textarea-md mt-2 w-full"
				></textarea>
			</fieldset>
			<button
				class="btn btn-accent btn-md m-auto mt-2 w-1/2 capitalize"
				onclick={() => {
					onRandomizeSingle(stateValue);
				}}
			>
				Randomize {stateValue.replaceAll('_', ' ')}
			</button>
			<button
				class="btn btn-neutral btn-md m-auto mt-2 w-1/2 capitalize"
				onclick={() => {
					storyState.resetProperty(stateValue as keyof Story);
					delete storyStateOverwrites[stateValue];
				}}
			>
				Clear {stateValue.replaceAll('_', ' ')}
			</button>
		{/each}
		<button
			class="btn btn-primary btn-md m-auto mt-2 w-1/2"
			onclick={() => {
				navigate('/new/character');
			}}
		>
			Next Step:<br /> Customize Character
		</button>
	{/if}
</form>
