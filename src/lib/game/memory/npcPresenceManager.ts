import type { GameActionState, Targets } from '$lib/types/gameState';
import type { NPCState } from '$lib/ai/agents/characterStatsAgent';

export type NPCPresenceMemory = {
  [npcId: string]: {
    lastPresentStep: number;
    lastKnownPlotPoint?: string;
    isPartyMember?: boolean;
  };
};

/**
 * Extracts unique technical IDs from a Targets object.
 */
export function getAllNpcIdsFromTargets(targets?: Targets): string[] {
  if (!targets) return [];
  const collect = (arr?: Array<{ uniqueTechnicalNameId: string }>) =>
    (arr || []).map((n) => n.uniqueTechnicalNameId).filter(Boolean);
  const hostile = collect(targets.hostile);
  const friendly = collect(targets.friendly);
  const neutral = collect(targets.neutral);
  return Array.from(new Set([...hostile, ...friendly, ...neutral]));
}

/**
 * Computes presence continuity recommendations based on previous state and NPC state.
 * - Always carry over party members
 * - Prefer carrying over NPCs that were present in the previous step when scene change is minor
 */
export function computePresenceContinuity(
  previous: GameActionState | undefined,
  npcState: NPCState
) {
  const partyIds = Object.entries(npcState)
    .filter(([, stats]) => !!stats?.is_party_member)
    .map(([id]) => id);

  const lastPresentIds = previous ? getAllNpcIdsFromTargets(previous.currently_present_npcs) : [];

  return {
    partyIds,
    lastPresentIds,
    previousPlotPoint: previous?.currentPlotPoint,
  } as const;
}

/**
 * Builds a small, strict presence continuity prompt to help the LLM keep NPCs consistent.
 * Non-breaking: adds instructions text only.
 */
export function buildPresenceContinuityPrompt(input: {
  partyIds: string[];
  lastPresentIds: string[];
  previousPlotPoint?: string;
}) {
  const { partyIds, lastPresentIds, previousPlotPoint } = input;

  const partyLine = partyIds.length > 0
    ? `Party members (must be present unless explicitly separated): ${partyIds.join(', ')}`
    : 'Party members: none';

  const lastPresentLine = lastPresentIds.length > 0
    ? `NPCs present in the last scene: ${lastPresentIds.join(', ')}`
    : 'NPCs present in the last scene: none';

  const prevPlot = previousPlotPoint ? `Previous plot/location context: ${previousPlotPoint}` : '';

  return (
    `\nNPC PRESENCE CONTINUITY RULES:\n` +
    `${partyLine}\n` +
    `${lastPresentLine}\n` +
    (prevPlot ? prevPlot + '\n' : '') +
    `Hard constraints:\n` +
    `- Do NOT include NPCs who are not currently present in the scene.\n` +
    `- Always include party members in currently_present_npcs unless the story explicitly separates them.\n` +
    `- If transitioning to a new location, only carry over NPCs who logically travelled with the CHARACTER (party or those explicitly following).\n` +
    `- If an NPC was with the CHARACTER in the previous step, they must remember that they were there and act accordingly.\n` +
    `- If an NPC is not present, they MUST NOT speak or act in the scene.\n`
  );
}

/**
 * Updates simple presence memory for debugging/analytics. Call this after receiving a new state.
 */
export function updatePresenceMemory(
  memory: NPCPresenceMemory,
  newState: GameActionState,
  stepIndex: number
): NPCPresenceMemory {
  const ids = getAllNpcIdsFromTargets(newState.currently_present_npcs);
  const updated: NPCPresenceMemory = { ...memory };
  ids.forEach((id) => {
    updated[id] = {
      lastPresentStep: stepIndex,
      lastKnownPlotPoint: newState.currentPlotPoint,
      // isPartyMember is informational; keep if already known
      isPartyMember: updated[id]?.isPartyMember,
    };
  });
  return updated;
}
