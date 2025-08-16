// Types for the game time system
export interface Weather {
	type:
		| 'clear'
		| 'cloudy'
		| 'light_rain'
		| 'heavy_rain'
		| 'drizzle'
		| 'snow'
		| 'blizzard'
		| 'storm'
		| 'thunderstorm'
		| 'fog'
		| 'mist'
		| 'wind'
		| 'hail'
		| 'heat_wave'
		| 'cold_snap';
	intensity: 'light' | 'moderate' | 'heavy' | 'extreme';
	description?: string; // Optional AI-generated description
}

export interface GameTime {
	year: number;
	month: number; // 1-12
	day: number; // 1-31
	hour: number; // 0-23
	minute: number; // 0-59
	dayName: string; // "Monday", "Tuesday", etc.
	monthName: string; // "January", "February", etc.
	timeOfDay: 'dawn' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night' | 'deep_night';
	season: 'spring' | 'summer' | 'autumn' | 'winter';
	weather: Weather;
}

export const createDefaultTime = (): GameTime => {
	return {
		year: 1024,
		month: 3,
		day: 15,
		hour: 10,
		minute: 0,
		dayName: 'Wednesday',
		monthName: 'March',
		timeOfDay: 'morning',
		season: 'spring',
		weather: {
			type: 'clear',
			intensity: 'light',
			description: 'A pleasant spring morning with clear skies'
		}
	};
};
