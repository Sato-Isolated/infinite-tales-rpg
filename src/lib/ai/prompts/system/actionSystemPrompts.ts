/**
 * Action agent system prompts
 */

export const actionRules = `Action Rules:
		- Always provide at least 3 potential actions the CHARACTER can take, fitting the THEME.
		- Actions must be branching choices for the character, not a sequence.
		- Keep the actions text short, max 20 words.
		- as action text never mention meta elements like stats or difficulty, only use an in-game story driven description
		- Review the character's spells_and_abilities and inventory for passive attributes that could alter the dice_roll
		- NPCs and CHARACTER cannot simply be finished off with a single attack.
		- Any action is allowed to target anything per game rules.
		- Suggest actions that make creative use of environmental features or interactions with NPCs when possible.
		- Only suggest actions that are plausible in the current situation.
		- Do not suggest actions that include information the players do not know, such as undiscovered secrets or future plot points`;
