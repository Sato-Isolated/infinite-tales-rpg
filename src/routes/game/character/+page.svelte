<script lang="ts">
	import { useHybridLocalStorage } from '$lib/state/hybrid/useHybridLocalStorage.svelte';
	import AIGeneratedImage from '$lib/components/ui/media/AIGeneratedImage.svelte';
	import type { CharacterStats, SkillsProgression } from '$lib/ai/agents/characterStatsAgent.ts';
	import type { CharacterDescription } from '$lib/ai/agents/characterAgent';
	import type { Story } from '$lib/ai/agents/storyAgent';
	import type { AIConfig } from '$lib';
	import type {
		PlayerCharactersGameState,
		PlayerCharactersIdToNamesMap
	} from '$lib/ai/agents/gameAgent';
	import { getRequiredSkillProgression } from '$lib/game/logic/characterLogic';
	import { getCurrentCharacterGameState } from '$lib/game/state/gameStateUtils';

	const characterState = useHybridLocalStorage<CharacterDescription>('characterState');
	const characterStatsState = useHybridLocalStorage<CharacterStats>('characterStatsState');
	const skillsProgressionState = useHybridLocalStorage<SkillsProgression>('skillsProgressionState');
	const storyState = useHybridLocalStorage<Story>('storyState');
	const aiConfigState = useHybridLocalStorage<AIConfig>('aiConfigState');
	const playerCharactersGameState = useHybridLocalStorage<PlayerCharactersGameState>(
		'playerCharactersGameState',
		{}
	);
	const playerCharactersIdToNamesMapState = useHybridLocalStorage<PlayerCharactersIdToNamesMap>(
		'playerCharactersIdToNamesMapState',
		{}
	);

	let activeTab = $state('overview');

	// Calculate skill data for progression
	const skillsData = $derived(() => {
		const skills = characterStatsState.value?.skills || {};
		const progression = skillsProgressionState.value || {};

		return Object.entries(skills).map(([skillName, skillValue]) => {
			const current = progression[skillName] || 0;
			const required = getRequiredSkillProgression(skillName, characterStatsState.value || {}) || 1;
			const percentage = Math.min((current / required) * 100, 100);

			return {
				name: skillName.replace(/_/g, ' '),
				value: skillValue,
				current,
				required,
				percentage
			};
		});
	});

	// Calculate attributes data
	const attributesData = $derived(() => {
		const attributes = characterStatsState.value?.attributes || {};
		const maxValue = Math.max(...Object.values(attributes), 1);

		return Object.entries(attributes).map(([name, value]) => ({
			name: name.replace(/_/g, ' '),
			value,
			percentage: (value / maxValue) * 100,
			icon: getAttributeIcon(name)
		}));
	});

	// Get resources data with current values
	const resourcesData = $derived(() => {
		const currentCharacterGameState = getCurrentCharacterGameState(
			playerCharactersGameState.value,
			playerCharactersIdToNamesMapState.value,
			characterState.value?.name || ''
		);

		if (!currentCharacterGameState) return [];

		return Object.entries(currentCharacterGameState).map(([key, resource]) => ({
			name: key.replace(/_/g, ' '),
			current: resource.current_value || 0,
			max: resource.max_value || 0,
			percentage: resource.max_value ? (resource.current_value / resource.max_value) * 100 : 0,
			icon: getResourceIcon(key)
		}));
	});

	// Calculate average skill progress
	const averageSkillProgress = $derived(() => {
		const skills = skillsData();
		if (skills.length === 0) return 0;
		const totalProgress = skills.reduce((sum, skill) => sum + skill.percentage, 0);
		return Math.round(totalProgress / skills.length);
	});

	function getAttributeIcon(attribute: string): string {
		const icons: Record<string, string> = {
			strength: '💪',
			dexterity: '🎯',
			constitution: '🛡️',
			intelligence: '🧠',
			wisdom: '👁️',
			charisma: '✨',
			default: '⚡'
		};
		return icons[attribute.toLowerCase()] || icons.default;
	}

	function getResourceIcon(resource: string): string {
		const icons: Record<string, string> = {
			health: '❤️',
			mana: '💙',
			stamina: '💚',
			energy: '⚡',
			default: '🔹'
		};
		return icons[resource.toLowerCase()] || icons.default;
	}
</script>

