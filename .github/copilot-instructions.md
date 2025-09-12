## Infinite Tales RPG – Copilot Project Instructions

These instructions define **MANDATORY** requirements for AI assistants (GitHub Copilot, chat models) to write code consistent with this repo. These are non-negotiable standards that MUST be followed. For non-trivial requests: start with a short plan/pseudocode, then implement.

**CRITICAL REQUIREMENTS:**
- Every code change MUST include corresponding test updates
- Code MUST be fragmented into small, focused files
- No backwards compatibility - breaking changes are preferred over complexity
- Tests MUST be properly organized and structured

---

### 1. Base standards

Simplicity • Readability • Maintainability • Testability • Reusability • Reasonable performance.
- Prefer early returns and small pure helpers.
- Styling: Tailwind v4 + DaisyUI 5 only. No inline styles; avoid raw CSS except shared utilities with @apply.
- Accessibility: semantic elements or proper `role`, `aria-*`, focusable when needed.
- Handlers: prefix with `handle` (e.g., `handleClick`).
- Svelte 5 runes: import from `svelte` and use `$state`, `$derived`, `$effect`. Avoid legacy `$:` labels.

---

### 2. MANDATORY: Code Fragmentation Standards

**REQUIRED PRACTICES:**
- Maximum 200 lines per file (excluding imports/exports)
- Single responsibility principle: one concept per file
- Extract reusable logic into separate utility files
- Break large components into smaller, composable parts
- Prefer composition over inheritance

**FILE ORGANIZATION:**
- `/components/` - UI components (max 150 lines each)
- `/utils/` - Pure utility functions (max 100 lines each) 
- `/logic/` - Business logic modules (max 200 lines each)
- `/types/` - Type definitions (group related types)

**FRAGMENTATION EXAMPLES:**
```
❌ DON'T: gameLogic.ts (800 lines)
✅ DO: 
  - gameLogic/diceRollLogic.ts
  - gameLogic/combatLogic.ts  
  - gameLogic/characterLogic.ts
```

---

### 3. MANDATORY: Testing Policy

**NON-NEGOTIABLE REQUIREMENTS:**
- Every code change MUST include corresponding test updates
- New functions/components MUST have tests before implementation (TDD preferred)
- Modified functions MUST have updated tests
- Deleted code MUST have tests removed
- Test coverage is part of the deliverable, not optional

**TESTING OBLIGATIONS:**
- Pure functions → Unit tests (100% coverage required)
- Components → Component tests + accessibility tests
- API endpoints → Integration tests
- User flows → E2E tests
- Error conditions → Error handling tests

**FAILURE TO TEST = INCOMPLETE WORK**

---

### 4. MANDATORY: Test Organization Structure

**REQUIRED FOLDER STRUCTURE:**
```
src/lib/
  ├── components/
  │   ├── Button.svelte
  │   └── __tests__/
  │       ├── Button.test.ts
  │       └── Button.accessibility.test.ts
  ├── game/logic/
  │   ├── diceRollLogic.ts
  │   └── __tests__/
  │       ├── diceRollLogic.test.ts
  │       └── diceRollLogic.integration.test.ts
  └── utils/
      ├── formatters.ts
      └── __tests__/
          └── formatters.test.ts

tests/ (E2E only)
  ├── game-flow.test.ts
  └── user-scenarios.test.ts
```

**NAMING CONVENTIONS:**
- Unit tests: `{filename}.test.ts`
- Integration tests: `{filename}.integration.test.ts`
- Accessibility tests: `{filename}.accessibility.test.ts`
- E2E tests: `{feature}.test.ts`

**CO-LOCATION REQUIREMENTS:**
- Unit/component tests MUST be in `__tests__/` subfolder next to source
- E2E tests MUST be in root `/tests/` folder
- Test utilities MUST be in `/tests/utils/`

---

### 5. MANDATORY: No Backwards Compatibility Policy

