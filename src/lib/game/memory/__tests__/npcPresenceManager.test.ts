import { describe, it, expect } from 'vitest';
import { buildPresenceContinuityPrompt, computePresenceContinuity, getAllNpcIdsFromTargets } from '../npcPresenceManager';

describe('npcPresenceManager', () => {
  it('extracts all npc ids from targets', () => {
    const ids = getAllNpcIdsFromTargets({
      hostile: [{ uniqueTechnicalNameId: 'orc1', displayName: 'Orc' } as any],
      friendly: [{ uniqueTechnicalNameId: 'ally1', displayName: 'Ally' } as any],
      neutral: [{ uniqueTechnicalNameId: 'shop1', displayName: 'Shopkeeper' } as any],
    });
    expect(ids.sort()).toEqual(['ally1', 'orc1', 'shop1'].sort());
  });

  it('computes party and last present ids', () => {
    const previous = {
      id: 0,
      currentPlotPoint: 'At School - PLOT_ID: 12',
      nextPlotPoint: '',
      story: '',
      inventory_update: [],
      stats_update: [],
      is_character_in_combat: false,
      currently_present_npcs: {
        hostile: [],
        friendly: [{ uniqueTechnicalNameId: 'marie', displayName: 'Marie' } as any],
        neutral: []
      },
      story_memory_explanation: ''
    } as any;
    const npcState = {
      marie: { is_party_member: true, class: 'mage', rank_enum_english: 'Average', level: 1, spells_and_abilities: [] },
      pierre: { is_party_member: false, class: 'warrior', rank_enum_english: 'Average', level: 1, spells_and_abilities: [] }
    } as any;
    const res = computePresenceContinuity(previous, npcState);
    expect(res.partyIds).toContain('marie');
    expect(res.lastPresentIds).toContain('marie');
    expect(res.previousPlotPoint).toContain('At School');
  });

  it('builds prompt with constraints', () => {
    const prompt = buildPresenceContinuityPrompt({ partyIds: ['marie'], lastPresentIds: ['marie', 'pierre'], previousPlotPoint: 'At School - PLOT_ID: 12' });
    expect(prompt).toContain('NPC PRESENCE CONTINUITY RULES');
    expect(prompt).toContain('Party members');
    expect(prompt).toContain('Do NOT include NPCs');
  });
});
