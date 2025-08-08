import type { CompanionCharacter } from '$lib/types/companion.js';
import type { StatsUpdate } from '$lib/ai/agents/combatAgent.js';
import type { CompanionMention } from '$lib/types/gameTypes.js';
import { CompanionManager } from '$lib/services/companionManager.js';

// ===== Système de mentions @ =====

export function detectCompanionMentions(
	input: string,
	companionManager: CompanionManager
): { cleanInput: string; mentions: CompanionMention[] } {
	const mentionRegex = /@(\w+)/gi;
	const mentions: CompanionMention[] = [];
	const activeCompanions = companionManager.getActiveCompanions();

	// Détecter toutes les mentions @
	const matches = Array.from(input.matchAll(mentionRegex));

	for (const match of matches) {
		const mentionedName = match[1].toLowerCase();

		// Chercher le compagnon correspondant (insensible à la casse)
		const companion = activeCompanions.find(c =>
			c.character_description.name.toLowerCase() === mentionedName ||
			c.character_description.name.toLowerCase().startsWith(mentionedName)
		);

		if (companion) {
			mentions.push({
				companionName: companion.character_description.name,
				companionId: companion.id,
				companion: companion
			});
		}
	}

	// Nettoyer l'input en remplaçant les mentions par le nom complet
	let cleanInput = input;
	mentions.forEach(mention => {
		const regex = new RegExp(`@${mention.companionName}`, 'gi');
		cleanInput = cleanInput.replace(regex, mention.companionName);
	});

	return { cleanInput, mentions };
}

export function generateCompanionContextForPrompt(mentions: CompanionMention[]): string {
	if (mentions.length === 0) return '';

	const contextParts = mentions.map(mention => {
		const companion = mention.companion;
		const recentMemories = companion.companion_memory.significant_events
			.slice(-3) // 3 derniers événements
			.map(event => `- ${event.description} (${event.emotional_impact > 0 ? 'positive' : 'negative'} impact)`)
			.join('\n');

		const personalityTraits = companion.personality_evolution.current_personality_traits
			.map(trait => `${trait.trait_name}: ${trait.value}`)
			.join(', ');

		return `
COMPAGNON MENTIONNÉ: ${companion.character_description.name} (ID: ${companion.id})
Personnalité: ${companion.character_description.personality}
Traits actuels: ${personalityTraits}
Loyauté: ${companion.loyalty_level}% | Confiance: ${companion.trust_level}%
Relation: ${companion.relationship_data.current_status}

Mémoires récentes:
${recentMemories || 'Aucun événement récent'}

Réagir selon cette personnalité et ces souvenirs.`;
	});

	return `
=== COMPAGNONS MENTIONNÉS ===
${contextParts.join('\n\n')}
=== FIN CONTEXTE COMPAGNONS ===
`;
}

export function updateCompanionFromStatsUpdate(companionManager: CompanionManager, statsUpdate: StatsUpdate): void {
	const activeCompanions = companionManager.getActiveCompanions();
	const targetCompanion = activeCompanions.find(
		companion => companion.character_description.name === statsUpdate.targetName
	);

	if (targetCompanion && targetCompanion.character_stats.resources) {
		const result = Number.parseInt(statsUpdate.value.result);
		const resources = targetCompanion.character_stats.resources;

		switch (statsUpdate.type) {
			case 'hp_gained':
				if (resources.HP) {
					const currentValue = resources.HP.start_value || 0; // Using start_value as fallback
					const newValue = Math.min(currentValue + (result > 0 ? result : 0), resources.HP.max_value);
					// Note: ResourceWithCurrentValue type doesn't have current_value, this needs proper implementation
				}
				break;
			case 'hp_lost':
				if (resources.HP) {
					const currentValue = resources.HP.start_value || 0;
					const newValue = Math.max(currentValue - (result > 0 ? result : 0), 0);
					// Note: ResourceWithCurrentValue type doesn't have current_value, this needs proper implementation
				}
				break;
			// Similar for MP cases...
		}

		// Sauvegarder les changements
		companionManager.updateCompanion(targetCompanion.id, {
			character_stats: targetCompanion.character_stats
		});
	}
}
