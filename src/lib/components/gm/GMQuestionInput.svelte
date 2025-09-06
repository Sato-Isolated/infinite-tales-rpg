<script lang="ts">
	let {
		onQuestionSubmit,
		currentLocation = "unknown location",
		characterName = "Character"
	}: {
		onQuestionSubmit: (question: string, type?: string) => void;
		currentLocation?: string;
		characterName?: string;
	} = $props();

	let question = $state('');
	let selectedCategory = $state<keyof typeof questionCategories>('rule_clarification');
	let showSuggestions = $state(false);

	// Question categories with contextual suggestions
	const questionCategories = {
		rule_clarification: {
			icon: '📋',
			label: 'Rules & Mechanics',
			color: 'primary',
			suggestions: [
				"How does combat work?",
				"What are the skill check rules?",
				"How do I level up?",
				"What are the inventory limits?"
			]
		},
		current_situation: {
			icon: '🎯',
			label: 'Current Situation',
			color: 'secondary',
			suggestions: [
				`Where exactly am I in ${currentLocation}?`,
				"Who is present in this scene?",
				"What can I interact with here?",
				"What time of day is it?"
			]
		},
		character_info: {
			icon: '👤',
			label: 'Character Info',
			color: 'accent',
			suggestions: [
				`What are ${characterName}'s current stats?`,
				"What abilities do I have?",
				"What's in my inventory?",
				"What's my character's background?"
			]
		},
		world_lore: {
			icon: '🌍',
			label: 'World & Lore',
			color: 'info',
			suggestions: [
				"Tell me about this world's history",
				"What are the major factions?",
				"What gods or religions exist?",
				"What's the political situation?"
			]
		},
		tactical_advice: {
			icon: '⚔️',
			label: 'Tactical Advice',
			color: 'warning',
			suggestions: [
				"What's the best strategy here?",
				"What are my options in this situation?",
				"How should I approach this challenge?",
				"What are the risks of each choice?"
			]
		}
	} as const;

	function handleSubmit() {
		if (question.trim()) {
			onQuestionSubmit(question.trim(), selectedCategory);
			question = '';
			showSuggestions = false;
		}
	}

	function useSuggestion(suggestion: string) {
		question = suggestion;
		showSuggestions = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSubmit();
		}
	}
</script>

<div class="space-y-4">
	<!-- Category Selection -->
	<div class="flex flex-wrap gap-2">
		{#each Object.entries(questionCategories) as [key, category]}
			<button
				class="btn btn-sm"
				class:btn-{category.color}={selectedCategory === key}
				class:btn-outline={selectedCategory !== key}
				onclick={() => {
					selectedCategory = key as keyof typeof questionCategories;
					showSuggestions = true;
				}}
			>
				<span class="text-sm">{category.icon}</span>
				<span class="text-xs hidden sm:inline">{category.label}</span>
			</button>
		{/each}
	</div>

	<!-- Question Input -->
	<div class="form-control w-full">
		<label class="label" for="gm-question-input">
			<span class="label-text font-medium">
				{questionCategories[selectedCategory]?.icon} Ask the Game Master
			</span>
			<button
				class="btn btn-ghost btn-xs"
				onclick={() => showSuggestions = !showSuggestions}
			>
				{showSuggestions ? 'Hide' : 'Show'} Suggestions
			</button>
		</label>
		
		<div class="relative">
			<textarea
				id="gm-question-input"
				bind:value={question}
				onkeydown={handleKeydown}
				class="textarea textarea-bordered w-full min-h-[80px] resize-none pr-12"
				placeholder="Ask your question... (Enter to submit, Shift+Enter for new line)"
				rows="3"
			></textarea>
			
			<button
				class="btn btn-primary btn-sm absolute bottom-2 right-2"
				onclick={handleSubmit}
				disabled={!question.trim()}
			>
				<span class="text-base">📤</span>
			</button>
		</div>
	</div>

	<!-- Contextual Suggestions -->
	{#if showSuggestions && questionCategories[selectedCategory]}
		<div class="card bg-base-100 shadow-sm border border-base-300">
			<div class="card-body p-3">
				<h4 class="card-title text-sm text-{questionCategories[selectedCategory].color} mb-2">
					{questionCategories[selectedCategory].icon} {questionCategories[selectedCategory].label} Suggestions
				</h4>
				<div class="grid grid-cols-1 gap-2">
					{#each questionCategories[selectedCategory].suggestions as suggestion}
						<button
							class="btn btn-ghost btn-sm justify-start text-left h-auto min-h-[2rem] normal-case"
							onclick={() => useSuggestion(suggestion)}
						>
							<span class="text-xs">💡</span>
							<span class="text-xs flex-1">{suggestion}</span>
						</button>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	<!-- Quick Tips -->
	<div class="alert alert-info py-2 px-3">
		<span class="text-info">💡</span>
		<div class="text-xs space-y-1">
			<p><strong>Tip:</strong> Be specific for better answers. Include context about your situation.</p>
			<p><strong>Examples:</strong> "What happens if I attack?" vs "What are the consequences of attacking the guard while sneaking?"</p>
		</div>
	</div>
</div>
