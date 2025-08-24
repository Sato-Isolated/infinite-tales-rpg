<script lang="ts">
	import { onMount } from 'svelte';
	import LoadingModal from '$lib/components/ui/loading/LoadingModal.svelte';
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
	import ImportExportSaveGame from '$lib/components/ui/data/ImportExportSaveGame.svelte';
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

	// States
	let isGeneratingState = $state(false);
	const apiKeyState = useLocalStorage<string>('apiKeyState');
	const aiLanguage = useLocalStorage<string>('aiLanguage');
	let campaignAgent: CampaignAgent;

	const campaignState = useLocalStorage<Campaign>('campaignState', initialCampaignState);
	const storyState = useLocalStorage<Story>('storyState', {} as Story);
	const currentChapterState = useLocalStorage<number>('currentChapterState');
	const characterState = useLocalStorage<CharacterDescription>('characterState');
	const aiConfigState = useLocalStorage<AIConfig>('aiConfigState');

	// Derived states
	const textAreaRowsDerived = $derived(getRowsForTextarea(campaignState.value));

	// Campaign overwrites with proper typing
	type CampaignOverwrites = Partial<
		Omit<Campaign, 'chapters'> & {
			chapters?: Array<Partial<CampaignChapter>> | Record<string, Partial<CampaignChapter>>;
			[key: string]: any;
		}
	>;
	let campaignStateOverwrites: CampaignOverwrites = $state({});

	// Helper functions for cleaner data access
	const getCampaignValue = (key: string) => {
		return (campaignState.value as any)[key];
	};

	const setCampaignValue = (key: string, value: any) => {
		(campaignState.value as any)[key] = value;
	};

	const getChapterValue = (stateValue: string, chapterNumber: string, property: string) => {
		return getCampaignValue(stateValue)?.[chapterNumber]?.[property];
	};

	const setChapterValue = (
		stateValue: string,
		chapterNumber: string,
		property: string,
		value: any
	) => {
		if (!getCampaignValue(stateValue)) {
			setCampaignValue(stateValue, {});
		}
		if (!getCampaignValue(stateValue)[chapterNumber]) {
			getCampaignValue(stateValue)[chapterNumber] = {};
		}
		getCampaignValue(stateValue)[chapterNumber][property] = value;
	};

	const getPlotPointValue = (
		stateValue: string,
		chapterNumber: string,
		chapterProperty: string,
		plotPoint: string,
		plotPointProperty: string
	) => {
		return getChapterValue(stateValue, chapterNumber, chapterProperty)?.[plotPoint]?.[
			plotPointProperty
		];
	};

	const setPlotPointValue = (
		stateValue: string,
		chapterNumber: string,
		chapterProperty: string,
		plotPoint: string,
		plotPointProperty: string,
		value: any
	) => {
		const chapters = getCampaignValue(stateValue);
		if (!chapters?.[chapterNumber]?.[chapterProperty]?.[plotPoint]) {
			// Initialize nested structure if needed
			if (!chapters[chapterNumber]) chapters[chapterNumber] = {};
			if (!chapters[chapterNumber][chapterProperty]) chapters[chapterNumber][chapterProperty] = {};
			if (!chapters[chapterNumber][chapterProperty][plotPoint])
				chapters[chapterNumber][chapterProperty][plotPoint] = {};
		}
		chapters[chapterNumber][chapterProperty][plotPoint][plotPointProperty] = value;
	};

	// Overwrite helpers
	const getOverwriteValue = (path: string[]) => {
		let current = campaignStateOverwrites as any;
		for (const key of path) {
			current = current?.[key];
		}
		return current;
	};

	const setOverwriteValue = (path: string[], value: any) => {
		let current = campaignStateOverwrites as any;

		// Initialize nested structure
		for (let i = 0; i < path.length - 1; i++) {
			if (!current[path[i]]) {
				current[path[i]] = {};
			}
			current = current[path[i]];
		}

		// Set the final value
		current[path[path.length - 1]] = value;
	};

	// Event handlers
	const handleInput = (evt: Event, stateValue: string) => {
		const value = (evt.target as HTMLTextAreaElement).value;
		setOverwriteValue([stateValue], value);
	};

	const handleChapterInput = (
		evt: Event,
		stateValue: string,
		chapterNumber: string,
		chapterProperty: string
	) => {
		const value = (evt.currentTarget as HTMLTextAreaElement).value;
		setOverwriteValue([stateValue, chapterNumber, chapterProperty], value);
	};

	const handlePlotPointInput = (
		evt: Event,
		stateValue: string,
		chapterNumber: string,
		chapterProperty: string,
		plotPoint: string,
		plotPointProperty: string
	) => {
		const value = (evt.currentTarget as HTMLTextAreaElement).value;
		setOverwriteValue(
			[stateValue, chapterNumber, chapterProperty, plotPoint, plotPointProperty],
			value
		);
	};

	// Component lifecycle
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
			currentCampaign[stateValue][chapterNumber] = undefined;
		} else {
			currentCampaign[stateValue] = undefined;
		}

		const filteredOverwrites: any = removeEmptyValues(
			$state.snapshot(campaignStateOverwrites)
		) as any;
		const singleChapterOverwritten = filteredOverwrites.chapters?.[chapterNumber];

		if (filteredOverwrites.chapters) {
			filteredOverwrites.chapters = Object.entries(
				removeEmptyValues(filteredOverwrites.chapters)
			).map(([_, value]) => value);
		}

		let alteredCampaign: Campaign = {
			...(currentCampaign as Campaign),
			...(filteredOverwrites as Partial<Campaign>)
		} as Campaign;

		if (chapterNumber) {
			const newChapter = await campaignAgent.generateSingleChapter(
				alteredCampaign,
				$state.snapshot(characterState.value),
				Number.parseInt(chapterNumber) + 1,
				singleChapterOverwritten
			);
			(getCampaignValue(stateValue) as any)[chapterNumber] = newChapter;
		} else {
			const newState = await campaignAgent.generateCampaign(
				alteredCampaign,
				$state.snapshot(characterState.value)
			);
			if (newState) {
				console.log(stringifyPretty(newState));
				setCampaignValue(stateValue, (newState as any)[stateValue]);
			}
		}
		isGeneratingState = false;
	};

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
		const nextPlotPoint = campaignState.value.chapters[currentChapterNumber]?.plot_points[0];
		if (nextPlotPoint) {
			currentChapter.plot_points.push({
				...nextPlotPoint,
				plotId: currentChapter.plot_points.length + 1
			});
		}
		return currentChapter;
	};

	// Delete handlers
	const deletePlotPoint = (
		stateValue: string,
		chapterNumber: string,
		chapterProperty: string,
		plotPoint: string
	) => {
		const chapters = getCampaignValue(stateValue);
		chapters[chapterNumber][chapterProperty].splice(Number.parseInt(plotPoint), 1);

		// Clean up overwrites
		const overwrites = getOverwriteValue([stateValue, chapterNumber, chapterProperty, plotPoint]);
		if (overwrites) {
			delete (campaignStateOverwrites as any)[stateValue][chapterNumber][chapterProperty][
				plotPoint
			];
		}

		// Update plotIds
		chapters[chapterNumber][chapterProperty] = chapters[chapterNumber][chapterProperty].map(
			(plotPoint: any, i: number) => ({
				...plotPoint,
				plotId: i + 1
			})
		);
	};

	const deleteChapter = (stateValue: string, chapterNumber: string) => {
		(campaignState.value as any)[stateValue].splice(Number.parseInt(chapterNumber), 1);

		// Clean up overwrites
		const overwrites = getOverwriteValue([stateValue, chapterNumber]);
		if (overwrites) {
			delete (campaignStateOverwrites as any)[stateValue][chapterNumber];
		}

		// Update chapterIds
		(campaignState.value as any)[stateValue] = (campaignState.value as any)[stateValue].map(
			(chapter: any, i: number) => ({
				...chapter,
				chapterId: i + 1
			})
		);
	};
