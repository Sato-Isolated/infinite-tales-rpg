<script lang="ts">
	import { onMount } from 'svelte';
	import LoadingModal from '$lib/components/LoadingModal.svelte';
	import { useLocalStorage } from '$lib/state/useLocalStorage.svelte';
	import { LLMProvider } from '$lib/ai/llmProvider';
	import {
		getRowsForTextarea,
		loadPDF,
		navigate,
		removeEmptyValues,
		stringifyPretty
	} from '$lib/util.svelte';
	import isEqual from 'fast-deep-equal';
	import ImportExportSaveGame from '$lib/components/ImportExportSaveGame.svelte';
	import { type CharacterDescription, initialCharacterState } from '$lib/ai/agents/characterAgent';
	import {
		type Campaign,
		CampaignAgent,
		type CampaignChapter,
		getNewChapterObject,
		getNewPlotPointObject,
		initialCampaignState
	} from '$lib/ai/agents/campaignAgent';
	import { type Story } from '$lib/ai/agents/storyAgent';
	import { beforeNavigate } from '$app/navigation';
	import type { AIConfig } from '$lib';
	let isGeneratingState = $state(false);
	const apiKeyState = useLocalStorage<string>('apiKeyState');
	const aiLanguage = useLocalStorage<string>('aiLanguage');
	let campaignAgent: CampaignAgent;

	const campaignState = useLocalStorage<Campaign>('campaignState', initialCampaignState);
	const storyState = useLocalStorage<Story>('storyState', {} as Story);
	const currentChapterState = useLocalStorage<number>('currentChapterState');
	const textAreaRowsDerived = $derived(getRowsForTextarea(campaignState.value));
	// Define a loose overwrite shape to avoid implicit any during dynamic edits
	type CampaignOverwrites = Partial<
		Omit<Campaign, 'chapters'> & {
			chapters?: Array<Partial<CampaignChapter>> | Record<string, Partial<CampaignChapter>>;
			// allow extra keys like gameBook for PDF import processing
			[key: string]: any;
		}
	>;
	let campaignStateOverwrites: CampaignOverwrites = $state({});
	const characterState = useLocalStorage<CharacterDescription>('characterState');
	const aiConfigState = useLocalStorage<AIConfig>('aiConfigState');

	onMount(() => {
		campaignAgent = new CampaignAgent(
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
			overwriteTaleWithCampaignSettings(getCurrentChapterMapped(), storyState.value);
		});
	});

	function onUploadClicked() {
		const fileInput = document.createElement('input');
		fileInput.type = 'file';
		fileInput.accept = 'application/pdf';
		fileInput.click();
		fileInput.addEventListener('change', function (event) {
			// @ts-expect-error can never be null
			const file = event.target.files[0];
			if (file) {
				const reader = new FileReader();
				reader.onload = async () => {
					const text = await loadPDF(file);
					campaignStateOverwrites = { ...campaignStateOverwrites, gameBook: text };
					await onRandomize();
				};
				reader.readAsArrayBuffer(file);
			}
		});
	}

	function getCharacterDescription() {
		let characterDescription = $state.snapshot(characterState.value);
		if (isEqual(characterDescription, initialCharacterState)) {
			return undefined;
		}
		return characterDescription;
	}

	const onRandomize = async () => {
		isGeneratingState = true;

		const newState = await campaignAgent.generateCampaign(
			$state.snapshot(campaignStateOverwrites),
			getCharacterDescription()
		);
		if (newState) {
			console.log(stringifyPretty(newState));
			campaignState.value = newState;
		}
		isGeneratingState = false;
		return newState;
	};

	const onRandomizeSingle = async (
		stateValue: keyof Campaign | 'chapters',
		chapterNumber: string = ''
	) => {
		isGeneratingState = true;
		const currentCampaign: any = $state.snapshot(campaignState.value);
		if (chapterNumber) {
			(currentCampaign as any)[stateValue as string][chapterNumber] = undefined;
		} else {
			(currentCampaign as any)[stateValue as string] = undefined;
		}
		const filteredOverwrites: any = removeEmptyValues(
			$state.snapshot(campaignStateOverwrites)
		) as any;
		const singleChapterOverwritten =
			(filteredOverwrites as any).chapters && (filteredOverwrites as any).chapters[chapterNumber];
		//TODO not generic
		if (filteredOverwrites.chapters) {
			filteredOverwrites.chapters = Object.entries(
				removeEmptyValues(filteredOverwrites.chapters)
			).map(
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				([_, value]) => value
			);
		}

		let alteredCampaign: Campaign = {
			...(currentCampaign as Campaign),
			...(filteredOverwrites as Partial<Campaign>)
		} as Campaign;
		if (chapterNumber) {
			// TODO only works for chapters section
			const newChapter = await campaignAgent.generateSingleChapter(
				alteredCampaign,
				$state.snapshot(characterState.value),
				Number.parseInt(chapterNumber) + 1,
				singleChapterOverwritten
			);
			(campaignState.value as any)[stateValue as string][chapterNumber] = newChapter;
		} else {
			const newState = await campaignAgent.generateCampaign(
				alteredCampaign,
				$state.snapshot(characterState.value)
			);
			if (newState) {
				console.log(stringifyPretty(newState));
				(campaignState.value as any)[stateValue as string] = (newState as any)[
					stateValue as string
				];
			}
		}
		isGeneratingState = false;
	};

	function handleInput(evt: Event, stateValue: keyof Campaign | string) {
		(campaignStateOverwrites as any)[stateValue as string] = (
			evt.target as HTMLTextAreaElement
		).value;
	}

	function isCampaignSet() {
		return campaignState.value?.chapters?.length > 0;
	}

	async function _goto(page: string) {
		if (isEqual(initialCampaignState, campaignState.value)) {
			if (!(await onRandomize())) {
				return;
			}
		}
		navigate('/new/' + page);
	}

	const overwriteTaleWithCampaignSettings = (currentChapter: CampaignChapter, taleState: Story) => {
		if (taleState) {
			taleState.main_scenario = stringifyPretty(currentChapter);
			taleState.general_image_prompt = campaignState.value.general_image_prompt;
			taleState.character_simple_description = campaignState.value.character_simple_description;
			taleState.world_details = campaignState.value.world_details;
			taleState.game = campaignState.value.game;
			taleState.theme = campaignState.value.theme;
			taleState.tonality = campaignState.value.tonality;
			console.log(stringifyPretty(taleState));
			storyState.value = taleState;
		}
		if (!currentChapterState.value) {
			currentChapterState.value = 1;
		}
	};

	const getCurrentChapterMapped = () => {
		const currentChapterNumber = currentChapterState.value || 1;
		const currentChapter: CampaignChapter = $state.snapshot(
			campaignState.value.chapters[currentChapterNumber - 1]
		);
		//currentChapterNumber is actually next chapter as it starts with 1
		const nextPlotPoint = campaignState.value.chapters[currentChapterNumber]?.plot_points[0];
		if (nextPlotPoint) {
			currentChapter.plot_points.push({
				...nextPlotPoint,
				plotId: currentChapter.plot_points.length + 1
			});
		}
		return currentChapter;
	};
