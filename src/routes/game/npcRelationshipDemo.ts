/**
 * Démonstration du nouveau système de relations NPCs
 * Ce fichier montre comment utiliser les nouvelles fonctionnalités pour maintenir
 * la cohérence des relations entre NPCs et éviter les hallucinations de l'IA
 */

import type { NPCState, NPCStats, Relationship } from '$lib/ai/agents/characterStatsAgent';
import { 
	addRelationship, 
	createFamilyRelationship, 
	validateFamilyRelationships, 
	generateRelationshipContext,
	getRelationship 
} from './npcLogic';

/**
 * Exemple de création d'une famille avec relations cohérentes
 */
export function createSampleFamily(): NPCState {
	const npcState: NPCState = {
		"marie_10": {
			known_names: ["Marie", "Petite Marie"],
			is_party_member: false,
			class: "Student",
			rank_enum_english: "Very Weak",
			level: 1,
			spells_and_abilities: [],
			relationships: [],
			personality_traits: ["curieuse", "énergique", "espiègle"],
			speech_patterns: "Parle avec enthousiasme, utilise souvent 'grand frère' pour s'adresser à son frère",
			background_notes: "Petite sœur de Pierre, admire beaucoup son grand frère et cherche toujours à l'impressionner"
		},
		"pierre_16": {
			known_names: ["Pierre", "Grand Pierre"],
			is_party_member: false,
			class: "Apprentice Warrior",
			rank_enum_english: "Weak",
			level: 3,
			spells_and_abilities: [],
			relationships: [],
			personality_traits: ["protecteur", "responsable", "patient"],
			speech_patterns: "Parle avec assurance mais gentillesse, appelle sa sœur 'petite sœur' ou par son prénom",
			background_notes: "Grand frère de Marie, se sent responsable de sa protection et de son éducation"
		},
		"parent_jean": {
			known_names: ["Jean", "Papa", "Père"],
			is_party_member: false,
			class: "Blacksmith",
			rank_enum_english: "Average",
			level: 8,
			spells_and_abilities: [],
			relationships: [],
			personality_traits: ["sage", "travailleur", "bienveillant"],
			speech_patterns: "Parle avec autorité mais affection, appelle ses enfants 'mon fils' et 'ma fille'",
			background_notes: "Père de Pierre et Marie, forgeron du village, enseigne des valeurs d'honneur et de travail"
		}
	};

	// Créer les relations familiales bidirectionnelles
	createFamilyRelationship(
		npcState, 
		"marie_10", "Marie", "sister",
		"pierre_16", "Pierre", "brother",
		"very_positive",
		"Marie admire beaucoup son grand frère Pierre et cherche toujours son approbation"
	);

	createFamilyRelationship(
		npcState,
		"marie_10", "Marie", "daughter", 
		"parent_jean", "Jean", "father",
		"positive",
		"Relation père-fille affectueuse, Marie respecte l'autorité de son père"
	);

	createFamilyRelationship(
		npcState,
		"pierre_16", "Pierre", "son",
		"parent_jean", "Jean", "father", 
		"positive",
		"Relation père-fils traditionnelle, Pierre apprend le métier de forgeron"
	);

	return npcState;
}

/**
 * Exemple d'utilisation du système de validation
 */
