<script lang="ts">
	import { initialSystemInstructionsState, type SystemInstructionsState } from '$lib/ai/llm';
	import { useHybridLocalStorage } from '$lib/state/hybrid/useHybridLocalStorage.svelte';
	import { navigate } from '$lib/util.svelte';
	import { goto } from '$app/navigation';
	import GameStyleSelector from '$lib/components/ui/GameStyleSelector.svelte';

	const systemInstructionsState = useHybridLocalStorage<SystemInstructionsState>(
		'systemInstructionsState',
		initialSystemInstructionsState
	);

	// campaign removed
</script>

<ul class="steps mt-3 w-full">
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events  -->
	<li class="step step-primary cursor-pointer" onclick={() => goto('tale')}>Tale</li>
	<li class="step step-primary">System Prompts</li>
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events  -->
	<li class="step cursor-pointer" onclick={() => goto('character')}>Character</li>
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions  -->
	<!-- svelte-ignore a11y_click_events_have_key_events  -->
	<li class="step cursor-pointer" onclick={() => goto('characterStats')}>Stats</li>
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions  -->
	<!-- svelte-ignore a11y_click_events_have_key_events  -->
	<li class="step cursor-pointer" onclick={() => goto('character')}>Start</li>
</ul>

<div class="flex w-full flex-col items-center p-6">
	<div class="w-full max-w-2xl">
		<h1 class="mb-4 text-center text-2xl font-bold">Custom AI Behavior Settings</h1>

		<p class="text-base-content/80 mb-6 text-center text-sm">
			Configure how your AI Game Master will behave during your tale.
			<br />
			You may need to start a new Tale after changing these instructions.
		</p>

		<form class="space-y-6">
			<!-- Game Style Selector - NEW -->
			<fieldset class="w-full">
				<GameStyleSelector />
			</fieldset>

			<!-- Story Agent Instruction -->
			<fieldset class="w-full">
				<label for="story-agent-instruction" class="mb-2 block text-base font-medium">
					Story Agent Instruction (GM, NPCs, World)
				</label>
				<textarea
					id="story-agent-instruction"
					bind:value={systemInstructionsState.value.storyAgentInstruction}
					placeholder="Focus on narrative style. E.g., 'Describe environments vividly. Make NPCs quirky.'"
					class="textarea textarea-bordered h-24 w-full"
				></textarea>
				<small class="text-base-content/70 mt-1 block text-xs">
					Guides tone, pacing, descriptions, and NPC interactions.
				</small>
			</fieldset>

			<!-- Action Agent Instruction -->
			<fieldset class="w-full">
				<label for="action-agent-instruction" class="mb-2 block text-base font-medium">
					Action Agent Instruction
				</label>
				<textarea
					id="action-agent-instruction"
					bind:value={systemInstructionsState.value.actionAgentInstruction}
					placeholder="Focus on action resolution. E.g., 'Make skill checks easy. Always provide one funny, nonsensical action.'"
					class="textarea textarea-bordered h-24 w-full"
				></textarea>
				<small class="text-base-content/70 mt-1 block text-xs">
					Applied to generating actions (general, items, skills)
				</small>
			</fieldset>

			<!-- Combat Agent Instruction -->
			<fieldset class="w-full">
				<label for="combat-agent-instruction" class="mb-2 block text-base font-medium">
					Combat Agent Instruction
				</label>
				<textarea
					id="combat-agent-instruction"
					bind:value={systemInstructionsState.value.combatAgentInstruction}
					placeholder="Focus on combat style. E.g., 'Player Character only takes half damage. Enemies fight tactically.'"
					class="textarea textarea-bordered h-24 w-full"
				></textarea>
				<small class="text-base-content/70 mt-1 block text-xs"> Applied only when in combat </small>
			</fieldset>

			<!-- General System Instruction -->
			<fieldset class="w-full">
				<label for="general-system-instruction" class="mb-2 block text-base font-medium">
					General System Instruction
				</label>
				<textarea
					id="general-system-instruction"
					bind:value={systemInstructionsState.value.generalSystemInstruction}
					placeholder="Overall guidance. E.g., 'Maintain a serious tone. The world is dangerous.'"
					class="textarea textarea-bordered h-24 w-full"
				></textarea>
				<small class="text-error mt-1 block text-xs">
					⚠️ Attention! This prompt is added to ALL AI generations
				</small>
			</fieldset>

			<!-- AI Safety Settings - Now Configured Per Tale -->
			<fieldset class="w-full">
				<legend class="mb-4 text-base font-medium">Content Safety Configuration</legend>
				<div class="bg-info/10 border-info/20 rounded-lg border p-4">
					<p class="text-info flex items-center gap-2 text-sm font-medium">
						<span class="text-lg">ℹ️</span>
						Content safety is now configured per tale
					</p>
					<p class="text-base-content/70 mt-2 text-sm">
						Safety levels are controlled by each tale's content rating. You can set the content
						rating (Safe, Mid, Adult, Uncensored) when creating or editing your tale. This allows
						different tales to have different safety levels based on their content.
					</p>
					<button
						type="button"
						class="btn btn-info btn-sm mt-3"
						onclick={() => navigate('/new/tale')}
					>
						← Go back to configure tale content rating
					</button>
				</div>
			</fieldset>

			<!-- Navigation Buttons -->
			<div class="mt-8 flex justify-center gap-4">
				<button
					type="button"
					class="btn btn-neutral"
					onclick={() => {
						navigate('/new/tale');
					}}
				>
					← Previous: Tale
				</button>

				<button
					type="button"
					class="btn btn-primary"
					onclick={() => {
						navigate('/new/character');
					}}
				>
					Next: Character →
				</button>
			</div>

			<!-- Reset Button -->
			<div class="mt-4 flex justify-center">
				<button
					type="button"
					class="btn btn-ghost btn-sm"
					onclick={() => {
						systemInstructionsState.value = { ...initialSystemInstructionsState };
					}}
				>
					Reset to Defaults
				</button>
			</div>
		</form>
	</div>
</div>
