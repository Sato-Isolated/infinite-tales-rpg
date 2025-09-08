## Infinite Tales RPG – Copilot Project Instructions

These instructions guide AI assistants (GitHub Copilot, chat models) to write code consistent with this repo. Keep answers concise but complete. For non-trivial requests: start with a short plan/pseudocode, then implement.

---

### 1. Base standards

Simplicity • Readability • Maintainability • Testability • Reusability • Reasonable performance.
- Prefer early returns and small pure helpers.
- Styling: Tailwind v4 + DaisyUI 5 only. No inline styles; avoid raw CSS except shared utilities with @apply.
- Accessibility: semantic elements or proper `role`, `aria-*`, focusable when needed.
- Handlers: prefix with `handle` (e.g., `handleClick`).
- Svelte 5 runes: import from `svelte` and use `$state`, `$derived`, `$effect`. Avoid legacy `$:` labels.

---

### 2. Tech stack

SvelteKit 2 (Svelte 5 runes) • TypeScript 5 • Vite 7 • TailwindCSS v4 + DaisyUI 5 • ESLint flat config + Prettier • Vitest (unit) • Playwright (E2E) • Google Gemini via `@google/genai` • Hybrid state persistence (localStorage + file-backed) via `useHybridLocalStorage`.

---

### 3. High-level architecture

Layers:

1) UI pages & components: `src/routes` and `src/lib/components/*`.
2) AI agents: `src/lib/ai/agents/*` orchestrate prompts and structured JSON outputs (see Section 4).
3) Game logic: `src/lib/game/logic/*` and controller `src/lib/game/controllers/gameController.ts`.
4) State: hybrid persistence in `src/lib/state/**` with `useHybridLocalStorage` and `gameStateManager.svelte.ts`.
5) LLM provider abstractions: `src/lib/ai/*Provider.ts`, `llm.ts`.

Data flow: UI event -> gameController orchestrates -> agents generate story/actions (Gemini structured JSON) -> update hybrid state -> optional summarization/memory -> regenerate actions -> UI refresh.

---

### 4. Core AI agents (responsibilities)

Under `src/lib/ai/agents/`:
- `gameAgent.ts`: Story progression (narrative + structured JSON: stats, inventory, xp, image prompt, plot hints).
- `actionAgent.ts`: Next possible actions with metadata.
- `characterAgent.ts`: Character description & image prompt.
- `characterStatsAgent.ts`: Initialize/update stats/resources; level-up; abilities.
- `combatAgent.ts`: Combat resolution & stat updates.
- `eventAgent.ts`: Events evaluation (unlocks, transformations, etc.).
- `summaryAgent.ts`: Summarization and related history retrieval.
- `dialogueTrackingAgent.ts`: Dialogue continuity helpers.
- `mappers.ts`: Mapping helpers.

Agents use `@google/genai` structured output with schemas from `src/lib/ai/config/ResponseSchemas.ts` (modularized under `config/schemas/*`).

Never change JSON contracts silently. If modifying: update prompts, schemas, parser/consumers, tests, and this file.

---

### 5. LLM providers

- `geminiProvider.ts`: Handles content generation, simulated streaming, safety settings, and structured output with `@google/genai`. Uses `GeminiConfigBuilder` and `ModelCapabilities`.
- `llmProvider.ts`: Provider selection.
- `llm.ts`: Shared prompt fragments/constants (e.g., `LANGUAGE_PROMPT`).

Keep streaming/thought callbacks stable when used by UI/controller.

---

### 6. State management

Use hybrid storage utilities: `src/lib/state/hybrid/useHybridLocalStorage.svelte.ts` and `src/lib/state/gameStateManager.svelte.ts`.
- Keys and their storage targets are defined in `src/lib/state/hybrid-storage-config.json` (localStorage vs. file-backed store). Do not hardcode new keys—add them to the config when introducing persistent state.
- Common keys: `gameActionsState`, `historyMessagesState`, `storyState`, `npcState`, `characterState`, `characterStatsState`, `playerCharactersGameState`, `inventoryState`, `systemInstructionsState`, `eventEvaluationState`, `gameTimeState`, `skillsProgressionState`, `characterTransformState`, `aiConfigState`, `levelUpState`, `thoughtsState`, `chosenActionState`, `playerCharactersIdToNamesMapState`, difficulty/roll-related keys, `isGameEnded`, `aiLanguage`, `temperatureState`, dice flags, `customMemoriesState`, `customGMNotesState`, `related*HistoryState`, `apiKeyState`, `safetySettingsState`.
- For complex updates, prefer manager patterns in `gameStateManager.svelte.ts`. Take snapshots before deep mutations when required.

