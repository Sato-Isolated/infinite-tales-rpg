<script lang="ts">
	import { onMount } from 'svelte';
	import { getCompanionManager } from '$lib/contexts/companionContext';
	import type { CompanionCharacter } from '$lib/types/companion';
	import CompanionEditModal from '$lib/components/interaction_modals/CompanionEditModal.svelte';
	import { useLocalStorage } from '$lib/state/useLocalStorage.svelte';
	import type { NPCState } from '$lib/ai/agents/characterStatsAgent';
	import type { LLMMessage } from '$lib/ai/llm';

	let companionManager = getCompanionManager();
	let companions = $state<CompanionCharacter[]>([]);
	let filteredCompanions = $state<CompanionCharacter[]>([]);
	let searchQuery = $state('');
	let filterStatus = $state<'all' | 'active' | 'inactive'>('all');
	let selectedCompanion = $state<CompanionCharacter | null>(null);
	let showEditModal = $state(false);
	let recurringNPCs = $state<Array<{name: string, appearances: number, lastSeen: string}>>([]);

	// Game data from localStorage
	const npcState = useLocalStorage<NPCState>('npcState', {});
	const historyMessagesState = useLocalStorage<LLMMessage[]>('historyMessagesState', []);

	// Charger les compagnons
	const loadCompanions = () => {
		companions = companionManager.getAllCompanions();
		filterCompanions();
	};

	// Analyser les NPCs récurrents dans l'histoire
	const analyzeRecurringNPCs = () => {
		const history = historyMessagesState.value;
		const npcAppearances: Record<string, {count: number, lastMessage: string}> = {};
		
		// Parcourir l'historique pour compter les mentions de NPCs
		history.forEach((message, index) => {
			Object.keys(npcState.value).forEach(npcId => {
				const npc = npcState.value[npcId];
				// Chercher le nom du NPC ou ses noms connus dans le message
				const npcNames = [npcId, ...(npc.known_names || [])];
				
				if (npcNames.some(name => 
					message.content.toLowerCase().includes(name.toLowerCase())
				)) {
					if (!npcAppearances[npcId]) {
						npcAppearances[npcId] = {count: 0, lastMessage: ''};
					}
					npcAppearances[npcId].count++;
					npcAppearances[npcId].lastMessage = message.content;
				}
			});
		});

		// Créer la liste des NPCs récurrents (apparaissant au moins 2 fois)
		recurringNPCs = Object.entries(npcAppearances)
			.filter(([_, data]) => data.count >= 2)
			.map(([npcId, data]) => ({
				name: npcId,
				appearances: data.count,
				lastSeen: data.lastMessage.substring(0, 100) + '...'
			}))
			.sort((a, b) => b.appearances - a.appearances);
	};

	// Convertir un NPC récurrent en compagnon simple
	const promoteToCompanion = (npcName: string) => {
		const npcData = npcState.value[npcName];
		if (!npcData) return;

		// Créer un compagnon simplifié basé sur l'NPC
		const companionId = crypto.randomUUID();
		const now = new Date().toISOString();

		const newCompanion: CompanionCharacter = {
			id: companionId,
			character_description: {
				name: npcName,
				class: npcData.class || 'Unknown',
				race: 'Unknown',
				gender: 'Unknown',
				appearance: `A ${npcData.class} who has accompanied you on your adventures`,
				alignment: 'Neutral',
				personality: `A ${npcData.class} with their own unique personality that has developed through your shared experiences.`,
				background: `Met during your adventures and became a recurring companion.`,
				motivation: `Continues to travel with you for reasons that have grown over time.`
			},
			character_stats: {
				level: npcData.level || 1,
				resources: {
					HP: { max_value: 30, start_value: 30, game_ends_when_zero: true },
					MP: { max_value: 20, start_value: 20, game_ends_when_zero: false }
				},
				attributes: {
					strength: 0, dexterity: 0, intelligence: 0, 
					wisdom: 0, constitution: 0, charisma: 0
				},
				skills: {},
				spells_and_abilities: npcData.spells_and_abilities || []
			},
			companion_memory: {
				significant_events: [],
				personality_influences: [],
				relationship_timeline: [{
					timestamp: now,
					event_type: 'first_meeting' as const,
					description: 'Promoted from recurring NPC to companion',
					impact_on_relationship: 20
				}],
				combat_experiences: [],
				dialogue_history: []
			},
			personality_evolution: {
				baseline_personality: `A ${npcData.class} companion`,
				current_personality_traits: [{
					trait_name: 'loyal',
					value: 60,
					last_changed: now,
					influenced_by: []
				}],
				evolution_history: [],
				stability_factor: 70
			},
			relationship_data: {
				initial_relationship: 'recurring_npc',
				current_status: 'acquaintance',
				relationship_milestones: [],
				shared_experiences: []
			},
			created_at: now,
			last_interaction: now,
			is_active_in_party: false,
			loyalty_level: 60,
			trust_level: 50
		};

		companionManager.createCompanion(newCompanion);
		loadCompanions();
		
		// Retirer le NPC de la liste récurrente
		recurringNPCs = recurringNPCs.filter(npc => npc.name !== npcName);
	};

	// Filtrer les compagnons
	const filterCompanions = () => {
		let filtered = [...companions];

		// Filtrer par nom
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(c => 
				c.character_description.name.toLowerCase().includes(query) ||
				c.character_description.class.toLowerCase().includes(query) ||
				c.character_description.race.toLowerCase().includes(query)
			);
		}

		// Filtrer par statut
		if (filterStatus === 'active') {
			filtered = filtered.filter(c => c.is_active_in_party);
		} else if (filterStatus === 'inactive') {
			filtered = filtered.filter(c => !c.is_active_in_party);
		}

		filteredCompanions = filtered;
	};

	// Reactivity pour les filtres
	$effect(() => {
		filterCompanions();
	});

	// Actions
	const handleToggleActive = (companion: CompanionCharacter) => {
		if (companion.is_active_in_party) {
			companionManager.removeFromActiveParty(companion.id);
		} else {
			companionManager.addToActiveParty(companion.id);
		}
		loadCompanions();
	};

	const handleEditCompanion = (companion: CompanionCharacter) => {
		selectedCompanion = companion;
		showEditModal = true;
	};

	const handleSaveCompanion = (updatedCompanion: CompanionCharacter) => {
		companionManager.updateCompanion(updatedCompanion.id, updatedCompanion);
		loadCompanions();
	};

	const handleDeleteCompanion = (companion: CompanionCharacter) => {
		if (confirm(`Are you sure you want to delete ${companion.character_description.name}? This action cannot be undone.`)) {
			companionManager.deleteCompanion(companion.id);
			loadCompanions();
		}
	};

	const handleCloseModal = () => {
		showEditModal = false;
		selectedCompanion = null;
	};

	// Helpers
	const getRelationshipColor = (status: string) => {
		const colors: Record<string, string> = {
			'enemy': 'badge-error',
			'rival': 'badge-warning',
			'stranger': 'badge-ghost',
			'acquaintance': 'badge-info',
			'friend': 'badge-success',
			'close_friend': 'badge-success',
			'companion': 'badge-primary',
			'soulmate': 'badge-secondary'
		};
		return colors[status] || 'badge-ghost';
	};

	const getLoyaltyColor = (level: number) => {
		if (level >= 80) return 'progress-success';
		if (level >= 60) return 'progress-info';
		if (level >= 40) return 'progress-warning';
		return 'progress-error';
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString();
	};

	// Stats générales
	const getStats = () => {
		const total = companions.length;
		const active = companions.filter(c => c.is_active_in_party).length;
		const avgLoyalty = total > 0 ? companions.reduce((sum, c) => sum + c.loyalty_level, 0) / total : 0;
		const avgTrust = total > 0 ? companions.reduce((sum, c) => sum + c.trust_level, 0) / total : 0;
		
		return { total, active, avgLoyalty, avgTrust };
	};

	// Vérifier s'il y a des NPCs et une partie en cours
	const hasGameData = () => {
		return Object.keys(npcState.value).length > 0 && historyMessagesState.value.length > 0;
	};

	onMount(() => {
		loadCompanions();
		if (hasGameData()) {
			analyzeRecurringNPCs();
		}
	});
