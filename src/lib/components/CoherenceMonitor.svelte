<script lang="ts">
	import {
		getEntityCoordinator,
		type EntityValidationResult,
		type EntityConflict
	} from '$lib/services/entityCoordinator';
        import { getMemoryCoordinator } from '$lib/services/memoryCoordinator';
        import type { MemoryValidationResult } from '$lib/services/memoryCoordinator.types';
	import {
		getCoherenceMetricsService,
		type CoherenceMetrics,
		type CoherenceHistoryEntry,
		type CoherenceGuardrails
	} from '$lib/services/coherenceMetrics';

	// UI state
	let isExpanded = $state(false);
	let autoRefresh = $state(true);
	const refreshIntervalMs = 30000;

	let selectedConflictType = $state<'all' | string>('all');

	// Data state
	let lastUpdateISO = $state(new Date().toISOString());
	let overallScore = $state(100);
	let entityValidation = $state<EntityValidationResult | null>(null);
	let memoryValidation = $state<MemoryValidationResult | null>(null);
	let lastMetrics = $state<CoherenceMetrics | null>(null);
	let history = $state<CoherenceHistoryEntry[]>([]);
	let statistics = $state<{
		average_score: number;
		best_score: number;
		worst_score: number;
		total_actions: number;
		issues_resolved: number;
		trend_direction: 'improving' | 'stable' | 'degrading';
	} | null>(null);
	let guardrails = $state<CoherenceGuardrails | null>(null);

	// Helpers
	const formatLastUpdate = (iso: string): string => {
		const date = new Date(iso);
		const diff = Math.floor((Date.now() - date.getTime()) / 1000);
		if (diff < 60) return `${diff}s ago`;
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
		return date.toLocaleString();
	};

	const getScoreColor = (score: number): string =>
		score >= 90
			? 'text-green-500'
			: score >= 75
				? 'text-yellow-500'
				: score >= 50
					? 'text-orange-500'
					: 'text-red-500';

	const getRiskBadge = (risk?: 'low' | 'medium' | 'high' | 'critical'): string => {
		if (risk === 'low') return 'badge-success';
		if (risk === 'medium') return 'badge-warning';
		return 'badge-error'; // high or critical
	};

	const getTrendGlyph = (m: CoherenceMetrics | null | undefined): string =>
		m?.trends.improving ? '↑' : m?.trends.degrading ? '↓' : '→';

	// Toggle header handlers for accessibility
	const handleToggle = (): void => {
		isExpanded = !isExpanded;
	};

	const handleHeaderKeyDown = (e: KeyboardEvent): void => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleToggle();
		}
	};

	const getConflictIcon = (t: string): string =>
		(
			({
				name_duplicate: '👥',
				stat_inconsistency: '📊',
				memory_contradiction: '🧠',
				relationship_conflict: '💔',
				temporal_inconsistency: '⏰',
				character_contradiction: '🎭'
			}) as Record<string, string>
		)[t] || '⚠️';

	const getFilteredConflicts = (): EntityConflict[] => {
		const conflicts = entityValidation?.conflicts || [];
		if (selectedConflictType === 'all') return conflicts;
		return conflicts.filter((c) => c.type === selectedConflictType);
	};

	// Core refresh
	const handleRefresh = async (): Promise<void> => {
		try {
			const entityC = getEntityCoordinator();
			const memoryC = getMemoryCoordinator();
			const metricsService = getCoherenceMetricsService();

			const eVal = entityC.detectAndResolveDuplicates();
			const mVal = await memoryC.validateOverallCoherence();

			const metrics = metricsService.calculateDetailedMetrics(
				eVal,
				mVal,
				statistics?.total_actions || 0,
				'UI Refresh'
			);

			const insights = metricsService.generatePredictiveInsights(eVal, mVal);
			if (metricsService.shouldApplyGuardrails(metrics)) {
				metricsService.buildGuardrailsInstructions(eVal, mVal, metrics, insights);
			}

			// Update state
			entityValidation = eVal;
			memoryValidation = mVal;
			lastMetrics = metrics;
			overallScore = metrics.overall_score;
			history = metricsService.getRecentMetrics(8);
			statistics = metricsService.getOverallStatistics();
			guardrails = metricsService.getLastGuardrails();
			lastUpdateISO = new Date().toISOString();
		} catch (err) {
			console.error('❌ Coherence UI refresh failed:', err);
		}
	};

	// Initial refresh
	$effect(() => {
		handleRefresh();
	});

	// Auto-refresh lifecycle with cleanup
	$effect(() => {
		if (!autoRefresh) return;
		const id = setInterval(handleRefresh, refreshIntervalMs);
		return () => clearInterval(id);
	});

	// Conflict resolution
	const resolveConflict = async (conflict: EntityConflict): Promise<void> => {
		try {
			const entityCoordinator = getEntityCoordinator();
			switch (conflict.type) {
				case 'name_duplicate': {
					const [a, b] = conflict.entities_involved;
					const e1 = entityCoordinator.getEntity(a);
					const e2 = entityCoordinator.getEntity(b);
					if (e1 && e2) {
						const p1 = e1.type === 'player' ? 3 : e1.type === 'companion' ? 2 : 1;
						const p2 = e2.type === 'player' ? 3 : e2.type === 'companion' ? 2 : 1;
						entityCoordinator.removeEntity(p1 < p2 ? a : b);
					}
					break;
				}
				case 'stat_inconsistency': {
					for (const id of conflict.entities_involved) {
						const ent = entityCoordinator.getEntity(id);
						if (ent) {
							Object.values(ent.resources as any).forEach((res: any) => {
								if (res.current_value > res.max_value) res.current_value = res.max_value;
								if (res.current_value < 0) res.current_value = 0;
							});
						}
					}
					break;
				}
			}
			await handleRefresh();
		} catch (e) {
			console.error('❌ Error resolving conflict:', e);
		}
	};