**BREAKING CHANGES ARE PREFERRED:**
- Never maintain deprecated APIs for backwards compatibility
- Remove old code immediately when replacing it
- Use version migration scripts instead of compatibility layers
- Breaking changes > technical debt

**MIGRATION STRATEGY:**
- Create migration utilities in `/src/lib/state/migrations/`
- Document breaking changes in commit messages
- Update all consumers in the same commit
- Remove migration code after one release cycle

**FORBIDDEN PRACTICES:**
- `@deprecated` markers (delete instead)
- Optional parameters for backwards compatibility
- Conditional logic for old vs new behavior
- Polyfills for removed features

---

### 6. Tech stack

SvelteKit 2 (Svelte 5 runes) • TypeScript 5 • Vite 7 • TailwindCSS v4 + DaisyUI 5 • ESLint flat config + Prettier • Vitest (unit) • Playwright (E2E) • Google Gemini via `@google/genai` • Hybrid state persistence (localStorage + file-backed) via `useHybridLocalStorage`.

---

### 7. High-level architecture

Layers:

1) UI pages & components: `src/routes` and `src/lib/components/*`.
2) AI agents: `src/lib/ai/agents/*` orchestrate prompts and structured JSON outputs (see Section 4).
3) Game logic: `src/lib/game/logic/*` and controller `src/lib/game/controllers/gameController.ts`.
4) State: hybrid persistence in `src/lib/state/**` with `useHybridLocalStorage` and `gameStateManager.svelte.ts`.
5) LLM provider abstractions: `src/lib/ai/*Provider.ts`, `llm.ts`.

Data flow: UI event -> gameController orchestrates -> agents generate story/actions (Gemini structured JSON) -> update hybrid state -> optional summarization/memory -> regenerate actions -> UI refresh.

---

### 8. Core AI agents (responsibilities)

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

### 9. LLM providers

- `geminiProvider.ts`: Handles content generation, simulated streaming, safety settings, and structured output with `@google/genai`. Uses `GeminiConfigBuilder` and `ModelCapabilities`.
- `llmProvider.ts`: Provider selection.
- `llm.ts`: Shared prompt fragments/constants (e.g., `LANGUAGE_PROMPT`).

Keep streaming/thought callbacks stable when used by UI/controller.

---

### 10. State management

Use hybrid storage utilities: `src/lib/state/hybrid/useHybridLocalStorage.svelte.ts` and `src/lib/state/gameStateManager.svelte.ts`.
- Keys and their storage targets are defined in `src/lib/state/hybrid-storage-config.json` (localStorage vs. file-backed store). Do not hardcode new keys—add them to the config when introducing persistent state.
- Common keys: `gameActionsState`, `historyMessagesState`, `storyState`, `npcState`, `characterState`, `characterStatsState`, `playerCharactersGameState`, `inventoryState`, `systemInstructionsState`, `eventEvaluationState`, `gameTimeState`, `skillsProgressionState`, `characterTransformState`, `aiConfigState`, `levelUpState`, `thoughtsState`, `chosenActionState`, `playerCharactersIdToNamesMapState`, difficulty/roll-related keys, `isGameEnded`, `aiLanguage`, `temperatureState`, dice flags, `customMemoriesState`, `customGMNotesState`, `related*HistoryState`, `apiKeyState`, `safetySettingsState`.
- For complex updates, prefer manager patterns in `gameStateManager.svelte.ts`. Take snapshots before deep mutations when required.

---

### 11. Gameplay flow

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

### 12. JSON contracts (do not break)

Schemas live under `src/lib/ai/config/ResponseSchemas.ts` (modular files in `config/schemas/*`). Maintain casing/enums. Examples: story progression includes `story`, `xp_gain`, `inventory_update`, `stats_update`, `image_prompt`, `plotPointAdvancingNudgeExplanation`, etc. Summaries, related history, combat and character stats have dedicated schemas.

If adding fields:
1) Update schema/types; 2) adjust prompts; 3) update consumers/parsers with safe defaults; 4) add tests; 5) reflect changes here.

