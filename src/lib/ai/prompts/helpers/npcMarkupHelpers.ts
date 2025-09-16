/**
 * Modern XML Narrative Markup Helpers
 * Provides validation and reference generation for XML-based narrative markup
 * NO BACKWARDS COMPATIBILITY with old @ prefix or [tag] systems
 */

import type { NPCState } from '$lib/ai/agents/characterStatsAgent';
import { validateXmlMarkup } from '$lib/components/narrative/narrativeSanitizer';

/**
 * Validates XML markup tags
 * 
 * @param text - Text to validate  
 * @returns Validation result with errors
 */
export function validateMarkupTags(text: string): {
	isValid: boolean;
	errors: string[];
	warnings?: string[];
	suggestions?: string[];
} {
	return validateXmlMarkup(text);
}

/**
 * Extract character names from XML markup
 * 
 * @param text - Text containing XML character tags
 * @returns Array of character names
 */
export function extractCharacterNames(text: string): string[] {
	const matches = text.match(/<character\s+name="([^"]+)"\s*\/?>/g);
	if (!matches) return [];

	return matches.map(match => {
		const nameMatch = match.match(/name="([^"]+)"/);
		return nameMatch ? nameMatch[1] : '';
	}).filter(Boolean);
}

/**
 * Create NPC resolver for XML markup validation
 * 
 * @param npcState - NPC state for validation
 * @returns NPC resolver with validation methods
 */
export function createNPCXmlResolver(npcState: NPCState) {
	const npcMap = new Map<string, any>();
	
	// Build NPC map from state
	Object.entries(npcState).forEach(([uuid, npc]) => {
		npcMap.set(uuid, npc);
		if (npc.known_names) {
			npc.known_names.forEach((name: string) => {
				npcMap.set(name.toLowerCase(), npc);
			});
		}
	});

	return {
		/**
		 * Validate NPC references in XML markup
		 */
		validateNPCMarkup: (text: string) => {
			const characterNames = extractCharacterNames(text);
			const errors: string[] = [];
			
			characterNames.forEach(name => {
				if (!npcMap.has(name.toLowerCase())) {
					errors.push(`Unknown character: "${name}"`);
				}
			});

			return {
				isValid: errors.length === 0,
				errors,
				characterNames
			};
		},

		/**
		 * Get available characters for AI context
		 */
		getAvailableCharacters: () => {
			return Array.from(new Set(
				Object.values(npcState)
					.flatMap(npc => npc.known_names || [])
					.filter(Boolean)
			));
		}
	};
}

/**
 * Generates XML markup reference guide
 * 
 * @param npcState - Optional NPC state for character examples
 * @returns XML markup reference guide as string
 */
export function generateMarkupReferenceGuide(npcState?: NPCState): string {
	const guide = `# Modern XML Narrative Markup System

## 🎯 Overview
Clean, structured XML-based markup for rich narrative content. No confusion with HTML/XML syntax.

## 📋 Available Tags

### 1. Speaker Dialogue
**Syntax:** \`<speaker name="CharacterName">dialogue content</speaker>\`
**Purpose:** Character speech with speaker identification
**Example:** \`<speaker name="Marie">Hello there, traveler!</speaker>\`

### 2. Character Reference  
**Syntax:** \`<character name="CharacterName" />\`
**Purpose:** Reference character by name
**Example:** \`The <character name="hero" /> approached cautiously.\`

### 3. Highlight Important Text
**Syntax:** \`<highlight>important content</highlight>\`
**Purpose:** Emphasize key story elements
**Example:** \`You notice <highlight>a glowing artifact</highlight> on the altar.\`

### 4. Location Reference
**Syntax:** \`<location name="PlaceName" />\`
**Purpose:** Mark location mentions
**Example:** \`You arrive at <location name="ancient_temple" />.\`

### 5. Time Indicator
**Syntax:** \`<time>temporal reference</time>\`
**Purpose:** Mark temporal transitions  
**Example:** \`<time>Three hours later</time>, they reached the summit.\`

### 6. Whispered Dialogue
**Syntax:** \`<whisper>quiet content</whisper>\`
**Purpose:** Mark whispered or quiet speech
**Example:** \`<whisper>The guards are coming</whisper>, she murmured.\`

### 7. Action Description
**Syntax:** \`<action>action content</action>\`
**Purpose:** Mark character actions
**Example:** \`<action>He draws his sword</action> and prepares for battle.\`

### 8. Character Thoughts
**Syntax:** \`<thought>thought content</thought>\`
**Purpose:** Mark internal thoughts
**Example:** \`<thought>Something feels wrong here</thought>, she wondered.\`

### 9. Scene Break
**Syntax:** \`<break />\`
**Purpose:** Major scene transitions and time jumps
**Example:** \`They left the village. <break /> The next morning...\`

## ✨ Advantages

- 🎯 **Clear Structure**: XML-like syntax that's familiar and unambiguous
- 🛡️ **Strong Validation**: Real-time error checking and suggestions
- ⚡ **Performance**: AST-based parsing for reliability
- 🧩 **Modular**: Component-based rendering system
- 🔧 **Extensible**: Easy to add new markup types
- � **Consistent**: Uniform styling and behavior

## 🚨 Important Notes

- All tags are case-sensitive and must be lowercase
- Self-closing tags must end with \` />\`
- Required attributes must be provided (name for speaker, character, location)
- Content tags cannot be empty
- Unknown tags will trigger validation errors

## 🎯 Best Practices

- Use descriptive character names
- Keep dialogue natural and conversational
- Use highlights sparingly for maximum impact
- Be consistent with location naming
- Use scene breaks only for major transitions`;

	// Add character context if NPCs exist
	if (npcState && Object.keys(npcState).length > 0) {
		const characters = Array.from(new Set(
			Object.values(npcState)
				.flatMap(npc => npc.known_names || [])
				.filter(Boolean)
		));

		if (characters.length > 0) {
			return guide + `\n\n## 👥 Available Characters\n${characters.map(name => `- ${name} (\`<character name="${name}" />\`)`).join('\n')}`;
		}
	}

	return guide;
}
