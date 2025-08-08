<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import LoadingIcon from '$lib/components/LoadingIcon.svelte';

	export let isOpen: boolean = false;
	export let onClose: () => void = () => {};
	export let availableNPCs: any[] = [];
	export let onRecruit: (npcId: string, npcName: string, approach: string) => Promise<any> = async () => {};

	const dispatch = createEventDispatcher();

	let isLoading = false;
	let selectedNPC: any = null;
	let selectedApproach = 'direct';
	let recruitmentResult: any = null;
	let showResult = false;

	const approaches = [
		{ value: 'direct', label: 'Direct Approach', description: 'Straightforward recruitment offer' },
		{ value: 'persuasive', label: 'Persuasive', description: 'Use logic and benefits to convince them' },
		{ value: 'emotional', label: 'Emotional', description: 'Appeal to shared experiences and bonds' },
		{ value: 'practical', label: 'Practical', description: 'Focus on mutual benefits and practical reasons' }
	];

	const handleClose = () => {
		selectedNPC = null;
		selectedApproach = 'direct';
		recruitmentResult = null;
		showResult = false;
		onClose();
	};

	const handleSelectNPC = (npc: any) => {
		selectedNPC = npc;
		showResult = false;
		recruitmentResult = null;
	};

	const handleRecruit = async () => {
		if (!selectedNPC) return;
		
		isLoading = true;
		try {
			recruitmentResult = await onRecruit(selectedNPC.technicalId, selectedNPC.name, selectedApproach);
			showResult = true;
		} catch (error) {
			recruitmentResult = {
				success: false,
				message: `Failed to recruit ${selectedNPC.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
			};
			showResult = true;
		} finally {
			isLoading = false;
		}
	};

	const handleBackToList = () => {
		selectedNPC = null;
		showResult = false;
		recruitmentResult = null;
	};
</script>

{#if isOpen}
	<div class="modal modal-open">
		<div class="modal-box w-11/12 max-w-4xl max-h-[90vh]">
			<!-- Header -->
			<div class="flex justify-between items-center mb-4">
				<h3 class="font-bold text-lg">NPC Recruitment</h3>
				<button class="btn btn-sm btn-circle btn-ghost" onclick={handleClose}>✕</button>
			</div>

			<!-- Content -->
			<div class="space-y-4">
				{#if showResult && recruitmentResult}
					<!-- Résultat du recrutement -->
					<div class="text-center py-6">
						<div class="text-6xl mb-4">
							{recruitmentResult.success ? '✅' : '❌'}
						</div>
						<h4 class="text-xl font-semibold mb-2">
							{recruitmentResult.success ? 'Recruitment Successful!' : 'Recruitment Failed'}
						</h4>
						<p class="text-base-content/70 mb-4">
							{recruitmentResult.message || recruitmentResult.reason}
						</p>
						
						{#if recruitmentResult.success}
							<div class="alert alert-success">
								<div>
									<h5 class="font-semibold">
										{selectedNPC.name} has joined your party!
									</h5>
									<p class="text-sm mt-1">
										They are now available as a permanent companion with full stats and personality.
									</p>
								</div>
							</div>
						{:else}
							<div class="alert alert-warning">
								<div>
									<h5 class="font-semibold">Better luck next time</h5>
									<p class="text-sm mt-1">
										{selectedNPC.name} isn't ready to join your adventure yet. Try interacting with them more or using a different approach.
									</p>
								</div>
							</div>
						{/if}
					</div>
				{:else if selectedNPC}
					<!-- Écran de recrutement -->
					<div class="space-y-6">
						<div class="card bg-base-200">
							<div class="card-body">
								<h4 class="card-title text-lg">Recruiting: {selectedNPC.name}</h4>
								<p class="text-sm text-base-content/70 mb-4">
									{selectedNPC.description || 'A character from your adventures'}
								</p>
								
								{#if selectedNPC.recruitmentReasons}
									<div class="space-y-2">
										<h5 class="font-semibold text-sm">Why they might join:</h5>
										<ul class="list-disc list-inside text-sm text-base-content/80 space-y-1">
											{#each selectedNPC.recruitmentReasons as reason}
												<li>{reason}</li>
											{/each}
										</ul>
									</div>
								{/if}
								
								{#if selectedNPC.recruitmentRisks}
									<div class="space-y-2">
										<h5 class="font-semibold text-sm text-warning">Potential challenges:</h5>
										<ul class="list-disc list-inside text-sm text-warning space-y-1">
											{#each selectedNPC.recruitmentRisks as risk}
												<li>{risk}</li>
											{/each}
										</ul>
									</div>
								{/if}
							</div>
						</div>

						<!-- Sélection de l'approche -->
						<fieldset class="form-control">
							<legend id="approach-label" class="label">
								<span class="label-text font-semibold">Choose your approach:</span>
							</legend>
							<div class="space-y-3" role="radiogroup" aria-labelledby="approach-label">
								{#each approaches as approach}
									<label class="cursor-pointer" for={`approach-${approach.value}`}>
										<div class="card bg-base-100 hover:bg-base-200 transition-colors">
											<div class="card-body p-4">
												<div class="flex items-center space-x-3">
													<input
														type="radio"
														name="approach"
														value={approach.value}
														id={`approach-${approach.value}`}
														bind:group={selectedApproach}
														class="radio radio-primary"
													/>
													<div class="flex-1">
														<div class="font-semibold">{approach.label}</div>
														<div class="text-sm text-base-content/70">{approach.description}</div>
													</div>
												</div>
											</div>
										</div>
									</label>
								{/each}
							</div>
						</fieldset>
					</div>
				{:else if availableNPCs.length > 0}
					<!-- Liste des NPCs disponibles -->
					<div class="space-y-4">
						<p class="text-sm text-base-content/70">
							Here are NPCs from your adventure that might be willing to join your party:
						</p>
						
						<div class="grid gap-4 max-h-96 overflow-y-auto">
							{#each availableNPCs as npc}
								<div class="card bg-base-100 hover:bg-base-200 cursor-pointer transition-colors" role="button" tabindex="0"
									 onclick={() => handleSelectNPC(npc)}
									 onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelectNPC(npc); } }}>
									<div class="card-body p-4">
										<div class="flex items-center justify-between">
											<div class="flex-1">
												<h5 class="font-semibold">{npc.name}</h5>
												<p class="text-sm text-base-content/70 mb-2">
													{npc.description || 'A character from your adventures'}
												</p>
												
												{#if npc.suitabilityScore !== undefined}
													<div class="flex items-center gap-2">
														<span class="text-xs">Recruitment chance:</span>
														<div class="badge badge-sm {npc.suitabilityScore >= 7 ? 'badge-success' : npc.suitabilityScore >= 4 ? 'badge-warning' : 'badge-error'}">
															{npc.suitabilityScore}/10
														</div>
													</div>
												{/if}
											</div>
											<button class="btn btn-primary btn-sm">
												Recruit →
											</button>
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{:else}
					<!-- Aucun NPC disponible -->
					<div class="text-center py-12">
						<div class="text-6xl mb-4">🤷</div>
						<h4 class="text-xl font-semibold mb-2">No NPCs Available</h4>
						<p class="text-base-content/70 mb-4">
							No suitable NPCs for recruitment were found in your current adventure. 
							Try interacting with more characters during your journey!
						</p>
						<div class="alert alert-info">
							<div>
								<h5 class="font-semibold">Tips for finding companions:</h5>
								<ul class="text-sm mt-2 text-left list-disc list-inside">
									<li>Engage in conversations with NPCs</li>
									<li>Help them with their problems</li>
									<li>Build positive relationships through your actions</li>
									<li>Look for NPCs with complementary skills</li>
								</ul>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="modal-action">
				{#if showResult}
					<button class="btn btn-primary" onclick={handleClose}>
						{recruitmentResult?.success ? 'Great!' : 'Close'}
					</button>
				{:else if selectedNPC}
					<button class="btn btn-ghost" onclick={handleBackToList}>
						← Back to List
					</button>
					<button class="btn btn-primary" onclick={handleRecruit} disabled={isLoading}>
						{#if isLoading}
							<LoadingIcon />
							Recruiting...
						{:else}
							Recruit {selectedNPC.name}
						{/if}
					</button>
				{:else}
					<button class="btn btn-primary" onclick={handleClose}>
						Close
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}
