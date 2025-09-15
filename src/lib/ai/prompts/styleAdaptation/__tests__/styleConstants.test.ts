/**
 * Tests for the new style constants approach
 */

import { describe, it, expect } from 'vitest';
import { getStyleConstants, STYLE_ROLES, STYLE_CONFLICT_TERMS } from '../styleConstants';

describe('styleConstants', () => {
  describe('getStyleConstants', () => {
    it('should return RPG constants for RPG style', () => {
      const constants = getStyleConstants('rpg');
      
      expect(constants.role).toBe('Game Master');
      expect(constants.roleDescription).toBe('Pen & Paper Game Master');
      expect(constants.conflict).toBe('combat');
      expect(constants.status).toBe('Combat Status');
      expect(constants.advice).toBe('tactical_advice');
      expect(constants.gameType).toBe('RPG');
    });

    it('should return Visual Novel constants for visual-novel style', () => {
      const constants = getStyleConstants('visual-novel');
      
      expect(constants.role).toBe('Story Director');
      expect(constants.roleDescription).toBe('Interactive Story Director');
      expect(constants.conflict).toBe('emotional conflict');
      expect(constants.status).toBe('Emotional State');
      expect(constants.advice).toBe('emotional_guidance');
      expect(constants.gameType).toBe('Interactive Story');
    });

    it('should provide all expected constant categories', () => {
      const constants = getStyleConstants('rpg');
      
      expect(constants).toHaveProperty('role');
      expect(constants).toHaveProperty('roleDescription');
      expect(constants).toHaveProperty('narrativeFocus');
      expect(constants).toHaveProperty('actionGuidance');
      expect(constants).toHaveProperty('experience');
      expect(constants).toHaveProperty('conflict');
      expect(constants).toHaveProperty('status');
      expect(constants).toHaveProperty('advice');
      expect(constants).toHaveProperty('scene');
      expect(constants).toHaveProperty('gameType');
      expect(constants).toHaveProperty('focus');
    });
  });

  describe('individual constant objects', () => {
    it('should have consistent structure across all constant objects', () => {
      expect(STYLE_ROLES).toHaveProperty('rpg');
      expect(STYLE_ROLES).toHaveProperty('visual-novel');
      
      expect(STYLE_CONFLICT_TERMS).toHaveProperty('rpg');
      expect(STYLE_CONFLICT_TERMS).toHaveProperty('visual-novel');
    });

    it('should provide meaningful differences between styles', () => {
      expect(STYLE_ROLES.rpg).not.toBe(STYLE_ROLES['visual-novel']);
      expect(STYLE_CONFLICT_TERMS.rpg).not.toBe(STYLE_CONFLICT_TERMS['visual-novel']);
    });
  });

  describe('type safety', () => {
    it('should be type-safe for GameStyle values', () => {
      // This test mainly ensures compilation works with proper typing
      const rpgConstants = getStyleConstants('rpg');
      const vnConstants = getStyleConstants('visual-novel');
      
      expect(typeof rpgConstants.role).toBe('string');
      expect(typeof vnConstants.role).toBe('string');
    });
  });
});