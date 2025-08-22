/**
 * Structured response schemas for @google/genai
 * Replaces manual JSON parsing with type-safe structured output
 */

import { Type } from '@google/genai';

/**
 * Schema for story progression responses from gameAgent
 * Replaces manual parsing in jsonStreamHelper
 */
export const StoryResponseSchema = {
  type: Type.OBJECT,
  properties: {
    story: {
      type: Type.STRING,
      description: "The narrative text progression that will be streamed to the user"
    },
    xp_gain: {
      type: Type.NUMBER,
      description: "Experience points gained from this action (0 or positive integer)"
    },
    inventory_update: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Items added (+item) or removed (-item) from inventory"
    },
    stats_update: {
      type: Type.OBJECT,
      properties: {
        health: { type: Type.NUMBER, description: "Health points change" },
        mana: { type: Type.NUMBER, description: "Mana points change" },
        stamina: { type: Type.NUMBER, description: "Stamina points change" },
        strength: { type: Type.NUMBER, description: "Strength stat change" },
        intelligence: { type: Type.NUMBER, description: "Intelligence stat change" },
        dexterity: { type: Type.NUMBER, description: "Dexterity stat change" },
        constitution: { type: Type.NUMBER, description: "Constitution stat change" },
        wisdom: { type: Type.NUMBER, description: "Wisdom stat change" },
        charisma: { type: Type.NUMBER, description: "Charisma stat change" }
      },
      description: "Character stats updates (positive or negative changes)"
    },
    image_prompt: {
      type: Type.STRING,
      description: "Detailed prompt for AI image generation to visualize the scene"
    },
    plotPointAdvancingNudgeExplanation: {
      type: Type.STRING,
      description: "Internal explanation of how this advances the plot (for campaign progression)"
    },
    gameTimeAdvancement: {
      type: Type.OBJECT,
      properties: {
        hours: { type: Type.NUMBER, description: "Hours that passed" },
        days: { type: Type.NUMBER, description: "Days that passed" }
      },
      description: "Time advancement from this action"
    },
    eventTriggers: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Events that should be triggered after this story progression"
    }
  },
  required: ['story'],
  propertyOrdering: [
    'story',
    'xp_gain',
    'inventory_update',
    'stats_update',
    'image_prompt',
    'plotPointAdvancingNudgeExplanation',
    'gameTimeAdvancement',
    'eventTriggers'
  ]
};

/**
 * Schema for action generation responses from actionAgent
 */
export const ActionResponseSchema = {
  type: Type.OBJECT,
  properties: {
    actions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          action: {
            type: Type.STRING,
            description: "The action text the player can choose"
          },
          description: {
            type: Type.STRING,
            description: "Detailed description of what this action entails"
          },
          difficulty: {
            type: Type.STRING,
            enum: ["TRIVIAL", "EASY", "MEDIUM", "HARD", "EXTREME"],
            description: "Difficulty level of the action"
          },
          consequences: {
            type: Type.STRING,
            description: "Potential consequences or outcomes of this action"
          },
          skillRequired: {
            type: Type.STRING,
            description: "Skill that might be tested for this action (optional)"
          },
          riskLevel: {
            type: Type.STRING,
            enum: ["LOW", "MEDIUM", "HIGH", "EXTREME"],
            description: "Risk level associated with this action"
          }
        },
        required: ['action', 'description', 'difficulty']
      },
      description: "Array of available actions for the player"
    }
  },
  required: ['actions']
};

/**
 * Schema for character creation/update responses from characterAgent
 */
export const CharacterResponseSchema = {
  type: Type.OBJECT,
  properties: {
    description: {
      type: Type.STRING,
      description: "Detailed character description for narrative purposes"
    },
    image_prompt: {
      type: Type.STRING,
      description: "Prompt for generating character portrait"
    },
    backstory: {
      type: Type.STRING,
      description: "Character's backstory and motivation"
    },
    personality_traits: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Key personality traits of the character"
    }
  },
  required: ['description']
};