---

### 13. Coding conventions

- Svelte 5 runes for reactivity; keep components thin—move logic into `src/lib/game/logic/*` or agents.
- Use `handleX` naming, arrow functions, semantic HTML, Tailwind+DaisyUI classes.
- `$derived` for computed values; `$effect` for idempotent side-effects only.
- Error handling via `handleError` and `stringifyPretty` (`src/lib/util.svelte.ts`).
- Undo/state snapshots exist; see `saveSnapshotBeforeAction`, `undoManager.ts`, and `UndoButton.svelte`.

---

### 14. Testing (EXPANDED - MANDATORY COMPLIANCE)

**TESTING IS NOT OPTIONAL - IT IS REQUIRED FOR ALL CODE CHANGES**

**UNIT TESTING (Vitest):**
- All pure functions in `src/lib/game/logic/*` MUST have 100% test coverage
- All parsers and mappers MUST be unit tested
- All utility functions MUST have comprehensive tests
- Tests MUST be co-located in `__tests__/` folders
- Mock external dependencies and AI agent outputs for deterministic tests

**COMPONENT TESTING:**
- All UI components MUST have component tests
- Test user interactions and state changes
- Include accessibility tests for all interactive components
- Test error states and edge cases
- Use `@testing-library/svelte` patterns

**INTEGRATION TESTING:**
- Test agent workflows and state management integration
- Test API endpoints and data flow
- Test complex interactions between components
- Mock external services but test internal integrations

**E2E TESTING (Playwright):**
- Main user flows MUST be covered: game start → action selection → story progression
- Test streaming functionality and UI updates
- Test error handling and recovery scenarios
- Keep tests in `/tests/` folder with descriptive names

**TEST MAINTENANCE:**
- When modifying code, update tests BEFORE making changes when possible (TDD)
- When deleting code, delete corresponding tests in the same commit
- When adding features, add tests for happy path, error cases, and edge cases
- Failing tests block deployment - no exceptions

**COVERAGE REQUIREMENTS:**
- Pure functions: 100% line and branch coverage
- Components: All user interactions and state transitions
- Critical paths: Complete E2E coverage
- Error handling: All error conditions tested

---

### 15. Performance & streaming

Minimize tokens: use summaries and related retrieval; don’t send full raw history. Prefer recent actions + summaries + relevant details. Lazy-load heavy components when feasible.

---

### 16. Memory & context

Summaries compress long histories; related retrieval targets context slices under `src/lib/game/memory/*`. Custom player memories should be prioritized when relevant. Order prompt context from most to least recent/relevant.

---

### 17. Dice & skill checks

`src/lib/game/logic/gameLogic.ts` determines gates (e.g., `mustRollDice`). Use `diceRollLogic.ts`, `combatLogic.ts`, etc. On success/failure, inject side-effects via helpers. Include outcome descriptors in story context for coherence.

---

### 18. Progression notes

Campaign feature is removed. Ensure continuity via plot-point hints in `gameAgent` JSON.

---

### 19. Skills & level progression

Use progression helpers (see `src/lib/game/progression/*` and `logic/levelLogic.ts`). Ensure XP updates feed level logic before UI refresh.

---

### 20. Events & abilities

`eventAgent` evaluates triggers after story updates. If adding new ability structures, update schemas, state persistence, and UI components accordingly.

---

### 21. Error handling & fallback

Use `GeminiErrorHandler`, `GeminiConfigBuilder`, and provider fallback paths prudently. Keep retries bounded. Always show a user-friendly message and log the raw error. Safety mapping is available via `getSafetyLevelFromStory`.

---

### 22. Adding / modifying features checklist

Before coding:

1. **MANDATORY: Plan test updates** - Define what tests need to be added/modified/deleted.
2. **MANDATORY: Check file sizes** - Ensure new code follows fragmentation standards (max 200 lines).
3. Identify affected Agent(s) or Logic file.
4. Assess JSON contract change? If yes, follow Section 12 procedure.
5. Need new persisted key? Add via `useLocalStorage` with clear name.
6. UI: create reusable component under `src/lib/components` (single responsibility, max 150 lines).
7. Add accessibility attributes.
8. **MANDATORY: Write tests FIRST** - Unit tests for logic, component tests for UI, integration tests for workflows.
9. **MANDATORY: Update existing tests** - Modify any tests affected by your changes.
10. **MANDATORY: No backwards compatibility** - Remove deprecated code instead of maintaining it.
11. Consider summarization & context size impact.
12. Update this instructions file if any agent/contract changes.
13. Run lint + tests locally - ALL TESTS MUST PASS.
14. Keep code minimal, explicit, with early returns.

**VERIFICATION CHECKLIST:**
- [ ] All new functions have tests
- [ ] All modified functions have updated tests  
- [ ] All deleted code has tests removed
- [ ] No file exceeds line limits
- [ ] No backwards compatibility code added
- [ ] All tests pass locally

---

### 23. Common pitfalls

- **CRITICAL: Forgetting to update tests** when modifying code (violates mandatory testing policy).
- **CRITICAL: Creating files over 200 lines** (violates fragmentation standards).
- **CRITICAL: Adding backwards compatibility** instead of making clean breaking changes.
- **CRITICAL: Putting tests in wrong locations** - must follow the mandatory test organization structure.
- Forgetting snapshots before deep object mutation (may break reactivity/undo).
- Prompt context too broad (token bloat); keep minimal and relevant.
- Changing enum casing or field names (breaks contracts).
- Heavy computations inside `$effect` causing jank.
- Missing accessibility attributes.
- **CRITICAL: Modifying code without corresponding test updates** - this is incomplete work.
- **CRITICAL: Creating monolithic components** instead of breaking them into smaller, composable parts.

---

### 24. Quick reference links

UI: `src/routes/game/+page.svelte`
Controller: `src/lib/game/controllers/gameController.ts`
Logic: `src/lib/game/logic/*`
Memory: `src/lib/game/memory/*`
Agents: `src/lib/ai/agents/*`
Schemas: `src/lib/ai/config/ResponseSchemas.ts` and `src/lib/ai/config/schemas/*`
LLM: `src/lib/ai/llm.ts`, `src/lib/ai/geminiProvider.ts`, `src/lib/ai/llmProvider.ts`
State: `src/lib/state/hybrid/useHybridLocalStorage.svelte.ts`, `src/lib/state/gameStateManager.svelte.ts`

---

### 25. Important files & directories (map)

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

### 26. Runes pattern snippet (Svelte 5)

Minimal, accessible pattern aligned with Section 13:

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

### 27. Run & test quick reference

- Dev server: `pnpm run dev`
- Typecheck: `pnpm run check` (watch: `pnpm run check:watch`)
- Lint/format: `pnpm run lint` • `pnpm run lint:fix` • `pnpm run format`
- Unit tests: `pnpm run test:unit` (Vitest)
- E2E tests: `pnpm run test:integration` (Playwright)
- Build/preview: `pnpm run build` • `pnpm run preview`
- Release: `pnpm run release` (release-it)

Notes:

- Keep tests deterministic; mock LLM outputs for agents.
- After changing public contracts, update tests and this file (Sections 12 & 22).

---

### 28. When generating code (AI assistant rules)

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

### 29. Extension guidelines (if creating a new agent)

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

### 30. Contribution quality gate

Before opening PR:

1. `pnpm run lint` passes.
2. `pnpm test:unit` passes (unit + integration subset).
3. No type errors (`tsc --noEmit`).
4. Story flow manual smoke: start new tale -> choose action -> see streamed story.

---

### 31. Recap for Copilot

If user asks for change: gather context → outline plan → confirm assumptions (max 1 sentence) → produce code → brief explanation. Respect sections above.

End of Instructions.