{#if characterState.value && characterStatsState.value}
	<div class="drawer lg:drawer-open">
		<!-- Mobile drawer toggle -->
		<input id="character-drawer" type="checkbox" class="drawer-toggle" />

		<!-- Sidebar drawer -->
		<div class="drawer-side">
			<label for="character-drawer" class="drawer-overlay" aria-label="close sidebar"></label>
			<aside class="bg-base-200 text-base-content min-h-full w-72 p-4">
				<!-- Character image -->
				<div class="mb-6">
					<div class="avatar">
						<div class="mx-auto w-24 rounded-full">
							{#if storyState.value?.general_image_prompt}
								<AIGeneratedImage
									imagePrompt={storyState.value.general_image_prompt}
									imageClassesString="w-full h-full object-cover"
									showGenerateButton={false}
								/>
							{:else}
								<div class="bg-primary/20 flex h-full w-full items-center justify-center">
									<span class="text-4xl">🧙‍♂️</span>
								</div>
							{/if}
						</div>
					</div>
					<h2 class="mt-4 text-center text-xl font-bold">{characterState.value.name}</h2>
					<p class="text-center text-sm opacity-70">
						{characterState.value.race}
						{characterState.value.class}
					</p>
				</div>

				<!-- Quick Stats -->
				<div class="mb-6 space-y-3">
					<h3 class="text-sm font-semibold tracking-wide uppercase opacity-70">Quick Stats</h3>
					{#each resourcesData().slice(0, 4) as resource}
						<div class="bg-base-100 flex items-center justify-between rounded p-2">
							<div class="flex items-center gap-2">
								<span>{resource.icon}</span>
								<span class="text-sm capitalize">{resource.name}</span>
							</div>
							<span class="font-mono text-sm">{resource.current}/{resource.max}</span>
						</div>
					{/each}
				</div>

				<!-- Navigation -->
				<div class="space-y-3">
					<h3 class="mb-4 text-sm font-semibold tracking-wide uppercase opacity-70">Navigation</h3>
					<button
						class="btn btn-ghost btn-sm w-full justify-start gap-3 {activeTab === 'overview'
							? 'btn-active bg-primary/20 text-primary'
							: 'hover:bg-base-300'}"
						onclick={() => (activeTab = 'overview')}
					>
						<span class="text-lg">📋</span>
						<span class="font-medium">Overview</span>
					</button>
					<button
						class="btn btn-ghost btn-sm w-full justify-start gap-3 {activeTab === 'attributes'
							? 'btn-active bg-secondary/20 text-secondary'
							: 'hover:bg-base-300'}"
						onclick={() => (activeTab = 'attributes')}
					>
						<span class="text-lg">💪</span>
						<span class="font-medium">Attributes</span>
					</button>
					<button
						class="btn btn-ghost btn-sm w-full justify-start gap-3 {activeTab === 'skills'
							? 'btn-active bg-accent/20 text-accent'
							: 'hover:bg-base-300'}"
						onclick={() => (activeTab = 'skills')}
					>
						<span class="text-lg">🎯</span>
						<span class="font-medium">Skills</span>
					</button>
					<button
						class="btn btn-ghost btn-sm w-full justify-start gap-3 {activeTab === 'character'
							? 'btn-active bg-info/20 text-info'
							: 'hover:bg-base-300'}"
						onclick={() => (activeTab = 'character')}
					>
						<span class="text-lg">👤</span>
						<span class="font-medium">Character Details</span>
					</button>
				</div>
			</aside>
		</div>

		<!-- Page content -->
		<div class="drawer-content flex flex-col">
			<!-- Header -->
			<div class="navbar bg-base-100 border-base-300 border-b shadow-sm">
				<div class="navbar-start">
					<label for="character-drawer" class="btn btn-square btn-ghost lg:hidden">
						<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 6h16M4 12h16M4 18h16"
							></path>
						</svg>
					</label>
				</div>
				<div class="navbar-center">
					<h1 class="text-primary text-xl font-bold">
						{characterState.value.name}
					</h1>
				</div>
				<div class="navbar-end">
					<div class="flex items-center gap-2">
						<div class="badge badge-primary">Level {characterStatsState.value?.level || 1}</div>
						<div class="badge badge-secondary">{characterState.value.class}</div>
					</div>
				</div>
			</div>

			<!-- Main content -->
			<div class="bg-base-200 min-h-screen flex-1 p-6">
				<div class="mx-auto max-w-7xl">
					<!-- Tab Content -->
					{#if activeTab === 'overview'}
						<!-- Overview Tab -->
						<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
							<!-- Basic Information -->
							<div class="space-y-8 lg:col-span-2">
								<div
									class="card from-base-100 to-base-200/50 border-base-300 border bg-gradient-to-br shadow-xl"
								>
									<div class="card-body">
										<h2 class="card-title mb-6 flex items-center text-2xl">
											<div class="avatar placeholder mr-3">
												<div class="bg-primary text-primary-content w-12 rounded-full">
													<span class="text-2xl">📋</span>
												</div>
											</div>
											Character Overview
										</h2>
										<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
											<div class="space-y-4">
												<div class="form-control">
													<div class="text-base-content/70 mb-2 text-sm font-semibold">Race</div>
													<div class="badge badge-lg badge-primary w-full justify-center py-3">
														{characterState.value.race}
													</div>
												</div>
												<div class="form-control">
													<div class="text-base-content/70 mb-2 text-sm font-semibold">Gender</div>
													<div class="input input-bordered bg-base-200 cursor-default">
														{characterState.value.gender}
													</div>
												</div>
												<div class="form-control">
													<div class="text-base-content/70 mb-2 text-sm font-semibold">Class</div>
													<div class="badge badge-lg badge-secondary w-full justify-center py-3">
														{characterState.value.class}
													</div>
												</div>
											</div>
											<div class="space-y-4">
												<div class="form-control">
													<div class="text-base-content/70 mb-2 text-sm font-semibold">Level</div>
													<div class="badge badge-lg badge-accent w-full justify-center py-3">
														Level {characterStatsState.value?.level || 1}
													</div>
												</div>
												<div class="form-control">
													<div class="text-base-content/70 mb-2 text-sm font-semibold">
														Alignment
													</div>
													<div class="input input-bordered bg-base-200 cursor-default">
														{characterState.value.alignment}
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>

								<!-- Resources Display -->
								<div
									class="card from-success/10 to-info/10 border-base-300 border bg-gradient-to-br shadow-xl"
								>
									<div class="card-body">
										<h3 class="card-title mb-6 flex items-center text-xl">
											<div class="avatar placeholder mr-3">
												<div class="bg-success text-success-content w-10 rounded-full">
													<span class="text-xl">⚡</span>
												</div>
											</div>
											Current Resources
										</h3>
										<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
											{#each resourcesData() as resource}
												<div class="card bg-base-100/80 border-base-300 border shadow-md">
													<div class="card-body p-4">
														<div class="mb-2 flex items-center justify-between">
															<span class="text-2xl">{resource.icon}</span>
															<span class="font-mono text-sm font-bold">
																{resource.current}/{resource.max}
															</span>
														</div>
														<h4 class="mb-2 text-sm font-semibold capitalize">{resource.name}</h4>
														<progress
															class="progress progress-primary h-2 w-full"
															value={resource.current}
															max={resource.max}
														></progress>
														<div class="text-base-content/70 mt-1 text-center text-xs">
															{resource.percentage.toFixed(0)}%
														</div>
													</div>
												</div>
											{/each}
										</div>
									</div>
								</div>
							</div>

							<!-- Quick Actions -->
							<div class="space-y-6">
								<div class="card from-primary/20 to-secondary/20 bg-gradient-to-br shadow-xl">
									<div class="card-body text-center">
										<h3 class="card-title mb-4 justify-center">
											<span class="mr-2 text-base">⚡</span>
											Quick Actions
										</h3>
										<div class="space-y-3">
											<button class="btn btn-primary btn-block gap-2">
												<span>🎲</span>
												Roll Dice
											</button>
											<button class="btn btn-secondary btn-block gap-2">
												<span>🔄</span>
												Level Up
											</button>
											<button class="btn btn-accent btn-block gap-2">
												<span>📝</span>
												Edit Character
											</button>
										</div>
									</div>
								</div>

								<!-- Character Summary -->
								<div class="card bg-base-100 shadow-xl">
									<div class="card-body">
										<h3 class="card-title mb-4 text-base">
											<span class="mr-2 text-base">📈</span>
											Progress Summary
										</h3>
										<div class="space-y-3">
											<div class="flex items-center justify-between">
												<span class="text-sm">Total Skills</span>
												<span class="badge badge-primary">{skillsData().length}</span>
											</div>
											<div class="flex items-center justify-between">
												<span class="text-sm">Attributes</span>
												<span class="badge badge-secondary">{attributesData().length}</span>
											</div>
											<div class="flex items-center justify-between">
												<span class="text-sm">Average Skill Progress</span>
												<span class="badge badge-accent">
													{averageSkillProgress()}%
												</span>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					{:else if activeTab === 'attributes'}
						<!-- Attributes Tab -->
						<div
							class="card from-secondary/10 to-accent/10 border-base-300 border bg-gradient-to-br shadow-xl"
						>
							<div class="card-body">
								<h2 class="card-title mb-6 flex items-center text-2xl">
									<div class="avatar placeholder mr-3">
										<div class="bg-secondary text-secondary-content w-12 rounded-full">
											<span class="text-2xl">💪</span>
										</div>
									</div>
									Attributes & Stats
								</h2>

								{#if attributesData().length === 0}
									<div class="alert alert-info">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
											class="h-6 w-6 shrink-0 stroke-current"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
											></path>
										</svg>
										<span>No attributes data available yet.</span>
									</div>
								{:else}
									<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
										{#each attributesData() as attribute}
											<div
												class="card bg-base-100 border-base-300 border shadow-lg transition-all duration-300 hover:shadow-xl"
											>
												<div class="card-body p-6">
													<div class="mb-4 flex items-center justify-between">
														<div class="text-4xl">{attribute.icon}</div>
														<div class="text-right">
															<div class="text-primary text-2xl font-bold">{attribute.value}</div>
															<div class="text-base-content/70 text-xs tracking-wide uppercase">
																{attribute.percentage.toFixed(0)}% max
															</div>
														</div>
													</div>
													<h3 class="card-title text-base-content mb-3 text-lg capitalize">
														{attribute.name}
													</h3>
													<div class="space-y-2">
														<progress
															class="progress progress-primary h-3 w-full"
															value={attribute.percentage}
															max="100"
														></progress>
														<div class="text-base-content/70 text-center text-xs">
															{attribute.percentage.toFixed(1)}% of maximum potential
														</div>
													</div>
												</div>
											</div>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					{:else if activeTab === 'skills'}
						<!-- Skills Tab -->
						<div class="space-y-6">
							<div
								class="card from-primary/10 to-secondary/10 border-base-300 border bg-gradient-to-br shadow-xl"
							>
								<div class="card-body">
									<h2 class="card-title mb-6 flex items-center text-2xl">
										<div class="avatar placeholder mr-3">
											<div class="bg-primary text-primary-content w-12 rounded-full">
												<span class="text-2xl">🎯</span>
											</div>
										</div>
										Skills Progression
									</h2>

									{#if skillsData().length === 0}
										<div class="alert alert-info">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
												class="h-6 w-6 shrink-0 stroke-current"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
												></path>
											</svg>
											<span
												>No skills learned yet. Start adventuring to develop your abilities!</span
											>
										</div>
									{:else}
										<div class="grid max-h-[600px] gap-4 overflow-y-auto">
											{#each skillsData() as skill}
												<div
													class="card bg-base-100 border-base-300 border shadow-md transition-all duration-300 hover:shadow-lg"
												>
													<div class="card-body p-4">
														<div class="mb-3 flex items-start justify-between">
															<h3 class="card-title text-primary text-lg capitalize">
																{skill.name}
															</h3>
															<div class="flex gap-2">
																<div class="badge badge-lg badge-primary">{skill.value}</div>
																<div class="badge badge-lg badge-outline">
																	{skill.percentage.toFixed(0)}%
																</div>
															</div>
														</div>

														<div class="space-y-3">
															<div class="text-base-content/70 flex justify-between text-sm">
																<span
																	>Progress: <strong class="text-base-content"
																		>{skill.current}</strong
																	></span
																>
																<span
																	>Required: <strong class="text-base-content"
																		>{skill.required}</strong
																	></span
																>
															</div>

															<div class="relative">
																<progress
																	class="progress progress-primary h-4 w-full"
																	value={skill.current}
																	max={skill.required}
																></progress>
																<div class="absolute inset-0 flex items-center justify-center">
																	<span
																		class="text-primary-content text-xs font-bold mix-blend-difference"
																	>
																		{skill.percentage.toFixed(1)}%
																	</span>
																</div>
															</div>

															<div
																class="alert {skill.percentage >= 100
																	? 'alert-success'
																	: skill.percentage >= 75
																		? 'alert-warning'
																		: 'alert-info'} py-2"
															>
																<div class="flex items-center gap-2">
																	{#if skill.percentage >= 100}
																		<svg
																			xmlns="http://www.w3.org/2000/svg"
																			class="h-5 w-5 shrink-0 stroke-current"
																			fill="none"
																			viewBox="0 0 24 24"
																		>
																			<path
																				stroke-linecap="round"
																				stroke-linejoin="round"
																				stroke-width="2"
																				d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
																			/>
																		</svg>
																		<span class="text-sm font-medium"
																			>Mastery achieved! Ready to advance.</span
																		>
																	{:else if skill.percentage >= 75}
																		<svg
																			xmlns="http://www.w3.org/2000/svg"
																			class="h-5 w-5 shrink-0 stroke-current"
																			fill="none"
																			viewBox="0 0 24 24"
																		>
																			<path
																				stroke-linecap="round"
																				stroke-linejoin="round"
																				stroke-width="2"
																				d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 15c-.77.833.192 2.5 1.732 2.5z"
																			/>
																		</svg>
																		<span class="text-sm font-medium"
																			>Almost there! {(100 - skill.percentage).toFixed(0)}%
																			remaining.</span
																		>
																	{:else}
																		<svg
																			xmlns="http://www.w3.org/2000/svg"
																			class="h-5 w-5 shrink-0 stroke-current"
																			fill="none"
																			viewBox="0 0 24 24"
																		>
																			<path
																				stroke-linecap="round"
																				stroke-linejoin="round"
																				stroke-width="2"
																				d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
																			></path>
																		</svg>
																		<span class="text-sm"
																			>Continue practicing. {(100 - skill.percentage).toFixed(0)}%
																			to mastery.</span
																		>
																	{/if}
																</div>
															</div>
														</div>
													</div>
												</div>
											{/each}
										</div>
									{/if}
								</div>
							</div>
						</div>
					{:else if activeTab === 'character'}
						<!-- Character Details Tab -->
						<div class="space-y-8">
							<!-- Character Overview Hero -->
							<div
								class="hero from-primary/10 via-secondary/5 to-accent/10 rounded-3xl bg-gradient-to-br"
							>
								<div class="hero-content py-12 text-center">
									<div class="max-w-md">
										<div class="avatar mb-6">
											<div
												class="ring-primary ring-offset-base-100 w-32 rounded-full ring ring-offset-2"
											>
												{#if storyState.value?.general_image_prompt}
													<AIGeneratedImage
														imagePrompt={storyState.value.general_image_prompt}
														imageClassesString="w-full h-full object-cover"
														showGenerateButton={false}
													/>
												{:else}
													<div class="bg-primary/20 flex h-full w-full items-center justify-center">
														<span class="text-6xl">🧙‍♂️</span>
													</div>
												{/if}
											</div>
										</div>
										<h1 class="text-primary mb-2 text-4xl font-bold">
											{characterState.value.name}
										</h1>
										<div class="mb-4 flex justify-center gap-2">
											<div class="badge badge-lg badge-primary">{characterState.value.race}</div>
											<div class="badge badge-lg badge-secondary">{characterState.value.class}</div>
											<div class="badge badge-lg badge-accent">
												{characterState.value.alignment}
											</div>
										</div>
										<div class="flex justify-center gap-2">
											<div class="badge badge-outline">{characterState.value.gender}</div>
											<div class="badge badge-outline">
												Level {characterStatsState.value?.level || 1}
											</div>
										</div>
									</div>
								</div>
							</div>

							<!-- Character Details Grid -->
							<div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
								<!-- Appearance -->
								<div
									class="card bg-base-100 border-base-300 border shadow-xl transition-all duration-300 hover:shadow-2xl"
								>
									<div class="card-body">
										<h2 class="card-title mb-6 flex items-center text-xl">
											<div class="avatar placeholder mr-3">
												<div class="bg-primary text-primary-content w-10 rounded-full">
													<span class="text-xl">👤</span>
												</div>
											</div>
											Physical Appearance
										</h2>
										<div
											class="from-base-200/50 to-base-300/30 border-base-300 rounded-xl border bg-gradient-to-br p-6"
										>
											<p class="text-base-content/90 text-base leading-relaxed whitespace-pre-wrap">
												{characterState.value.appearance}
											</p>
										</div>
									</div>
								</div>

								<!-- Personality -->
								<div
									class="card bg-base-100 border-base-300 border shadow-xl transition-all duration-300 hover:shadow-2xl"
								>
									<div class="card-body">
										<h2 class="card-title mb-6 flex items-center text-xl">
											<div class="avatar placeholder mr-3">
												<div class="bg-secondary text-secondary-content w-10 rounded-full">
													<span class="text-xl">🧠</span>
												</div>
											</div>
											Personality & Traits
										</h2>
										<div
											class="from-base-200/50 to-base-300/30 border-base-300 rounded-xl border bg-gradient-to-br p-6"
										>
											<p class="text-base-content/90 text-base leading-relaxed whitespace-pre-wrap">
												{characterState.value.personality}
											</p>
										</div>
									</div>
								</div>

								<!-- Background -->
								<div
									class="card bg-base-100 border-base-300 border shadow-xl transition-all duration-300 hover:shadow-2xl lg:col-span-2"
								>
									<div class="card-body">
										<h2 class="card-title mb-6 flex items-center text-xl">
											<div class="avatar placeholder mr-3">
												<div class="bg-accent text-accent-content w-10 rounded-full">
													<span class="text-xl">📚</span>
												</div>
											</div>
											Background & History
										</h2>
										<div
											class="from-base-200/50 to-base-300/30 border-base-300 rounded-xl border bg-gradient-to-br p-6"
										>
											<p class="text-base-content/90 text-base leading-relaxed whitespace-pre-wrap">
												{characterState.value.background}
											</p>
										</div>
									</div>
								</div>

								<!-- Motivation -->
								<div
									class="card bg-base-100 border-base-300 border shadow-xl transition-all duration-300 hover:shadow-2xl lg:col-span-2"
								>
									<div class="card-body">
										<h2 class="card-title mb-6 flex items-center text-xl">
											<div class="avatar placeholder mr-3">
												<div class="bg-info text-info-content w-10 rounded-full">
													<span class="text-xl">🎯</span>
												</div>
											</div>
											Motivation & Goals
										</h2>
										<div
											class="from-base-200/50 to-base-300/30 border-base-300 rounded-xl border bg-gradient-to-br p-6"
										>
											<p class="text-base-content/90 text-base leading-relaxed whitespace-pre-wrap">
												{characterState.value.motivation}
											</p>
										</div>
									</div>
								</div>
							</div>

							<!-- Character Stats Summary -->
							<div
								class="card from-success/10 to-warning/10 border-base-300 border bg-gradient-to-br shadow-xl"
							>
								<div class="card-body">
									<h2 class="card-title mb-6 flex items-center text-xl">
										<div class="avatar placeholder mr-3">
											<div class="bg-success text-success-content w-10 rounded-full">
												<span class="text-xl">📊</span>
											</div>
										</div>
										Character Summary
									</h2>
									<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
										<div class="stat bg-base-100/70 border-base-300 rounded-xl border">
											<div class="stat-figure text-primary text-2xl">💪</div>
											<div class="stat-title">Total Attributes</div>
											<div class="stat-value text-primary">{attributesData().length}</div>
											<div class="stat-desc">Character traits</div>
										</div>
										<div class="stat bg-base-100/70 border-base-300 rounded-xl border">
											<div class="stat-figure text-secondary text-2xl">🎯</div>
											<div class="stat-title">Skills Mastered</div>
											<div class="stat-value text-secondary">{skillsData().length}</div>
											<div class="stat-desc">Learned abilities</div>
										</div>
										<div class="stat bg-base-100/70 border-base-300 rounded-xl border">
											<div class="stat-figure text-accent text-2xl">⚡</div>
											<div class="stat-title">Avg. Progress</div>
											<div class="stat-value text-accent">{averageSkillProgress()}%</div>
											<div class="stat-desc">Skill development</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
{:else}
	<!-- Loading state -->
	<div class="bg-base-200 flex min-h-screen items-center justify-center">
		<div class="text-center">
			<div class="loading loading-spinner loading-lg text-primary mb-4"></div>
			<h2 class="mb-2 text-xl font-bold">Loading Character...</h2>
			<p class="text-base-content/70">Please wait while we load your character data.</p>
		</div>
	</div>
{/if}