/**
 * Schema for character stats initialization/update from characterStatsAgent
 */
export const CharacterStatsResponseSchema = {
  type: Type.OBJECT,
  properties: {
    stats: {
      type: Type.OBJECT,
      properties: {
        health: { type: Type.NUMBER, description: "Current health points" },
        maxHealth: { type: Type.NUMBER, description: "Maximum health points" },
        mana: { type: Type.NUMBER, description: "Current mana points" },
        maxMana: { type: Type.NUMBER, description: "Maximum mana points" },
        stamina: { type: Type.NUMBER, description: "Current stamina points" },
        maxStamina: { type: Type.NUMBER, description: "Maximum stamina points" },
        strength: { type: Type.NUMBER, description: "Strength attribute" },
        intelligence: { type: Type.NUMBER, description: "Intelligence attribute" },
        dexterity: { type: Type.NUMBER, description: "Dexterity attribute" },
        constitution: { type: Type.NUMBER, description: "Constitution attribute" },
        wisdom: { type: Type.NUMBER, description: "Wisdom attribute" },
        charisma: { type: Type.NUMBER, description: "Charisma attribute" },
        level: { type: Type.NUMBER, description: "Character level" },
        experience: { type: Type.NUMBER, description: "Current experience points" }
      },
      required: ['health', 'maxHealth', 'level'],
      description: "Character statistics and attributes"
    },
    skills: {
      type: Type.OBJECT,
      properties: {
        combat: { type: Type.NUMBER, description: "Combat skill level" },
        magic: { type: Type.NUMBER, description: "Magic skill level" },
        stealth: { type: Type.NUMBER, description: "Stealth skill level" },
        diplomacy: { type: Type.NUMBER, description: "Diplomacy skill level" },
        survival: { type: Type.NUMBER, description: "Survival skill level" },
        crafting: { type: Type.NUMBER, description: "Crafting skill level" }
      },
      description: "Character skills and proficiencies"
    }
  },
  required: ['stats']
};

/**
 * Schema for combat resolution responses from combatAgent
 */
export const CombatResponseSchema = {
  type: Type.OBJECT,
  properties: {
    result: {
      type: Type.STRING,
      enum: ["VICTORY", "DEFEAT", "DRAW", "ESCAPE", "ONGOING"],
      description: "Outcome of the combat encounter"
    },
    description: {
      type: Type.STRING,
      description: "Narrative description of the combat events"
    },
    damage_dealt: {
      type: Type.NUMBER,
      description: "Damage dealt by the player"
    },
    damage_received: {
      type: Type.NUMBER,
      description: "Damage received by the player"
    },
    rewards: {
      type: Type.OBJECT,
      properties: {
        experience: { type: Type.NUMBER, description: "Experience gained" },
        gold: { type: Type.NUMBER, description: "Gold/currency gained" },
        items: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Items gained from combat"
        }
      },
      description: "Rewards from successful combat"
    },
    ongoing_effects: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Lasting effects from combat (injuries, buffs, etc.)"
    }
  },
  required: ['result', 'description']
};

/**
 * Schema for campaign progression responses from campaignAgent
 */
export const CampaignResponseSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "Title of the campaign or current chapter"
    },
    description: {
      type: Type.STRING,
      description: "Campaign description and setting"
    },
    chapters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Chapter title" },
          description: { type: Type.STRING, description: "Chapter description" },
          plotPoints: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Key plot points for this chapter"
          },
          estimatedDuration: { type: Type.STRING, description: "Estimated play time" }
        },
        required: ['title', 'description']
      },
      description: "Campaign chapters and structure"
    },
    currentChapter: {
      type: Type.NUMBER,
      description: "Index of the current active chapter"
    }
  },
  required: ['title', 'description', 'chapters']
};

/**
 * Schema for event evaluation responses from eventAgent
 */
