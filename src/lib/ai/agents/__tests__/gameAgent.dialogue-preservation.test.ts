import { describe, it, expect, vi } from 'vitest';
import { GameAgent } from '../gameAgent';
import type { Action } from '$lib/types/action';

// Minimal fake LLM that attempts to paraphrase, to verify our enforcement injects the exact quote
class FakeLLM {
  async generateContentStream(req: any, onStory: (c: string, b: boolean) => void, onThought: (c: string, b: boolean) => void) {
    // Try to paraphrase the dialogue deliberately
    const paraphrased = 'Il murmura que la situation était décevante.';
    const content = {
      story: paraphrased,
      inventory_update: [],
      stats_update: [],
      is_character_in_combat: false,
      currently_present_npcs: { hostile: [], friendly: [], neutral: [] },
      story_memory_explanation: ''
    };
    onStory(JSON.stringify(content), true);
    return content as any;
  }
  setSafetyLevel() { }
}

describe('GameAgent quoted dialogue preservation', () => {
  it('injects exact quoted text if model omits or paraphrases it', async () => {
    const llm = new FakeLLM() as any;
    const agent = new GameAgent(llm);

    const action: Action = {
      characterName: 'Player',
      text: 'je murmure a fenrir, "hmm pour l\'instant c\'est decevant"',
      is_custom_action: true
    } as any;

    const { newState } = await (agent as any).generateStoryProgression(
      () => { },
      () => { },
      action,
      '',
      '',
      '',
      '',
      [],
      { game: 'Test', genre: 'Fantasy', content_rating: 'safe' } as any,
      { name: 'Player' } as any,
      { player: { HP: { max_value: 10, current_value: 10, game_ends_when_zero: true }, XP: { max_value: 0, current_value: 0, game_ends_when_zero: false } } } as any,
      {},
      {} as any,
      [],
      { detailedNarrationLength: true, aiIntroducesSkills: false, randomEventsHandling: 'probability', generateAmbientDialogue: true, diceSimulationMode: 'auto' } as any,
      null,
      'low' as any
    );

    // Must contain the exact quoted string without alteration
    expect(newState.story).toContain('hmm pour l\'instant c\'est decevant');
    // And should include it in a [speaker] block that we inject if missing
    expect(newState.story).toContain('[speaker:Player]');
  });
});
