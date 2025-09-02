## Infinite Tales RPG – Copilot Project Instructions

These instructions guide AI assistants (GitHub Copilot, Chat models) to produce code consistent with this repository. Keep responses concise but complete. Always start complex answers with a short pseudocode / plan, then implement.

---

### 1. Base Standards (Keep & Enforce)

Simplicity • Readability • Maintainability • Testability • Reusability • Reasonable Performance.
Use early returns. Use Tailwind + DaisyUI only for styling (no inline style attributes, no raw CSS unless @apply in rare shared utility layers). Prefer `class:active={isActive}` style toggles over ternaries when possible.

Accessibility: interactive elements need semantic tags or `role`, `aria-label`, keyboard focus (`tabindex="0"` if non-native). Handlers are prefixed with `handle` (e.g., `handleClick`).

Svelte 5 runes: import from `svelte` and use `$state`, `$derived`, `$effect`. Do not use legacy `$:` reactive labels.

---

### 2. Tech Stack

SvelteKit 2 (Svelte 5 runes) • TypeScript 5 • Vite 5 • TailwindCSS + DaisyUI • Vitest (unit) • Playwright (E2E) • Vercel deploy • AI Providers (Gemini, Pollinations) • Local state persistence via custom `useLocalStorage`.

---

### 3. High-Level Architecture

Layers:

1. UI Pages & Components (`src/routes`, `src/lib/components`).
2. AI Agents (`src/lib/ai/agents/*`) orchestrating prompts & structured JSON outputs.
3. Game Logic Helpers (`src/routes/game/*Logic.ts`).
4. State Persistence (`src/lib/state/*` + `useLocalStorage`).
5. LLM Providers (`src/lib/ai/*Provider.ts`, `llm.ts`).

Data Flow Loop (simplified): UI action -> prepare context -> call appropriate Agent(s) -> stream thoughts/story -> parse & update local states -> summarization & memory retrieval -> regenerate actions -> UI refresh.

---

### 4. Core AI Agents (Responsibilities)

Files under `src/lib/ai/agents/`:
| Agent | Purpose |
|-------|---------|
| `gameAgent.ts` | Main story progression (narrative text + structured JSON: stats, inventory, xp, image prompt, plot hints). |
| `actionAgent.ts` | Generates next possible actions (list + enriched metadata). |
| `characterAgent.ts` | Character narrative description & image prompt. |
| `characterStatsAgent.ts` | Initialize/update character numerical & categorical stats/resources. |
| `combatAgent.ts` | Combat resolution & combat-oriented JSON updates. |
| `eventAgent.ts` | Detect & emit special events (abilities unlock, transformations). |
| `summaryAgent.ts` | Story/history summarization & retrieval of related details (context pruning). |
| `jsonFixingInterceptorAgent.ts` | Attempts to repair malformed JSON from LLM before parsing. |
| `storyAgent.ts` | (If present) Additional story-focused tasks / legacy naming. |
| `mappers.ts` | Helper mappers / type conversions for agent outputs. |

Never silently change JSON contracts. If modifying: update prompt, parsing code, tests, and this file.

---

### 5. LLM Providers

`geminiProvider.ts` handles streaming (story & thoughts), safety settings, fallback logic. `llmProvider.ts` centralizes provider selection. `llm.ts` defines shared prompt fragments (e.g. `LANGUAGE_PROMPT`).

Streaming callbacks (expected shapes) must remain stable: `onStoryStreamUpdate(partialText)`, `onThoughtStreamUpdate(kind, partialThought)`.

---

### 6. State Management

Pattern: `const someState = useLocalStorage<Type>('stateKey', initialValue);` All principal keys:

**Core Game State:**
`characterState`, `characterStatsState`, `storyState`, `campaignState`, `currentChapterState`, `gameActionsState`, `historyMessagesState`, `characterActionsState`, `npcState`, `inventoryState`, `isGameEnded`, `gameTimeState`.

**History & Memory:**
`relatedStoryHistoryState`, `relatedActionHistoryState`, `customMemoriesState`, `customGMNotesState`, `thoughtsState`, `rollDifferenceHistoryState`.

**UI & Settings:**
`gameSettingsState`, `aiConfigState`, `apiKeyState`, `temperatureState`, `systemInstructionsState`, `aiLanguage`, `ttsVoiceState`, `useDynamicCombat`.

