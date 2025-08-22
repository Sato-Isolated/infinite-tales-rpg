# 🚀 Guide d'Intégration des Améliorations de Prompts

## 📋 Vue d'ensemble

Ce guide vous montre comment intégrer progressivement les nouvelles améliorations de prompts dans votre système existant **sans casser le code**.

## 🎯 Bénéfices attendus

- **30-60% de réduction** des tokens utilisés
- **Meilleure qualité** des réponses JSON
- **Cohérence temporelle** améliorée
- **Décisions AI plus logiques** avec Chain-of-Thought
- **Système évolutif** pour futures améliorations

## ⚡ Intégration Rapide (15 minutes)

### Étape 1: Ajouter les imports

Dans `src/lib/ai/agents/gameAgent.ts`, ajoutez en haut du fichier :

```typescript
import { PromptMigrationHelper, MIGRATION_PRESETS, type PromptMigrationSettings } from '$lib/ai/prompts/integration/migrationHelper';
```

### Étape 2: Modifier la classe GameAgent

Ajoutez cette propriété à votre classe :

```typescript
export class GameAgent {
	llm: LLM;
	
	// 🚀 NOUVEAU: Configuration des améliorations de prompts
	private promptMigrationSettings: PromptMigrationSettings = MIGRATION_PRESETS.BASIC;

	constructor(llm: LLM, promptSettings?: PromptMigrationSettings) {
		this.llm = llm;
		if (promptSettings) {
			this.promptMigrationSettings = promptSettings;
		}
	}
```

### Étape 3: Remplacer l'appel de prompts

Dans la méthode `generateStoryProgression()`, remplacez ces lignes :

```typescript
// ❌ ANCIEN CODE
const gameAgent = this.getGameAgentSystemInstructionsFromStates(
	storyState,
	characterState,
	playerCharactersGameState,
	inventoryState,
	customSystemInstruction,
	customStoryAgentInstruction,
	customCombatAgentInstruction,
	gameSettings
);
gameAgent.push(jsonSystemInstructionForGameAgent(gameSettings));
```

Par :

```typescript
// ✅ NOUVEAU CODE AMÉLIORÉ
const gameAgent = PromptMigrationHelper.buildEnhancedGameAgentInstructions(
	storyState,
	characterState,
	playerCharactersGameState,
	inventoryState,
	customSystemInstruction,
	customStoryAgentInstruction,
	customCombatAgentInstruction,
	gameSettings,
	this.promptMigrationSettings
);
```

## 🔧 Configuration Avancée (Optionnel)

### Méthodes utiles à ajouter à votre classe GameAgent :

```typescript
/**
 * Configure le niveau d'amélioration des prompts
 */
setPromptEnhancements(settings: PromptMigrationSettings) {
	this.promptMigrationSettings = settings;
}

/**
 * Bascule rapidement entre les niveaux d'amélioration
 */
setPromptLevel(level: 'LEGACY' | 'BASIC' | 'ENHANCED' | 'FULL_MODERN') {
	this.promptMigrationSettings = MIGRATION_PRESETS[level];
}

/**
 * Compare les performances entre ancien et nouveau système
 */
async comparePromptPerformance(
	storyState: any,
	characterState: any,
	playerCharactersGameState: any,
	inventoryState: any,
	customSystemInstruction: string,
	customStoryAgentInstruction: string,
	customCombatAgentInstruction: string,
	gameSettings: GameSettings
) {
	const comparison = PromptMigrationHelper.comparePromptVersions(
		storyState, characterState, playerCharactersGameState, inventoryState,
		customSystemInstruction, customStoryAgentInstruction, customCombatAgentInstruction,
		gameSettings
	);

	console.log('📊 PERFORMANCE COMPARISON:');
	console.log('Legacy tokens:', comparison.legacy.tokenCount);
	console.log('Modern tokens:', comparison.modern.tokenCount);
	console.log('Token reduction:', comparison.legacy.tokenCount - comparison.modern.tokenCount);

	return comparison;
}
```

## 🎮 Utilisation

