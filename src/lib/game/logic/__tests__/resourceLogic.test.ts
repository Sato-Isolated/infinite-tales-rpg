import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  refillResourcesFully,
  initializeMissingResources
} from '../resourceLogic';
import type { Resources } from '$lib/ai/agents/characterStatsAgent';
import type { GameActionState } from '$lib/types/gameState';
import type { PlayerCharactersGameState } from '$lib/types/players';
import type { ResourcesWithCurrentValue } from '$lib/types/resources';
import * as resourceUtils from '$lib/game/resourceUtils';

// Mock the resource utilities
vi.mock('$lib/game/resourceUtils', () => ({
  getRefillValue: vi.fn(),
  getRefillResourcesUpdateObject: vi.fn()
}));

describe('Resource Logic', () => {
  let mockMaxResources: Resources;
  let mockPlayerCharactersGameState: PlayerCharactersGameState;
  let mockGameActionsState: GameActionState[];

  const mockGetRefillValue = vi.mocked(resourceUtils.getRefillValue);
  const mockGetRefillResourcesUpdateObject = vi.mocked(resourceUtils.getRefillResourcesUpdateObject);

  beforeEach(() => {
    vi.clearAllMocks();

    mockMaxResources = {
      HP: {
        max_value: 100,
        start_value: 100,
        game_ends_when_zero: true
      },
      MP: {
        max_value: 50,
        start_value: 50,
        game_ends_when_zero: false
      },
      Stamina: {
        max_value: 80,
        start_value: 80,
        game_ends_when_zero: false
      }
    };

    mockPlayerCharactersGameState = {
      'player1': {
        HP: {
          max_value: 100,
          current_value: 75,
          game_ends_when_zero: true
        },
        MP: {
          max_value: 50,
          current_value: 30,
          game_ends_when_zero: false
        },
        Stamina: {
          max_value: 80,
          current_value: 60,
          game_ends_when_zero: false
        },
        XP: {
          max_value: 1000,
          current_value: 250,
          game_ends_when_zero: false
        }
      }
    };

    mockGameActionsState = [
      {
        id: 1,
        currentPlotPoint: 'Test Plot',
        nextPlotPoint: 'Next Plot',
        story: 'Test story',
        inventory_update: [],
        stats_update: [
          {
            sourceName: 'Hero',
            targetName: 'Hero',
            type: 'HP_lost',
            value: { result: 25 }
          }
        ],
        is_character_in_combat: false,
        currently_present_npcs: {
          hostile: [],
          friendly: [],
          neutral: []
        },
        story_memory_explanation: 'Test memory'
      }
    ];

    // Default mock implementations
    mockGetRefillValue.mockImplementation((resource) => {
      return resource.start_value;
    });

    mockGetRefillResourcesUpdateObject.mockReturnValue({
      stats_update: [
        {
          sourceName: 'Hero',
          targetName: 'Hero',
          type: 'HP_gained',
          value: { result: 25 }
        },
        {
          sourceName: 'Hero',
          targetName: 'Hero',
          type: 'MP_gained',
          value: { result: 20 }
        }
      ]
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('refillResourcesFully', () => {
    it('should successfully refill all resources to their start values', () => {
      mockGetRefillValue
        .mockReturnValueOnce(100) // HP
        .mockReturnValueOnce(50)  // MP
        .mockReturnValueOnce(80); // Stamina

      const result = refillResourcesFully(
        mockMaxResources,
        'player1',
        'Hero',
        mockGameActionsState,
        mockPlayerCharactersGameState
      );

      // Verify stats update was computed correctly
      expect(mockGetRefillResourcesUpdateObject).toHaveBeenCalledWith(
        mockMaxResources,
        mockPlayerCharactersGameState['player1'],
        'Hero'
      );

      // Check that stats_update was appended to the last action
      expect(result.updatedGameActionsState).toHaveLength(1);
      expect(result.updatedGameActionsState[0].stats_update).toHaveLength(3); // Original 1 + 2 new
      expect(result.updatedGameActionsState[0].stats_update[1].type).toBe('HP_gained');
      expect(result.updatedGameActionsState[0].stats_update[2].type).toBe('MP_gained');

      // Check that player resources were updated correctly
      const updatedPlayer = result.updatedPlayerCharactersGameState['player1'];
      expect(updatedPlayer.HP.current_value).toBe(100); // Refilled to start_value
      expect(updatedPlayer.MP.current_value).toBe(50);  // Refilled to start_value
      expect(updatedPlayer.Stamina.current_value).toBe(80); // Refilled to start_value
      expect(updatedPlayer.XP.current_value).toBe(250); // XP should be preserved
    });

    it('should not reduce current value if already higher than refill value', () => {
      // Set current HP higher than start value
      mockPlayerCharactersGameState['player1'].HP.current_value = 120;

      mockGetRefillValue
        .mockReturnValueOnce(100) // HP refill value
        .mockReturnValueOnce(50)  // MP
        .mockReturnValueOnce(80); // Stamina

      const result = refillResourcesFully(
        mockMaxResources,
        'player1',
        'Hero',
        mockGameActionsState,
        mockPlayerCharactersGameState
      );

      const updatedPlayer = result.updatedPlayerCharactersGameState['player1'];
      expect(updatedPlayer.HP.current_value).toBe(120); // Should remain at higher value
      expect(updatedPlayer.MP.current_value).toBe(50);  // Should be refilled
    });

    it('should throw error for invalid playerId', () => {
      expect(() => {
        refillResourcesFully(
          mockMaxResources,
          '',
          'Hero',
          mockGameActionsState,
          mockPlayerCharactersGameState
        );
      }).toThrow('Invalid parameters for refillResourcesFully');
    });

    it('should throw error for invalid playerCharacterName', () => {
      expect(() => {
        refillResourcesFully(
          mockMaxResources,
          'player1',
          '',
          mockGameActionsState,
          mockPlayerCharactersGameState
        );
      }).toThrow('Invalid parameters for refillResourcesFully');
    });

    it('should throw error for invalid maxResources', () => {
      expect(() => {
        refillResourcesFully(
          null as any,
          'player1',
          'Hero',
          mockGameActionsState,
          mockPlayerCharactersGameState
        );
      }).toThrow('Invalid parameters for refillResourcesFully');
    });

    it('should throw error when player not found in game state', () => {
      expect(() => {
        refillResourcesFully(
          mockMaxResources,
          'nonexistent_player',
          'Hero',
          mockGameActionsState,
          mockPlayerCharactersGameState
        );
      }).toThrow('Player with ID nonexistent_player not found in game state');
    });

    it('should handle empty game actions state', () => {
      const result = refillResourcesFully(
        mockMaxResources,
        'player1',
        'Hero',
        [],
        mockPlayerCharactersGameState
      );

      expect(result.updatedGameActionsState).toHaveLength(0);
      expect(result.updatedPlayerCharactersGameState['player1']).toBeDefined();
    });

    it('should handle action without existing stats_update', () => {
      const actionsWithoutStats = [{
        id: 1,
        currentPlotPoint: 'Test Plot',
        nextPlotPoint: 'Next Plot',
        story: 'Test story',
        inventory_update: [],
        stats_update: [], // Empty stats_update instead of missing
        is_character_in_combat: false,
        currently_present_npcs: {
          hostile: [],
          friendly: [],
          neutral: []
        },
        story_memory_explanation: 'Test memory'
      }] as GameActionState[];

      const result = refillResourcesFully(
        mockMaxResources,
        'player1',
        'Hero',
        actionsWithoutStats,
        mockPlayerCharactersGameState
      );

      expect(result.updatedGameActionsState[0].stats_update).toHaveLength(2);
    });

    it('should skip resources that are null or undefined', () => {
      const resourcesWithNulls = {
        HP: mockMaxResources.HP,
        MP: null,
        Stamina: undefined
      } as any;

      mockGetRefillValue.mockReturnValueOnce(100); // Only HP

      const result = refillResourcesFully(
        resourcesWithNulls,
        'player1',
        'Hero',
        mockGameActionsState,
        mockPlayerCharactersGameState
      );

      // Should only process HP
      expect(mockGetRefillValue).toHaveBeenCalledTimes(1);
      const updatedPlayer = result.updatedPlayerCharactersGameState['player1'];
      expect(updatedPlayer.HP.current_value).toBe(100);
    });

    it('should handle non-array stats_update in action', () => {
      const actionsWithNonArrayStats = [{
        id: 1,
        currentPlotPoint: 'Test Plot',
        nextPlotPoint: 'Next Plot',
        story: 'Test story',
        inventory_update: [],
        stats_update: 'invalid' as any,
        is_character_in_combat: false,
        currently_present_npcs: {
          hostile: [],
          friendly: [],
          neutral: []
        },
        story_memory_explanation: 'Test memory'
      }] as GameActionState[];

      const result = refillResourcesFully(
        mockMaxResources,
        'player1',
        'Hero',
        actionsWithNonArrayStats,
        mockPlayerCharactersGameState
      );

      expect(result.updatedGameActionsState[0].stats_update).toHaveLength(2);
    });

    it('should handle non-array return from getRefillResourcesUpdateObject', () => {
      mockGetRefillResourcesUpdateObject.mockReturnValue({
        stats_update: 'invalid' as any
      });

      const result = refillResourcesFully(
        mockMaxResources,
        'player1',
        'Hero',
        mockGameActionsState,
        mockPlayerCharactersGameState
      );

      // Should still work, treating non-array as empty array
      expect(result.updatedGameActionsState[0].stats_update).toHaveLength(1); // Original only
    });
  });

  describe('initializeMissingResources', () => {
    it('should initialize missing resources with proper current_value', () => {
      // Player missing MP and Stamina
      const playerWithMissingResources = {
        'player1': {
          HP: {
            max_value: 100,
            current_value: 75,
            game_ends_when_zero: true
          },
          XP: {
            max_value: 1000,
            current_value: 250,
            game_ends_when_zero: false
          }
          // MP and Stamina missing
        }
      };

      mockGetRefillValue
        .mockReturnValueOnce(50)  // MP
        .mockReturnValueOnce(80); // Stamina

      const result = initializeMissingResources(
        mockMaxResources,
        'player1',
        'Hero',
        mockGameActionsState,
        playerWithMissingResources
      );

      const updatedPlayer = result.updatedPlayerCharactersGameState['player1'];
      expect(updatedPlayer.HP.current_value).toBe(75); // Preserved
      expect(updatedPlayer.MP.current_value).toBe(50); // Initialized
      expect(updatedPlayer.Stamina.current_value).toBe(80); // Initialized
      expect(updatedPlayer.XP.current_value).toBe(250); // Preserved

      // Game actions should remain unchanged for initialization
      expect(result.updatedGameActionsState).toEqual(mockGameActionsState);
    });

    it('should initialize resources with undefined current_value', () => {
      const playerWithUndefinedValues = {
        'player1': {
          HP: {
            max_value: 100,
            current_value: undefined, // Missing current_value
            game_ends_when_zero: true
          },
          MP: {
            max_value: 50,
            // current_value missing entirely
            game_ends_when_zero: false
          }
        }
      };

      mockGetRefillValue
        .mockReturnValueOnce(100) // HP
        .mockReturnValueOnce(50); // MP

      const result = initializeMissingResources(
        mockMaxResources,
        'player1',
        'Hero',
        mockGameActionsState,
        playerWithUndefinedValues as any
      );

      const updatedPlayer = result.updatedPlayerCharactersGameState['player1'];
      expect(updatedPlayer.HP.current_value).toBe(100);
      expect(updatedPlayer.MP.current_value).toBe(50);
    });

    it('should return unchanged state when no resources are missing', () => {
      const result = initializeMissingResources(
        mockMaxResources,
        'player1',
        'Hero',
        mockGameActionsState,
        mockPlayerCharactersGameState
      );

      expect(result.updatedGameActionsState).toEqual(mockGameActionsState);
      expect(result.updatedPlayerCharactersGameState).toEqual(mockPlayerCharactersGameState);
      expect(mockGetRefillValue).not.toHaveBeenCalled();
    });

    it('should handle invalid playerId gracefully', () => {
      const result = initializeMissingResources(
        mockMaxResources,
        '',
        'Hero',
        mockGameActionsState,
        mockPlayerCharactersGameState
      );

      expect(result.updatedGameActionsState).toEqual(mockGameActionsState);
      expect(result.updatedPlayerCharactersGameState).toEqual(mockPlayerCharactersGameState);
    });

    it('should handle invalid resources gracefully', () => {
      const result = initializeMissingResources(
        null as any,
        'player1',
        'Hero',
        mockGameActionsState,
        mockPlayerCharactersGameState
      );

      expect(result.updatedGameActionsState).toEqual(mockGameActionsState);
      expect(result.updatedPlayerCharactersGameState).toEqual(mockPlayerCharactersGameState);
    });

    it('should handle non-existent player gracefully with warning', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

      const result = initializeMissingResources(
        mockMaxResources,
        'nonexistent_player',
        'Hero',
        mockGameActionsState,
        mockPlayerCharactersGameState
      );

      expect(consoleSpy).toHaveBeenCalledWith('Player state not found for ID: nonexistent_player');
      expect(result.updatedGameActionsState).toEqual(mockGameActionsState);
      expect(result.updatedPlayerCharactersGameState).toEqual(mockPlayerCharactersGameState);

      consoleSpy.mockRestore();
    });

    it('should handle invalid player state gracefully', () => {
      const invalidPlayerState = {
        'player1': null
      };

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

      const result = initializeMissingResources(
        mockMaxResources,
        'player1',
        'Hero',
        mockGameActionsState,
        invalidPlayerState as any
      );

      expect(consoleSpy).toHaveBeenCalledWith('Player state not found for ID: player1');
      consoleSpy.mockRestore();
    });

    it('should skip null resources during initialization', () => {
      const resourcesWithNulls = {
        HP: mockMaxResources.HP,
        MP: null,
        Stamina: undefined
      } as any;

      const playerMissingAll = {
        'player1': {
          XP: { max_value: 1000, current_value: 0, game_ends_when_zero: false }
        }
      };

      mockGetRefillValue.mockReturnValueOnce(100); // Only HP

      const result = initializeMissingResources(
        resourcesWithNulls,
        'player1',
        'Hero',
        mockGameActionsState,
        playerMissingAll
      );

      expect(mockGetRefillValue).toHaveBeenCalledTimes(1);
      const updatedPlayer = result.updatedPlayerCharactersGameState['player1'];
      expect(updatedPlayer.HP.current_value).toBe(100);
      expect(updatedPlayer.MP).toBeUndefined();
      expect(updatedPlayer.Stamina).toBeUndefined();
    });
  });

  describe('Type Guards and Safety', () => {
    it('should handle resources with missing properties safely', () => {
      const malformedPlayerState = {
        'player1': {
          HP: 'not an object',
          MP: { max_value: 50, game_ends_when_zero: false }, // Missing current_value
          Stamina: null
        }
      };

      mockGetRefillValue.mockReturnValue(50);

      const result = initializeMissingResources(
        { MP: mockMaxResources.MP },
        'player1',
        'Hero',
        mockGameActionsState,
        malformedPlayerState as any
      );

      // Should initialize MP despite malformed HP and Stamina
      const updatedPlayer = result.updatedPlayerCharactersGameState['player1'];
      expect(updatedPlayer.MP.current_value).toBe(50);
    });

    it('should preserve non-resource properties during refill', () => {
      const extendedPlayerState = {
        ...mockPlayerCharactersGameState,
        'player1': {
          ...mockPlayerCharactersGameState['player1'],
          customProperty: 'test value',
          anotherProperty: 42
        }
      } as any;

      mockGetRefillValue.mockReturnValue(100);

      const result = refillResourcesFully(
        { HP: mockMaxResources.HP },
        'player1',
        'Hero',
        mockGameActionsState,
        extendedPlayerState
      );

      const updatedPlayer = result.updatedPlayerCharactersGameState['player1'] as any;
      expect(updatedPlayer.customProperty).toBe('test value');
      expect(updatedPlayer.anotherProperty).toBe(42);
      expect(updatedPlayer.HP.current_value).toBe(100);
    });

    it('should handle getCurrentResourceValue with edge cases', () => {
      // This tests the internal getCurrentResourceValue function indirectly
      const edgeCasePlayerState = {
        'player1': {
          HP: { max_value: 100, current_value: 0, game_ends_when_zero: true }, // Zero value
          MP: { max_value: 50, current_value: -10, game_ends_when_zero: false }, // Negative value
          Stamina: { max_value: 80, game_ends_when_zero: false }, // Missing current_value
          Energy: null, // Null resource
          Mana: 'invalid' // Invalid type
        }
      };

      mockGetRefillValue.mockReturnValue(50);

      const result = refillResourcesFully(
        { HP: mockMaxResources.HP },
        'player1',
        'Hero',
        mockGameActionsState,
        edgeCasePlayerState as any
      );

      // Should handle edge cases gracefully
      expect(result.updatedPlayerCharactersGameState['player1']).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete resource management workflow', () => {
      // Step 1: Initialize missing resources
      const playerWithMissingMP = {
        'player1': {
          HP: {
            max_value: 100,
            current_value: 50,
            game_ends_when_zero: true
          }
          // MP missing
        }
      };

      mockGetRefillValue.mockReturnValue(50);

      const initResult = initializeMissingResources(
        mockMaxResources,
        'player1',
        'Hero',
        mockGameActionsState,
        playerWithMissingMP
      );

      // Verify MP was initialized
      expect(initResult.updatedPlayerCharactersGameState['player1'].MP.current_value).toBe(50);

      // Step 2: Refill resources fully
      mockGetRefillValue.mockReturnValue(100);

      const refillResult = refillResourcesFully(
        { HP: mockMaxResources.HP },
        'player1',
        'Hero',
        initResult.updatedGameActionsState,
        initResult.updatedPlayerCharactersGameState
      );

      // Verify HP was refilled
      expect(refillResult.updatedPlayerCharactersGameState['player1'].HP.current_value).toBe(100);
    });

    it('should maintain state integrity across multiple operations', () => {
      let currentGameState = mockGameActionsState;
      let currentPlayerState = mockPlayerCharactersGameState;

      // Multiple refills
      for (let i = 0; i < 3; i++) {
        mockGetRefillValue.mockReturnValue(100);

        const result = refillResourcesFully(
          { HP: mockMaxResources.HP },
          'player1',
          'Hero',
          currentGameState,
          currentPlayerState
        );

        currentGameState = result.updatedGameActionsState;
        currentPlayerState = result.updatedPlayerCharactersGameState;
      }

      // Should accumulate stats updates
      expect(currentGameState[0].stats_update.length).toBeGreaterThan(1);
      expect(currentPlayerState['player1'].HP.current_value).toBe(100);
    });
  });
});
