import { describe, it, expect } from 'vitest';
import { GAME_STYLES, getGameStyleConfig, isCharacterFocused, hasEmotionalDepth } from '../gameStyles';

describe('gameStyles', () => {
  describe('GAME_STYLES', () => {
    it('should have RPG and Visual Novel styles defined', () => {
      expect(GAME_STYLES.rpg).toBeDefined();
      expect(GAME_STYLES['visual-novel']).toBeDefined();
    });

    it('should have correct RPG configuration', () => {
      const rpg = GAME_STYLES.rpg;
      
      expect(rpg.id).toBe('rpg');
      expect(rpg.name).toBe('Classic RPG');
      expect(rpg.gmRole).toBe('Pen & Paper Game Master');
      expect(rpg.mechanicsWeight).toBe(0.8);
      expect(rpg.characterEmphasis).toBe(0.4);
      expect(rpg.relationshipFocus).toBe(false);
      expect(rpg.emotionalDepth).toBe(false);
    });

    it('should have correct Visual Novel configuration', () => {
      const vn = GAME_STYLES['visual-novel'];
      
      expect(vn.id).toBe('visual-novel');
      expect(vn.name).toBe('Visual Novel');
      expect(vn.gmRole).toBe('Interactive Story Director');
      expect(vn.mechanicsWeight).toBe(0.3);
      expect(vn.characterEmphasis).toBe(0.9);
      expect(vn.relationshipFocus).toBe(true);
      expect(vn.emotionalDepth).toBe(true);
    });
  });

  describe('getGameStyleConfig', () => {
    it('should return correct config for valid styles', () => {
      expect(getGameStyleConfig('rpg')).toBe(GAME_STYLES.rpg);
      expect(getGameStyleConfig('visual-novel')).toBe(GAME_STYLES['visual-novel']);
    });

    it('should fallback to RPG for invalid styles', () => {
      // @ts-expect-error - Testing invalid input
      expect(getGameStyleConfig('invalid')).toBe(GAME_STYLES.rpg);
    });
  });

  describe('isCharacterFocused', () => {
    it('should return false for RPG', () => {
      expect(isCharacterFocused('rpg')).toBe(false);
    });

    it('should return true for Visual Novel', () => {
      expect(isCharacterFocused('visual-novel')).toBe(true);
    });
  });

  describe('hasEmotionalDepth', () => {
    it('should return false for RPG', () => {
      expect(hasEmotionalDepth('rpg')).toBe(false);
    });

    it('should return true for Visual Novel', () => {
      expect(hasEmotionalDepth('visual-novel')).toBe(true);
    });
  });
});