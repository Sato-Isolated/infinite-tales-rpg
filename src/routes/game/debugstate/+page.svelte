<script lang="ts">
	import { initialThoughtsState, stringifyPretty, type ThoughtsState } from '$lib/util.svelte';
	import { useLocalStorage } from '$lib/state/useLocalStorage.svelte';

	const gameActionsState = useLocalStorage<any[]>('gameActionsState', []);
	const npcState = useLocalStorage('npcState', {});
	const characterActionsState = useLocalStorage('characterActionsState', {});
	let thoughtsState = useLocalStorage<ThoughtsState>('thoughtsState', initialThoughtsState);

	// Additional state for enhanced debugging
	const characterState = useLocalStorage('characterState', {});
	const characterStatsState = useLocalStorage('characterStatsState', {});
	const storyState = useLocalStorage('storyState', {});
	const campaignState = useLocalStorage('campaignState', {});
	const inventoryState = useLocalStorage('inventoryState', {});
	const gameSettingsState = useLocalStorage('gameSettingsState', {});
	const aiConfigState = useLocalStorage('aiConfigState', {});

	let searchFilter = $state('');
	let selectedCategory = $state('all');

	const categories = [
		{ id: 'all', name: 'All States', icon: '🔍' },
		{ id: 'character', name: 'Character', icon: '👤' },
		{ id: 'game', name: 'Game Progress', icon: '🎮' },
		{ id: 'ai', name: 'AI & Thoughts', icon: '🤖' },
		{ id: 'settings', name: 'Settings', icon: '⚙️' }
	];

	interface StateItem {
		id: string;
		category: string;
		title: string;
		data: any;
		icon: string;
		isText?: boolean;
	}

	const stateItems = $derived.by((): StateItem[] => {
		const items: StateItem[] = [
			{
				id: 'character',
				category: 'character',
				title: 'Character State',
				data: characterState.value,
				icon: '👤'
			},
			{
				id: 'characterStats',
				category: 'character',
				title: 'Character Stats',
				data: characterStatsState.value,
				icon: '📊'
			},
			{
				id: 'inventory',
				category: 'character',
				title: 'Inventory',
				data: inventoryState.value,
				icon: '🎒'
			},
			{ id: 'story', category: 'game', title: 'Story State', data: storyState.value, icon: '📖' },
			{
				id: 'campaign',
				category: 'game',
				title: 'Campaign',
				data: campaignState.value,
				icon: '🗺️'
			},
			{
				id: 'gameActions',
				category: 'game',
				title: 'Game Actions',
				data: gameActionsState.value
					? gameActionsState.value[gameActionsState.value.length - 1]
					: {},
				icon: '⚡'
			},
			{ id: 'npc', category: 'game', title: 'NPC State', data: npcState.value, icon: '👥' },
			{
				id: 'characterActions',
				category: 'game',
				title: 'Character Actions',
				data: characterActionsState.value,
				icon: '🎯'
			},
			{
				id: 'storyThoughts',
				category: 'ai',
				title: 'Story Thoughts',
				data: thoughtsState.value.storyThoughts,
				icon: '💭',
				isText: true
			},
			{
				id: 'actionThoughts',
				category: 'ai',
				title: 'Action Thoughts',
				data: thoughtsState.value.actionsThoughts,
				icon: '🤔',
				isText: true
			},
			{
				id: 'eventThoughts',
				category: 'ai',
				title: 'Event Thoughts',
				data: thoughtsState.value.eventThoughts,
				icon: '🌟',
				isText: true
			},
			{
				id: 'gameSettings',
				category: 'settings',
				title: 'Game Settings',
				data: gameSettingsState.value,
				icon: '⚙️'
			},
			{
				id: 'aiConfig',
				category: 'settings',
				title: 'AI Configuration',
				data: aiConfigState.value,
				icon: '🤖'
			}
		];

		return items.filter((item) => {
			const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
			const matchesSearch =
				searchFilter === '' ||
				item.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
				JSON.stringify(item.data).toLowerCase().includes(searchFilter.toLowerCase());
			return matchesCategory && matchesSearch;
		});
	});

	function exportAllStates() {
		const allStates = {
			timestamp: new Date().toISOString(),
			characterState: characterState.value,
			characterStatsState: characterStatsState.value,
			storyState: storyState.value,
			campaignState: campaignState.value,
			inventoryState: inventoryState.value,
			gameActionsState: gameActionsState.value,
			npcState: npcState.value,
			characterActionsState: characterActionsState.value,
			thoughtsState: thoughtsState.value,
			gameSettingsState: gameSettingsState.value,
			aiConfigState: aiConfigState.value
		};

		const blob = new Blob([stringifyPretty(allStates)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `debug-state-${new Date().toISOString().split('T')[0]}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function copyToClipboard(data: any) {
		navigator.clipboard.writeText(stringifyPretty(data));
	}
</script>

<!-- Debug State Dashboard -->
<div class="container mx-auto max-w-7xl p-6">
	<!-- Hero Header -->
	<div
		class="hero from-primary/20 via-secondary/10 to-accent/20 mb-8 rounded-2xl bg-gradient-to-br shadow-xl"
	>
		<div class="hero-content py-12 text-center">
			<div class="max-w-md">
				<div class="mb-4 text-6xl">🔧</div>
				<h1
					class="from-primary to-secondary bg-gradient-to-r bg-clip-text text-4xl font-bold text-transparent"
				>
					Debug Dashboard
				</h1>
				<p class="py-4 text-lg opacity-80">Comprehensive view of all game states and AI thoughts</p>
				<button class="btn btn-primary btn-lg gap-2" onclick={exportAllStates}>
					<span class="text-lg">💾</span>
					Export All States
				</button>
			</div>
		</div>
	</div>

	<!-- Search and Filter Controls -->
	<div class="card bg-base-100 mb-8 shadow-xl">
		<div class="card-body">
			<div class="flex flex-col items-center gap-4 lg:flex-row">
				<!-- Search Input -->
				<div class="form-control flex-1">
					<div class="input-group">
						<span class="bg-base-200">🔍</span>
						<input
							type="text"
							placeholder="Search states, properties, or values..."
							class="input input-bordered flex-1"
							bind:value={searchFilter}
						/>
						{#if searchFilter}
							<button class="btn btn-square btn-outline" onclick={() => (searchFilter = '')}>
								✕
							</button>
						{/if}
					</div>
				</div>

				<!-- Category Filter -->
				<div class="form-control">
					<select class="select select-bordered min-w-48" bind:value={selectedCategory}>
						{#each categories as category}
							<option value={category.id}>
								{category.icon}
								{category.name}
							</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- Results Count -->
			<div class="mt-2 text-sm opacity-70">
				Showing {stateItems.length} state{stateItems.length !== 1 ? 's' : ''}
				{#if searchFilter}for "{searchFilter}"{/if}
			</div>
		</div>
	</div>

	<!-- State Items Grid -->
	<div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
		{#each stateItems as item}
			<div class="card bg-base-100 shadow-xl transition-all duration-300 hover:shadow-2xl">
				<div class="card-body">
					<!-- Card Header -->
					<div class="mb-4 flex items-center justify-between">
						<div class="flex items-center gap-3">
							<div class="text-2xl">{item.icon}</div>
							<div>
								<h3 class="card-title text-lg">{item.title}</h3>
								<div class="badge badge-sm badge-outline capitalize">{item.category}</div>
							</div>
						</div>
						<button
							class="btn btn-sm btn-ghost btn-square"
							onclick={() => copyToClipboard(item.data)}
							title="Copy to clipboard"
						>
							📋
						</button>
					</div>

					<!-- Card Content -->
					<div class="collapse-arrow bg-base-200 collapse rounded-lg">
						<input type="checkbox" class="peer" />
						<div class="collapse-title flex items-center gap-2 font-medium">
							<span class="text-sm opacity-70">Click to expand</span>
							{#if typeof item.data === 'object' && item.data !== null}
								<div class="badge badge-xs badge-info">
									{Object.keys(item.data).length} properties
								</div>
							{:else if typeof item.data === 'string'}
								<div class="badge badge-xs badge-success">
									{item.data.length} characters
								</div>
							{/if}
						</div>
						<div class="collapse-content">
							<div class="divider my-2"></div>
							{#if item.isText && typeof item.data === 'string'}
								<div class="prose prose-sm max-w-none">
									<pre
										class="bg-base-300 max-h-96 overflow-auto rounded-lg p-4 text-sm whitespace-pre-wrap">{item.data ||
											'No data available'}</pre>
								</div>
							{:else}
								<pre
									class="bg-base-300 max-h-96 overflow-auto rounded-lg p-4 text-xs whitespace-pre-wrap">{stringifyPretty(
										item.data
									)}</pre>
							{/if}
						</div>
					</div>

					<!-- Quick Stats -->
					{#if typeof item.data === 'object' && item.data !== null && !item.isText}
						<div class="mt-4 flex flex-wrap gap-2">
							{#if Array.isArray(item.data)}
								<div class="badge badge-primary badge-sm">Array ({item.data.length} items)</div>
							{:else}
								<div class="badge badge-secondary badge-sm">
									Object ({Object.keys(item.data).length} props)
								</div>
							{/if}

							{#if JSON.stringify(item.data).length > 1000}
								<div class="badge badge-warning badge-sm">Large data</div>
							{/if}

							{#if Object.keys(item.data).length === 0}
								<div class="badge badge-ghost badge-sm">Empty</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<!-- Empty State -->
	{#if stateItems.length === 0}
		<div class="hero bg-base-200 rounded-2xl">
			<div class="hero-content text-center">
				<div class="max-w-md">
					<div class="mb-4 text-6xl">🔍</div>
					<h3 class="text-2xl font-bold">No states found</h3>
					<p class="py-4">
						{#if searchFilter}
							No states match your search for "{searchFilter}".
						{:else}
							Try adjusting your category filter.
						{/if}
					</p>
					{#if searchFilter}
						<button class="btn btn-primary" onclick={() => (searchFilter = '')}>
							Clear Search
						</button>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Developer Tools -->
	<div class="card from-info/10 to-success/10 mt-8 bg-gradient-to-r shadow-xl">
		<div class="card-body">
			<h3 class="card-title">
				<span class="text-2xl">🛠️</span>
				Developer Tools
			</h3>
			<p class="mb-4 text-sm opacity-70">Quick actions for debugging and state management</p>
			<div class="flex flex-wrap gap-3">
				<button class="btn btn-info btn-sm gap-2" onclick={() => window.location.reload()}>
					🔄 Reload Page
				</button>
				<button
					class="btn btn-warning btn-sm gap-2"
					onclick={() => {
						if (confirm('This will clear all localStorage data. Are you sure?')) {
							localStorage.clear();
							window.location.reload();
						}
					}}
				>
					🗑️ Clear All Data
				</button>
				<button
					class="btn btn-success btn-sm gap-2"
					onclick={() =>
						console.log('All states logged to console', {
							characterState: characterState.value,
							characterStatsState: characterStatsState.value,
							storyState: storyState.value,
							campaignState: campaignState.value,
							thoughtsState: thoughtsState.value
						})}
				>
					📝 Log to Console
				</button>
			</div>
		</div>
	</div>
</div>