---

### 7. Gameplay flow

1) Tale/character creation -> initial agents set baseline state.
2) In `src/routes/game/+page.svelte`, user actions call into `gameController.ts`.
3) `actionAgent` proposes options; custom actions allowed.
4) Dice rolls (skill/combat) via `src/lib/game/logic/*` when required.
5) Enrich context (combat, memory) -> `gameAgent` generates story progression (structured JSON).
6) UI streams story; upon completion, state updates and is persisted via hybrid storage.
7) Summarize if thresholds exceeded (`summaryAgent`).
8) Evaluate events (`eventAgent`).
9) Regenerate actions -> loop.

---

### 8. JSON contracts (do not break)

Schemas live under `src/lib/ai/config/ResponseSchemas.ts` (modular files in `config/schemas/*`). Maintain casing/enums. Examples: story progression includes `story`, `xp_gain`, `inventory_update`, `stats_update`, `image_prompt`, `plotPointAdvancingNudgeExplanation`, etc. Summaries, related history, combat and character stats have dedicated schemas.

If adding fields:
1) Update schema/types; 2) adjust prompts; 3) update consumers/parsers with safe defaults; 4) add tests; 5) reflect changes here.

---

### 9. Coding conventions

- Svelte 5 runes for reactivity; keep components thin—move logic into `src/lib/game/logic/*` or agents.
- Use `handleX` naming, arrow functions, semantic HTML, Tailwind+DaisyUI classes.
- `$derived` for computed values; `$effect` for idempotent side-effects only.
- Error handling via `handleError` and `stringifyPretty` (`src/lib/util.svelte.ts`).
- Undo/state snapshots exist; see `saveSnapshotBeforeAction`, `undoManager.ts`, and `UndoButton.svelte`.

---

### 10. Testing

- Unit (Vitest): logic in `src/lib/game/logic/*`, parsers, mappers.
- E2E (Playwright): main flows (start game, choose action, streaming progression) in `tests/` with `playwright.config.ts`.
- Keep tests deterministic; mock agent outputs for repeatability.

---

### 11. Performance & streaming

Minimize tokens: use summaries and related retrieval; don’t send full raw history. Prefer recent actions + summaries + relevant details. Lazy-load heavy components when feasible.

---

### 12. Memory & context

Summaries compress long histories; related retrieval targets context slices under `src/lib/game/memory/*`. Custom player memories should be prioritized when relevant. Order prompt context from most to least recent/relevant.

---

### 13. Dice & skill checks

`src/lib/game/logic/gameLogic.ts` determines gates (e.g., `mustRollDice`). Use `diceRollLogic.ts`, `combatLogic.ts`, etc. On success/failure, inject side-effects via helpers. Include outcome descriptors in story context for coherence.

---

### 14. Progression notes

Campaign feature is removed. Ensure continuity via plot-point hints in `gameAgent` JSON.

---

### 15. Skills & level progression

Use progression helpers (see `src/lib/game/progression/*` and `logic/levelLogic.ts`). Ensure XP updates feed level logic before UI refresh.

---

### 16. Events & abilities

`eventAgent` evaluates triggers after story updates. If adding new ability structures, update schemas, state persistence, and UI components accordingly.

---

### 17. Error handling & fallback

Use `GeminiErrorHandler`, `GeminiConfigBuilder`, and provider fallback paths prudently. Keep retries bounded. Always show a user-friendly message and log the raw error. Safety mapping is available via `getSafetyLevelFromStory`.

---

### 18. Adding / modifying features checklist

Before coding:

1. Identify affected Agent(s) or Logic file.
2. Assess JSON contract change? If yes, follow Section 8 procedure.
3. Need new persisted key? Add via `useLocalStorage` with clear name.
4. UI: create reusable component under `src/lib/components` (single responsibility).
5. Add accessibility attributes.
6. Update tests (logic &/or E2E stub). Ensure coverage of new branches / error paths.
7. Consider summarization & context size impact.
8. Update this instructions file if any agent/contract changes.
9. Run lint + tests locally.
10. Keep code minimal, explicit, with early returns.

