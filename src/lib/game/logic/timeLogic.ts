import { LLMProvider } from '$lib/ai/llmProvider';
import type { Story } from '$lib/ai/agents/storyAgent';
import type { CharacterDescription } from '$lib/ai/agents/characterAgent';
import { createDefaultTime, type GameTime } from '$lib/types/gameTime';
import type { GameSettings } from '$lib/types/gameSettings';
import type { SafetyLevel } from '$lib/types/safetySettings';
import { updateWeatherForTime } from './weatherLogic';

// --- Time helpers (normalization & math) ---
const DAY_NAMES = [
	'Sunday',
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday'
] as const;
const MONTH_NAMES = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
] as const;

export const getTimeOfDay = (hour: number): GameTime['timeOfDay'] => {
	if (hour >= 5 && hour < 7) return 'dawn';
	if (hour >= 7 && hour < 12) return 'morning';
	if (hour >= 12 && hour < 14) return 'midday';
	if (hour >= 14 && hour < 18) return 'afternoon';
	if (hour >= 18 && hour < 21) return 'evening';
	if (hour >= 21 && hour < 24) return 'night';
	return 'deep_night';
};

export const getSeasonForMonth = (month: number): GameTime['season'] => {
	// month is 1..12
	switch (month) {
		case 12:
		case 1:
		case 2:
			return 'winter';
		case 3:
		case 4:
		case 5:
			return 'spring';
		case 6:
		case 7:
		case 8:
			return 'summer';
		case 9:
		case 10:
		case 11:
			return 'autumn';
		default:
			return 'spring';
	}
};

/**
 * Add minutes to GameTime and normalize day/month/year, updating derived fields and weather.
 * Uses a proleptic Gregorian mapping via JS Date for rollover; does not change fiction calendar names if custom.
 */
export function addMinutesToGameTime(time: GameTime, minutes: number): GameTime {
	// Map GameTime to a JS Date in UTC to avoid timezone surprises
	const y = Math.max(0, time.year); // guard negative years
	const mIndex = Math.min(11, Math.max(0, time.month - 1));
	const d = Math.max(1, time.day);
	const date = new Date(Date.UTC(y, mIndex, d, time.hour, time.minute, 0, 0));
	const newMs = date.getTime() + minutes * 60_000;
	const nd = new Date(newMs);

	const newYear = nd.getUTCFullYear();
	const newMonthIndex = nd.getUTCMonth();
	const newMonth = newMonthIndex + 1;
	const newDay = nd.getUTCDate();
	const newHour = nd.getUTCHours();
	const newMinute = nd.getUTCMinutes();
	const newDayName = DAY_NAMES[nd.getUTCDay()];
	const newMonthName = MONTH_NAMES[newMonthIndex];

	const updated: GameTime = {
		...time,
		year: newYear,
		month: newMonth,
		day: newDay,
		hour: newHour,
		minute: newMinute,
		dayName: time.dayName && time.dayName !== '' ? newDayName : newDayName,
		monthName: time.monthName && time.monthName !== '' ? newMonthName : newMonthName,
		timeOfDay: getTimeOfDay(newHour),
		season: getSeasonForMonth(newMonth)
	};

	// Update weather based on time passage
	return updateWeatherForTime(updated, minutes);
}

/**
 * Normalize a GameTime object (e.g., if day is > month length or month > 12),
 * updating day/month/year/hour/minute and derived fields consistently, including weather.
 */
export function normalizeGameTime(time: GameTime): GameTime {
	return addMinutesToGameTime(time, 0);
}

/**
 * Get current weather effects description for gameplay purposes
 */
export function getWeatherGameplayEffects(gameTime: GameTime): string {
	const weather = gameTime.weather;
	const effects = weather.effects;
	
	const impactMessages: string[] = [];
	
	if (effects.visibility < 50) {
		impactMessages.push('⚠️ Severely limited visibility');
	} else if (effects.visibility < 80) {
		impactMessages.push('🌫️ Reduced visibility');
	}
	
	if (effects.movement < 70) {
		impactMessages.push('🦶 Movement hindered');
	}
	
	if (effects.combat < 80) {
		impactMessages.push('⚔️ Combat effectiveness reduced');
	}
	
	if (effects.magic > 110) {
		impactMessages.push('✨ Magical energies enhanced');
	} else if (effects.magic < 90) {
		impactMessages.push('🔮 Magical abilities weakened');
	}
	
	if (effects.comfort < 60) {
		impactMessages.push('😰 Poor comfort conditions');
	}
	
	return impactMessages.length > 0 ? impactMessages.join(' • ') : '';
}

/**
 * Check if weather conditions make certain actions more difficult
 */
export function isActionHinderedByWeather(gameTime: GameTime, actionType: 'movement' | 'combat' | 'magic' | 'perception'): boolean {
	const effects = gameTime.weather.effects;
	
	switch (actionType) {
		case 'movement':
			return effects.movement < 80;
		case 'combat':
			return effects.combat < 80;
		case 'magic':
			return effects.magic < 90;
		case 'perception':
			return effects.visibility < 70;
		default:
			return false;
	}
}

/**
 * Get weather enhancement for magical actions
 */
export function getWeatherMagicModifier(gameTime: GameTime): number {
	return gameTime.weather.effects.magic / 100;
}

/**
 * Generate an initial game time based on story and character context
 * This should be called when starting a new tale
 */
export async function generateStoryAppropriateTime(
	storyState: Story,
	characterState: CharacterDescription,
	gameSettings: GameSettings,
	apiKey: string,
	safetyLevel: SafetyLevel,
	language?: string,
	useFallbackLlm?: boolean
): Promise<GameTime> {
	console.log('generateStoryAppropriateTime called with:', {
		storyGame: storyState.game,
		storyTheme: storyState.theme,
		characterName: characterState.name,
		apiKey: apiKey ? 'present' : 'missing',
		language,
		safetyLevel
	});

	try {
		const llm = LLMProvider.provideLLM(
			{
				temperature: 0.8,
				apiKey: apiKey,
				language: language
			},
			safetyLevel, // Use provided safety level parameter
			useFallbackLlm
		);

		console.log('LLM provider created, calling generateInitialGameTime...');
		// TODO: Re-implement generateInitialGameTime function
		// const result = await generateInitialGameTime(llm, storyState, characterState, gameSettings);
		console.log('generateInitialGameTime temporarily disabled, using default time');
		return createDefaultTime();
	} catch (error) {
		console.error('Failed to generate story-appropriate time, falling back to default:', error);
		return createDefaultTime();
	}
}

/**
 * Helper function to check if a gameTime should be regenerated (e.g., if it's still the default)
 */
export function shouldRegenerateGameTime(gameTime: GameTime): boolean {
	const defaultTime = createDefaultTime();
	return (
		gameTime.day === defaultTime.day &&
		gameTime.month === defaultTime.month &&
		gameTime.year === defaultTime.year &&
		gameTime.hour === defaultTime.hour &&
		gameTime.minute === defaultTime.minute
	);
}
