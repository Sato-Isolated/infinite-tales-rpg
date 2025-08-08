import type { CompanionCharacter } from './companion.js';

export enum ActionDifficulty {
	simple = 'simple',
	medium = 'medium',
	difficult = 'difficult',
	very_difficult = 'very_difficult'
}

export enum InterruptProbability {
	NEVER = 'NEVER',
	LOW = 'LOW',
	MEDIUM = 'MEDIUM',
	HIGH = 'HIGH',
	ALWAYS = 'ALWAYS'
}

export type RenderedGameUpdate = { 
	text: string; 
	resourceText: string; 
	color: string 
};

export interface CompanionMention {
	companionName: string;
	companionId: string;
	companion: CompanionCharacter;
}
