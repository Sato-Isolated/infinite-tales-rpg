import { describe, it, expect } from 'vitest';
import { GAME_STYLES } from '$lib/ai/config/gameStyles';

describe('GameStyleSelector', () => {
  it('should have required game styles available', () => {
    expect(GAME_STYLES.rpg).toBeDefined();
    expect(GAME_STYLES['visual-novel']).toBeDefined();
  });

  it('should have correct style properties for UI display', () => {
    const rpgStyle = GAME_STYLES.rpg;
    expect(rpgStyle.name).toBe('Classic RPG');
    expect(rpgStyle.description).toBe('Adventure-focused with Game Master approach');
    
    const vnStyle = GAME_STYLES['visual-novel'];
    expect(vnStyle.name).toBe('Visual Novel');
    expect(vnStyle.description).toBe('Character-driven narrative with emotional choices');
  });

  it('should have distinct configurations', () => {
    const rpg = GAME_STYLES.rpg;
    const vn = GAME_STYLES['visual-novel'];
    
    expect(rpg.relationshipFocus).toBe(false);
    expect(vn.relationshipFocus).toBe(true);
    
    expect(rpg.emotionalDepth).toBe(false);
    expect(vn.emotionalDepth).toBe(true);
    
    expect(rpg.mechanicsWeight).toBeGreaterThan(vn.mechanicsWeight);
    expect(vn.characterEmphasis).toBeGreaterThan(rpg.characterEmphasis);
  });
});