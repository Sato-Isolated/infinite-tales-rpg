/**
 * Character stats related format prompts
 */

export const ATTRIBUTE_MAX_VALUE = 10;
export const ATTRIBUTE_MIN_VALUE = -10;

/**
 * Format for ability objects in prompts
 */
export const abilityFormatForPrompt =
	'{"name": string, "effect": "Clearly state the effect caused. If causing damage include the dice notation like 1d6+2 or 2d4", "resource_cost": if no cost null else { "resource_key": "the resource to pay for this action; one of character_stats.resources", "cost": number}, "image_prompt": short prompt for an image ai that generates an RPG game icon}';

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
	"level": Number; Level of the character according to Description of the story and character,
    "resources": "Starting resources, based on GAME System, MAIN_SCENARIO, description and level of the character. 2 - 4 different resources, e.g. for a survival game HUNGER, WARMTH, ...; as a vampire BLOOD, etc...) Format: {"{resourceKey}": {"max_value": number, "start_value": number, "game_ends_when_zero": true if this is a critical resource; else false}, ...}",
    "attributes": "Attributes that affect dice roll modifiers. Analyze character description to determine appropriate Attributes like Strength, Dexterity, etc. Stats can be positive (1 to ${ATTRIBUTE_MAX_VALUE}), neutral (0), or negative (${ATTRIBUTE_MIN_VALUE} to -1) based on character's strengths and weaknesses. Format: {"stat1": valueFrom${ATTRIBUTE_MIN_VALUE}To${ATTRIBUTE_MAX_VALUE}, "stat2": valueFrom${ATTRIBUTE_MIN_VALUE}To${ATTRIBUTE_MAX_VALUE}, ...}",
    "skills": "Skills that affect dice roll modifiers. Analyze character description to determine appropriate skills like Swordfighting, Swimming, Thunder Magic, etc. Stats can be positive (1 to ${ATTRIBUTE_MAX_VALUE}), neutral (0), or negative (${ATTRIBUTE_MIN_VALUE} to -1) based on character's strengths and weaknesses. Format: {"stat1": valueFrom${ATTRIBUTE_MIN_VALUE}To${ATTRIBUTE_MAX_VALUE}, "stat2": valueFrom${ATTRIBUTE_MIN_VALUE}To${ATTRIBUTE_MAX_VALUE}, ...}",
	"spells_and_abilities": "Array of spells and abilities according to game system and level. List 2-4 actively usable spells and abilities. They should have a cost of one resource type, although some can be without cost. At last include a 'Standard Attack' without cost. Format: [${abilityFormatForPrompt}]"
}`;

/**
 * Format for level up prompts
 */
export const levelUpPrompt = `{
		"level_up_explanation": "Explanation why exactly this stat and ability have been increased. If already existing ability changed explain the ability changes.",
		"attribute": "attribute name",
		"resources": {"resourceKey": newMaximumValue, ...},
		"ability": Existing ability leveled up or new ability according to game system and level; Format: ${abilityFormatForPrompt}
		"formerAbilityName": "refers an already existing ability name that is changed, null if new ability is gained",
}`;

/**
 * Format for NPC stats state in prompts
 */
export const npcStatsStateForPromptAsString = `{
	"uniqueTechnicalNameId": "A fixed, unchanging identifier that remains the same for the same NPC, regardless of state or context.",
	"displayName": "The name displayed to the player, which CAN change based on state or context",
	"level": Number, 
	"rank": "Very Weak|Weak|Average|Strong|Boss|Legendary",
	"is_friendly": true if friendly,
	"hp": "The NPCs Hit Points. Always use the key 'hp', not 'health' or any other variation",
	"mp": "The NPCs Mana Points. Always use the key 'mp', not 'mana' or any other variation"
}`;

export const npcRank = ['Very Weak', 'Weak', 'Average', 'Strong', 'Boss', 'Legendary'];
