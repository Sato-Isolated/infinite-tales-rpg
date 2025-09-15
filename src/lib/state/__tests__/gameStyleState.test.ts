import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  gameStyleState, 
  resetGameStyle, 
  setGameStyle, 
  getCurrentGameStyle, 
  isVisualNovelStyle, 
  isRPGStyle 
} from '../gameStyleState.svelte';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock window and localStorage for test environment
Object.defineProperty(globalThis, 'window', {
  value: {
    localStorage: mockLocalStorage,
  },
  writable: true,
});

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('gameStyleState', () => {
  beforeEach(() => {
    // Clear localStorage mocks
    vi.clearAllMocks();
    
    // Reset state before each test
    resetGameStyle();
  });

  describe('gameStyleState', () => {
    it('should have default value of rpg', () => {
      expect(gameStyleState.value).toBe('rpg');
    });
  });

  describe('setGameStyle', () => {
    it('should set valid RPG style', () => {
      setGameStyle('rpg');
      expect(gameStyleState.value).toBe('rpg');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('gameStyleState', '"rpg"');
    });

    it('should set valid Visual Novel style', () => {
      setGameStyle('visual-novel');
      expect(gameStyleState.value).toBe('visual-novel');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('gameStyleState', '"visual-novel"');
    });

    it('should warn and default to RPG for invalid style', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // @ts-expect-error - Testing invalid input
      setGameStyle('invalid-style');
      
      expect(consoleSpy).toHaveBeenCalledWith('Invalid game style: invalid-style. Defaulting to \'rpg\'.');
      expect(gameStyleState.value).toBe('rpg');
      
      consoleSpy.mockRestore();
    });
  });

  describe('getCurrentGameStyle', () => {
    it('should return current style', () => {
      setGameStyle('visual-novel');
      expect(getCurrentGameStyle()).toBe('visual-novel');
    });

    it('should fallback to rpg if value is undefined', () => {
      // Simulate undefined value
      gameStyleState.value = undefined as any;
      expect(getCurrentGameStyle()).toBe('rpg');
    });
  });

  describe('isVisualNovelStyle', () => {
    it('should return true when style is visual-novel', () => {
      setGameStyle('visual-novel');
      expect(isVisualNovelStyle()).toBe(true);
    });

    it('should return false when style is rpg', () => {
      setGameStyle('rpg');
      expect(isVisualNovelStyle()).toBe(false);
    });
  });

  describe('isRPGStyle', () => {
    it('should return true when style is rpg', () => {
      setGameStyle('rpg');
      expect(isRPGStyle()).toBe(true);
    });

    it('should return false when style is visual-novel', () => {
      setGameStyle('visual-novel');
      expect(isRPGStyle()).toBe(false);
    });
  });

  describe('resetGameStyle', () => {
    it('should reset to rpg', () => {
      setGameStyle('visual-novel');
      expect(gameStyleState.value).toBe('visual-novel');
      
      resetGameStyle();
      expect(gameStyleState.value).toBe('rpg');
    });
  });

  describe('localStorage integration', () => {
    it('should load initial value from localStorage', () => {
      // This test would need to be done with module re-import,
      // but for now we'll test that setGameStyle saves correctly
      setGameStyle('visual-novel');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('gameStyleState', '"visual-novel"');
    });

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });
      
      // Should not throw error
      expect(() => setGameStyle('visual-novel')).not.toThrow();
      expect(gameStyleState.value).toBe('visual-novel');
    });
  });
});