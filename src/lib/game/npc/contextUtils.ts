/**
 * NPC context utilities for generating enriched narrative context
 */
import { stringifyPretty } from '$lib/util.svelte';
import type { NPCState } from '$lib/ai/agents/characterStatsAgent';
import {
  NPC_TEMPORAL_CONTINUITY_PROMPT,
  NPC_ACTIVITY_DURING_ABSENCE_PROMPT,
  INTEGRATE_NPC_TEMPORAL_CONTEXT,
  NPC_TIME_GAP_EXAMPLES
} from '$lib/ai/prompts/templates/npcTemporalContinuity';

/**
 * Generates enriched NPC context including temporal continuity and relationship details
 * 
 * This enhanced version includes temporal continuity rules and detailed relationship context
 * for better narrative coherence in the game story.
 */
export function generateEnrichedNPCContext(npcState: NPCState, playerName: string = "CHARACTER"): string {
  let enrichedContext = "The following is the internal state of the NPCs.\n";
  enrichedContext += stringifyPretty(npcState);

  // Add temporal continuity rules for NPCs
  enrichedContext += `\n${NPC_TEMPORAL_CONTINUITY_PROMPT}\n`;
  enrichedContext += `\n${NPC_ACTIVITY_DURING_ABSENCE_PROMPT}\n`;
  enrichedContext += `\n${INTEGRATE_NPC_TEMPORAL_CONTEXT}\n`;
  enrichedContext += `\n${NPC_TIME_GAP_EXAMPLES}\n`;

  // Add relationship context for each NPC
  Object.keys(npcState).forEach(npcId => {
    const npc = npcState[npcId];
    if (npc?.relationships && npc.relationships.length > 0) {
      enrichedContext += `\n=== CONTEXTE RELATIONNEL POUR ${npcId} ===\n`;

      npc.relationships.forEach(rel => {
        const emotionalTone = {
          'very_negative': 'déteste profondément',
          'negative': 'n\'aime pas',
          'neutral': 'a une relation neutre avec',
          'positive': 'apprécie',
          'very_positive': 'adore'
        }[rel.emotional_bond];

        if (rel.target_npc_id) {
          enrichedContext += `• ${rel.specific_role || rel.relationship_type} de ${rel.target_name} - ${emotionalTone} cette personne\n`;
        } else {
          enrichedContext += `• Relation avec ${playerName}: ${rel.specific_role || rel.relationship_type} - ${emotionalTone} le joueur\n`;
        }

        if (rel.description) {
          enrichedContext += `  └─ ${rel.description}\n`;
        }
      });

      if (npc.speech_patterns) {
        enrichedContext += `• Façon de parler: ${npc.speech_patterns}\n`;
      }

      if (npc.personality_traits && npc.personality_traits.length > 0) {
        enrichedContext += `• Traits de personnalité: ${npc.personality_traits.join(', ')}\n`;
      }

      if (npc.background_notes) {
        enrichedContext += `• Contexte personnel: ${npc.background_notes}\n`;
      }

      enrichedContext += "=== FIN CONTEXTE RELATIONNEL ===\n";
    }
  });

  return enrichedContext;
}
