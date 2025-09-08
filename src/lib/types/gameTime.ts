// Types for the enhanced game time and weather system

export type WeatherType =
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
	| 'cold_snap'
	| 'sandstorm'
	| 'aurora'
	| 'eclipse'
	| 'meteor_shower';

export type WeatherIntensity = 'light' | 'moderate' | 'heavy' | 'extreme';

export interface WeatherEffects {
	visibility: number; // 0-100, affects perception and ranged actions
	movement: number; // 0-100, affects travel speed and stealth
	comfort: number; // 0-100, affects morale and rest quality
	magic: number; // 0-100, affects magical abilities (storms enhance, etc.)
	combat: number; // 0-100, affects combat accuracy and effectiveness
}

export interface WeatherEvent {
	type: 'sudden_change' | 'seasonal_shift' | 'magical_phenomenon' | 'natural_disaster';
	description: string;
	duration: number; // in minutes
	effects?: Partial<WeatherEffects>;
}

export interface Weather {
	type: WeatherType;
	intensity: WeatherIntensity;
	description?: string; // Optional AI-generated description
	effects: WeatherEffects;
	duration?: number; // How long this weather will last (in minutes)
	stability: number; // 0-100, how likely it is to change
	temperature: number; // Temperature in a fictional scale (-50 to 50)
	humidity: number; // 0-100
	wind: {
		speed: number; // 0-100
		direction: 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest';
	};
	pressure: number; // 0-100, atmospheric pressure
	events?: WeatherEvent[]; // Special weather events
}

export interface WeatherForecast {
	time: number; // minutes from now
	weather: Weather;
	confidence: number; // 0-100, how accurate the prediction is
}

export interface GeographicWeatherData {
	region: string;
	baseTemperature: number;
	seasonalVariation: number;
	weatherPatterns: WeatherType[];
	climateTendencies: {
		rainfall: number; // 0-100
		temperature: number; // 0-100
		windiness: number; // 0-100
		stability: number; // 0-100
	};
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
	forecast?: WeatherForecast[]; // Next 24 hours prediction
	weatherHistory?: Weather[]; // Last few weather states
	region?: string; // Current geographic region
}

export const createDefaultWeatherEffects = (): WeatherEffects => ({
	visibility: 100,
	movement: 100,
	comfort: 100,
	magic: 100,
	combat: 100
});

export const createDefaultWeather = (): Weather => ({
	type: 'clear',
	intensity: 'light',
	description: 'A pleasant spring morning with clear skies',
	effects: createDefaultWeatherEffects(),
	duration: 240, // 4 hours
	stability: 75,
	temperature: 20,
	humidity: 50,
	wind: {
		speed: 10,
		direction: 'west'
	},
	pressure: 60
});

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
		weather: createDefaultWeather(),
		forecast: [],
		weatherHistory: [],
		region: 'temperate_plains'
	};
};
