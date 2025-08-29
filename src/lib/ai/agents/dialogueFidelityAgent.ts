/**
 * Dialogue Fidelity Agent
 * Detects when users want their exact words preserved vs. when they allow creative interpretation
 * 
 * Based on prompt engineering best practices for preserving user input exact wording
 */

export type DialogueFidelityLevel = 'preserve_exact' | 'preserve_essence' | 'allow_creative' | 'auto_detect';

export type DialogueFidelityAnalysis = {
	fidelity_level: DialogueFidelityLevel;
	reasoning: string;
	detected_patterns: string[];
	suggested_preservation_instructions: string;
};

export type DialogueFidelitySettings = {
	default_mode: DialogueFidelityLevel;
	preserve_quoted_text: boolean;
	preserve_first_person_dialogue: boolean;
	detect_explicit_markers: boolean;
};

export const DEFAULT_FIDELITY_SETTINGS: DialogueFidelitySettings = {
	default_mode: 'auto_detect',
	preserve_quoted_text: true,
	preserve_first_person_dialogue: true,
	detect_explicit_markers: true
};

/**
 * Agent responsable de détecter et gérer la fidélité des dialogues utilisateur
 */
export class DialogueFidelityAgent {
	private settings: DialogueFidelitySettings;

	constructor(settings: DialogueFidelitySettings = DEFAULT_FIDELITY_SETTINGS) {
		this.settings = settings;
	}

	/**
	 * Analyse un texte d'action utilisateur pour déterminer le niveau de fidélité requis
	 */
	analyzeDialogueFidelity(userActionText: string): DialogueFidelityAnalysis {
		const detectedPatterns: string[] = [];
		let fidelityLevel: DialogueFidelityLevel = this.settings.default_mode;
		let reasoning = '';

		// 1. Détecter les marqueurs explicites de fidélité
		if (this.settings.detect_explicit_markers) {
			const explicitMarkers = this.detectExplicitFidelityMarkers(userActionText);
			if (explicitMarkers.found) {
				fidelityLevel = explicitMarkers.level;
				reasoning = explicitMarkers.reasoning;
				detectedPatterns.push(...explicitMarkers.patterns);
			}
		}

		// 2. Détecter le texte entre guillemets (dialogue direct)
		if (this.settings.preserve_quoted_text && fidelityLevel !== 'preserve_exact') {
			const quotedText = this.detectQuotedDialogue(userActionText);
			if (quotedText.found) {
				fidelityLevel = 'preserve_exact';
				reasoning = quotedText.reasoning;
				detectedPatterns.push(...quotedText.patterns);
			}
		}

		// 3. Détecter le dialogue à la première personne
		if (this.settings.preserve_first_person_dialogue && fidelityLevel !== 'preserve_exact') {
			const firstPersonDialogue = this.detectFirstPersonDialogue(userActionText);
			if (firstPersonDialogue.found) {
				fidelityLevel = 'preserve_exact';
				reasoning = firstPersonDialogue.reasoning;
				detectedPatterns.push(...firstPersonDialogue.patterns);
			}
		}

		// 4. Mode auto-detect par défaut
		if (fidelityLevel === 'auto_detect') {
			const autoDetection = this.autoDetectFidelityLevel(userActionText);
			fidelityLevel = autoDetection.level;
			reasoning = autoDetection.reasoning;
			detectedPatterns.push(...autoDetection.patterns);
		}

		const preservationInstructions = this.generatePreservationInstructions(
			fidelityLevel,
			detectedPatterns,
			userActionText
		);

		return {
			fidelity_level: fidelityLevel,
			reasoning,
			detected_patterns: detectedPatterns,
			suggested_preservation_instructions: preservationInstructions
		};
	}

	/**
	 * Détecte les marqueurs explicites de fidélité dans le texte
	 */
	private detectExplicitFidelityMarkers(text: string): {
		found: boolean;
		level: DialogueFidelityLevel;
		reasoning: string;
		patterns: string[];
	} {
		const preserveExactMarkers = [
			'je dis exactement',
			'mot pour mot',
			'littéralement',
			'exactement comme ça',
			'sans rien changer',
			'preserve exact',
			'exact words',
			'verbatim',
			'textually',
			'without modification'
		];

		const allowCreativeMarkers = [
			'improvise',
			'créativement',
			'adapte comme tu veux',
			'fais-en ce que tu veux',
			'interprète librement',
			'creative interpretation',
			'feel free to adapt',
			'however you think best'
		];

		const lowerText = text.toLowerCase();
		const foundPatterns: string[] = [];

		// Vérifier les marqueurs de préservation exacte
		for (const marker of preserveExactMarkers) {
			if (lowerText.includes(marker.toLowerCase())) {
				foundPatterns.push(`Explicit preservation marker: "${marker}"`);
			}
		}

		if (foundPatterns.length > 0) {
			return {
				found: true,
				level: 'preserve_exact',
				reasoning: 'User explicitly requested exact preservation of their words',
				patterns: foundPatterns
			};
		}

		// Vérifier les marqueurs d'interprétation créative
		for (const marker of allowCreativeMarkers) {
			if (lowerText.includes(marker.toLowerCase())) {
				foundPatterns.push(`Explicit creative marker: "${marker}"`);
			}
		}

		if (foundPatterns.length > 0) {
			return {
				found: true,
				level: 'allow_creative',
				reasoning: 'User explicitly allowed creative interpretation',
				patterns: foundPatterns
			};
		}

		return {
			found: false,
			level: 'auto_detect',
			reasoning: 'No explicit fidelity markers detected',
			patterns: []
		};
	}