</script>

{#if isGeneratingState}
	<LoadingModal loadingText="Generating Campaign, this may take a while..." />
{/if}
<ul class="steps mt-3 w-full">
	<li class="step step-primary">Campaign</li>
	<!--TODO  -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events  -->
	<li class="step cursor-pointer" onclick={() => _goto('character')}>Character</li>
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions  -->
	<!-- svelte-ignore a11y_click_events_have_key_events  -->
	<li class="step cursor-pointer" onclick={() => _goto('characterStats')}>Stats</li>
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions  -->
	<!-- svelte-ignore a11y_click_events_have_key_events  -->
	<li class="step cursor-pointer" onclick={() => _goto('character')}>Start</li>
</ul>
<form class="m-6 grid items-center gap-2 text-center">
	<button
		class="btn btn-accent btn-md m-auto mt-3 w-1/2"
		disabled={isGeneratingState}
		onclick={onRandomize}
	>
		Randomize All
	</button>
	<button class="btn btn-neutral btn-md m-auto w-1/2" onclick={onUploadClicked}>
		Generate Campaign from PDF
	</button>
	<button
		class="btn btn-neutral btn-md m-auto w-1/2"
		onclick={() => {
			campaignState.reset();
			storyState.reset();
			campaignStateOverwrites = {};
		}}
	>
		Clear All
	</button>
	<ImportExportSaveGame isSaveGame={false}>
		{#snippet exportButton(onclick)}
			<button {onclick} class="btn btn-neutral btn-md m-auto w-1/2"> Export Settings</button>
		{/snippet}
		{#snippet importButton(onclick)}
			<button {onclick} class="btn btn-neutral btn-md m-auto w-1/2"> Import Settings</button>
		{/snippet}
	</ImportExportSaveGame>
	<button
		class="btn btn-primary btn-md m-auto w-1/2"
		disabled={!isCampaignSet()}
		onclick={() => _goto('character')}
	>
		Next Step:<br /> Customize Character
	</button>
	<p>The Campaign mode is currently in alpha, bugs are still expected.</p>
	<p>Please report any bugs in the Discord!</p>
	<p>Watch out for:</p>
	<ul>
		<li>Consistency with plot points and GM notes.</li>
		<li>Transition between chapters.</li>
		<li>Consistency with decisions that deviate from the planned plot.</li>
	</ul>
	{#if campaignState.value}
		{#each Object.keys(initialCampaignState) as stateValue}
			{#if stateValue === 'chapters'}
				<!-- TODO refactor or leave for now?-->
				<fieldset class="mt-3 w-full">
					<details open class="collapse-arrow border-base-300 bg-base-200 collapse border">
						<summary class="collapse-title capitalize">{stateValue.replaceAll('_', ' ')}</summary>
						<div class="collapse-content">
							{#each Object.keys((campaignState.value as any)[stateValue as string]) as chapterNumber}
								<fieldset class="mt-3 w-full">
									<details class="collapse-arrow textarea bg-base-200 textarea-md collapse border">
										{#each Object.keys((campaignState.value as any)[stateValue as string][chapterNumber]) as chapterProperty (chapterProperty)}
											{#if chapterProperty === 'plot_points'}
												<details class="collapse-arrow border-base-300 bg-base-200 collapse border">
													<summary class="collapse-title capitalize"
														>{chapterProperty.replaceAll('_', ' ')}</summary
													>
													<div class="collapse-content">
														{#each Object.keys((campaignState.value as any)[stateValue as string][chapterNumber][chapterProperty]) as plotPoint}
															<fieldset class="mt-3 w-full">
																<details
																	class="collapse-arrow textarea bg-base-200 textarea-md collapse border"
																>
																	{#each Object.keys((campaignState.value as any)[stateValue as string][chapterNumber][chapterProperty][plotPoint]) as plotPointProperty (plotPointProperty)}
																		{#if plotPointProperty === 'location'}
																			<summary class="collapse-title capitalize">
																				<div class="m-auto w-full sm:col-span-2">
																					<p class="content-center truncate">
																						{`${((campaignState.value as any)[stateValue as string][chapterNumber][chapterProperty][plotPoint] as any)[plotPointProperty] || 'Enter A Name'}`}
																					</p>
																					<button
																						class="components btn btn-error no-animation btn-sm m-auto mt-2"
																						onclick={(evt) => {
																							evt.preventDefault();
																							(campaignState.value as any)[stateValue as string][
																								chapterNumber
																							][chapterProperty].splice(
																								Number.parseInt(plotPoint),
																								1
																							);
																							if (
																								(campaignStateOverwrites as any)[
																									stateValue as string
																								] &&
																								(campaignStateOverwrites as any)[
																									stateValue as string
																								][chapterNumber][chapterProperty][plotPoint]
																							) {
																								delete (campaignStateOverwrites as any)[
																									stateValue as string
																								][chapterNumber][chapterProperty][plotPoint];
																							}
																							(campaignState.value as any)[stateValue as string][
																								chapterNumber
																							][chapterProperty] = (
																								(campaignState.value as any)[stateValue as string][
																									chapterNumber
																								][chapterProperty] as any[]
																							).map((plotPoint: any, i: number) => ({
																								...plotPoint,
																								plotId: i + 1
																							}));
																						}}
																					>
																						Delete
																					</button>
																				</div>
																			</summary>
																		{/if}
																		{#if plotPointProperty !== 'plotId'}
																			<div class="collapse-content">
																				<fieldset class="mt-3 w-full">
																					<div class="capitalize">
																						{plotPointProperty.replaceAll('_', ' ')}
																						{#if (campaignStateOverwrites as any)[stateValue as string] && (campaignStateOverwrites as any)[stateValue as string][chapterNumber] && (campaignStateOverwrites as any)[stateValue as string][chapterNumber][chapterProperty] && (campaignStateOverwrites as any)[stateValue as string][chapterNumber][chapterProperty][plotPoint] && (campaignStateOverwrites as any)[stateValue as string][chapterNumber][chapterProperty][plotPoint][plotPointProperty]}
																							<span class="badge badge-accent ml-2"
																								>overwritten</span
																							>
																						{/if}
																					</div>
																					<textarea
																						bind:value={

																								(campaignState.value as any)[stateValue as string][
																									chapterNumber
																								][chapterProperty] as any
																							)[plotPoint][plotPointProperty] as any
																						}
																						rows={(
																							(
																								(campaignState.value as any)[stateValue as string][
																									chapterNumber
																								][chapterProperty] as any
																							)[plotPoint][plotPointProperty] + ''
																						).length > 60
																							? 4
																							: 2}
																						oninput={(evt) => {
																							if (
																								!(campaignStateOverwrites as any)[
																									stateValue as string
																								]
																							) {
																								(campaignStateOverwrites as any)[
																									stateValue as string
																								] = {};
																							}
																							if (
																								!(campaignStateOverwrites as any)[
																									stateValue as string
																								][chapterNumber]
																							) {
																								(campaignStateOverwrites as any)[
																									stateValue as string
																								][chapterNumber] = {};
																							}
																							if (
																								!(campaignStateOverwrites as any)[
																									stateValue as string
																								][chapterNumber][chapterProperty]
																							) {
																								(campaignStateOverwrites as any)[
																									stateValue as string
																								][chapterNumber][chapterProperty] = {};
																							}
																							if (
																								!(campaignStateOverwrites as any)[
																									stateValue as string
																								][chapterNumber][chapterProperty][plotPoint]
																							) {
																								(campaignStateOverwrites as any)[
																									stateValue as string
																								][chapterNumber][chapterProperty][plotPoint] = {};
																							}
																							(campaignStateOverwrites as any)[
																								stateValue as string
																							][chapterNumber][chapterProperty][plotPoint][
																								plotPointProperty
																							] = (evt.currentTarget as HTMLTextAreaElement).value;
																						}}
																						class="textarea textarea-md mt-2 w-full"
																					>
																					</textarea>
																				</fieldset>
																			</div>
																		{/if}
																	{/each}
																</details>
															</fieldset>
														{/each}
													</div>
												</details>
												<!-- Plot Points -->
												<button
													class="btn btn-neutral btn-md m-auto mt-2 w-3/4 capitalize sm:w-1/2"
													onclick={() => {
														const arr = (campaignState.value as any)[stateValue as string][
															chapterNumber
														][chapterProperty] as any[];
														arr.push(getNewPlotPointObject(arr.length + 1));
													}}
												>
													Add Plot Point
												</button>
											{:else}
												{#if chapterProperty === 'title'}
													<summary class="collapse-title capitalize">
														<div class="m-auto w-full sm:col-span-2">
															<p class="content-center truncate">
																{isNaN(parseInt(chapterNumber))
																	? chapterNumber.replaceAll('_', ' ')
																	: `${((campaignState.value as any)[stateValue as string][chapterNumber][chapterProperty] as any) || 'Enter A Name'}`}
															</p>
															<button
																class="components btn btn-error no-animation btn-sm m-auto mt-2"
																onclick={(evt) => {
																	evt.preventDefault();
																	campaignState.value[stateValue].splice(
																		Number.parseInt(chapterNumber),
																		1
																	);
																	if (
																		(campaignStateOverwrites as any)[stateValue as string] &&
																		(campaignStateOverwrites as any)[stateValue as string][
																			chapterNumber
																		]
																	) {
																		delete (campaignStateOverwrites as any)[stateValue as string][
																			chapterNumber
																		];
																	}
																	campaignState.value[stateValue] = campaignState.value[
																		stateValue
																	].map((chapter, i) => ({ ...chapter, chapterId: i + 1 }));
																}}
															>
																Delete
															</button>
														</div>
													</summary>
												{/if}
												{#if chapterProperty !== 'chapterId'}
													<div class="collapse-content">
														<fieldset class="mt-3 w-full">
															<div class="capitalize">
																{chapterProperty.replaceAll('_', ' ')}
																{#if (campaignStateOverwrites as any)[stateValue as string] && (campaignStateOverwrites as any)[stateValue as string][chapterNumber] && (campaignStateOverwrites as any)[stateValue as string][chapterNumber][chapterProperty]}
																	<span class="badge badge-accent ml-2">overwritten</span>
																{/if}
															</div>
															<textarea
																bind:value={
																	campaignState.value as any)[stateValue as string][chapterNumber][
																		chapterProperty
																	] as any
																}
																rows={((
																	(campaignState.value as any)[stateValue as string][chapterNumber][
																		chapterProperty
																	] as any
																)?.length as number) > 30
																	? 2
																	: 1}
																oninput={(evt) => {
																	if (!campaignStateOverwrites[stateValue]) {
																		campaignStateOverwrites[stateValue] = {};
																	}
																	if (
																		!(campaignStateOverwrites as any)[stateValue as string][
																			chapterNumber
																		]
																	) {
																		(campaignStateOverwrites as any)[stateValue as string][
																			chapterNumber
																		] = {};
																	}
																	(campaignStateOverwrites as any)[stateValue as string][
																		chapterNumber
																	][chapterProperty] = (
																		evt.currentTarget as HTMLTextAreaElement
																	).value;
																}}
																class="textarea textarea-md mt-2 w-full"
															>
															</textarea>
														</fieldset>
													</div>
												{/if}
											{/if}
										{/each}
										<button
											class="btn btn-accent btn-md m-5 m-auto mt-2 mb-2 w-1/2"
											onclick={() => {
												onRandomizeSingle(stateValue, chapterNumber);
											}}
										>
											Randomize Whole Chapter
										</button>
									</details>
								</fieldset>
							{/each}
							<!-- Chapters -->
						</div>
						<button
							class="btn btn-neutral btn-md m-auto mt-2 w-3/4 capitalize sm:w-1/2"
							onclick={() => {
								campaignState.value[stateValue].push(
									getNewChapterObject(campaignState.value[stateValue].length + 1)
								);
							}}
						>
							Add Chapter
						</button>
						<button
							class="btn btn-accent btn-md m-5 m-auto mt-2 mb-2 w-1/2"
							onclick={() => {
								onRandomizeSingle(stateValue as any);
							}}
						>
							Randomize All Chapters
						</button>
					</details>
				</fieldset>
			{:else}
				<fieldset class="mt-3 w-full">
					<div class=" flex-row capitalize">
						{stateValue.replaceAll('_', ' ')}
						{#if (campaignStateOverwrites as any)[stateValue as string]}
							<span class="badge badge-accent ml-2">overwritten</span>
						{/if}
					</div>

					<textarea
						bind:value={campaignState.value as any)[stateValue as string]}
						rows={textAreaRowsDerived ? (textAreaRowsDerived as any)[stateValue as string] : 2}
						oninput={(evt) => handleInput(evt, stateValue)}
						placeholder={(initialCampaignState as any)[stateValue as string]}
						class="textarea textarea-md mt-2 w-full"
					></textarea>
				</fieldset>
				<button
					class="btn btn-accent btn-md m-auto mt-2 w-3/4 capitalize sm:w-1/2"
					onclick={() => {
						onRandomizeSingle(stateValue as any);
					}}
				>
					Randomize {stateValue.replaceAll('_', ' ')}
				</button>
				<button
					class="btn btn-neutral btn-md m-auto mt-2 w-3/4 capitalize sm:w-1/2"
					onclick={() => {
						campaignState.resetProperty(stateValue as keyof Campaign);
						delete campaignStateOverwrites[stateValue];
					}}
				>
					Clear {stateValue.replaceAll('_', ' ')}
				</button>
			{/if}
		{/each}
		<button
			class="btn btn-primary btn-md m-auto mt-2 w-1/2"
			disabled={!isCampaignSet()}
			onclick={() => _goto('character')}
		>
			Next Step:<br /> Customize Character
		</button>
	{/if}
</form>