</script>

<div class="container mx-auto p-4 space-y-6">
	<!-- Header avec stats -->
	<div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
		<div>
			<h1 class="text-3xl font-bold">Companions</h1>
			<p class="text-base-content/70">Your traveling companions and recurring NPCs from your adventures</p>
		</div>
		
		{#if companions.length > 0}
			{@const stats = getStats()}
			<div class="stats stats-vertical lg:stats-horizontal shadow">
				<div class="stat">
					<div class="stat-title">Total</div>
					<div class="stat-value text-primary">{stats.total}</div>
					<div class="stat-desc">companions</div>
				</div>
				<div class="stat">
					<div class="stat-title">Active</div>
					<div class="stat-value text-success">{stats.active}</div>
					<div class="stat-desc">in party</div>
				</div>
				<div class="stat">
					<div class="stat-title">Avg Loyalty</div>
					<div class="stat-value text-info">{Math.round(stats.avgLoyalty)}%</div>
				</div>
				<div class="stat">
					<div class="stat-title">Avg Trust</div>
					<div class="stat-value text-info">{Math.round(stats.avgTrust)}%</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- NPCs récurrents -->
	{#if recurringNPCs.length > 0}
		<div class="card bg-base-200 shadow-xl">
			<div class="card-body">
				<h2 class="card-title text-xl mb-4">
					🔄 Recurring NPCs
					<div class="badge badge-info">{recurringNPCs.length}</div>
				</h2>
				<p class="text-base-content/70 mb-4">
					These NPCs have appeared multiple times in your adventure. You can promote them to companions if you want to track their relationship with you.
				</p>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each recurringNPCs as npc (npc.name)}
						<div class="card bg-base-100 shadow">
							<div class="card-body p-4">
								<div class="flex items-center justify-between mb-2">
									<h3 class="card-title text-base">{npc.name}</h3>
									<div class="badge badge-secondary badge-sm">{npc.appearances}x</div>
								</div>
								<p class="text-xs text-base-content/60 mb-3">"{npc.lastSeen}"</p>
								<div class="card-actions justify-end">
									<button 
										class="btn btn-primary btn-sm"
										onclick={() => promoteToCompanion(npc.name)}
									>
										→ Companion
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	{#if companions.length === 0}
		<!-- État vide -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body text-center py-12">
				<div class="text-6xl mb-4">👥</div>
				<h2 class="card-title text-2xl justify-center mb-2">No Companions Yet</h2>
				<p class="text-base-content/70 mb-6">
					You haven't created any companions yet. Companions are created during character creation
					or promoted from recurring NPCs in your adventures.
				</p>
				<div class="card-actions justify-center gap-4">
					<a href="/game/new/companions" class="btn btn-primary">
						Create New Adventure
					</a>
				</div>
			</div>
		</div>
	{:else}
		<!-- Contrôles de filtrage -->
		<div class="card bg-base-100 shadow">
			<div class="card-body">
				<div class="flex flex-col sm:flex-row gap-4">
					<!-- Recherche -->
					<div class="form-control flex-1">
						<div class="input-group">
							<input
								type="text"
								placeholder="Search by name, class, or race..."
								class="input input-bordered flex-1"
								bind:value={searchQuery}
							/>
							<button class="btn btn-square btn-outline" aria-label="Search companions">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
								</svg>
							</button>
						</div>
					</div>

					<!-- Filtre par statut -->
					<div class="form-control">
						<select class="select select-bordered" bind:value={filterStatus}>
							<option value="all">All Companions</option>
							<option value="active">Active in Party</option>
							<option value="inactive">Not in Party</option>
						</select>
					</div>
				</div>
			</div>
		</div>

		<!-- Liste des compagnons -->
		<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
			{#each filteredCompanions as companion (companion.id)}
				<div class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
					<div class="card-body">
						<!-- Header avec nom et statut -->
						<div class="flex items-start justify-between mb-4">
							<div>
								<h2 class="card-title text-lg">
									{companion.character_description.name}
									{#if companion.is_active_in_party}
										<div class="badge badge-success badge-sm">Active</div>
									{/if}
								</h2>
								<p class="text-sm text-base-content/70">
									Level {companion.character_stats.level} {companion.character_description.race} {companion.character_description.class}
								</p>
							</div>
				<div class="dropdown dropdown-end">
					<button class="btn btn-ghost btn-circle btn-sm" tabindex="0" aria-label="Open companion actions menu">
									<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01" />
									</svg>
								</button>
								<ul class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52 z-10">
									<li><button onclick={() => handleEditCompanion(companion)}>✏️ Edit</button></li>
									<li><button onclick={() => handleToggleActive(companion)}>
										{companion.is_active_in_party ? '👥 Remove from Party' : '➕ Add to Party'}
									</button></li>
									<li><button onclick={() => handleDeleteCompanion(companion)} class="text-error">🗑️ Delete</button></li>
								</ul>
							</div>
						</div>

						<!-- Informations de base -->
						<div class="space-y-3">
							<!-- Relationship Status -->
							<div class="flex items-center justify-between">
								<span class="text-sm font-medium">Relationship:</span>
								<div class="badge {getRelationshipColor(companion.relationship_data.current_status)} badge-sm">
									{companion.relationship_data.current_status.replace('_', ' ')}
								</div>
							</div>

							<!-- Loyalty -->
							<div>
								<div class="flex justify-between text-sm mb-1">
									<span>Loyalty</span>
									<span>{companion.loyalty_level}%</span>
								</div>
								<progress
									class="progress progress-sm {getLoyaltyColor(companion.loyalty_level)}"
									value={companion.loyalty_level}
									max="100"
								></progress>
							</div>

							<!-- Trust -->
							<div>
								<div class="flex justify-between text-sm mb-1">
									<span>Trust</span>
									<span>{companion.trust_level}%</span>
								</div>
								<progress
									class="progress progress-sm {getLoyaltyColor(companion.trust_level)}"
									value={companion.trust_level}
									max="100"
								></progress>
							</div>

							<!-- Personality snippet -->
							{#if companion.character_description.personality}
								<div class="text-xs text-base-content/60 border-l-2 border-base-300 pl-2">
									{companion.character_description.personality.slice(0, 100)}{companion.character_description.personality.length > 100 ? '...' : ''}
								</div>
							{/if}

							<!-- Last interaction -->
							<div class="text-xs text-base-content/50">
								Last seen: {formatDate(companion.last_interaction)}
							</div>
						</div>

						<!-- Action buttons -->
						<div class="card-actions justify-end mt-4">
							<button
								class="btn btn-sm btn-outline"
								onclick={() => handleEditCompanion(companion)}
							>
								Edit
							</button>
							<button
								class="btn btn-sm {companion.is_active_in_party ? 'btn-warning' : 'btn-primary'}"
								onclick={() => handleToggleActive(companion)}
							>
								{companion.is_active_in_party ? 'Remove' : 'Add'}
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Message si aucun résultat après filtrage -->
		{#if filteredCompanions.length === 0}
			<div class="card bg-base-100 shadow">
				<div class="card-body text-center py-8">
					<div class="text-4xl mb-4">🔍</div>
					<h3 class="text-lg font-semibold mb-2">No companions found</h3>
					<p class="text-base-content/70">
						Try adjusting your search or filter criteria.
					</p>
				</div>
			</div>
		{/if}
	{/if}
</div>

<!-- Modal d'édition -->
{#if selectedCompanion && showEditModal}
	<CompanionEditModal
		companion={selectedCompanion}
		isOpen={showEditModal}
		onClose={handleCloseModal}
		onSave={handleSaveCompanion}
	/>
{/if}
