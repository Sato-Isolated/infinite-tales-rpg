/**
 * Event format prompts
 */

/**
 * Format for event evaluation JSON responses
 */
export const eventJsonFormat = `{
	"reasoning": "Brief explanation of character changes and abilities learned",
	"character_changed": null,
	"abilities_learned": [
		{
			"uniqueTechnicalId": "unique_ability_id",
			"name": "Ability Name",
			"effect": "Ability effect description"
		}
	]
}`;

/**
 * Instructions for event evaluation
 */
export const eventEvaluationInstructions = `
EVENT EVALUATION RULES:
- reasoning: Briefly explain how the character changed from the CURRENT CHARACTER DESCRIPTION and how abilities learned if any
- character_changed: null if no change, otherwise object with "changed_into" (single word only what the character transformed into) and "description" (string)
- abilities_learned: Array of ability objects with uniqueTechnicalId (string), name (string), and effect (string)
`;