</script>

<div class="rounded-lg border border-base-300 bg-base-100 shadow-lg">
	<div
		class="hover:bg-base-50 w-full cursor-pointer border-b border-base-300 p-4 text-left"
		onclick={handleToggle}
		onkeydown={handleHeaderKeyDown}
		role="button"
		tabindex="0"
		aria-expanded={isExpanded}
		aria-label="Toggle coherence monitor details"
	>
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<span class="text-2xl">🎯</span>
				<div>
					<h3 class="text-lg font-semibold">Story Coherence Monitor</h3>
					<div class="mt-1 text-xs text-base-content/50">
						Last update: {formatLastUpdate(lastUpdateISO)}
					</div>
				</div>
				<div class="ml-4 flex items-center gap-2">
					<span class="text-sm text-base-content/70">Score</span>
					<span class={`text-xl font-bold ${getScoreColor(overallScore)}`}>
						{overallScore}% {getTrendGlyph(lastMetrics)}
					</span>
					{#if lastMetrics}
						<div
							class={`badge badge-sm ${getRiskBadge(lastMetrics.quality_indicators?.risk_level)}`}
						>
							{lastMetrics.quality_indicators?.risk_level} risk
						</div>
					{/if}
				</div>
			</div>
			<div class="flex items-center gap-2">
				<label class="flex cursor-pointer items-center gap-2 text-sm">
					<span>Auto-refresh</span>
					<input
						type="checkbox"
						checked={autoRefresh}
						onchange={(e) => { e.stopPropagation(); autoRefresh = !autoRefresh; }}
						class="checkbox checkbox-sm"
					/>
				</label>
				<button
					class="btn btn-primary btn-sm"
					onclick={(e) => { e.stopPropagation(); handleRefresh(); }}
					aria-label="Refresh coherence data"
				>
					🔄 Refresh
				</button>
				<span class="text-sm">{isExpanded ? '▼' : '▶'}</span>
			</div>
		</div>
	</div>

	{#if isExpanded}
		<div class="space-y-6 p-4">
			{#if guardrails}
				<div class="rounded-lg border border-warning/30 bg-warning/10 p-4">
					<div class="flex items-center justify-between">
						<div class="font-semibold">Coherence Guardrails</div>
						<div class="badge badge-outline">{guardrails.summary}</div>
					</div>
					<pre class="mt-2 whitespace-pre-wrap text-sm leading-snug">
						{guardrails.instruction_block}
					</pre>
					<div class="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
						{#if guardrails.top_conflicts?.length}
							<div>
								<div class="text-sm font-semibold">Top conflicts</div>
								<ul class="mt-1 list-disc pl-5 text-sm">
									{#each guardrails.top_conflicts as c}
										<li>{c}</li>
									{/each}
								</ul>
							</div>
						{/if}
						{#if guardrails.suggestions?.length}
							<div>
								<div class="text-sm font-semibold">Suggestions</div>
								<ul class="mt-1 list-disc pl-5 text-sm">
									{#each guardrails.suggestions as s}
										<li>{s}</li>
									{/each}
								</ul>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			{#if lastMetrics}
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div class="rounded-lg border border-base-300 p-4">
						<div class="mb-3 font-semibold">Category Scores</div>
						<div class="space-y-2 text-sm">
							{#each Object.entries(lastMetrics.category_scores) as [k, v]}
								<div>
									<div class="flex justify-between">
										<span class="capitalize">{k}</span>
										<span class="font-semibold">{v as number}%</span>
									</div>
									<progress class="progress progress-primary w-full" value={Number(v)} max="100"
									></progress>
								</div>
							{/each}
						</div>
					</div>
					<div class="rounded-lg border border-base-300 p-4">
						<div class="mb-3 font-semibold">Quality Indicators</div>
						<div class="flex flex-wrap gap-2">
							<div class="badge badge-outline">
								consistency: {lastMetrics.quality_indicators.consistency_level}
							</div>
							<div class={`badge ${getRiskBadge(lastMetrics.quality_indicators.risk_level)}`}>
								risk: {lastMetrics.quality_indicators.risk_level}
							</div>
							<div class="badge badge-outline">
								player exp: {lastMetrics.quality_indicators.player_experience}
							</div>
						</div>
						<div class="mt-3 text-xs text-base-content/70">
							Action #{lastMetrics.action_index} ·
							{new Date(lastMetrics.timestamp).toLocaleString()}
						</div>
					</div>
				</div>
			{/if}

			<div class="rounded-lg border border-base-300 p-4">
				<div class="mb-3 flex items-center justify-between">
					<div class="font-semibold">Recent Metrics</div>
					{#if statistics}
						<div class="text-sm text-base-content/70">
							Avg {statistics.average_score}% · Best {statistics.best_score}% · Worst
							{statistics.worst_score}% · {statistics.total_actions} actions ·
							{statistics.trend_direction}
						</div>
					{/if}
				</div>
				<div class="overflow-x-auto">
					<table class="table table-zebra text-sm">
						<thead>
							<tr>
								<th>Idx</th>
								<th>Score</th>
								<th>Trend</th>
								<th>Consistency</th>
								<th>Risk</th>
								<th>Timestamp</th>
							</tr>
						</thead>
						<tbody>
							{#each history as h}
								<tr>
									<td>{h.metrics.action_index}</td>
									<td class={`font-semibold ${getScoreColor(h.metrics.overall_score)}`}>
										{h.metrics.overall_score}%
									</td>
									<td>
										{h.metrics.trends.improving ? '↑' : h.metrics.trends.degrading ? '↓' : '→'}
									</td>
									<td>{h.metrics.quality_indicators.consistency_level}</td>
									<td>
										<span
											class={`badge badge-xs ${getRiskBadge(h.metrics.quality_indicators.risk_level)}`}
										>
											{h.metrics.quality_indicators.risk_level}
										</span>
									</td>
									<td>{new Date(h.metrics.timestamp).toLocaleTimeString()}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			<!-- Memory conflicts -->
			{#if (memoryValidation?.conflicts_detected.length || 0) > 0}
				<div class="rounded-lg border border-warning/30 bg-warning/5 p-4">
					<div class="mb-2 font-semibold">Memory Conflicts</div>
					<div class="space-y-2">
						{#each memoryValidation?.conflicts_detected || [] as conflict}
							<div class="rounded-lg border border-warning/30 bg-warning/10 p-3">
								<div class="flex items-start gap-3">
									<span class="text-2xl">🧠</span>
									<div>
										<div class="flex items-center gap-2">
											<span class="font-medium capitalize">
												{conflict.conflict_type.replace('_', ' ')}
											</span>
											<div class="badge badge-warning badge-sm">{conflict.severity}</div>
										</div>
										<p class="mt-1 text-sm text-base-content/70">
											{conflict.description}
										</p>
										{#if conflict.conflicting_events?.length}
											<div class="mt-2 rounded bg-base-200 p-2 text-xs">
												<strong>Conflicting Events:</strong>
												<ul class="mt-1 list-inside list-disc">
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
				</div>
			{/if}

			<!-- Entity conflicts -->
			<div class="rounded-lg border border-base-300 p-4">
				<div class="mb-3 flex items-center justify-between">
					<div class="font-semibold">Entity Conflicts</div>
					<select
						class="select select-bordered select-sm"
						bind:value={selectedConflictType}
						aria-label="Filter conflicts by type"
					>
						<option value="all">All</option>
						<option value="name_duplicate">Name Duplicates</option>
						<option value="stat_inconsistency">Stat Issues</option>
						<option value="memory_contradiction">Memory Issues</option>
						<option value="relationship_conflict">Relationship Conflicts</option>
					</select>
				</div>
				{#if getFilteredConflicts().length > 0}
					<div class="grid grid-cols-1 gap-2">
						{#each getFilteredConflicts() as conflict}
							<div class="rounded-lg border border-base-300 p-3">
								<div class="flex items-start justify-between">
									<div class="flex items-start gap-3">
										<span class="text-2xl">{getConflictIcon(conflict.type)}</span>
										<div>
											<div class="font-medium capitalize">
												{conflict.type.replace('_', ' ')}
											</div>
											<div class="text-sm text-base-content/70">
												{conflict.description}
											</div>
											<div class="mt-1 text-xs text-base-content/60">
												Severity:
												<span class="badge badge-outline badge-xs">
													{conflict.severity}
												</span>
											</div>
										</div>
									</div>
									<div class="flex items-center gap-2">
										<button
											class="btn btn-outline btn-sm"
											onclick={() => resolveConflict(conflict)}
											aria-label="Resolve conflict"
										>
											Resolve
										</button>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="text-sm text-base-content/60">No conflicts 🎉</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