### Configuration par défaut (recommandée pour commencer)

```typescript
const gameAgent = new GameAgent(llm);
// Utilise automatiquement MIGRATION_PRESETS.BASIC
```

### Configuration personnalisée

```typescript
// Niveau Enhanced pour plus de qualité
const gameAgent = new GameAgent(llm, MIGRATION_PRESETS.ENHANCED);

// Configuration sur mesure
const customConfig: PromptMigrationSettings = {
	enableModernJson: true,        // ✅ Templates JSON améliorés
	enableTimeConsistency: true,   // ✅ Cohérence temporelle
	enableConciseMode: true,       // ✅ Économie de tokens (~40%)
	enableChainOfThought: true,    // ✅ Meilleure logique
	enableFewShotExamples: false,  // ⚠️ Activer si besoin plus de cohérence
	enableHierarchicalInstructions: false, // ⚠️ Pour résoudre conflits
	enableDetailedLanguage: false // ⚠️ Seulement si multilingue
};
const gameAgent = new GameAgent(llm, customConfig);
```

### Configuration dynamique

```typescript
// Basculer vers mode haute qualité pour des scènes importantes
gameAgent.setPromptLevel('ENHANCED');

// Revenir au mode économe
gameAgent.setPromptLevel('BASIC');

// Test de performance
const comparison = await gameAgent.comparePromptPerformance(/* paramètres */);
```

## 📊 Niveaux de Migration

### 🔵 LEGACY
- Utilise l'ancien système
- Pas d'améliorations
- Pour comparaison uniquement

### 🟢 BASIC (Recommandé pour commencer)
- ✅ Templates JSON standardisés
- ✅ Cohérence temporelle améliorée
- ✅ Mode concise (économie ~40% tokens)
- Risque: **Minimal**
- Temps test: **15 minutes**

### 🟡 ENHANCED (Qualité optimale)
- ✅ Tout de BASIC +
- ✅ Chain-of-Thought (meilleure logique)
- ✅ Few-Shot Examples (plus de cohérence)
- Risque: **Faible**
- Temps test: **1 heure**

### 🔴 FULL_MODERN (Toutes les fonctionnalités)
- ✅ Tout de ENHANCED +
- ✅ Hiérarchie d'instructions (résolution conflits)
- ✅ Optimisations avancées
- Risque: **Faible**
- Temps test: **2-3 heures**

## 🧪 Tests Recommandés

1. **Test basique** : Une action simple (attaque, conversation)
2. **Test temporel** : Vérifier les durées d'actions
3. **Test JSON** : S'assurer qu'il n'y a pas d'erreurs de parsing
4. **Test tokens** : Comparer l'usage avec `comparePromptPerformance()`
5. **Test qualité** : Jouer quelques actions et évaluer la cohérence

## 🚨 Rollback

Si vous voulez revenir en arrière, remettez simplement l'ancien code :

```typescript
// Rollback vers l'ancien système
const gameAgent = this.getGameAgentSystemInstructionsFromStates(
	storyState, characterState, playerCharactersGameState, inventoryState,
	customSystemInstruction, customStoryAgentInstruction, customCombatAgentInstruction,
	gameSettings
);
gameAgent.push(jsonSystemInstructionForGameAgent(gameSettings));
```

## 📈 Métriques à surveiller

- **Token usage** : Devrait diminuer de 30-60%
- **Erreurs JSON** : Devraient diminuer
- **Qualité narrative** : Devrait s'améliorer
- **Temps de réponse** : Devrait rester stable
- **Cohérence temporelle** : Actions avec durées réalistes

## ⭐ Recommandation Finale

1. **Commencez avec BASIC** - risque minimal, bénéfices immédiats
2. **Testez pendant 1-2 sessions** de jeu
3. **Si satisfait, passez à ENHANCED** - qualité supérieure
4. **Monitoring continu** des performances et de la qualité
5. **Ajustement personnalisé** selon vos besoins spécifiques

**Le système est conçu pour être backwards-compatible et améliorer l'existant sans rien casser !**
