/**
 * Combat and stats update format prompts
 */

/**
 * Format for dice roll in action prompts
 */
export const diceRollPrompt = `"dice_roll": {
						"modifier_explanation": "Keep the text short, max 15 words. Never based on attributes and skills, they are already applied! Instead based on situational factors specific to the story progression or passive attributes in spells_and_abilities and inventory. Give an in game story explanation why a modifier is applied or not and how you decided that.",
						# If action_difficulty is difficult apply a bonus.
						"modifier": "none|bonus|malus",
						"modifier_value": negative number for malus, 0 if none, positive number for bonus
					}`;

/**
 * Format for stats update objects in prompts
 */
export const statsUpdatePromptObject = `
    "stats_update": [
        # You must include one update for each action
        # Also include one update per turn effect like poisoned or bleeding
        {
        		"explanation": "Short explanation for the reason of this change",
        		# if targetName is a NPC then resourceKey must be one of hp,mp else one of related CHARACTER resources
        		"type": "{resourceKey}_lost|{resourceKey}_gained",
            "sourceName": "NPC name or player CHARACTER name, who is the initiator of this action",
            "targetName": "NPC name or player CHARACTER name, whose stats must be updated.",
            "value": "must be dice roll notation in format 1d6+3 or 3d4 etc."
        },
        {
        	 "targetName": "Player CHARACTER name who gains XP.",
        	 "explanation": "Short explanation for the reason of this change",
           "type": "xp_gained",
           "value": "SMALL|MEDIUM|HIGH"
        },
        ...
        ]`;