	/**
	 * Détecte le dialogue entre guillemets
	 */
	private detectQuotedDialogue(text: string): {
		found: boolean;
		reasoning: string;
		patterns: string[];
	} {
		const quotationPatterns = [
			/"[^"]+"/g, // Guillemets anglais
			/«[^»]+»/g, // Guillemets français
			/'[^']+'/g, // Apostrophes simples
			/„[^"]+"/g, // Guillemets allemands
			/"[^"]+"/g  // Guillemets typographiques
		];

		const foundPatterns: string[] = [];

		for (const pattern of quotationPatterns) {
			const matches = text.match(pattern);
			if (matches) {
				foundPatterns.push(`Quoted dialogue: ${matches.join(', ')}`);
			}
		}

		if (foundPatterns.length > 0) {
			return {
				found: true,
				reasoning: 'Direct dialogue in quotation marks detected - user likely wants exact preservation',
				patterns: foundPatterns
			};
		}

		return {
			found: false,
			reasoning: 'No quoted dialogue detected',
			patterns: []
		};
	}

	/**
	 * Détecte le dialogue à la première personne
	 */
	private detectFirstPersonDialogue(text: string): {
		found: boolean;
		reasoning: string;
		patterns: string[];
	} {
		const firstPersonPatterns = [
			/\bje dis\b/gi,
			/\bje réponds\b/gi,
			/\bje demande\b/gi,
			/\bje déclare\b/gi,
			/\bje murmure\b/gi,
			/\bje crie\b/gi,
			/\bje chuchote\b/gi,
			/\bi say\b/gi,
			/\bi tell\b/gi,
			/\bi ask\b/gi,
			/\bi respond\b/gi,
			/\bi whisper\b/gi,
			/\bi shout\b/gi
		];

		const foundPatterns: string[] = [];

		for (const pattern of firstPersonPatterns) {
			const matches = text.match(pattern);
			if (matches) {
				foundPatterns.push(`First-person dialogue marker: ${matches.join(', ')}`);
			}
		}

		// Vérifier les deux-points après les marqueurs de dialogue
		const colonPattern = /(?:je dis|je réponds|je demande|i say|i tell|i ask)[^:]*:\s*(.+)/gi;
		const colonMatches = text.match(colonPattern);
		if (colonMatches) {
			foundPatterns.push(`Dialogue with colon separation: ${colonMatches.length} instances`);
		}

		if (foundPatterns.length > 0) {
			return {
				found: true,
				reasoning: 'First-person dialogue markers detected - user is directly specifying what their character says',
				patterns: foundPatterns
			};
		}

		return {
			found: false,
			reasoning: 'No first-person dialogue markers detected',
			patterns: []
		};
	}

	/**
	 * Détection automatique du niveau de fidélité basée sur l'analyse du contexte
	 */
	private autoDetectFidelityLevel(text: string): {
		level: DialogueFidelityLevel;
		reasoning: string;
		patterns: string[];
	} {
		const foundPatterns: string[] = [];

		// Actions complexes qui suggèrent une interprétation créative
		const complexActionPatterns = [
			/\bj'essaie de\b/gi,
			/\bje tente de\b/gi,
			/\bje commence à\b/gi,
			/\bi try to\b/gi,
			/\bi attempt to\b/gi,
			/\bi start to\b/gi
		];

		let complexActionCount = 0;
		for (const pattern of complexActionPatterns) {
			const matches = text.match(pattern);
			if (matches) {
				complexActionCount += matches.length;
				foundPatterns.push(`Complex action pattern: ${matches.join(', ')}`);
			}
		}

		// Actions simples et directes qui suggèrent une fidélité
		const directActionPatterns = [
			/\b[A-Z][^.!?]*[.!?]\s*$/g, // Phrases déclaratives simples
			/\b(oui|non|yes|no)\b/gi // Réponses simples
		];

		let directActionCount = 0;
		for (const pattern of directActionPatterns) {
			const matches = text.match(pattern);
			if (matches) {
				directActionCount += matches.length;
				foundPatterns.push(`Direct action pattern: ${matches.join(', ')}`);
			}
		}

		// Longueur du texte comme indicateur
		const textLength = text.trim().length;
		if (textLength < 15) {
			foundPatterns.push(`Very short text length: ${textLength} characters`);
			return {
				level: 'preserve_exact',
				reasoning: 'Very short text suggests user wants exact preservation',
				patterns: foundPatterns
			};
		}

		if (complexActionCount > directActionCount) {
			return {
				level: 'allow_creative',
				reasoning: 'Complex actions detected - user likely expects creative interpretation',
				patterns: foundPatterns
			};
		}

		// Par défaut, utiliser preserve_essence pour équilibrer fidélité et fluidité narrative
		return {
			level: 'preserve_essence',
			reasoning: 'Default to essence preservation - balanced approach between fidelity and narrative flow',
			patterns: foundPatterns
		};
	}

	/**
	 * Génère les instructions de préservation pour le LLM
	 */
	private generatePreservationInstructions(
		fidelityLevel: DialogueFidelityLevel,
		detectedPatterns: string[],
		originalText: string
	): string {
		if (fidelityLevel === 'preserve_exact') {
			return this.generateExactPreservationInstructions(detectedPatterns, originalText);
		} else {
			return this.generateCreativeInterpretationInstructions(detectedPatterns, originalText);
		}
	}

	/**
	 * Instructions pour préservation exacte
	 */
	private generateExactPreservationInstructions(
		detectedPatterns: string[],
		originalText: string
	): string {
		return `
🎯 DIALOGUE FIDELITY MODE: PRESERVE EXACT

CRITICAL PRESERVATION RULES:
- The user wants their exact words preserved with minimal interpretation
- DO NOT paraphrase, embellish, or creatively interpret the user's dialogue
- DO NOT add emotional descriptions unless explicitly mentioned
- DO NOT expand on the user's words with additional context
- Preserve the original tone, style, and word choice

DETECTED FIDELITY PATTERNS:
${detectedPatterns.map(pattern => `• ${pattern}`).join('\n')}

ORIGINAL USER TEXT TO PRESERVE:
"${originalText}"

PERMITTED MODIFICATIONS:
- Format the dialogue with proper HTML/DaisyUI styling for display
- Add necessary narrative context around the dialogue (setting, reactions)
- Include NPC responses and environmental descriptions
- Apply game mechanics (dice rolls, consequences)

FORBIDDEN MODIFICATIONS:
- Changing the user's actual words or meaning
- Adding personality traits not explicitly stated
- Expanding brief statements into lengthy speeches
- Interpreting simple actions as complex emotional expressions

EXAMPLE:
User says: "Non, je ne veux pas."
✅ CORRECT: Character says exactly "Non, je ne veux pas." then add NPC reactions
❌ WRONG: Character hesitates, their voice trembling with uncertainty as they finally manage to whisper "I... I don't think I want to do this right now..."
`;
	}

	/**
	 * Instructions pour interprétation créative
	 */
	private generateCreativeInterpretationInstructions(
		detectedPatterns: string[],
		originalText: string
	): string {
		return `
🎨 DIALOGUE FIDELITY MODE: ALLOW CREATIVE

CREATIVE INTERPRETATION GUIDELINES:
- The user is open to creative expansion and interpretation of their intent
- You may embellish, add emotional context, and expand on their basic intention
- Feel free to add personality, tone, and style consistent with the character
- You can interpret simple actions as the beginning of more complex scenes

DETECTED CREATIVE PATTERNS:
${detectedPatterns.map(pattern => `• ${pattern}`).join('\n')}

USER INTENT TO INTERPRET:
"${originalText}"

CREATIVE FREEDOMS:
- Expand brief statements into character-appropriate dialogue
- Add emotional subtext and personality traits
- Interpret actions as part of larger narrative moments
- Include internal thoughts and motivations
- Enhance the dramatic or comedic impact as appropriate

CREATIVE BOUNDARIES:
- Stay true to the core intention of the user's action
- Don't contradict established character traits or story continuity
- Maintain consistency with the game's tone and setting
- Ensure the expanded interpretation still serves the user's goal

EXAMPLE:
User says: "Je vais essayer de convaincre le garde."
✅ CREATIVE: Character approaches confidently, adjusting their posture and speaking with practiced charm: "Listen, friend, I think we can help each other here..."
✅ ALSO VALID: Character nervous but determined, clears throat and attempts a diplomatic approach...
`;
	}

	/**
	 * Met à jour les paramètres de fidélité
	 */
	updateSettings(newSettings: Partial<DialogueFidelitySettings>): void {
		this.settings = { ...this.settings, ...newSettings };
	}

	/**
	 * Obtient les paramètres actuels
	 */
	getSettings(): DialogueFidelitySettings {
		return { ...this.settings };
	}
}
