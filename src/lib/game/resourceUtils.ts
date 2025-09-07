/**
 * Resource utility functions for game state management
 */
import type { Resources } from '$lib/ai/agents/characterStatsAgent';
import type { StatsUpdate } from '$lib/ai/agents/combatAgent';
import type { ResourcesWithCurrentValue } from '$lib/types/resources';

/**
 * Calculates the refill value for a resource based on its max and start values
 */
export function getRefillValue(maxResource: Resources[string]): number {
  return maxResource.max_value === maxResource.start_value
    ? maxResource.max_value
    : maxResource.start_value;
}

/**
 * Creates a stats update object for refilling resources to their starting values
 */
export function getRefillResourcesUpdateObject(
  maxResources: Resources,
  currentResources: ResourcesWithCurrentValue,
  playerCharacterName: string
): { stats_update: StatsUpdate[] } {
  const returnObject: { stats_update: StatsUpdate[] } = { stats_update: [] };
  Object.entries(maxResources)
    .filter(([resourceKey]) => resourceKey !== 'XP')
    .forEach(([resourceKey, maxResource]) => {
      const refillValue = getRefillValue(maxResource);
      if (refillValue === 0) {
        return;
      }
      returnObject.stats_update.push({
        sourceName: playerCharacterName,
        targetName: playerCharacterName,
        type: resourceKey + '_gained',
        value: { result: refillValue - (currentResources[resourceKey]?.current_value || 0) || 0 }
      });
    });
  return returnObject;
}

/**
 * Creates a stats update object for level up costs
 */
export function getLevelUpCostObject(xpCost: number, playerName: string, level: number): StatsUpdate {
  return {
    sourceName: playerName,
    targetName: playerName,
    type: 'now_level_' + (level + 1),
    value: { result: xpCost }
  };
}