export const EventResponseSchema = {
  type: Type.OBJECT,
  properties: {
    eventType: {
      type: Type.STRING,
      enum: ["LEVEL_UP", "SKILL_UNLOCK", "TRANSFORMATION", "DISCOVERY", "RELATIONSHIP", "QUEST"],
      description: "Type of event that occurred"
    },
    title: {
      type: Type.STRING,
      description: "Title of the event"
    },
    description: {
      type: Type.STRING,
      description: "Detailed description of the event"
    },
    effects: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Mechanical effects of this event"
    },
    unlocks: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "New abilities, skills, or options unlocked"
    },
    notifications: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Messages to display to the player"
    }
  },
  required: ['eventType', 'title', 'description']
};

/**
 * Schema for story summarization responses from summaryAgent
 */
export const SummaryResponseSchema = {
  type: Type.OBJECT,
  properties: {
    keyDetails: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Key details and plot points to remember"
    },
    story: {
      type: Type.STRING,
      description: "Condensed narrative summary"
    },
    importantCharacters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Character name" },
          relationship: { type: Type.STRING, description: "Relationship to player" },
          importance: { type: Type.STRING, description: "Why this character is important" }
        },
        required: ['name', 'relationship']
      },
      description: "Important characters mentioned in the story"
    },
    plotThreads: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Ongoing plot threads and unresolved elements"
    }
  },
  required: ['keyDetails', 'story']
};

/**
 * Type definitions for the structured responses
 * These replace the 'any' types from manual JSON parsing
 */
export interface StoryResponse {
  story: string;
  xp_gain?: number;
  inventory_update?: string[];
  stats_update?: {
    health?: number;
    mana?: number;
    stamina?: number;
    strength?: number;
    intelligence?: number;
    dexterity?: number;
    constitution?: number;
    wisdom?: number;
    charisma?: number;
  };
  image_prompt?: string;
  plotPointAdvancingNudgeExplanation?: string;
  gameTimeAdvancement?: {
    hours?: number;
    days?: number;
  };
  eventTriggers?: string[];
}

export interface ActionResponse {
  actions: Array<{
    action: string;
    description: string;
    difficulty: "TRIVIAL" | "EASY" | "MEDIUM" | "HARD" | "EXTREME";
    consequences?: string;
    skillRequired?: string;
    riskLevel?: "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
  }>;
}

export interface CharacterResponse {
  description: string;
  image_prompt?: string;
  backstory?: string;
  personality_traits?: string[];
}

export interface CharacterStatsResponse {
  stats: {
    health: number;
    maxHealth: number;
    mana?: number;
    maxMana?: number;
    stamina?: number;
    maxStamina?: number;
    strength?: number;
    intelligence?: number;
    dexterity?: number;
    constitution?: number;
    wisdom?: number;
    charisma?: number;
    level: number;
    experience?: number;
  };
  skills?: {
    combat?: number;
    magic?: number;
    stealth?: number;
    diplomacy?: number;
    survival?: number;
    crafting?: number;
  };
}

export interface CombatResponse {
  result: "VICTORY" | "DEFEAT" | "DRAW" | "ESCAPE" | "ONGOING";
  description: string;
  damage_dealt?: number;
  damage_received?: number;
  rewards?: {
    experience?: number;
    gold?: number;
    items?: string[];
  };
  ongoing_effects?: string[];
}

export interface CampaignResponse {
  title: string;
  description: string;
  chapters: Array<{
    title: string;
    description: string;
    plotPoints?: string[];
    estimatedDuration?: string;
  }>;
  currentChapter?: number;
}

export interface EventResponse {
  eventType: "LEVEL_UP" | "SKILL_UNLOCK" | "TRANSFORMATION" | "DISCOVERY" | "RELATIONSHIP" | "QUEST";
  title: string;
  description: string;
  effects?: string[];
  unlocks?: string[];
  notifications?: string[];
}

export interface SummaryResponse {
  keyDetails: string[];
  story: string;
  importantCharacters?: Array<{
    name: string;
    relationship: string;
    importance?: string;
  }>;
  plotThreads?: string[];
}
