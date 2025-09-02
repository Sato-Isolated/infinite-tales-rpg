# Narrative Markup System

## 🎯 Objectif

Remplace la génération de HTML complexe dans les prompts AI par un système de markup structuré plus simple, plus léger et plus maintenir.

## 📝 Syntaxe des Tags

### Dialogues
```
[dialogue:SpeakerName]Texte du dialogue[/dialogue]
```
**Rendu :** Boîte stylée avec nom du personnage et dialogue en italique

### Actions
```
[action]Description de l'action[/action]
```
**Rendu :** Bordure bleue avec astérisques pour les actions physiques/mentales

### Ambiance/Atmosphère
```
[atmosphere]Description de l'environnement[/atmosphere]
```
**Rendu :** Citation stylée pour les descriptions d'ambiance

### Emphase
```
[emphasis]Texte important[/emphasis]
```
**Rendu :** Texte en gras avec couleur primaire

### Pensées
```
[thought]Pensées du personnage[/thought]
```
**Rendu :** Texte en italique avec couleur secondaire

### Transitions
```
[transition]
```
**Rendu :** Séparateur stylé avec points

### Statuts
```
[status:success]Réussite[/status]
[status:warning]Attention[/status]
[status:error]Danger[/status]
```
**Rendu :** Boîtes colorées avec icônes appropriées

### Badges
```
[badge]Effet de statut[/badge]
```
**Rendu :** Badge stylé DaisyUI

## 📚 Exemples d'utilisation

### Exemple simple
```
Le soleil se lève sur la ville endormie.

[dialogue:Garde]Halte ! Qui va là ?[/dialogue]

[action]Je lève lentement les mains pour montrer que je ne suis pas armé[/action]

[dialogue:Moi]Je suis un voyageur, je ne cherche que le repos[/dialogue]

[thought]J'espère qu'il ne remarquera pas mes vêtements tachés de sang[/thought]

[status:success]Le garde semble convaincu[/status]
```

### Exemple complexe
```
[atmosphere]L'air dans la taverne est épais de fumée et de mystères. Les conversations s'arrêtent quand vous entrez.[/atmosphere]

[dialogue:Tavernier]Bonsoir étranger. Que puis-je vous servir ?[/dialogue]

[action]Je m'approche du comptoir en scrutant les autres clients du coin de l'œil[/action]

[dialogue:Moi]Une bière et des informations, si vous en avez[/dialogue]

[transition]

[atmosphere]Le tavernier échange un regard inquiet avec une femme encapuchonnée dans le coin[/atmosphere]

[status:warning]Quelque chose cloche dans cette taverne[/status]

[badge]Sens aiguisés activé[/badge]
```

## 🔄 Migration depuis HTML

### Avant (HTML dans prompt)
```
Format the narration using HTML with DaisyUI classes: Use <p class="text-base-content leading-relaxed mb-4"> for main narrative paragraphs, <div class="border-l-4 border-primary pl-4 py-2 mb-3 bg-base-200/30 rounded-r-lg"><strong class="text-primary text-sm uppercase tracking-wide">Speaker Name:</strong> <em class="text-primary font-medium">'Dialogue here'</em></div> for CHARACTER SPOKEN WORDS...
```

### Après (Markup structuré)
```
Format the narration using structured markup tags:
- [dialogue:SpeakerName]Text[/dialogue] for character speech
- [action]Text[/action] for physical/mental actions  
- [atmosphere]Text[/atmosphere] for environmental descriptions
- [emphasis]Text[/emphasis] for important elements
- [thought]Text[/thought] for character thoughts
- [transition] for scene changes
- [status:success|warning|error]Text[/status] for outcomes
- [badge]Text[/badge] for status effects
```

## ⚡ Avantages

1. **Tokens réduits** : Prompts plus courts = réponses plus rapides
2. **Maintenance** : Styles centralisés dans le composant Svelte
3. **Sécurité** : Pas d'injection HTML possible
4. **Flexibilité** : Facile de changer les styles sans toucher aux prompts
5. **Lisibilité** : Plus facile à lire pour les humains et l'AI

## 🛠️ Utilisation technique

```svelte
<script>
  import NarrativeMarkupParser from '$lib/components/narrative/NarrativeMarkupParser.svelte';
</script>

<NarrativeMarkupParser content={storyText} />
```

Le composant convertit automatiquement le markup en HTML stylé avec les classes DaisyUI appropriées.