**Actions & Input:**
`chosenActionState`, `additionalStoryInputState`, `additionalActionInputState`, `didAIProcessDiceRollAction`.

**Character & Player Management:**
`playerCharactersIdToNamesMapState`, `playerCharactersGameState`, `characterImageState`, `characterTransformState`.

**Events & Progression:**
`eventEvaluationState`, `levelUpState`, `skillsProgressionState`.

Use snapshots before deep mutations when required: `$state.snapshot(variable.value)`.

---

### 7. Gameplay Flow

1. Creation (tale/character) -> initial agents invoked for baseline state.
2. On `game/+page.svelte`, `sendAction()` triggers Action or Story flow.
3. `actionAgent` proposes candidate actions.
4. Player selects or inputs custom action; may trigger dice roll (combat/skill gating) via `gameLogic.ts`.
5. Context is enriched (combat, memory retrieval) -> `gameAgent.generateStoryProgression`.
6. Streaming updates UI; on completion, structured JSON parsed & local states updated.
7. Summarization if thresholds exceeded (`summaryAgent`).
8. Event evaluation (`eventAgent`).
9. Regenerate actions -> repeat.

---

### 8. JSON Contracts (Do Not Break)

Story Progression JSON (gameAgent): keys include `story`, `xp_gain`, `inventory_update`, `stats_update`, `image_prompt`, `plotPointAdvancingNudgeExplanation`, etc. Summary JSON: `{ keyDetails: string[], story: string }`. Related history retrieval JSON: `{ relatedDetails: Array<{ storyReference: string; relevanceScore: number }> }`. Combat/stat update JSON: defined in combat & character stats prompts (enums uppercase). Maintain stable casing & enumeration values.

If adding a field: 1) extend type/interface, 2) adjust prompt instructions, 3) add parser & safe default, 4) write test, 5) document here.

---

### 9. Coding Conventions (Project-Specific)

Svelte 5 runes only for reactivity. Handlers: `handleX`. Prefer `const` arrow functions over `function` declarations. Tailwind + DaisyUI classes only; use semantic HTML. Derive computed values using `$derived`. Use `$effect` for side-effects; keep side-effects idempotent. Avoid complex logic in components—extract into logic or agent files.

Error handling: central utility (e.g., `handleError`) & console debug through prettified JSON (`stringifyPretty`). Always catch JSON parse errors with fallback path.

---

### 10. Testing Strategy

Unit (Vitest): pure logic (`*Logic.ts`, parsers, mappers). Write at least one happy path + one edge case when altering logic. E2E (Playwright): key user flows (start game, choose action, progression streaming). Add tests alongside code or under `tests/`. Keep tests deterministic; mock LLM outputs where possible.

---

### 11. Performance & Streaming

Minimize token usage: rely on summaries (`summaryAgent`) & related retrieval. Avoid sending entire raw history; include only recent actions, summarized story, and related details. Lazy-load heavy components (import on demand) if they are not part of initial above-the-fold game screen.

---

### 12. Memory & Context

`summaryAgent` compresses long histories; `retrieveRelatedHistory` fetches targeted context slices. Custom player memories override summarization omission—always include them if relevant. When building prompts: order context from most to least recent/relevant.

---

### 13. Dice & Skill Checks

`gameLogic.ts` determines if dice roll required (`mustRollDice`). On success/failure, inject side-effect additions using `addAdditionsFromActionSideeffects`. Include outcome descriptors in story context to keep narrative coherent.

---

### 14. Progression Notes

Campaign feature has been removed. Keep story continuity via plot point hints within `gameAgent` JSON only.

---

### 15. Skills & Level Progression

Increment skills via progression utilities (e.g., `advanceSkillIfApplicable`). Level thresholds defined in `levelLogic.ts`; ensure xp gains feed into that logic before UI updates.

---

### 16. Events & Abilities

`eventAgent` evaluates triggers post-story update. If new ability added, ensure UI surfaces it and state persisted. Document new ability schema here if structure changes.

---

### 17. Error Handling & Fallback

If primary provider unstable, fallback path in providers chooses alternative (e.g., Pollinations for images, alternate LLM if configured). Keep retry counts bounded to avoid infinite loops. Always surface a user-friendly message + log raw error.

---

### 18. Adding / Modifying Features Checklist

Before coding:

1. Identify affected Agent(s) or Logic file.
2. Assess JSON contract change? If yes, follow Section 8 procedure.
3. Need new persisted key? Add via `useLocalStorage` with clear name.
4. UI: create reusable component under `src/lib/components` (single responsibility).
5. Add accessibility attributes.
6. Update tests (logic &/or E2E stub). Ensure coverage of new branches / error paths.
7. Consider summarization & context size impact.
8. Update this instructions file if any Agent/contract changes.
9. Run lint + tests locally.
10. Keep code minimal, explicit, with early returns.

---

### 19. Common Pitfalls

Legacy Svelte 4 syntax (`on:click`) — must use standard attributes. Forgetting snapshots before deep object mutation (breaks reactivity). Expanding prompt context too broadly (token bloat). Altering enum casing. Adding blocking heavy computations inside `$effect` causing UI jank.

---

### 20. Quick Reference Links

`src/routes/game/+page.svelte` • `src/lib/ai/agents/gameAgent.ts` • `src/lib/ai/agents/actionAgent.ts` • `src/lib/ai/agents/summaryAgent.ts` • `src/lib/ai/agents/combatAgent.ts` • `src/lib/ai/agents/characterStatsAgent.ts` • `src/lib/ai/agents/eventAgent.ts` • `src/routes/game/memoryLogic.ts` • `src/routes/game/gameLogic.ts` • `src/lib/ai/llm.ts` • `src/lib/ai/geminiProvider.ts` • `src/lib/state/useLocalStorage.svelte.ts` (state util).

---

### 21.1 Important Files & Directories (Map)

- Core routes & pages
  - `src/routes/+layout.svelte` / `src/routes/+layout.server.ts`: App shell, server layout.
  - `src/routes/+page.svelte`: Landing / entry UI.
  - `src/routes/game/+layout.svelte`: Game screen shell.
  - `src/routes/game/+page.svelte`: Main game UI and streaming presentation.

- Game logic (Section 3 & 7)
  - `src/routes/game/gameController.ts`: Orchestrates action/story cycle, coordinates agents and state updates. See Sections 4, 7, 17.
  - `src/routes/game/gameLogic.ts`: Dice gates, side-effects injection, core flow helpers. See Sections 13, 11.
  - `src/routes/game/gameStateUtils.ts`: Game state utility functions and helpers for state management.
  - `src/routes/game/combatLogic.ts`: Combat outcomes and JSON updates (Section 8/Combat contract).
  - `src/routes/game/characterLogic.ts`: Character-related helpers.
  - `src/routes/game/resourceLogic.ts`: Resource calculations and updates.
  - `src/routes/game/levelLogic.ts`: Level thresholds and XP handling (Section 15).
  - `src/routes/game/timeLogic.ts`: Time progression helpers.
  - `src/routes/game/memoryLogic.ts` + `src/routes/game/memoryLogic/`: Related history retrieval and summarization support (Section 12).
  - `src/routes/game/skillProgressionHelpers.ts`: Skills and progression utilities (Section 15).
  - `src/routes/game/npcLogic.ts`: NPC-related helper functions.
  - `src/routes/game/modalManager.svelte.ts`: Centralized modal state management.

- AI layer (Sections 4, 5, 8)
  - `src/lib/ai/agents/*.ts`: All core agents (see Section 4 table). Do not change JSON contracts (Section 8).
  - `src/lib/ai/llm.ts`: Shared prompt fragments and language constants.
  - `src/lib/ai/llmProvider.ts`: Provider abstraction selection.
  - `src/lib/ai/geminiProvider.ts`: Modern provider using @google/genai SDK with structured output.
  - `src/lib/ai/config/GeminiConfigBuilder.ts`: Centralized configuration with THINKING_BUDGETS.
  - `src/lib/ai/errors/GeminiErrorHandler.ts`: Consolidated error handling utilities.
  - `src/lib/ai/streaming/StructuredStreamHandler.ts`: SDK-native structured streaming (replaces manual parsing).
  - `src/lib/ai/schemas/ResponseSchemas.ts`: Type-safe response schemas using SDK Types.

- State & utilities (Section 6)
  - `src/lib/state/useLocalStorage.svelte.ts`: Local storage rune-based state util. Keys listed in Section 6.
  - `src/lib/state/versionMigration.ts`: Versioned migrations for persisted state.
  - `src/lib/state/errorState.svelte.ts`: Centralized error state handling.
  - `src/lib/util.svelte.ts`: Shared UI/utility helpers.
  - `src/lib/types/gameTime.ts`: Game time type definitions.

