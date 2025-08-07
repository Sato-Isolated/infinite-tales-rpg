<script lang="ts">
	import type { CompanionCharacter } from '$lib/types/companion';
	import type { CharacterDescription } from '$lib/ai/agents/characterAgent';
	import type { CharacterStats, Resource, Ability } from '$lib/ai/agents/characterStatsAgent';
	import { getCompanionManager } from '$lib/contexts/companionContext';
	import { onMount } from 'svelte';

	interface Props {
		companion: CompanionCharacter;
		isOpen: boolean;
		onClose: () => void;
		onSave: (updatedCompanion: CompanionCharacter) => void;
	}

	let { companion, isOpen, onClose, onSave }: Props = $props();

	// État local pour l'édition
	let editedCompanion = $state<CompanionCharacter>({ ...companion });
	let activeSection = $state<string>('basic');

	// Remettre à jour quand le compagnon change
	$effect(() => {
		if (companion) {
			editedCompanion = JSON.parse(JSON.stringify(companion)); // Deep copy
		}
	});

	const sections = [
		{ id: 'basic', label: 'Basic Info', icon: '👤' },
		{ id: 'description', label: 'Description', icon: '📝' },
		{ id: 'stats', label: 'Stats & Abilities', icon: '⚔️' },
		{ id: 'loyalty', label: 'Loyalty & Trust', icon: '❤️' },
		{ id: 'advanced', label: 'Advanced', icon: '⚙️' }
	];

	const handleSave = () => {
		editedCompanion.last_interaction = new Date().toISOString();
		onSave(editedCompanion);
		onClose();
	};

	const handleClose = () => {
		// Reset les changements
		editedCompanion = JSON.parse(JSON.stringify(companion));
		onClose();
	};

	const handleKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			handleClose();
		}
	};

	const addAttribute = () => {
		const name = prompt('Enter attribute name:');
		if (name && !editedCompanion.character_stats.attributes[name]) {
			editedCompanion.character_stats.attributes[name] = 0;
		}
	};

	const addSkill = () => {
		const name = prompt('Enter skill name:');
		if (name && !editedCompanion.character_stats.skills[name]) {
			editedCompanion.character_stats.skills[name] = 0;
		}
	};

	const addResource = () => {
		const name = prompt('Enter resource name:');
		if (name && !editedCompanion.character_stats.resources[name]) {
			editedCompanion.character_stats.resources[name] = {
				max_value: 100,
				start_value: 100,
				game_ends_when_zero: false
			};
		}
	};

	const addAbility = () => {
		editedCompanion.character_stats.spells_and_abilities.push({
			name: 'New Ability',
			effect: '',
			resource_cost: { cost: 0, resource_key: undefined },
			image_prompt: ''
		});
	};
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
	<!-- Modal Overlay -->
	<div class="modal modal-open" onclick={handleClose}>
		<!-- Modal Content -->
		<div class="modal-box w-11/12 max-w-5xl max-h-[90vh] overflow-hidden p-0" onclick={(e) => e.stopPropagation()}>
			<!-- Header -->
			<div class="flex items-center justify-between p-6 border-b border-base-300">
				<h2 class="text-2xl font-bold">
					Edit Companion: {editedCompanion.character_description.name}
				</h2>
				<button class="btn btn-ghost btn-sm btn-circle" onclick={handleClose}>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<div class="flex h-[calc(90vh-180px)]">
				<!-- Sidebar Navigation -->
				<div class="w-64 bg-base-200 p-4 overflow-y-auto">
					<ul class="menu menu-compact">
						{#each sections as section}
							<li>
								<button
									class="flex items-center gap-2 {activeSection === section.id ? 'active' : ''}"
									onclick={() => activeSection = section.id}
								>
									<span>{section.icon}</span>
									{section.label}
								</button>
							</li>
						{/each}
					</ul>
				</div>

				<!-- Content Area -->
				<div class="flex-1 p-6 overflow-y-auto">
					{#if activeSection === 'basic'}
						<div class="space-y-4">
							<h3 class="text-lg font-semibold mb-4">Basic Information</h3>
							
							<div class="form-control">
								<label class="label">
									<span class="label-text">Name</span>
								</label>
								<input 
									type="text" 
									class="input input-bordered" 
									bind:value={editedCompanion.character_description.name}
								/>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div class="form-control">
									<label class="label">
										<span class="label-text">Class</span>
									</label>
									<input 
										type="text" 
										class="input input-bordered" 
										bind:value={editedCompanion.character_description.class}
									/>
								</div>

								<div class="form-control">
									<label class="label">
										<span class="label-text">Race</span>
									</label>
									<input 
										type="text" 
										class="input input-bordered" 
										bind:value={editedCompanion.character_description.race}
									/>
								</div>

								<div class="form-control">
									<label class="label">
										<span class="label-text">Gender</span>
									</label>
									<input 
										type="text" 
										class="input input-bordered" 
										bind:value={editedCompanion.character_description.gender}
									/>
								</div>

								<div class="form-control">
									<label class="label">
										<span class="label-text">Alignment</span>
									</label>
									<input 
										type="text" 
										class="input input-bordered" 
										bind:value={editedCompanion.character_description.alignment}
									/>
								</div>
							</div>

							<div class="form-control">
								<label class="label">
									<span class="label-text">Level</span>
								</label>
								<input 
									type="number" 
									min="1" 
									max="20" 
									class="input input-bordered" 
									bind:value={editedCompanion.character_stats.level}
								/>
							</div>

							<div class="form-control">
								<label class="label cursor-pointer">
									<span class="label-text">Active in Party</span>
									<input 
										type="checkbox" 
										class="toggle toggle-success" 
										bind:checked={editedCompanion.is_active_in_party}
									/>
								</label>
							</div>
						</div>

					{:else if activeSection === 'description'}
						<div class="space-y-4">
							<h3 class="text-lg font-semibold mb-4">Description</h3>
							
							<div class="form-control">
								<label class="label">
									<span class="label-text">Personality</span>
								</label>
								<textarea 
									class="textarea textarea-bordered h-24" 
									bind:value={editedCompanion.character_description.personality}
								></textarea>
							</div>

							<div class="form-control">
								<label class="label">
									<span class="label-text">Background</span>
								</label>
								<textarea 
									class="textarea textarea-bordered h-32" 
									bind:value={editedCompanion.character_description.background}
								></textarea>
							</div>

							<div class="form-control">
								<label class="label">
									<span class="label-text">Appearance</span>
								</label>
								<textarea 
									class="textarea textarea-bordered h-24" 
									bind:value={editedCompanion.character_description.appearance}
								></textarea>
							</div>

							<div class="form-control">
								<label class="label">
									<span class="label-text">Motivation</span>
								</label>
								<textarea 
									class="textarea textarea-bordered h-24" 
									bind:value={editedCompanion.character_description.motivation}
								></textarea>
							</div>
						</div>

					{:else if activeSection === 'stats'}
						<div class="space-y-6">
							<h3 class="text-lg font-semibold mb-4">Stats & Abilities</h3>
							
							<!-- Attributes -->
							<div class="collapse collapse-arrow border border-base-300 bg-base-100">
								<input type="checkbox" />
								<div class="collapse-title font-medium">Attributes</div>
								<div class="collapse-content">
									<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
										{#each Object.entries(editedCompanion.character_stats.attributes) as [name, value]}
											<div class="form-control">
												<label class="label">
													<span class="label-text capitalize">{name.replace(/_/g, ' ')}</span>
													<button 
														class="btn btn-error btn-xs"
														onclick={() => delete editedCompanion.character_stats.attributes[name]}
													>
														Delete
													</button>
												</label>
												<input 
													type="number" 
													min="-10" 
													max="10" 
													class="input input-bordered input-sm" 
													bind:value={editedCompanion.character_stats.attributes[name]}
												/>
											</div>
										{/each}
									</div>
									<button class="btn btn-outline btn-sm mt-4" onclick={addAttribute}>
										Add Attribute
									</button>
								</div>
							</div>

							<!-- Skills -->
							<div class="collapse collapse-arrow border border-base-300 bg-base-100">
								<input type="checkbox" />
								<div class="collapse-title font-medium">Skills</div>
								<div class="collapse-content">
									<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
										{#each Object.entries(editedCompanion.character_stats.skills) as [name, value]}
											<div class="form-control">
												<label class="label">
													<span class="label-text capitalize">{name.replace(/_/g, ' ')}</span>
													<button 
														class="btn btn-error btn-xs"
														onclick={() => delete editedCompanion.character_stats.skills[name]}
													>
														Delete
													</button>
												</label>
												<input 
													type="number" 
													min="-10" 
													max="10" 
													class="input input-bordered input-sm" 
													bind:value={editedCompanion.character_stats.skills[name]}
												/>
											</div>
										{/each}
									</div>
									<button class="btn btn-outline btn-sm mt-4" onclick={addSkill}>
										Add Skill
									</button>
								</div>
							</div>

							<!-- Resources -->
							<div class="collapse collapse-arrow border border-base-300 bg-base-100">
								<input type="checkbox" />
								<div class="collapse-title font-medium">Resources</div>
								<div class="collapse-content">
									<div class="space-y-4">
										{#each Object.entries(editedCompanion.character_stats.resources) as [name, resource]}
											<div class="border border-base-300 p-4 rounded">
												<div class="flex justify-between items-center mb-2">
													<h4 class="font-semibold capitalize">{name.replace(/_/g, ' ')}</h4>
													<button 
														class="btn btn-error btn-xs"
														onclick={() => delete editedCompanion.character_stats.resources[name]}
													>
														Delete
													</button>
												</div>
												<div class="grid grid-cols-1 md:grid-cols-3 gap-2">
													<div class="form-control">
														<label class="label">
															<span class="label-text text-xs">Max Value</span>
														</label>
														<input 
															type="number" 
															class="input input-bordered input-sm" 
															bind:value={resource.max_value}
														/>
													</div>
													<div class="form-control">
														<label class="label">
															<span class="label-text text-xs">Start Value</span>
														</label>
														<input 
															type="number" 
															class="input input-bordered input-sm" 
															bind:value={resource.start_value}
														/>
													</div>
													<div class="form-control">
														<label class="label cursor-pointer">
															<span class="label-text text-xs">Game Ends When Zero</span>
															<input 
																type="checkbox" 
																class="checkbox checkbox-sm" 
																bind:checked={resource.game_ends_when_zero}
															/>
														</label>
													</div>
												</div>
											</div>
										{/each}
									</div>
									<button class="btn btn-outline btn-sm mt-4" onclick={addResource}>
										Add Resource
									</button>
								</div>
							</div>

							<!-- Abilities -->
							<div class="collapse collapse-arrow border border-base-300 bg-base-100">
								<input type="checkbox" />
								<div class="collapse-title font-medium">Spells & Abilities</div>
								<div class="collapse-content">
									<div class="space-y-4">
										{#each editedCompanion.character_stats.spells_and_abilities as ability, index}
											<div class="border border-base-300 p-4 rounded">
												<div class="flex justify-between items-center mb-2">
													<h4 class="font-semibold">Ability {index + 1}</h4>
													<button 
														class="btn btn-error btn-xs"
														onclick={() => editedCompanion.character_stats.spells_and_abilities.splice(index, 1)}
													>
														Delete
													</button>
												</div>
												<div class="space-y-2">
													<div class="form-control">
														<label class="label">
															<span class="label-text text-xs">Name</span>
														</label>
														<input 
															type="text" 
															class="input input-bordered input-sm" 
															bind:value={ability.name}
														/>
													</div>
													<div class="form-control">
														<label class="label">
															<span class="label-text text-xs">Effect</span>
														</label>
														<textarea 
															class="textarea textarea-bordered textarea-sm h-20" 
															bind:value={ability.effect}
														></textarea>
													</div>
													<div class="grid grid-cols-2 gap-2">
														<div class="form-control">
															<label class="label">
																<span class="label-text text-xs">Resource Cost</span>
															</label>
															<input 
																type="number" 
																class="input input-bordered input-sm" 
																bind:value={ability.resource_cost.cost}
															/>
														</div>
														<div class="form-control">
															<label class="label">
																<span class="label-text text-xs">Resource Key</span>
															</label>
															<select class="select select-bordered select-sm" bind:value={ability.resource_cost.resource_key}>
																<option value={undefined}>None</option>
																{#each Object.keys(editedCompanion.character_stats.resources) as resourceKey}
																	<option value={resourceKey}>{resourceKey}</option>
																{/each}
															</select>
														</div>
													</div>
												</div>
											</div>
										{/each}
									</div>
									<button class="btn btn-outline btn-sm mt-4" onclick={addAbility}>
										Add Ability
									</button>
								</div>
							</div>
						</div>

					{:else if activeSection === 'loyalty'}
						<div class="space-y-4">
							<h3 class="text-lg font-semibold mb-4">Loyalty & Trust</h3>
							
							<div class="form-control">
								<label class="label">
									<span class="label-text">Loyalty Level: {editedCompanion.loyalty_level}%</span>
								</label>
								<input 
									type="range" 
									min="0" 
									max="100" 
									class="range range-success" 
									bind:value={editedCompanion.loyalty_level}
								/>
								<div class="w-full flex justify-between text-xs px-2">
									<span>Hostile</span>
									<span>Neutral</span>
									<span>Devoted</span>
								</div>
							</div>

							<div class="form-control">
								<label class="label">
									<span class="label-text">Trust Level: {editedCompanion.trust_level}%</span>
								</label>
								<input 
									type="range" 
									min="0" 
									max="100" 
									class="range range-info" 
									bind:value={editedCompanion.trust_level}
								/>
								<div class="w-full flex justify-between text-xs px-2">
									<span>Suspicious</span>
									<span>Cautious</span>
									<span>Trusting</span>
								</div>
							</div>

							<div class="form-control">
								<label class="label">
									<span class="label-text">Current Relationship Status</span>
								</label>
								<select class="select select-bordered" bind:value={editedCompanion.relationship_data.current_status}>
									<option value="stranger">Stranger</option>
									<option value="acquaintance">Acquaintance</option>
									<option value="friend">Friend</option>
									<option value="close_friend">Close Friend</option>
									<option value="companion">Companion</option>
									<option value="soulmate">Soulmate</option>
									<option value="rival">Rival</option>
									<option value="enemy">Enemy</option>
								</select>
							</div>
						</div>

					{:else if activeSection === 'advanced'}
						<div class="space-y-4">
							<h3 class="text-lg font-semibold mb-4">Advanced Settings</h3>
							
							<div class="form-control">
								<label class="label">
									<span class="label-text">Companion ID (readonly)</span>
								</label>
								<input 
									type="text" 
									class="input input-bordered" 
									value={editedCompanion.id}
									readonly
								/>
							</div>

							<div class="form-control">
								<label class="label">
									<span class="label-text">Created At (readonly)</span>
								</label>
								<input 
									type="text" 
									class="input input-bordered" 
									value={new Date(editedCompanion.created_at).toLocaleString()}
									readonly
								/>
							</div>

							<div class="form-control">
								<label class="label">
									<span class="label-text">Last Interaction (readonly)</span>
								</label>
								<input 
									type="text" 
									class="input input-bordered" 
									value={new Date(editedCompanion.last_interaction).toLocaleString()}
									readonly
								/>
							</div>

							<div class="alert alert-info">
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
								<div>
									<p class="text-sm">Memory and personality evolution data are managed automatically by the game engine and cannot be edited manually.</p>
								</div>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Footer -->
			<div class="flex items-center justify-end gap-4 p-6 border-t border-base-300">
				<button class="btn btn-ghost" onclick={handleClose}>
					Cancel
				</button>
				<button class="btn btn-primary" onclick={handleSave}>
					Save Changes
				</button>
			</div>
		</div>
	</div>
{/if}
