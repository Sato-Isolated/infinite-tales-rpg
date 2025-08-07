<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { getEntityCoordinator } from '$lib/services/entityCoordinator';
	import { getMemoryCoordinator } from '$lib/services/memoryCoordinator';
	import type { EntityConflict, EntityValidationResult } from '$lib/services/entityCoordinator';
	import type { MemoryValidationResult } from '$lib/services/memoryCoordinator';

	// État réactif du monitoring
	let coherenceState = {
		entityValidation: null as EntityValidationResult | null,
		memoryValidation: null as MemoryValidationResult | null,
		overallScore: 100,
		lastUpdate: new Date().toISOString(),
		autoRefresh: true,
		refreshInterval: 5000 // 5 secondes
	};

	let refreshTimer: NodeJS.Timeout | null = null;
	let isExpanded = false;
	let selectedConflictType = 'all';
	let showDetailedView = false;

	onMount(() => {
		refreshCoherenceData();
		
		if (coherenceState.autoRefresh) {
			startAutoRefresh();
		}
	});

	onDestroy(() => {
		stopAutoRefresh();
	});

	/**
	 * Actualise les données de cohérence
	 */
	async function refreshCoherenceData(): Promise<void> {
		try {
			const entityCoordinator = getEntityCoordinator();
			const memoryCoordinator = getMemoryCoordinator();

			// Validation des entités
			const entityValidation = entityCoordinator.detectAndResolveDuplicates();
			
			// Validation de la mémoire (si disponible)
			const memoryValidation = await memoryCoordinator.validateOverallCoherence();
			
			// Calculer le score global
			const overallScore = calculateOverallCoherenceScore(entityValidation, memoryValidation);
			
			coherenceState = {
				...coherenceState,
				entityValidation,
				memoryValidation,
				overallScore,
				lastUpdate: new Date().toISOString()
			};

			console.log('🔍 Coherence Monitor Updated:', {
				entityConflicts: entityValidation.conflicts.length,
				memoryConflicts: memoryValidation.conflicts_detected.length,
				overallScore
			});
		} catch (error) {
			console.error('❌ Error refreshing coherence data:', error);
		}
	}

	/**
	 * Calcule le score de cohérence global
	 */
	function calculateOverallCoherenceScore(
		entityValidation: EntityValidationResult,
		memoryValidation: MemoryValidationResult
	): number {
		let score = 100;
		
		// Pénalités pour les conflits d'entités
		entityValidation.conflicts.forEach(conflict => {
			switch (conflict.severity) {
				case 'critical': score -= 25; break;
				case 'high': score -= 15; break;
				case 'medium': score -= 8; break;
				case 'low': score -= 3; break;
			}
		});
		
		// Pénalités pour les conflits de mémoire
		memoryValidation.conflicts_detected.forEach(conflict => {
			switch (conflict.severity) {
				case 'critical': score -= 20; break;
				case 'high': score -= 12; break;
				case 'medium': score -= 6; break;
				case 'low': score -= 2; break;
			}
		});
		
		return Math.max(0, score);
	}

	/**
	 * Démarre l'actualisation automatique
	 */
	function startAutoRefresh(): void {
		stopAutoRefresh();
		refreshTimer = setInterval(refreshCoherenceData, coherenceState.refreshInterval);
	}

	/**
	 * Arrête l'actualisation automatique  
	 */
	function stopAutoRefresh(): void {
		if (refreshTimer) {
			clearInterval(refreshTimer);
			refreshTimer = null;
		}
	}

	/**
	 * Bascule l'actualisation automatique
	 */
	function toggleAutoRefresh(): void {
		coherenceState.autoRefresh = !coherenceState.autoRefresh;
		
		if (coherenceState.autoRefresh) {
			startAutoRefresh();
		} else {
			stopAutoRefresh();
		}
	}

	/**
	 * Résout automatiquement un conflit
	 */
	async function resolveConflict(conflict: EntityConflict): Promise<void> {
		try {
			const entityCoordinator = getEntityCoordinator();
			
			// Appliquer la résolution suggérée
			switch (conflict.type) {
				case 'name_duplicate':
					// Supprimer l'entité la moins importante
					const [entityId1, entityId2] = conflict.entities_involved;
					const entity1 = entityCoordinator.getEntity(entityId1);
					const entity2 = entityCoordinator.getEntity(entityId2);
					
					if (entity1 && entity2) {
						// Garder le joueur, ensuite les compagnons, puis les NPCs
						const priority1 = entity1.type === 'player' ? 3 : entity1.type === 'companion' ? 2 : 1;
						const priority2 = entity2.type === 'player' ? 3 : entity2.type === 'companion' ? 2 : 1;
						
						if (priority1 < priority2) {
							entityCoordinator.removeEntity(entityId1);
						} else {
							entityCoordinator.removeEntity(entityId2);
						}
					}
					break;
					
				case 'stat_inconsistency':
					// Synchroniser les stats avec les valeurs les plus récentes
					for (const entityId of conflict.entities_involved) {
						const entity = entityCoordinator.getEntity(entityId);
						if (entity) {
							// Valider et corriger les stats
							Object.entries(entity.resources).forEach(([key, resource]) => {
								if (resource.current_value > resource.max_value) {
									resource.current_value = resource.max_value;
								}
								if (resource.current_value < 0) {
									resource.current_value = 0;
								}
							});
						}
					}
					break;
			}
			
			// Actualiser après résolution
			await refreshCoherenceData();
			
		} catch (error) {
			console.error('❌ Error resolving conflict:', error);
		}
	}

	/**
	 * Obtient la couleur CSS pour le score
	 */
	function getScoreColor(score: number): string {
		if (score >= 90) return 'text-green-500';
		if (score >= 75) return 'text-yellow-500';
		if (score >= 50) return 'text-orange-500';
		return 'text-red-500';
	}

	/**
	 * Obtient l'icône pour le type de conflit
	 */
	function getConflictIcon(conflictType: string): string {
		switch (conflictType) {
			case 'name_duplicate': return '👥';
			case 'stat_inconsistency': return '📊';
			case 'memory_contradiction': return '🧠';
			case 'relationship_conflict': return '💔';
			case 'temporal_inconsistency': return '⏰';
			case 'character_contradiction': return '🎭';
			default: return '⚠️';
		}
	}

	/**
	 * Filtre les conflits selon le type sélectionné
	 */
	function getFilteredConflicts(): EntityConflict[] {
		if (!coherenceState.entityValidation) return [];
		
		const conflicts = coherenceState.entityValidation.conflicts;
		
		if (selectedConflictType === 'all') {
			return conflicts;
		}
		
		return conflicts.filter(conflict => conflict.type === selectedConflictType);
	}

	/**
	 * Formate la date de dernière mise à jour
	 */
	function formatLastUpdate(isoString: string): string {
		const date = new Date(isoString);
		const now = new Date();
		const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
		
		if (diffSeconds < 60) return `${diffSeconds}s ago`;
		if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
		if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
		return date.toLocaleDateString();
	}
