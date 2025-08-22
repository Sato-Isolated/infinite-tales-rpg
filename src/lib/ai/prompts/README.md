# Prompts Organization

Cette restructuration organise tous les prompts du système IA dans une hiérarchie claire et maintenable.

## Structure

```
src/lib/ai/prompts/
├── shared/           # Prompts partagés entre agents
│   ├── languagePrompt.ts    # LANGUAGE_PROMPT
│   ├── tropesPrompt.ts      # TROPES_CLICHE_PROMPT  
│   ├── slowStoryPrompt.ts   # SLOW_STORY_PROMPT
│   └── index.ts
├── formats/          # Formats JSON réutilisables
│   ├── characterFormats.ts      # characterDescriptionForPrompt
│   ├── characterStatsFormats.ts # abilityFormatForPrompt, npcIDForPrompt, etc.
│   ├── combatFormats.ts         # diceRollPrompt, statsUpdatePromptObject
│   ├── campaignFormats.ts       # chaptersPrompt, campaignJsonPrompt
│   ├── eventFormats.ts          # eventJsonFormat
│   └── index.ts
├── system/           # Instructions système complexes
│   ├── gameSystemPrompts.ts     # systemBehaviour
│   ├── gameJsonPrompts.ts       # jsonSystemInstructionForGameAgent
│   ├── timeGenerationPrompts.ts # timeGenerationPrompt
│   └── index.ts
├── agents/           # Prompts spécifiques aux agents
│   ├── story/        # Story agent prompts
│   ├── character/    # Character agent prompts
│   ├── campaign/     # Campaign agent prompts
│   ├── summary/      # Summary agent prompts
│   ├── action/       # Action agent prompts
│   └── index.ts
├── index.ts          # Export principal
├── migration-guide.ts # Guide de migration
└── README.md         # Cette documentation
```

## Utilisation

### Imports Recommandés

```typescript
// Prompts partagés
import { LANGUAGE_PROMPT, TROPES_CLICHE_PROMPT, SLOW_STORY_PROMPT } from '$lib/ai/prompts/shared';

// Formats JSON
import { 
  characterDescriptionForPrompt,
  abilityFormatForPrompt,
  statsUpdatePromptObject 
} from '$lib/ai/prompts/formats';

// Prompts système
import { 
  systemBehaviour, 
  jsonSystemInstructionForGameAgent 
} from '$lib/ai/prompts/system';

// Prompts d'agents spécifiques
import { storyAgentInstruction } from '$lib/ai/prompts/agents/story';
import { characterAgentInstruction } from '$lib/ai/prompts/agents/character';

// Import global (si nécessaire)
import * as prompts from '$lib/ai/prompts';
```

### Migration des Agents

1. **Remplacer les déclarations locales** par des imports
2. **Mettre à jour les références** pour utiliser les prompts importés
3. **Tester la fonctionnalité** pour s'assurer que tout fonctionne

### Exemple de Migration

**Avant :**
```typescript
const LANGUAGE_PROMPT = 'Important! Each JSON key...';
const characterDescriptionForPrompt = `{...}`;
```

**Après :**
```typescript
import { LANGUAGE_PROMPT } from '$lib/ai/prompts/shared';
import { characterDescriptionForPrompt } from '$lib/ai/prompts/formats';
```

## Avantages

- **Organisation claire** : Prompts groupés par fonction et responsabilité
- **Réutilisabilité** : Prompts partagés facilement importables
- **Maintenabilité** : Modifications centralisées
- **Type safety** : Exports TypeScript typés
- **Documentation** : Structure autodocumentée

## Ajout de Nouveaux Prompts

1. **Identifiez la catégorie** (shared, formats, system, agents)
2. **Créez le fichier** dans le bon dossier
3. **Ajoutez l'export** dans l'index approprié
4. **Documentez** si nécessaire
5. **Testez** l'import et l'utilisation

## Tests

Après migration, vérifiez que :
- [ ] Tous les imports fonctionnent
- [ ] Les agents utilisent correctement les prompts
- [ ] Aucune régression fonctionnelle
- [ ] Les nouveaux prompts sont accessibles