export function demonstrateValidation() {
	console.log("=== DÉMONSTRATION DU SYSTÈME DE RELATIONS NPCs ===\n");
	
	const family = createSampleFamily();
	
	// Valider les relations familiales
	const errors = validateFamilyRelationships(family);
	if (errors.length === 0) {
		console.log("✅ Toutes les relations familiales sont cohérentes !");
	} else {
		console.log("❌ Erreurs de cohérence détectées :");
		errors.forEach(error => console.log(`  - ${error}`));
	}

	// Afficher le contexte relationnel pour chaque NPC
	Object.keys(family).forEach(npcId => {
		const context = generateRelationshipContext(family, npcId, "LE_JOUEUR");
		if (context) {
			console.log(context);
		}
	});

	// Démontrer comment l'IA devrait maintenant comprendre les relations
	console.log("=== EXEMPLES DE DIALOGUES COHÉRENTS ATTENDUS ===\n");
	
	console.log("Marie s'adressant à Pierre :");
	console.log("❌ AVANT (incorrect) : 'Bonjour papa !'");
	console.log("✅ APRÈS (correct) : 'Bonjour grand frère !' ou 'Salut Pierre !'");
	
	console.log("\nPierre s'adressant à Marie :");
	console.log("❌ AVANT (incorrect) : 'Comment allez-vous madame ?'");
	console.log("✅ APRÈS (correct) : 'Comment ça va petite sœur ?' ou 'Salut Marie !'");
	
	console.log("\nMarie s'adressant à Jean :");
	console.log("❌ AVANT (incorrect) : 'Bonjour monsieur le frère !'");
	console.log("✅ APRÈS (correct) : 'Bonjour papa !' ou 'Salut père !'");
}

/**
 * Exemple de relation problématique qui serait détectée
 */
export function demonstrateInconsistentRelationship() {
	console.log("\n=== DÉMONSTRATION DE DÉTECTION D'INCOHÉRENCE ===\n");
	
	const problematicState: NPCState = {
		"alice": {
			known_names: ["Alice"],
			is_party_member: false,
			class: "Test",
			rank_enum_english: "Weak",
			level: 1,
			spells_and_abilities: [],
			relationships: [{
				target_npc_id: "bob",
				target_name: "Bob",
				relationship_type: "family",
				specific_role: "sister", // Alice dit que Bob est sa sœur
				emotional_bond: "positive",
				description: "Relation problématique"
			}]
		},
		"bob": {
			known_names: ["Bob"],
			is_party_member: false,
			class: "Test",
			rank_enum_english: "Weak", 
			level: 1,
			spells_and_abilities: [],
			relationships: [{
				target_npc_id: "alice",
				target_name: "Alice", 
				relationship_type: "family",
				specific_role: "father", // Bob dit qu'Alice est son père
				emotional_bond: "positive",
				description: "Relation problématique réciproque"
			}]
		}
	};

	const errors = validateFamilyRelationships(problematicState);
	console.log("Relations incohérentes détectées :");
	errors.forEach(error => console.log(`  ❌ ${error}`));
}

/**
 * Guide d'utilisation pour les développeurs
 */
export function printUsageGuide() {
	console.log(`
=== GUIDE D'UTILISATION DU SYSTÈME DE RELATIONS NPCs ===

1. CRÉATION D'UN NPC AVEC RELATIONS :
   - Utilisez le nouveau type NPCStats étendu
   - Ajoutez les champs relationships, personality_traits, speech_patterns, background_notes

2. AJOUT DE RELATIONS :
   - Pour relations familiales : createFamilyRelationship()
   - Pour autres relations : addRelationship()

3. VALIDATION :
   - Appelez validateFamilyRelationships() pour vérifier la cohérence
   - Les erreurs vous alerteront des incohérences

4. CONTEXTE POUR L'IA :
   - generateRelationshipContext() génère le contexte enrichi
   - L'IA recevra des instructions claires sur les relations

5. INSTRUCTIONS POUR L'IA :
   - Le gameAgent inclut maintenant des règles strictes de cohérence
   - L'IA DOIT vérifier les relations avant de générer des dialogues
   - Plus d'hallucinations comme "sœur qui appelle son frère papa"

TYPES DE RELATIONS SUPPORTÉS :
- family : relations familiales (father, mother, son, daughter, brother, sister)
- friend : relations amicales  
- romantic : relations romantiques
- enemy : relations hostiles
- acquaintance : connaissances
- professional : relations de travail
- other : autres types

LIENS ÉMOTIONNELS :
- very_negative : déteste profondément
- negative : n'aime pas
- neutral : relation neutre  
- positive : apprécie
- very_positive : adore
`);
}

// Export de la fonction de démonstration pour tests
export function runFullDemo() {
	demonstrateValidation();
	demonstrateInconsistentRelationship();
	printUsageGuide();
}
