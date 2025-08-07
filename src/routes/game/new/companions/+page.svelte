<script lang="ts">
	import { onMount } from 'svelte';
	import {
		CharacterAgent,
		type CharacterDescription,
		initialCharacterState
	} from '$lib/ai/agents/characterAgent';
	import LoadingModal from '$lib/components/LoadingModal.svelte';
	import AIGeneratedImage from '$lib/components/AIGeneratedImage.svelte';
	import { useLocalStorage } from '$lib/state/useLocalStorage.svelte';
	import { getRowsForTextarea, navigate } from '$lib/util.svelte';
	import isEqual from 'lodash.isequal';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { LLMProvider } from '$lib/ai/llmProvider';
	import { initialStoryState, type Story } from '$lib/ai/agents/storyAgent';
	import type { Campaign } from '$lib/ai/agents/campaignAgent';
	import type { AIConfig } from '$lib';
	import type { CompanionCharacter } from '$lib/types/companion';
	import { initialCompanionMemory, initialPersonalityEvolution, initialRelationshipData } from '$lib/types/companion';
	import { initialCharacterStatsState } from '$lib/ai/agents/characterStatsAgent';
	import { getCompanionManager } from '$lib/contexts/companionContext';
	import { v4 as uuidv4 } from 'uuid';
	import CompanionEditModal from '$lib/components/interaction_modals/CompanionEditModal.svelte';

	let isGeneratingState = $state(false);
	const apiKeyState = useLocalStorage<string>('apiKeyState');
	const aiLanguage = useLocalStorage<string>('aiLanguage');
	const storyState = useLocalStorage<Story>('storyState', initialStoryState);
	const campaignState = useLocalStorage<Campaign>('campaignState');
	
	// État du compagnon en cours de création
	let companionDescription = $state<CharacterDescription>({ ...initialCharacterState });
	const textAreaRowsDerived = $derived(getRowsForTextarea(companionDescription));

	let characterStateOverwrites: Partial<CharacterDescription> = $state({});
	let resetImageState = $state(false);
	const aiConfigState = useLocalStorage<AIConfig>('aiConfigState');
	
	let characterAgent: CharacterAgent;
	let companionManager: any;
	
	// État pour la gestion des compagnons existants
	let existingCompanions = $state<CompanionCharacter[]>([]);
	let showExistingCompanions = $state(false);
	
	// Variables pour l'édition avec modal
	let isEditMode = $state(false);
	let editModalOpen = $state(false);
	let companionBeingEdited = $state<CompanionCharacter | null>(null);
	
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
		
		companionManager = getCompanionManager();
		loadExistingCompanions();
		
		// Charger un compagnon pour édition si spécifié dans l'URL
		const editId = $page.url.searchParams.get('edit');
		if (editId) {
			loadCompanionForEdit(editId);
		}
	});

	const loadExistingCompanions = () => {
		if (companionManager) {
			existingCompanions = companionManager.getAllCompanions();
		}
	};

	const loadCompanionForEdit = (companionId: string) => {
		if (!companionManager) return;
		
		const companion = companionManager.getCompanion(companionId);
		if (companion) {
			companionDescription = { ...companion.character_description };
			characterStateOverwrites = {};
			resetImageState = true;
			isEditMode = true;
		}
	};

	const toggleCompanionActive = (companionId: string) => {
		if (!companionManager) return;
		
		const companion = companionManager.getCompanion(companionId);
		if (!companion) return;

		if (companion.is_active_in_party) {
			companionManager.removeFromActiveParty(companionId);
		} else {
			companionManager.addToActiveParty(companionId);
		}
		
		loadExistingCompanions();
	};

	const deleteCompanion = (companionId: string) => {
		if (!companionManager) return;
		
		if (confirm('Are you sure you want to delete this companion? This action cannot be undone.')) {
			companionManager.deleteCompanion(companionId);
			loadExistingCompanions();
		}
	};

	const editCompanion = (companionId: string) => {
		if (!companionManager) return;
		
		const companion = companionManager.getCompanion(companionId);
		if (companion) {
			companionBeingEdited = companion;
			editModalOpen = true;
		}
	};

	const closeEditModal = () => {
		editModalOpen = false;
		companionBeingEdited = null;
	};

	const saveEditedCompanion = (updatedCompanion: CompanionCharacter) => {
		if (!companionManager || !companionBeingEdited) return;
		
		companionManager.updateCompanion(companionBeingEdited.id, updatedCompanion);
		loadExistingCompanions();
		closeEditModal();
	};

	const onRandomize = async () => {
		isGeneratingState = true;
		const newState = await characterAgent.generateCharacterDescription(
			$state.snapshot(storyState.value),
			characterStateOverwrites
		);
		if (newState) {
			companionDescription = newState;
			resetImageState = true;
		}
		isGeneratingState = false;
	};

	const onRandomizeSingle = async (stateValue: keyof CharacterDescription) => {
		isGeneratingState = true;
		const currentCharacter = { ...companionDescription };
		currentCharacter[stateValue] = undefined as any;
		const characterInput = { ...currentCharacter, ...characterStateOverwrites };
		const newState = await characterAgent.generateCharacterDescription(
			$state.snapshot(storyState.value),
			characterInput
		);
		if (newState) {
			companionDescription[stateValue] = newState[stateValue];
			if (stateValue === 'appearance') {
				resetImageState = true;
			}
		}
		isGeneratingState = false;
	};

	const saveCompanion = () => {
		if (isEqual(companionDescription, initialCharacterState) || !companionManager) {
			return;
		}
		
		// Vérifier si on édite un compagnon existant
		const editId = $page.url.searchParams.get('edit');
		
		if (editId) {
			// Mode édition
			const existingCompanion = companionManager.getCompanion(editId);
			if (existingCompanion) {
				const updatedCompanion: CompanionCharacter = {
					...existingCompanion,
					character_description: companionDescription,
					last_interaction: new Date().toISOString()
				};
				
				companionManager.updateCompanion(editId, updatedCompanion);
				
				// Retourner à la création normale
				goto('companions');
				companionDescription = { ...initialCharacterState };
				characterStateOverwrites = {};
				resetImageState = true;
			}
		} else {
			// Mode création
			const newCompanion: CompanionCharacter = {
				id: uuidv4(),
				character_description: companionDescription,
				character_stats: {
					...initialCharacterStatsState,
					level: 1
				},
				companion_memory: initialCompanionMemory,
				personality_evolution: initialPersonalityEvolution(companionDescription.personality || ''),
				relationship_data: initialRelationshipData('newly_met'),
				created_at: new Date().toISOString(),
				last_interaction: new Date().toISOString(),
				is_active_in_party: false,
				loyalty_level: 50,
				trust_level: 30
			};

			companionManager.createCompanion(newCompanion);
			
			// Réinitialiser pour le prochain
			companionDescription = { ...initialCharacterState };
			characterStateOverwrites = {};
			resetImageState = true;
		}
		
		loadExistingCompanions();
	};

	const saveAndCreateAnother = () => {
		saveCompanion();
		// La réinitialisation est déjà faite dans saveCompanion()
	};

	const cancelEdit = () => {
		isEditMode = false;
		companionDescription = { ...initialCharacterState };
		characterStateOverwrites = {};
		resetImageState = true;
		goto('companions');
	};

	const goToNext = () => {
		navigate('/');
	};
