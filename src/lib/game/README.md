# Game Architecture

This folder contains the core game logic and functionality, organized by domain:

## 📁 Folder Structure

### `/controllers`
Game controllers that orchestrate game operations and manage state.
- `gameController.ts` - Main game controller with state management and action handling

### `/logic`
Core business logic separated by domain:
- `gameLogic.ts` - Core game mechanics and state management
- `campaignLogic.ts` - Campaign and chapter progression logic
- `characterLogic.ts` - Character management and progression
- `combatLogic.ts` - Combat mechanics and calculations
- `levelLogic.ts` - Experience and level progression
- `resourceLogic.ts` - Resource management (health, mana, energy, etc.)
- `timeLogic.ts` - Game time and temporal mechanics

### `/memory`
Memory and history management:
- `memoryLogic.ts` - Story memory and context management
- `messages.ts` - Message history and related story retrieval

### `/npc`
NPC-related functionality:
- `npcLogic.ts` - NPC behavior and relationship management

### `/progression`
Character and skill progression systems:
- `skillProgressionHelpers.ts` - Skill advancement and progression calculations

### `/state`
Game state utilities and management:
- `gameStateUtils.ts` - Pure utility functions for game state operations

### `/ui`
UI management and modal coordination:
- `modalManager.svelte.ts` - Modal state management and coordination

## 🎯 Architecture Principles

1. **Separation of Concerns**: Each folder has a specific responsibility
2. **Pure Functions**: Logic functions are pure when possible for testability
3. **Type Safety**: Full TypeScript coverage with proper type definitions
4. **Testability**: Co-located tests with source files
5. **Barrel Exports**: Clean imports through index.ts files

## 📦 Usage

Import from the game library using clean paths:

```typescript
// Import specific modules
import { createGameController } from '$lib/game/controllers';
import { ActionDifficulty, getEmptyCriticalResourceKeys } from '$lib/game/logic';
import { createModalManager } from '$lib/game/ui';

// Or import everything (use sparingly)
import * as Game from '$lib/game';
```

## 🧪 Testing

Tests are co-located with their source files and can be run with:
```bash
pnpm test:unit
```

## 🔄 Migration Notes

This structure was migrated from the previous routes-based organization to follow SvelteKit best practices and improve maintainability. All imports have been updated to use the new paths.
