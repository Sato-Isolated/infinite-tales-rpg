/**
 * Story-related response schemas for AI agents
 * Includes story generation and story progression schemas
 */

// Story Generation Response Schema
export const StoryGenerationResponseSchema = {
  type: 'object' as const,
  properties: {
    game: { type: 'string' as const },
    world_details: { type: 'string' as const },
    story_pace: { type: 'string' as const },
    main_scenario: { type: 'string' as const },
    character_simple_description: { type: 'string' as const },
    theme: { type: 'string' as const },
    tonality: { type: 'string' as const },
    background_context: { type: 'string' as const },
    social_dynamics: { type: 'string' as const },
    locations: { type: 'string' as const },
    npcs: { type: 'string' as const },
    story_catalyst: { type: 'string' as const },
    potential_developments: { type: 'string' as const },
    narrative_flexibility: { type: 'string' as const },
    player_agency: { type: 'string' as const },
    content_rating: { type: 'string' as const },
    tags: { type: 'string' as const }
  },
  required: [
    'game', 'world_details', 'story_pace', 'main_scenario', 'character_simple_description',
    'theme', 'tonality', 'background_context', 'social_dynamics', 'locations', 'npcs',
    'story_catalyst', 'potential_developments', 'narrative_flexibility', 'player_agency',
    'content_rating', 'tags'
  ]
};

export interface StoryGenerationResponse {
  game: string;
  world_details: string;
  story_pace: string;
  main_scenario: string;
  character_simple_description: string;
  theme: string;
  tonality: string;
  background_context: string;
  social_dynamics: string;
  locations: string;
  npcs: string;
  story_catalyst: string;
  potential_developments: string;
  narrative_flexibility: string;
  player_agency: string;
  content_rating: string;
  tags: string;
}

// Story Progression Response Schema
export const StoryResponseSchema = {
  type: 'object' as const,
  properties: {
    story: {
      type: 'string' as const,
      description: 'The main story narrative text'
    },
    xp_gain: {
      type: 'number' as const,
      description: 'Experience points gained from this action'
    },
    inventory_update: {
      type: 'object' as const,
      properties: {
        items_added: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              name: { type: 'string' as const },
              quantity: { type: 'number' as const },
              description: { type: 'string' as const, nullable: true }
            },
            required: ['name', 'quantity']
          }
        },
        items_removed: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              name: { type: 'string' as const },
              quantity: { type: 'number' as const }
            },
            required: ['name', 'quantity']
          }
        }
      },
      required: ['items_added', 'items_removed']
    },
    stats_update: {
      type: 'object' as const,
      properties: {
        health: { type: 'number' as const, nullable: true },
        mana: { type: 'number' as const, nullable: true },
        energy: { type: 'number' as const, nullable: true },
        mood: { type: 'string' as const, nullable: true },
        location: { type: 'string' as const, nullable: true }
      }
    },
    plotPointAdvancingNudgeExplanation: {
      type: 'string' as const,
      nullable: true,
      description: 'Explanation of how this advances the plot'
    },
    time_progression: {
      type: 'object' as const,
      nullable: true,
      properties: {
        hours_passed: { type: 'number' as const },
        new_time_description: { type: 'string' as const }
      },
      required: ['hours_passed', 'new_time_description']
    },
    story_beats: {
      type: 'array' as const,
      nullable: true,
      items: { type: 'string' as const }
    },
    consequences: {
      type: 'array' as const,
      nullable: true,
      items: { type: 'string' as const }
    }
  },
  required: ['story', 'xp_gain', 'inventory_update', 'stats_update']
};