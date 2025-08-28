/**
 * Combat and stats update format prompts
 * Enhanced with chain-of-thought reasoning for better combat resolution
 */

/**
 * Combat chain-of-thought reasoning process
 */
export const COMBAT_CHAIN_OF_THOUGHT = `
COMBAT REASONING PROCESS:

1. ⚔️ COMBAT STATE ASSESSMENT
   - Who are the participants and their current conditions?
   - What is the tactical situation and positioning?
   - What environmental factors affect the combat?

2. 🎯 ACTION EVALUATION
   - What is the character attempting to do?
   - How skilled/equipped are they for this action?
   - What situational modifiers apply?

3. 🛡️ DEFENSIVE CONSIDERATIONS
   - What defenses does the target have?
   - Are there armor, shields, or resistance factors?
   - What evasion or blocking capabilities exist?

4. 💥 DAMAGE AND EFFECTS CALCULATION
   - What base damage/effect applies?
   - What bonuses or penalties modify the result?
   - How does this affect combat balance and flow?

5. 📈 TACTICAL CONSEQUENCES
   - How does this change the combat situation?
   - What new opportunities or threats emerge?
   - How does this impact the broader story?

Apply this reasoning, then provide your combat resolution.
`;

/**
 * Format for dice roll in action prompts
 * Enhanced with clearer modifier explanations
 */
export const diceRollPrompt = `"dice_roll": {
						"modifier_explanation": "Keep the text short, max 15 words. Never based on attributes and skills, they are already applied! Instead based on situational factors specific to the story progression or passive attributes in spells_and_abilities and inventory. Give an in game story explanation why a modifier is applied or not and how you decided that.",
						# If action_difficulty is difficult apply a bonus.
						"modifier": "none|bonus|malus",
						"modifier_value": negative number for malus, 0 if none, positive number for bonus
					}`;

/**
 * Enhanced format for stats update objects in prompts
 */
export const statsUpdatePromptObject = `
    "stats_update": [
        {
        		"explanation": "Short explanation for the reason of this change",
        		"type": "health_lost",
            "sourceName": "NPC name or player CHARACTER name, who is the initiator of this action",
            "targetName": "NPC name or player CHARACTER name, whose stats must be updated",
            "value": "1d6+3"
        },
        {
        	 "targetName": "Player CHARACTER name who gains XP",
        	 "explanation": "Short explanation for the reason of this change",
           "type": "xp_gained",
           "value": "MEDIUM"
        }
        ]`;

/**
 * Instructions for stats update generation
 */
export const statsUpdateInstructions = `
STATS UPDATE RULES:
- You must include one update for each action
- Also include one update per turn effect like poisoned or bleeding
- If targetName is a NPC then resourceKey must be one of hp,mp else one of related CHARACTER resources
- type: Must be in format "{resourceKey}_lost" or "{resourceKey}_gained"
- sourceName: NPC name or player CHARACTER name, who is the initiator of this action
- targetName: NPC name or player CHARACTER name, whose stats must be updated
- value: Must be dice roll notation in format 1d6+3 or 3d4 etc.
- For XP gains: targetName should be player CHARACTER name, type should be "xp_gained", value should be "SMALL|MEDIUM|HIGH"
`;

/**
 * Combat balance guidelines
 */
export const COMBAT_BALANCE_GUIDELINES = `
COMBAT BALANCE GUIDELINES:

💪 DAMAGE SCALING
- Trivial enemies: 1d4-1d6 damage
- Standard enemies: 1d6+1 to 2d6 damage  
- Tough enemies: 2d6+2 to 3d6 damage
- Boss enemies: 3d6+3 to 4d8 damage

🛡️ DEFENSIVE CONSIDERATIONS
- Light armor: +1-2 to effective HP
- Medium armor: +3-4 to effective HP
- Heavy armor: +5-6 to effective HP
- Magical protection: Variable bonuses

⚖️ ENCOUNTER BALANCE
- Single weak enemy: Quick resolution (2-3 rounds)
- Multiple enemies: Tactical complexity (4-6 rounds)
- Boss encounters: Epic struggle (6-10 rounds)
- Environmental hazards: Additional complexity

🎯 TACTICAL DEPTH
- Positioning matters: Cover, flanking, terrain
- Status effects: Bleeding, poisoned, stunned, etc.
- Resource management: MP, special abilities, items
- Dynamic environment: Changing conditions
`;

/**
 * Combat result templates
 */
export const COMBAT_RESULT_TEMPLATES = `
COMBAT RESULT PATTERNS:

✅ CRITICAL SUCCESS (Natural 20 or exceptional roll):
- Maximum or near-maximum damage
- Additional tactical advantage
- Possible status effect on enemy
- Morale boost or special description

✅ SUCCESS (Meets or beats difficulty):
- Normal damage range
- Achievement of intended effect
- Tactical position maintained or improved
- Clear progress toward victory

⚠️ PARTIAL SUCCESS (Close but not quite):
- Reduced damage or effect
- Some progress but with complications
- Tactical position mostly maintained
- Opens counter-attack opportunities

❌ FAILURE (Misses difficulty):
- No damage or intended effect
- Possible tactical disadvantage
- Counter-attack opportunity for enemy
- Potential resource waste

💥 CRITICAL FAILURE (Natural 1 or catastrophic):
- Possible self-damage or equipment damage
- Significant tactical disadvantage
- Major counter-attack opportunity
- Dramatic negative consequences
`;