</script>

{#if isGeneratingState}
	<LoadingModal loadingText="Generating Campaign, this may take a while..." />
{/if}

<ul class="steps mt-3 w-full">
	<li class="step step-primary">Campaign</li>
	<li class="step">
		<button
			type="button"
			class="focus:ring-primary cursor-pointer border-none bg-transparent p-0 text-inherit hover:opacity-75 focus:ring-2 focus:outline-none"
			onclick={() => _goto('character')}
			onkeydown={(e) => e.key === 'Enter' && _goto('character')}
			aria-label="Go to Character step"
		>
			Character
		</button>
	</li>
	<li class="step">
		<button
			type="button"
			class="focus:ring-primary cursor-pointer border-none bg-transparent p-0 text-inherit hover:opacity-75 focus:ring-2 focus:outline-none"
			onclick={() => _goto('characterStats')}
			onkeydown={(e) => e.key === 'Enter' && _goto('characterStats')}
			aria-label="Go to Stats step"
		>
			Stats
		</button>
	</li>
	<li class="step">
		<button
			type="button"
			class="focus:ring-primary cursor-pointer border-none bg-transparent p-0 text-inherit hover:opacity-75 focus:ring-2 focus:outline-none"
			onclick={() => _goto('character')}
			onkeydown={(e) => e.key === 'Enter' && _goto('character')}
			aria-label="Start the game"
		>
			Start
		</button>
	</li>
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
			<button {onclick} class="btn btn-neutral btn-md m-auto w-1/2">Export Settings</button>
		{/snippet}
		{#snippet importButton(onclick)}
			<button {onclick} class="btn btn-neutral btn-md m-auto w-1/2">Import Settings</button>
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
				<fieldset class="mt-3 w-full">
					<details open class="collapse-arrow border-base-300 bg-base-200 collapse border">
						<summary class="collapse-title capitalize">{stateValue.replaceAll('_', ' ')}</summary>
						<div class="collapse-content">
							{#each Object.keys(getCampaignValue(stateValue) || {}) as chapterNumber}
								{@const chapter = getCampaignValue(stateValue)[chapterNumber]}
								<fieldset class="mt-3 w-full">
									<details class="collapse-arrow textarea bg-base-200 textarea-md collapse border">
										{#each Object.keys(chapter) as chapterProperty (chapterProperty)}
											{#if chapterProperty === 'plot_points'}
												<details class="collapse-arrow border-base-300 bg-base-200 collapse border">
													<summary class="collapse-title capitalize">
														{chapterProperty.replaceAll('_', ' ')}
													</summary>
													<div class="collapse-content">
														{#each Object.keys(chapter[chapterProperty] || {}) as plotPoint}
															{@const plotPointData = chapter[chapterProperty][plotPoint]}
															<fieldset class="mt-3 w-full">
																<details
																	class="collapse-arrow textarea bg-base-200 textarea-md collapse border"
																>
																	{#each Object.keys(plotPointData) as plotPointProperty (plotPointProperty)}
																		{#if plotPointProperty === 'location'}
																			<summary class="collapse-title capitalize">
																				<div class="m-auto w-full sm:col-span-2">
																					<p class="content-center truncate">
																						{plotPointData[plotPointProperty] || 'Enter A Name'}
																					</p>
																					<button
																						class="components btn btn-error no-animation btn-sm m-auto mt-2"
																						onclick={(evt) => {
																							evt.preventDefault();
																							deletePlotPoint(
																								stateValue,
																								chapterNumber,
																								chapterProperty,
																								plotPoint
																							);
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
																						{#if getOverwriteValue( [stateValue, chapterNumber, chapterProperty, plotPoint, plotPointProperty] )}
																							<span class="badge badge-accent ml-2"
																								>overwritten</span
																							>
																						{/if}
																					</div>
																					<textarea
																						bind:value={plotPointData[plotPointProperty]}
																						rows={String(plotPointData[plotPointProperty] || '')
																							.length > 60
																							? 4
																							: 2}
																						oninput={(evt) =>
																							handlePlotPointInput(
																								evt,
																								stateValue,
																								chapterNumber,
																								chapterProperty,
																								plotPoint,
																								plotPointProperty
																							)}
																						class="textarea textarea-md mt-2 w-full"
																					></textarea>
																				</fieldset>
																			</div>
																		{/if}
																	{/each}
																</details>
															</fieldset>
														{/each}
													</div>
												</details>
												<button
													class="btn btn-neutral btn-md m-auto mt-2 w-3/4 capitalize sm:w-1/2"
													onclick={() => {
														const arr = chapter[chapterProperty];
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
																	: chapter[chapterProperty] || 'Enter A Name'}
															</p>
															<button
																class="components btn btn-error no-animation btn-sm m-auto mt-2"
																onclick={(evt) => {
																	evt.preventDefault();
																	deleteChapter(stateValue, chapterNumber);
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
																{#if getOverwriteValue( [stateValue, chapterNumber, chapterProperty] )}
																	<span class="badge badge-accent ml-2">overwritten</span>
																{/if}
															</div>
															<textarea
																bind:value={chapter[chapterProperty]}
																rows={String(chapter[chapterProperty] || '').length > 30 ? 2 : 1}
																oninput={(evt) =>
																	handleChapterInput(
																		evt,
																		stateValue,
																		chapterNumber,
																		chapterProperty
																	)}
																class="textarea textarea-md mt-2 w-full"
															></textarea>
														</fieldset>
													</div>
												{/if}
											{/if}
										{/each}
										<button
											class="btn btn-accent btn-md m-5 m-auto mt-2 mb-2 w-1/2"
											onclick={() => onRandomizeSingle(stateValue, chapterNumber)}
										>
											Randomize Whole Chapter
										</button>
									</details>
								</fieldset>
							{/each}
						</div>
						<button
							class="btn btn-neutral btn-md m-auto mt-2 w-3/4 capitalize sm:w-1/2"
							onclick={() => {
								getCampaignValue(stateValue).push(
									getNewChapterObject(getCampaignValue(stateValue).length + 1)
								);
							}}
						>
							Add Chapter
						</button>
						<button
							class="btn btn-accent btn-md m-5 m-auto mt-2 mb-2 w-1/2"
							onclick={() => onRandomizeSingle(stateValue as any)}
						>
							Randomize All Chapters
						</button>
					</details>
				</fieldset>
			{:else}
				<fieldset class="mt-3 w-full">
					<div class="flex-row capitalize">
						{stateValue.replaceAll('_', ' ')}
						{#if getOverwriteValue([stateValue])}
							<span class="badge badge-accent ml-2">overwritten</span>
						{/if}
					</div>
					<textarea
						bind:value={
							() => getOverwriteValue([stateValue]) ?? getCampaignValue(stateValue),
							(value: string) => setOverwriteValue([stateValue], value)
						}
						rows={textAreaRowsDerived ? textAreaRowsDerived[stateValue] : 2}
						placeholder={(initialCampaignState as any)[stateValue] as string}
						class="textarea textarea-md mt-2 w-full"
					></textarea>
				</fieldset>
				<button
					class="btn btn-accent btn-md m-auto mt-2 w-3/4 capitalize sm:w-1/2"
					onclick={() => onRandomizeSingle(stateValue as any)}
				>
					Randomize {stateValue.replaceAll('_', ' ')}
				</button>
				<button
					class="btn btn-neutral btn-md m-auto mt-2 w-3/4 capitalize sm:w-1/2"
					onclick={() => {
						campaignState.resetProperty(stateValue as keyof Campaign);
						delete (campaignStateOverwrites as any)[stateValue];
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
