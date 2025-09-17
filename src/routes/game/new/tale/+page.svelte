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
	import { getRowsForTextarea, navigate } from '$lib/util.svelte';
	import isEqual from 'fast-deep-equal';
	import { goto } from '$app/navigation';
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
				getSafetyLevelFromStory(storyState.value), // Use tale's content rating
				aiConfigState.value?.useFallbackLlmState
			)
		);

		// Wait for all stores to be hydrated before showing content
		const checkHydration = () => {
			const allHydrated =
				storyState.storageInfo.isHydrated &&
				characterState.storageInfo.isHydrated &&
				apiKeyState.storageInfo.isHydrated;

			if (allHydrated && !isHydrated) {
				isHydrated = true;

				// Now that stores are hydrated, check content and apply reset logic if needed
				setTimeout(() => {
					try {
						// Only auto-reset for fresh start if no data has been imported
						// Check if story state has meaningful content (not just defaults)
						const hasStoryContent =
							storyState.value.game !== initialStoryState.game ||
							storyState.value.world_details !== initialStoryState.world_details ||
							storyState.value.story_pace !== initialStoryState.story_pace ||
							storyState.value.main_scenario !== initialStoryState.main_scenario ||
							storyState.value.theme !== initialStoryState.theme ||
							storyState.value.tonality !== initialStoryState.tonality;

						if (!hasStoryContent && !hasImportedData) {
							// Auto-reset for fresh start on new tale page
							storyState.reset();
							storyStateOverwrites = {};

							// Clear undo stack and conversation state for fresh start
							UndoManager.clearUndoStack();
							try {
								localStorage.removeItem('conversationState');
							} catch (error) {
								console.warn('Failed to clear conversation state:', error);
							}
						}
					} catch (error) {
						console.warn('Error during content check:', error);
					}
				}, 100); // Small delay to ensure data is fully loaded
			}
		};

		// Check immediately and set up interval to check hydration status
		checkHydration();
		const hydrationInterval = setInterval(() => {
			checkHydration();
			if (isHydrated) {
				clearInterval(hydrationInterval);
			}
		}, 50);

		// Cleanup interval on unmount
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

	const handleImportComplete = () => {
		hasImportedData = true;
		// Force re-check after import to update UI with imported data
		setTimeout(() => {
			// No need to force isHydrated = true as it should already be true
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
		<li class="step cursor-pointer" onclick={() => goto('systemPrompts')}>System Prompts</li>
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
			Example: Enter 'Call of Cthulhu' as Game and click Randomize All. A random Cthulhu Tale will
			be generated.
		</p>
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
				storyState.reset();
				storyStateOverwrites = {};

				// Clear undo stack and conversation state when clearing tale settings
				UndoManager.clearUndoStack();

				// Clear conversation state
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
						<!-- Special handling for content_rating - show as selector -->
						<div class="mt-4">
							<!-- Header with warning -->
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

							<!-- Content rating options with improved design -->
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
											<!-- Selection indicator -->
											{#if storyState.value[stateValue] === rating}
												<div class="absolute top-3 right-3">
													<div
														class="bg-primary flex h-6 w-6 items-center justify-center rounded-full"
													>
														<span class="text-primary-content text-sm">✓</span>
													</div>
												</div>
											{/if}

											<!-- Content -->
											<div class="p-5">
												<input
													type="radio"
													name="content-rating"
													value={rating}
													bind:group={storyState.value[stateValue]}
													class="sr-only"
												/>

												<!-- Icon and title -->
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

												<!-- Description -->
												<p class="text-base-content/70 text-sm leading-relaxed">
													{info.description}
												</p>

												<!-- Visual indicator bar -->
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

							<!-- Help text -->
							<div class="bg-info/5 border-info/20 mt-6 rounded-xl border p-4">
													<div class="flex items-start gap-3">
														<span class="text-info mt-0.5 text-lg">💡</span>
														<div class="text-info-content/80 text-sm">
															<p class="mb-1 font-medium">Tip:</p>
															<p>
																You can change this setting at any time while editing your story.
																Each tale can have its own safety level.
															</p>
														</div>
													</div>
							</div>
						</div>
					{:else}
						<!-- Default textarea for other fields -->
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
