<script lang="ts">
	import { onMount } from 'svelte';
	import {
		initialStoryState,
		type Story,
		StoryAgent,
		storyStateForPrompt
	} from '$lib/ai/agents/storyAgent';
	import LoadingModal from '$lib/components/ui/loading/LoadingModal.svelte';
	import { useHybridLocalStorage } from '$lib/state/hybrid/useHybridLocalStorage.svelte';
	import { LLMProvider } from '$lib/ai/llmProvider';
	import { getRowsForTextarea, navigate, loadPDF, handleError } from '$lib/util.svelte';
	import isEqual from 'fast-deep-equal';
	import ImportExportSaveGame from '$lib/components/ui/data/ImportExportSaveGame.svelte';
	import { type CharacterDescription, initialCharacterState } from '$lib/ai/agents/characterAgent';
	import type { AIConfig } from '$lib';
	import { UndoManager } from '$lib/state/undoManager';
	import {
		getSafetyLevelFromStory,
		CONTENT_RATING_DESCRIPTIONS
	} from '$lib/ai/config/contentRatingToSafety';

	let isGeneratingState = $state(false);
	let isHydrated = $state(false);
	let hasImportedData = $state(false);
	const apiKeyState = useHybridLocalStorage<string>('apiKeyState', '');
	const aiLanguage = useHybridLocalStorage<string>('aiLanguage');
	let storyAgent: StoryAgent;

	const storyState = useHybridLocalStorage<Story>('storyState', { ...initialStoryState });
	const textAreaRowsDerived = $derived(getRowsForTextarea(storyState.value));
	// Allow dynamic keys like 'gameBook' used during PDF import
	let storyStateOverwrites: Partial<Story> & Record<string, any> = $state({});
	const storyKeys = Object.keys(storyStateForPrompt) as Array<keyof Story>;
	const characterState = useHybridLocalStorage<CharacterDescription>('characterState', {
		...initialCharacterState
	});
	const aiConfigState = useHybridLocalStorage<AIConfig>('aiConfigState');

	onMount(() => {
		storyAgent = new StoryAgent(
			LLMProvider.provideLLM(
				{
					temperature: 2,
					apiKey: apiKeyState.value,
					language: aiLanguage.value
				},
				getSafetyLevelFromStory(storyState.value),
				aiConfigState.value?.useFallbackLlmState
			)
		);

		// Wait for stores to hydrate; DO NOT auto-reset here (view-only)
		const checkHydration = () => {
			const allHydrated =
				storyState.storageInfo.isHydrated &&
				characterState.storageInfo.isHydrated &&
				apiKeyState.storageInfo.isHydrated;

			if (allHydrated && !isHydrated) {
				isHydrated = true;
			}
		};

		checkHydration();
		const hydrationInterval = setInterval(() => {
			checkHydration();
			if (isHydrated) clearInterval(hydrationInterval);
		}, 50);

		return () => clearInterval(hydrationInterval);
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
		const modifiableStory = currentStory as Record<string, unknown>;
		modifiableStory[stateValue as string] = undefined;
		const agentInput = { ...modifiableStory, ...storyStateOverwrites };
		const newState = await storyAgent.generateRandomStorySettings(
			agentInput,
			getCharacterDescription()
		);
		if (newState && newState[stateValue] !== undefined) {
			storyState.value[stateValue] = newState[stateValue];
		}
		isGeneratingState = false;
	};

	function handleInput(evt: Event, stateValue: keyof Story) {
		const target = evt.target as HTMLTextAreaElement;
		if (target && target.value !== undefined) {
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

	const handleImportComplete = () => {
		hasImportedData = true;
		setTimeout(() => {
			console.log('Import completed, data flag set');
		}, 100);
	};
</script>

{#if isGeneratingState}
	<LoadingModal />
{/if}

{#if !isHydrated}
	<div class="flex min-h-screen items-center justify-center">
		<div class="loading loading-spinner loading-lg"></div>
		<span class="ml-3 text-lg">Loading...</span>
	</div>
{:else}
	<ul class="steps mt-3 w-full">
		<li class="step step-primary">Tale</li>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events  -->
		<li class="step cursor-pointer" onclick={() => navigate('/new/systemPrompts')}>
			System Prompts
		</li>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events  -->
		<li class="step cursor-pointer" onclick={() => navigate('/new/character')}>Character</li>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions  -->
		<!-- svelte-ignore a11y_click_events_have_key_events  -->
		<li class="step cursor-pointer" onclick={() => navigate('/new/characterStats')}>Stats</li>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions  -->
		<!-- svelte-ignore a11y_click_events_have_key_events  -->
		<li class="step cursor-pointer" onclick={() => navigate('/new/character')}>Start</li>
	</ul>
	<form class="m-6 grid items-center gap-2 text-center">
		<p>Review and tweak your Tale settings. No automatic reset will occur here.</p>
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
				// Manual clear still available on this page
				storyState.reset();
				storyStateOverwrites = {};

				UndoManager.clearUndoStack();
				try {
					localStorage.removeItem('conversationState');
				} catch (error) {
					console.warn('Failed to clear conversation state:', error);
				}
			}}
		>
			Clear All
		</button>
		<ImportExportSaveGame isSaveGame={false} onImportComplete={handleImportComplete}>
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
				navigate('/new/systemPrompts');
			}}
		>
			Next Step:<br /> Customize AI Behavior
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

					{#if stateValue === 'content_rating'}
						<div class="mt-4">
							<div class="bg-warning/10 border-warning/20 mb-6 rounded-xl border p-4">
								<div class="flex items-center gap-3">
									<span class="text-2xl">🛡️</span>
									<div>
										<h4 class="text-warning-content font-semibold">
											Content Security Level
										</h4>
										<p class="text-warning-content/80 mt-1 text-sm">
											This parameter controls AI security filters for this story
										</p>
									</div>
								</div>
							</div>

							<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
								{#each Object.entries(CONTENT_RATING_DESCRIPTIONS) as [rating, info]}
									<label class="group cursor-pointer">
										<div
											class="from-base-100 to-base-200/50 hover:from-base-50 hover:to-base-100 relative overflow-hidden rounded-xl border-2 bg-gradient-to-br
                      transition-all duration-300 hover:scale-[1.02] hover:shadow-lg
                      {storyState.value[stateValue] === rating
												? 'border-primary shadow-primary/25 from-primary/5 to-primary/10 bg-gradient-to-br shadow-lg'
												: 'border-base-300 hover:border-primary/50'}"
										>
											{#if storyState.value[stateValue] === rating}
												<div class="absolute top-3 right-3">
													<div
														class="bg-primary flex h-6 w-6 items-center justify-center rounded-full"
													>
														<span class="text-primary-content text-sm">✓</span>
													</div>
												</div>
											{/if}

											<div class="p-5">
												<input
													type="radio"
													name="content-rating"
													value={rating}
													bind:group={storyState.value[stateValue]}
													class="sr-only"
												/>

												<div class="mb-3 flex items-center gap-3">
													<div class="text-3xl drop-shadow-sm filter">
														{info.icon}
													</div>
													<div>
														<h5
															class="text-base-content group-hover:text-primary text-lg font-bold transition-colors"
														>
															{info.title}
														</h5>
														<div
															class="text-base-content/60 text-xs font-medium tracking-wider uppercase"
														>
															{rating}
														</div>
													</div>
												</div>

												<p class="text-base-content/70 text-sm leading-relaxed">
													{info.description}
												</p>

												<div class="bg-base-300/50 mt-4 h-1 overflow-hidden rounded-full">
													<div
														class="h-full rounded-full transition-all duration-500
                            {storyState.value[stateValue] === rating
															? 'from-primary to-primary-focus w-full bg-gradient-to-r'
															: 'w-0'}"
													></div>
												</div>
											</div>
										</div>
									</label>
								{/each}
							</div>

							<div class="bg-info/5 border-info/20 mt-6 rounded-xl border p-4">
								<div class="flex items-start gap-3">
									<span class="text-info mt-0.5 text-lg">💡</span>
									<div class="text-info-content/80 text-sm">
										<p class="mb-1 font-medium">Tip:</p>
										<p>
											You can modify this parameter at any time when editing your
											story. Each tale can have its own security level.
										</p>
									</div>
								</div>
							</div>
						</div>
					{:else}
						<textarea
							bind:value={storyState.value[stateValue]}
							rows={textAreaRowsDerived ? textAreaRowsDerived[stateValue] : 2}
							oninput={(evt) => handleInput(evt, stateValue)}
							placeholder={storyStateForPrompt[stateValue]}
							class="textarea textarea-md mt-2 w-full"
						></textarea>
					{/if}
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
					navigate('/new/systemPrompts');
				}}
			>
				Next Step:<br /> Customize AI Behavior
			</button>
		{/if}
	</form>
{/if}