- UI components (Section 1 & 9)
  - `src/lib/components/StoryProgressionWithImage.svelte`: Story + image area.
  - `src/lib/components/AIGeneratedImage.svelte`: Image rendering (Pollinations).
  - `src/lib/components/TTSComponent.svelte`: Text-to-speech (msedge).
  - `src/lib/components/ImportExportSaveGame.svelte`: Save/load persistence.
  - `src/lib/components/LoadingModal.svelte` / `LoadingIcon.svelte`: Streaming/loading UI.
  - `src/lib/components/ResourcesComponent.svelte`: Player resources.
  - `src/lib/components/game/`: Game-specific UI components (ActionButtons, ActionInputForm, GameModals, etc.).
  - `src/lib/components/interaction_modals/`: Modal components for various interactions (character, dice, settings, etc.).

- Tests (Section 10)
  - Unit: `src/index.test.ts`, `src/routes/game/*.test.ts`, `src/lib/ai/agents/storyAgent.test.ts`.
  - E2E: `tests/test.ts` (Playwright). Config: `playwright.config.ts`.

- Config & build
  - `svelte.config.js`, `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`.
  - `eslint.config.js`, `.prettierrc`, `.prettierignore`.
  - `vercel.json`: Deployment target.
  - `package.json`: Scripts and deps.

---

### 21.2 Runes Pattern Snippet (Svelte 5)

Minimal, accessible pattern aligned with Section 9:

```svelte
<script lang="ts">
	import { $state, $derived, $effect } from 'svelte';

	type Counter = { count: number };
	const counter = $state<Counter>({ count: 0 });

	const doubled = $derived(counter.count * 2);

	const handleIncrement = () => {
		counter.count += 1; // mutation is reactive
	};

	$effect(() => {
		// idempotent side-effect
		console.debug('count', counter.count);
	});
</script>

<button class="btn btn-primary" aria-label="Increment" on:click={handleIncrement}>
	+1 (x2: {doubled})
</button>
```

---

### 21.3 Run & Test Quick Reference

- Dev server: `pnpm run dev`
- Typecheck: `pnpm run check` (watch: `pnpm run check:watch`)
- Lint/format: `pnpm run lint` • `pnpm run lint:fix` • `pnpm run format`
- Unit tests: `pnpm run test:unit` (Vitest)
- E2E tests: `pnpm run test:integration` (Playwright)
- Full test suite: `pnpm test`
- Build/preview: `pnpm run build` • `pnpm run preview`
- Release: `pnpm run release` (release-it)

Notes:

- Keep tests deterministic; mock LLM outputs for agents.
- After changing public contracts, update tests and this file (Sections 8 & 18).

---

### 21. When Generating Code (AI Assistant Rules)

Always:

- Start with a brief plan/pseudocode.
- Provide full component or module (with imports) — no ellipses unless user asks.
- Preserve JSON contracts & types.
- Use `handleX` naming for events.
- Use Tailwind/DaisyUI classes only.
- Add minimal JSDoc for complex functions.
- Avoid repetition (extract helpers).

Return only what user requested; avoid unsolicited large rewrites.

---

### 22. Extension Guidelines (If Creating New Agent)

Structure:

```ts
// src/lib/ai/agents/newCoolAgent.ts
import { someSharedPrompt } from '../llm';
import type { AIProvider } from '../llmProvider';

export interface NewCoolResult {
	/* ... */
}

export const newCoolAgent = (provider: AIProvider) => {
	const generate = async (input: { context: string }): Promise<NewCoolResult> => {
		// build prompt pieces (summary, related, recent actions)
		// call provider.generateJSON or streaming method
		// parse & validate JSON (try/catch + fallback)
		return {
			/* parsed safe object */
		};
	};
	return { generate };
};
```

Add tests: `newCoolAgent.test.ts` covering parse success + malformed JSON fallback.

---

### 23. Contribution Quality Gate

Before opening PR:

1. `npm run lint` passes.
2. `npm test` passes (unit + integration subset).
3. No type errors (`tsc --noEmit`).
4. Story flow manual smoke: start new tale -> choose action -> see streamed story.

---

### 24. Recap for Copilot

If user asks for change: gather context → outline plan → confirm assumptions (max 1 sentence) → produce code → brief explanation. Respect sections above.

End of Instructions.
