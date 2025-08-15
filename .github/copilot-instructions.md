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
| `campaignAgent.ts` | Multi-chapter campaign generation & chapter advancement support. |
| `eventAgent.ts` | Detect & emit special events (abilities unlock, transformations). |
| `summaryAgent.ts` | Story/history summarization & retrieval of related details (context pruning). |
| `jsonFixingInterceptorAgent.ts` | Attempts to repair malformed JSON from LLM before parsing. |
| `storyAgent.ts` | (If present) Additional story-focused tasks / legacy naming. |
| `mappers.ts` | Helper mappers / type conversions for agent outputs. |

Never silently change JSON contracts. If modifying: update prompt, parsing code, tests, and this file.

---
### 5. LLM Providers
`geminiProvider.ts` handles streaming (story & thoughts), safety settings, fallback logic. `pollinationsProvider.ts` builds image prompts & retrieves image. `llmProvider.ts` centralizes provider selection. `llm.ts` defines shared prompt fragments (e.g. `LANGUAGE_PROMPT`).

Streaming callbacks (expected shapes) must remain stable: `onStoryStreamUpdate(partialText)`, `onThoughtStreamUpdate(kind, partialThought)`.

---
### 6. State Management
Pattern: `const someState = useLocalStorage<Type>('stateKey', initialValue);` All principal keys:
`characterState`, `characterStatsState`, `storyState`, `campaignState`, `currentChapterState`, `gameActionsState`, `historyMessagesState`, `characterActionsState`, `npcState`, `inventoryState`, `relatedStoryHistoryState`, `relatedActionHistoryState`, `customMemoriesState`, `thoughtsState`, `gameSettingsState`, `aiConfigState`, `eventEvaluationState`, `levelUpState`, `skillsProgressionState`, `isGameEnded`, `dice`, `ttsVoiceState`.

Use snapshots before deep mutations when required: `$state.snapshot(variable.value)`.

---
### 7. Gameplay Flow
1. Creation (tale/campaign/character) -> initial agents invoked for baseline state.
2. On `game/+page.svelte`, `sendAction()` triggers Action or Story flow.
3. `actionAgent` proposes candidate actions.
4. Player selects or inputs custom action; may trigger dice roll (combat/skill gating) via `gameLogic.ts`.
5. Context is enriched (campaign advancement, combat, memory retrieval) -> `gameAgent.generateStoryProgression`.
6. Streaming updates UI; on completion, structured JSON parsed & local states updated.
7. Summarization if thresholds exceeded (`summaryAgent`).
8. Event evaluation (`eventAgent`).
9. Regenerate actions -> repeat.

---
### 8. JSON Contracts (Do Not Break)
Story Progression JSON (gameAgent): keys include `story`, `xp_gain`, `inventory_update`, `stats_update`, `image_prompt`, `plotPointAdvancingNudgeExplanation`, etc. Campaign JSON: chapters list with plot points metadata. Summary JSON: `{ keyDetails: string[], story: string }`. Related history retrieval JSON: `{ relatedDetails: Array<{ storyReference: string; relevanceScore: number }> }`. Combat/stat update JSON: defined in combat & character stats prompts (enums uppercase). Maintain stable casing & enumeration values.

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
### 14. Campaign Progression
Use `campaignLogic.ts` functions (`advanceChapterIfApplicable`, `getNextChapterPrompt`) to transition chapters. Keep chapter transitions explicit in story JSON to help LLM maintain continuity.

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
`game/+page.svelte` • `gameAgent.ts` • `actionAgent.ts` • `summaryAgent.ts` • `campaignAgent.ts` • `combatAgent.ts` • `characterStatsAgent.ts` • `eventAgent.ts` • `memoryLogic.ts` • `gameLogic.ts` • `campaignLogic.ts` • `llm.ts` • `geminiProvider.ts` • `pollinationsProvider.ts` • `useLocalStorage.svelte.ts` (state util).

---
### 21. When Generating Code (AI Assistant Rules)
Always:
* Start with a brief plan/pseudocode.
* Provide full component or module (with imports) — no ellipses unless user asks.
* Preserve JSON contracts & types.
* Use `handleX` naming for events.
* Use Tailwind/DaisyUI classes only.
* Add minimal JSDoc for complex functions.
* Avoid repetition (extract helpers).

Return only what user requested; avoid unsolicited large rewrites.

---
### 22. Extension Guidelines (If Creating New Agent)
Structure:
```ts
// src/lib/ai/agents/newCoolAgent.ts
import { someSharedPrompt } from '../llm';
import type { AIProvider } from '../llmProvider';

export interface NewCoolResult { /* ... */ }

export const newCoolAgent = (provider: AIProvider) => {
	const generate = async (input: { context: string }) : Promise<NewCoolResult> => {
		// build prompt pieces (summary, related, recent actions)
		// call provider.generateJSON or streaming method
		// parse & validate JSON (try/catch + fallback)
		return { /* parsed safe object */ };
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
