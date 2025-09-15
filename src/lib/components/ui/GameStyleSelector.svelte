<script lang="ts">
  import { GAME_STYLES, type GameStyle } from '$lib/ai/config/gameStyles';
  import { gameStyleState } from '$lib/state/gameStyleState.svelte';

  // Make component reactive to gameStyleState changes
  let currentStyle = $state(gameStyleState.value);
  
  // Watch for external changes to gameStyleState
  $effect(() => {
    currentStyle = gameStyleState.value;
  });

  // Handle style change
  function handleStyleChange(style: GameStyle) {
    gameStyleState.value = style;
    currentStyle = style;
  }
</script>

<div class="card bg-base-200 shadow-md">
  <div class="card-body p-3">
    <h3 class="card-title text-sm mb-3">
      <span class="text-base">🎭</span>
      Narrative Style
    </h3>
    
    <div class="space-y-2">
      {#each Object.values(GAME_STYLES) as style}
        <label class="cursor-pointer flex items-start gap-3 p-2 rounded-lg hover:bg-base-300/50 transition-colors">
          <input
            type="radio"
            name="game-style"
            value={style.id}
            checked={currentStyle === style.id}
            onchange={() => handleStyleChange(style.id)}
            class="radio radio-primary mt-1 flex-shrink-0"
          />
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-sm text-base-content">{style.name}</div>
            <div class="text-xs text-base-content/70 mt-1">{style.description}</div>
            <div class="text-xs text-base-content/50 mt-1">
              {#if style.id === 'rpg'}
                Adventure • Combat • Stats • Exploration
              {:else if style.id === 'visual-novel'}
                Character Development • Relationships • Emotional Choices
              {/if}
            </div>
          </div>
        </label>
      {/each}
    </div>
    
    <div class="mt-3 p-2 bg-info/10 rounded-lg border border-info/20">
      <p class="text-xs text-info flex items-center gap-2">
        <span class="text-sm">ℹ️</span>
        <span>This changes how the AI tells your story, but keeps all game mechanics intact.</span>
      </p>
    </div>
  </div>
</div>