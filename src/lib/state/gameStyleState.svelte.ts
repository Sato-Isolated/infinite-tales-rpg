/**
 * Game style state management
 * Manages the selected narrative style (RPG vs Visual Novel)
 */

import type { GameStyle } from '../ai/config/gameStyles';

/**
 * Simple reactive state for game style that works at module level
 * Uses localStorage directly to avoid $effect issues at module level
 */
let _gameStyleValue: GameStyle = 'rpg';

// Load initial value from localStorage if available
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const stored = localStorage.getItem('gameStyleState');
    if (stored) {
      const parsed = JSON.parse(stored) as GameStyle;
      if (parsed === 'rpg' || parsed === 'visual-novel') {
        _gameStyleValue = parsed;
      }
    }
  } catch {
    // Ignore parse errors, use default
  }
}

/**
 * Save to localStorage
 */
function saveToLocalStorage(value: GameStyle) {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem('gameStyleState', JSON.stringify(value));
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Simple reactive state object for game style
 */
export const gameStyleState = {
  get value(): GameStyle {
    return _gameStyleValue;
  },
  set value(newValue: GameStyle) {
    _gameStyleValue = newValue;
    saveToLocalStorage(newValue);
  }
};

/**
 * Reset game style to default (RPG)
 */
export function resetGameStyle() {
  gameStyleState.value = 'rpg';
}

/**
 * Set game style and validate the value
 */
export function setGameStyle(style: GameStyle) {
  if (style === 'rpg' || style === 'visual-novel') {
    gameStyleState.value = style;
  } else {
    console.warn(`Invalid game style: ${style}. Defaulting to 'rpg'.`);
    gameStyleState.value = 'rpg';
  }
}

/**
 * Get current game style with fallback
 */
export function getCurrentGameStyle(): GameStyle {
  return gameStyleState.value || 'rpg';
}

/**
 * Check if current style is Visual Novel
 */
export function isVisualNovelStyle(): boolean {
  return getCurrentGameStyle() === 'visual-novel';
}

/**
 * Check if current style is RPG
 */
export function isRPGStyle(): boolean {
  return getCurrentGameStyle() === 'rpg';
}