</script>

<!-- Interface du Moniteur de Cohérence -->
<div class="coherence-monitor bg-base-100 border border-base-300 rounded-lg shadow-lg">
	<!-- En-tête du moniteur -->
	<div class="p-4 border-b border-base-300 cursor-pointer" on:click={() => isExpanded = !isExpanded}>
		<div class="flex items-center justify-between">
			<div class="flex items-center space-x-3">
				<div class="flex items-center space-x-2">
					<span class="text-2xl">🎯</span>
					<h3 class="text-lg font-semibold">Story Coherence Monitor</h3>
				</div>
				
				<!-- Score de cohérence -->
				<div class="flex items-center space-x-2">
					<span class="text-sm text-base-content/70">Score:</span>
					<span class={`text-xl font-bold ${getScoreColor(coherenceState.overallScore)}`}>
						{coherenceState.overallScore}%
					</span>
				</div>
			</div>
			
			<div class="flex items-center space-x-2">
				<!-- Indicateurs rapides -->
				<div class="flex space-x-1">
					{#if (coherenceState.entityValidation?.conflicts.length || 0) > 0}
						<div class="badge badge-error badge-sm">
							{coherenceState.entityValidation?.conflicts.length} conflicts
						</div>
					{/if}
					
					{#if (coherenceState.memoryValidation?.conflicts_detected.length || 0) > 0}
						<div class="badge badge-warning badge-sm">
							{coherenceState.memoryValidation?.conflicts_detected.length} memory issues
						</div>
					{/if}
				</div>
				
				<!-- Bouton d'expansion -->
				<button class="btn btn-ghost btn-sm">
					{isExpanded ? '▼' : '▶'}
				</button>
			</div>
		</div>
		
		<!-- Dernière mise à jour -->
		<div class="text-xs text-base-content/50 mt-1">
			Last update: {formatLastUpdate(coherenceState.lastUpdate)}
		</div>
	</div>
	
	<!-- Contenu détaillé (expandable) -->
	{#if isExpanded}
		<div class="p-4 space-y-4">
			<!-- Contrôles -->
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-4">
					<!-- Filtre par type de conflit -->
					<select bind:value={selectedConflictType} class="select select-bordered select-sm">
						<option value="all">All Conflicts</option>
						<option value="name_duplicate">Name Duplicates</option>
						<option value="stat_inconsistency">Stat Issues</option>
						<option value="memory_contradiction">Memory Issues</option>
						<option value="relationship_conflict">Relationship Conflicts</option>
					</select>
					
					<!-- Bouton de vue détaillée -->
					<button 
						class="btn btn-ghost btn-sm"
						on:click={() => showDetailedView = !showDetailedView}
					>
						{showDetailedView ? 'Simple View' : 'Detailed View'}
					</button>
				</div>
				
				<div class="flex items-center space-x-2">
					<!-- Auto-refresh toggle -->
					<label class="flex items-center space-x-2 cursor-pointer">
						<span class="text-sm">Auto-refresh:</span>
						<input 
							type="checkbox" 
							bind:checked={coherenceState.autoRefresh}
							on:change={toggleAutoRefresh}
							class="checkbox checkbox-sm"
						/>
					</label>
					
					<!-- Refresh manuel -->
					<button 
						class="btn btn-primary btn-sm"
						on:click={refreshCoherenceData}
					>
						🔄 Refresh
					</button>
				</div>
			</div>
			
			<!-- Liste des conflits d'entités -->
			{#if getFilteredConflicts().length > 0}
				<div class="space-y-2">
					<h4 class="font-semibold text-error">Entity Conflicts</h4>
					
					{#each getFilteredConflicts() as conflict}
						<div class="border border-base-300 rounded-lg p-3 bg-base-50">
							<div class="flex items-start justify-between">
								<div class="flex items-start space-x-3">
									<span class="text-2xl">{getConflictIcon(conflict.type)}</span>
									<div>
										<div class="flex items-center space-x-2">
											<span class="font-medium">{conflict.type.replace('_', ' ').toUpperCase()}</span>
											<div class="badge badge-{conflict.severity === 'critical' ? 'error' : conflict.severity === 'high' ? 'warning' : 'info'} badge-sm">
												{conflict.severity}
											</div>
										</div>
										
										<p class="text-sm text-base-content/70 mt-1">
											{conflict.description}
										</p>
										
										{#if showDetailedView}
											<div class="mt-2 text-xs bg-base-200 p-2 rounded">
												<strong>Suggested Resolution:</strong> {conflict.suggested_resolution}
											</div>
											
											<div class="mt-1 text-xs text-base-content/50">
												Entities: {conflict.entities_involved.join(', ')}
											</div>
										{/if}
									</div>
								</div>
								
								<!-- Actions de résolution -->
								<div class="flex space-x-1">
									<button 
										class="btn btn-success btn-xs"
										on:click={() => resolveConflict(conflict)}
									>
										✅ Auto-resolve
									</button>
									
									{#if showDetailedView}
										<button class="btn btn-ghost btn-xs">
											ℹ️ Details
										</button>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
			
			<!-- Conflits mémoire -->
			{#if coherenceState.memoryValidation?.conflicts_detected.length || 0 > 0}
				<div class="space-y-2">
					<h4 class="font-semibold text-warning">Memory Conflicts</h4>
					
					{#each coherenceState.memoryValidation?.conflicts_detected || [] as conflict}
						<div class="border border-warning/30 rounded-lg p-3 bg-warning/5">
							<div class="flex items-start space-x-3">
								<span class="text-2xl">🧠</span>
								<div>
									<div class="flex items-center space-x-2">
										<span class="font-medium">{conflict.conflict_type.replace('_', ' ').toUpperCase()}</span>
										<div class="badge badge-warning badge-sm">
											{conflict.severity}
										</div>
									</div>
									
									<p class="text-sm text-base-content/70 mt-1">
										{conflict.description}
									</p>
									
									{#if showDetailedView && conflict.conflicting_events}
										<div class="mt-2 text-xs bg-base-200 p-2 rounded">
											<strong>Conflicting Events:</strong>
											<ul class="list-disc list-inside mt-1">
												{#each conflict.conflicting_events as event}
													<li>Story {event.story_id}: {event.title}</li>
												{/each}
											</ul>
										</div>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
			
			<!-- État de cohérence positive -->
			{#if getFilteredConflicts().length === 0 && (coherenceState.memoryValidation?.conflicts_detected.length || 0) === 0}
				<div class="text-center py-8">
					<span class="text-6xl">✨</span>
					<h4 class="text-xl font-semibold text-success mt-2">Perfect Coherence!</h4>
					<p class="text-base-content/70">No conflicts detected in your story</p>
				</div>
			{/if}
			
			<!-- Statistiques détaillées -->
			{#if showDetailedView}
				<div class="divider"></div>
				<div class="grid grid-cols-2 gap-4 text-sm">
					<div class="stat">
						<div class="stat-title">Total Entities</div>
						<div class="stat-value text-sm">{getEntityCoordinator().getSystemStatus().total_entities}</div>
					</div>
					
					<div class="stat">
						<div class="stat-title">Memory Events</div>
						<div class="stat-value text-sm">{coherenceState.memoryValidation?.total_events || 0}</div>
					</div>
					
					<div class="stat">
						<div class="stat-title">Active Relationships</div>
						<div class="stat-value text-sm">{getEntityCoordinator().getSystemStatus().total_relationships}</div>
					</div>
					
					<div class="stat">
						<div class="stat-title">Coherence Validations</div>
						<div class="stat-value text-sm">{coherenceState.memoryValidation?.validation_depth || 0}</div>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.coherence-monitor {
		min-width: 300px;
		max-width: 800px;
	}
	
	.stat {
		@apply bg-base-200 rounded-lg p-2 text-center;
	}
	
	.stat-title {
		@apply text-xs text-base-content/60 font-medium;
	}
	
	.stat-value {
		@apply text-lg font-bold text-primary;
	}
</style>