</script>

{#if isGeneratingState}
	<LoadingModal />
{/if}
<ul class="steps mt-3 w-full">
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events  -->
	{#if campaignState.value?.campaign_title}
		<li class="step step-primary cursor-pointer" onclick={() => goto('campaign')}>Campaign</li>
	{:else}
		<li class="step step-primary cursor-pointer" onclick={() => goto('tale')}>Tale</li>
	{/if}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<li class="step step-primary cursor-pointer" onclick={() => goto('character')}>Character</li>
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<li class="step step-primary cursor-pointer" onclick={() => goto('characterStats')}>Stats</li>
	<li class="step step-primary">Companions</li>
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<li class="step cursor-pointer" onclick={goToNext}>Start</li>
</ul>
<form class="m-6 grid items-center gap-2 text-center">
	<!-- Explication simple comme les autres étapes -->
	<p>Create companions to join you in your adventure. You can create multiple companions and choose which ones are active.</p>
	<p>Click on Randomize All to generate a random Companion based on the Tale settings.</p>
	
	<!-- Actions principales (cohérentes avec Character/Tale) -->
	<button
		class="btn btn-accent m-auto mt-3 w-3/4 sm:w-1/2"
		disabled={isGeneratingState}
		onclick={onRandomize}
	>
		Randomize All
	</button>
	<button
		class="btn btn-neutral m-auto w-3/4 sm:w-1/2"
		onclick={() => {
			companionDescription = { ...initialCharacterState };
			characterStateOverwrites = {};
			resetImageState = true;
		}}
	>
		Clear All
	</button>

	<!-- Navigation cohérente -->
	<button
		class="btn btn-primary m-auto w-3/4 sm:w-1/2"
		onclick={() => {
			navigate('/new/characterStats');
		}}
	>
		Previous Step:<br /> Customize Stats & Abilities
	</button>
	<button
		class="btn btn-primary m-auto w-3/4 sm:w-1/2"
		onclick={goToNext}
	>
		Next Step:<br /> Start Your Tale
	</button>

	{#each Object.keys(companionDescription) as stateValue}
		{@const typedStateValue = stateValue as keyof CharacterDescription}
		<label class="form-control mt-3 w-full">
			<div class="flex-row capitalize">
				{stateValue.replaceAll('_', ' ')}
				{#if characterStateOverwrites[typedStateValue]}
					<span class="badge badge-accent ml-2">overwritten</span>
				{/if}
			</div>
			<textarea
				bind:value={companionDescription[typedStateValue]}
				rows={textAreaRowsDerived ? textAreaRowsDerived[typedStateValue] : 2}
				placeholder=""
				oninput={(evt) => {
					characterStateOverwrites[typedStateValue] = evt.currentTarget.value;
				}}
				class="textarea textarea-bordered textarea-md mt-2 w-full"
			>
			</textarea>
		</label>
		<button
			class="btn btn-accent m-auto mt-2 w-3/4 capitalize sm:w-1/2"
			onclick={() => {
				onRandomizeSingle(typedStateValue);
			}}
		>
			Randomize {stateValue.replaceAll('_', ' ')}
		</button>
		<button
			class="btn btn-neutral m-auto mt-2 w-3/4 capitalize sm:w-1/2"
			onclick={() => {
				companionDescription[typedStateValue] = initialCharacterState[typedStateValue];
				delete characterStateOverwrites[typedStateValue];
				if (stateValue === 'appearance') {
					resetImageState = true;
				}
			}}
		>
			Clear {stateValue.replaceAll('_', ' ')}
		</button>
		{#if !aiConfigState.value?.disableImagesState && stateValue === 'appearance'}
			<div class="m-auto flex w-full flex-col">
				<AIGeneratedImage
					storageKey="companionImageState"
					{resetImageState}
					imagePrompt="{storyState.value.general_image_prompt} {companionDescription.appearance}"
				/>
			</div>
		{/if}
	{/each}
	
	<!-- Actions pour sauvegarder -->
	<button
		class="btn btn-success m-auto w-3/4 sm:w-1/2"
		onclick={saveCompanion}
		disabled={isEqual(companionDescription, initialCharacterState)}
	>
		{#if $page.url.searchParams.has('edit')}
			Update Companion
		{:else}
			Save This Companion
		{/if}
	</button>
	
	{#if !$page.url.searchParams.has('edit')}
		<button
			class="btn btn-info m-auto w-3/4 sm:w-1/2"
			onclick={saveAndCreateAnother}
			disabled={isEqual(companionDescription, initialCharacterState)}
		>
			Save & Create Another
		</button>
	{/if}

	<!-- Gestion des compagnons existants (collapse minimal) -->
	{#if existingCompanions.length > 0}
		<div class="collapse collapse-arrow bg-base-200 mt-6">
			<input type="checkbox" bind:checked={showExistingCompanions} />
			<div class="collapse-title text-xl font-medium">
				Your Companions ({existingCompanions.length})
				{#if existingCompanions.filter(c => c.is_active_in_party).length > 0}
					<span class="badge badge-success ml-2">
						{existingCompanions.filter(c => c.is_active_in_party).length} Active
					</span>
				{/if}
			</div>
			<div class="collapse-content">
				<p class="text-sm text-base-content/70 mb-4">
					Manage your existing companions. Active companions will join your adventure.
				</p>
				{#each existingCompanions as companion (companion.id)}
					<div class="card bg-base-100 shadow-sm mb-3">
						<div class="card-body py-3">
							<div class="flex justify-between items-center">
								<div class="flex-1">
									<h4 class="font-semibold">
										{companion.character_description.name}
										{#if companion.is_active_in_party}
											<span class="badge badge-success badge-sm">Active</span>
										{/if}
									</h4>
									<p class="text-sm text-base-content/70">
										{companion.character_description.class} | {companion.character_description.race}
									</p>
								</div>
								<div class="flex items-center gap-2">
									<label class="label cursor-pointer gap-2">
										<span class="label-text text-sm">Active</span>
										<input 
											type="checkbox" 
											class="toggle toggle-success toggle-sm" 
											checked={companion.is_active_in_party}
											onchange={() => toggleCompanionActive(companion.id)}
										/>
									</label>
									<button 
										class="btn btn-info btn-xs"
										onclick={() => editCompanion(companion.id)}
									>
										Edit
									</button>
									<button 
										class="btn btn-error btn-xs"
										onclick={() => deleteCompanion(companion.id)}
									>
										Delete
									</button>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Navigation finale -->
	<button
		class="btn btn-primary m-auto w-3/4 sm:w-1/2 mt-6"
		onclick={goToNext}
	>
		Next Step:<br /> Start Your Tale
	</button>
</form>

<!-- Modal d'édition des compagnons -->
{#if companionBeingEdited}
	<CompanionEditModal 
		companion={companionBeingEdited}
		isOpen={editModalOpen}
		onClose={closeEditModal}
		onSave={saveEditedCompanion}
	/>
{/if}
