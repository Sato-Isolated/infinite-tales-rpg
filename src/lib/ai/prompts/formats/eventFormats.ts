/**
 * Event format prompts
 */

/**
 * Format for event evaluation JSON responses
 */
export const eventJsonFormat = `{
	"reasoning": "string; Briefly explain how the character changed from the CURRENT CHARACTER DESCRIPTION and how abilities learned if any",
	"character_changed": null | {"changed_into": "string; single word only what the character transformed into", "description": string},
	"abilities_learned": [{"uniqueTechnicalId": string, "name": string, "effect": string}, ...]
}`;
