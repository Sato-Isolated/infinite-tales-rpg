import { describe, it, expect } from 'vitest';
import { CompanionManager } from '../companionManager';
import type { CompanionCharacter } from '$lib/types/companion';

const makeCompanion = (name: string): CompanionCharacter => ({
  id: 'x',
  character_description: { name } as any,
  character_stats: { level: 1, resources: {}, attributes: {}, skills: {}, spells_and_abilities: [] } as any,
  source_type: 'template',
  source_ref: 'test',
  signature: name.toLowerCase(),
  companion_memory: { significant_events: [], personality_influences: [], relationship_timeline: [], combat_experiences: [], dialogue_history: [] },
  personality_evolution: { baseline_personality: 'x', current_personality_traits: [], evolution_history: [], stability_factor: 70 },
  relationship_data: { initial_relationship: 'test', current_status: 'acquaintance', relationship_milestones: [], shared_experiences: [] },
  created_at: new Date().toISOString(),
  last_interaction: new Date().toISOString(),
  is_active_in_party: false,
  loyalty_level: 0,
  trust_level: 0
});

describe('CompanionManager dedup', () => {
  it('merges duplicate by name and keeps single entry', () => {
    const m = new CompanionManager();
    m.createCompanion(makeCompanion("Y'shtola"));
    m.createCompanion(makeCompanion('Yshtola'));
    expect(m.getAllCompanions().length).toBe(1);
    expect(m.existsByName("Y'shtola")).toBe(true);
  });

  it('rejects unnamed companions', () => {
    const m = new CompanionManager();
    const c = makeCompanion('');
    // simulate lack of name
    c.character_description = { name: '' } as any;
    m.createCompanion(c);
    expect(m.getAllCompanions().length).toBe(0);
  });
});
