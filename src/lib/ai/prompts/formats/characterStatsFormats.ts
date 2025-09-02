/**
 * Character stats related format prompts
 */

export const ATTRIBUTE_MAX_VALUE = 10;
export const ATTRIBUTE_MIN_VALUE = -10;

/**
 * Ability JSON format template
 */
export const abilityJsonFormat = '{"name": "ability name", "effect": "clearly state the effect caused, include dice notation like 1d6+2 or 2d4 if causing damage", "resource_cost": null}';

/**
 * Ability format instructions
 */
export const abilityInstructions = [
	'ABILITY FORMAT RULES:',
	'- name: Clear, descriptive ability name',
	'- effect: Detailed effect description with dice notation for damage (1d6+2, 2d4, etc.)',
	'- resource_cost: null if no cost, otherwise object with resource_key and cost',
	'  - resource_key: must match one of character_stats.resources',
	'  - cost: numeric value for resource consumption'
].join('\n');

/**
 * Legacy export for backward compatibility
 */
export const abilityFormatForPrompt = abilityJsonFormat;

/**
 * Format for NPC ID objects in prompts
 */
export const npcIDForPrompt = `{"uniqueTechnicalNameId": "A fixed, unchanging identifier that remains the same for the same NPC, regardless of state or context.", "displayName": "The name displayed to the player, which CAN change based on state or context"}`;

/**
 * Format for currently present NPCs in prompts
 */
export const currentlyPresentNPCSForPrompt = `{"hostile": array of ${npcIDForPrompt}, "friendly": array of ${npcIDForPrompt}, "neutral": array of ${npcIDForPrompt}}`;

/**
 * Format for character stats state in prompts
 */
export const characterStatsStateForPrompt = `{
	"level": 1,
    "resources": {
        "resource_name": {
            "max_value": 100,
            "start_value": 100,
            "game_ends_when_zero": false
        }
    },
    "attributes": {
        "attribute_name": 0
    },
    "skills": {
        "skill_name": 0
    },
	"spells_and_abilities": [
        {
            "name": "Ability Name",
            "effect": "Effect description with dice notation if applicable",
            "resource_cost": null
        }
    ]
}`;

/**
 * Instructions for character stats generation
 */
export const characterStatsInstructions = `
CHARACTER STATS GENERATION RULES:
- Level: Level of the character according to description of the story and character
- Resources: Starting resources, based on GAME System, MAIN_SCENARIO, description and level of the character. 2-4 different resources (e.g. for survival game HUNGER, WARMTH; as vampire BLOOD, etc.)
- Attributes: Attributes that affect dice roll modifiers. Analyze character description to determine appropriate Attributes like Strength, Dexterity, etc. Stats can be positive (1 to ${ATTRIBUTE_MAX_VALUE}), neutral (0), or negative (${ATTRIBUTE_MIN_VALUE} to -1) based on character's strengths and weaknesses
- Skills: Skills that affect dice roll modifiers. Analyze character description to determine appropriate skills like Swordfighting, Swimming, Thunder Magic, etc. Stats can be positive (1 to ${ATTRIBUTE_MAX_VALUE}), neutral (0), or negative (${ATTRIBUTE_MIN_VALUE} to -1) based on character's strengths and weaknesses
- Spells and Abilities: Array of spells and abilities according to game system and level. List 2-4 actively usable spells and abilities. They should have a cost of one resource type, although some can be without cost. At least include a 'Standard Attack' without cost
`;

/**
 * Format for level up prompts
 */
export const levelUpPrompt = `{
		"level_up_explanation": "Explanation for stat and ability changes",
		"attribute": "attribute_name",
		"resources": {
            "resource_name": 100
        },
		"ability": {
            "name": "Ability Name",
            "effect": "Effect description",
            "resource_cost": null
        },
		"formerAbilityName": null
}`;

/**
 * Instructions for level up generation
 */
export const levelUpInstructions = `
LEVEL UP RULES:
- level_up_explanation: Explanation why exactly this stat and ability have been increased. If already existing ability changed explain the ability changes
- attribute: attribute name
- resources: Object with resource name as key and new maximum value as value  
- ability: Existing ability leveled up or new ability according to game system and level
- formerAbilityName: refers an already existing ability name that is changed, null if new ability is gained
`;

/**
 * Format for NPC stats state in prompts
 */
export const npcStatsStateForPromptAsString = `{
	"uniqueTechnicalNameId": "npc_unique_id",
	"displayName": "NPC Display Name",
	"level": 1, 
	"rank": "Average",
	"is_friendly": true,
	"hp": 100,
	"mp": 50,
	"relationships": [
		{
			"target_npc_id": "optional_target_npc_id",
			"target_name": "Target Name",
			"relationship_type": "friend",
			"specific_role": "colleague",
			"emotional_bond": "positive",
			"description": "Relationship description"
		}
	],
	"personality_traits": ["trait1", "trait2"],
	"speech_patterns": "Speech pattern description",
	"background_notes": "Background and motivation notes"
}`;

/**
 * Instructions for NPC stats generation
 */
export const npcStatsInstructions = `
NPC STATS GENERATION RULES:
- uniqueTechnicalNameId: A fixed, unchanging identifier that remains the same for the same NPC, regardless of state or context
- displayName: The name displayed to the player, which CAN change based on state or context
- level: Numeric level
- rank: Must be one of: "Very Weak", "Weak", "Average", "Strong", "Boss", "Legendary"
- is_friendly: Boolean indicating if NPC is friendly
- hp: The NPCs Hit Points. Always use the key 'hp', not 'health' or any other variation
- mp: The NPCs Mana Points. Always use the key 'mp', not 'mana' or any other variation
- relationships: Array of relationship objects with target NPCs or player
- personality_traits: Array of personality traits that influence behavior
- speech_patterns: How the NPC speaks (accent, expressions, tone, specific words they use)
- background_notes: Personal history, motivations, and context that explains their behavior
`;

/**
 * Dynamic NPC rank generator for prompts - no caching
 */
function getNpcRanksForPrompt(): string[] {
	return ['Very Weak', 'Weak', 'Average', 'Strong', 'Boss', 'Legendary'];
}