---

### 19. Common pitfalls

- Forgetting snapshots before deep object mutation (may break reactivity/undo).
- Prompt context too broad (token bloat); keep minimal and relevant.
- Changing enum casing or field names (breaks contracts).
- Heavy computations inside `$effect` causing jank.
- Missing accessibility attributes.

---

### 20. Quick reference links

UI: `src/routes/game/+page.svelte`
Controller: `src/lib/game/controllers/gameController.ts`
Logic: `src/lib/game/logic/*`
Memory: `src/lib/game/memory/*`
Agents: `src/lib/ai/agents/*`
Schemas: `src/lib/ai/config/ResponseSchemas.ts` and `src/lib/ai/config/schemas/*`
LLM: `src/lib/ai/llm.ts`, `src/lib/ai/geminiProvider.ts`, `src/lib/ai/llmProvider.ts`
State: `src/lib/state/hybrid/useHybridLocalStorage.svelte.ts`, `src/lib/state/gameStateManager.svelte.ts`

---

### 21. Important files & directories (map)

- Core routes & pages
  - `src/routes/+layout.svelte` / `src/routes/+layout.server.ts`: App shell.
  - `src/routes/+page.svelte`: Landing / entry UI.
  - `src/routes/game/+layout.svelte`: Game shell.
  - `src/routes/game/+page.svelte`: Main game UI and streaming presentation.

- Game controller & logic
  - `src/lib/game/controllers/gameController.ts`: Orchestrates action/story cycle and state updates.
  - `src/lib/game/logic/*`: Dice gates, side-effects, combat, character, resources, level, time.
  - `src/lib/game/state/*`: Conversation state, utilities.
  - `src/lib/game/memory/*`: Related history retrieval and summarization support.

- AI layer
  - `src/lib/ai/agents/*.ts`: Core agents (see Section 4). Don’t break JSON contracts (Section 8).
  - `src/lib/ai/llm.ts`, `src/lib/ai/llmProvider.ts`, `src/lib/ai/geminiProvider.ts`.
  - `src/lib/ai/config/GeminiConfigBuilder.ts`, `src/lib/ai/errors/GeminiErrorHandler.ts`.
  - `src/lib/ai/config/ResponseSchemas.ts` and `src/lib/ai/config/schemas/*`.

- State & utilities
  - `src/lib/state/hybrid/useHybridLocalStorage.svelte.ts`, `src/lib/state/gameStateManager.svelte.ts`.
  - `src/lib/state/versionMigration.ts`, `src/lib/state/errorState.svelte.ts`.
  - `src/lib/util.svelte.ts`, `src/lib/types/gameTime.ts`.

- UI components
  - `src/lib/components/*` incl. game UI (actions, modals, story, time) and Undo UI.

- Tests
  - Unit: in logic/modules (e.g., `src/lib/game/logic/*.test.ts`, agent tests).
  - E2E: `tests/test.ts` (Playwright). Config: `playwright.config.ts`.

- Config & build
  - `svelte.config.js`, `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`.
  - `eslint.config.js`, `.prettierrc`, `.prettierignore`.
  - `package.json` and scripts.

---

### 22. Runes pattern snippet (Svelte 5)

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

### 23. Run & test quick reference

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

### 24. When generating code (AI assistant rules)

Always:

- Start with a brief plan/pseudocode.
- Provide full component or module (with imports) — no ellipses unless user asks.
- Preserve JSON contracts & types.
- Use `handleX` naming for events.
- Use Tailwind/DaisyUI classes only.
- Add minimal JSDoc for complex functions.
- Avoid repetition (extract helpers).

Return only what the user requested; avoid unsolicited large rewrites.

---

### 25. Extension guidelines (if creating a new agent)

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

### 26. Contribution quality gate

Before opening PR:

1. `npm run lint` passes.
2. `npm test` passes (unit + integration subset).
3. No type errors (`tsc --noEmit`).
4. Story flow manual smoke: start new tale -> choose action -> see streamed story.

---

### 27. Recap for Copilot

If user asks for change: gather context → outline plan → confirm assumptions (max 1 sentence) → produce code → brief explanation. Respect sections above.

End of Instructions.
