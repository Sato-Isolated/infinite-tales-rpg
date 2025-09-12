import type {
	Weather,
	WeatherType,
	WeatherIntensity,
	WeatherEffects,
	WeatherEvent,
	WeatherForecast,
	GeographicWeatherData,
	GameTime
} from '$lib/types/gameTime';
import { createDefaultWeatherEffects } from '$lib/types/gameTime';

// Helper to create complete weather transition matrix
const createWeatherTransition = (primary: Record<string, number>): Record<WeatherType, number> => {
	const allTypes: WeatherType[] = [
		'clear', 'cloudy', 'light_rain', 'heavy_rain', 'drizzle', 'snow', 'blizzard',
		'storm', 'thunderstorm', 'fog', 'mist', 'wind', 'hail', 'heat_wave', 'cold_snap',
		'sandstorm', 'aurora', 'eclipse', 'meteor_shower'
	];
	
	const result: Record<WeatherType, number> = {} as Record<WeatherType, number>;
	allTypes.forEach(type => {
		result[type] = primary[type] || 0;
	});
	
	return result;
};

// Weather probability matrices based on current conditions
const WEATHER_TRANSITIONS: Record<WeatherType, Record<WeatherType, number>> = {
	clear: createWeatherTransition({
		clear: 0.65,
		cloudy: 0.2,
		light_rain: 0.05,
		wind: 0.025,
		fog: 0.02,
		cold_snap: 0.015, // Increased base chance for cold snap transitions from clear
		snow: 0.01 // Add snow transitions from clear
	}),
	cloudy: createWeatherTransition({
		cloudy: 0.45,
		clear: 0.25,
		light_rain: 0.15,
		heavy_rain: 0.05,
		storm: 0.03,
		wind: 0.015,
		snow: 0.02, // Increased base chance for snow transitions from cloudy
		cold_snap: 0.015 // Add cold snap transitions from cloudy
	}),
	light_rain: createWeatherTransition({
		light_rain: 0.4,
		cloudy: 0.3,
		clear: 0.15,
		heavy_rain: 0.1,
		drizzle: 0.05
	}),
	heavy_rain: createWeatherTransition({
		heavy_rain: 0.4,
		light_rain: 0.3,
		storm: 0.15,
		cloudy: 0.1,
		thunderstorm: 0.05
	}),
	drizzle: createWeatherTransition({
		drizzle: 0.5,
		light_rain: 0.2,
		cloudy: 0.2,
		clear: 0.1
	}),
	snow: createWeatherTransition({
		snow: 0.6,
		cloudy: 0.2,
		blizzard: 0.1,
		clear: 0.08,
		cold_snap: 0.02
	}),
	blizzard: createWeatherTransition({
		blizzard: 0.5,
		snow: 0.3,
		cold_snap: 0.15,
		cloudy: 0.05
	}),
	storm: createWeatherTransition({
		storm: 0.4,
		thunderstorm: 0.25,
		heavy_rain: 0.2,
		wind: 0.1,
		cloudy: 0.05
	}),
	thunderstorm: createWeatherTransition({
		thunderstorm: 0.35,
		storm: 0.3,
		heavy_rain: 0.2,
		cloudy: 0.1,
		clear: 0.05
	}),
	fog: createWeatherTransition({
		fog: 0.6,
		mist: 0.2,
		cloudy: 0.15,
		clear: 0.05
	}),
	mist: createWeatherTransition({
		mist: 0.5,
		fog: 0.2,
		cloudy: 0.2,
		clear: 0.1
	}),
	wind: createWeatherTransition({
		wind: 0.4,
		cloudy: 0.3,
		storm: 0.15,
		clear: 0.1,
		sandstorm: 0.05
	}),
	hail: createWeatherTransition({
		hail: 0.3,
		thunderstorm: 0.4,
		storm: 0.2,
		cloudy: 0.1
	}),
	heat_wave: createWeatherTransition({
		heat_wave: 0.7,
		clear: 0.2,
		cloudy: 0.08,
		wind: 0.02
	}),
	cold_snap: createWeatherTransition({
		cold_snap: 0.6,
		snow: 0.25,
		blizzard: 0.1,
		cloudy: 0.05
	}),
	sandstorm: createWeatherTransition({
		sandstorm: 0.5,
		wind: 0.3,
		clear: 0.15,
		cloudy: 0.05
	}),
	aurora: createWeatherTransition({
		aurora: 0.4,
		clear: 0.4,
		cloudy: 0.15,
		cold_snap: 0.05
	}),
	eclipse: createWeatherTransition({
		eclipse: 0.8, // Eclipses last a while
		clear: 0.15,
		cloudy: 0.05
	}),
	meteor_shower: createWeatherTransition({
		meteor_shower: 0.6,
		clear: 0.3,
		cloudy: 0.1
	})
};

// Default transition probabilities for weather types not defined above
const getDefaultTransitions = (_currentType: WeatherType): Record<WeatherType, number> => {
	const defaultProb = 1 / Object.keys(WEATHER_TRANSITIONS).length;
	const result: Record<WeatherType, number> = {} as Record<WeatherType, number>;
	
	Object.keys(WEATHER_TRANSITIONS).forEach(type => {
		result[type as WeatherType] = defaultProb;
	});
	
	return result;
};

// Geographic weather patterns
export const GEOGRAPHIC_PATTERNS: Record<string, GeographicWeatherData> = {
	temperate_plains: {
		region: 'Temperate Plains',
		baseTemperature: 20,
		seasonalVariation: 25,
		weatherPatterns: ['clear', 'cloudy', 'light_rain', 'wind'],
		climateTendencies: { rainfall: 40, temperature: 60, windiness: 30, stability: 70 }
	},
	mountain_peaks: {
		region: 'Mountain Peaks',
		baseTemperature: 5,
		seasonalVariation: 20,
		weatherPatterns: ['snow', 'blizzard', 'wind', 'cold_snap', 'cloudy'],
		climateTendencies: { rainfall: 60, temperature: 20, windiness: 80, stability: 30 }
	},
	desert_lands: {
		region: 'Desert Lands',
		baseTemperature: 35,
		seasonalVariation: 15,
		weatherPatterns: ['clear', 'heat_wave', 'sandstorm', 'wind'],
		climateTendencies: { rainfall: 10, temperature: 90, windiness: 50, stability: 60 }
	},
	coastal_regions: {
		region: 'Coastal Regions',
		baseTemperature: 18,
		seasonalVariation: 12,
		weatherPatterns: ['fog', 'mist', 'light_rain', 'wind', 'storm'],
		climateTendencies: { rainfall: 70, temperature: 50, windiness: 60, stability: 50 }
	},
	arctic_tundra: {
		region: 'Arctic Tundra',
		baseTemperature: -15,
		seasonalVariation: 30,
		weatherPatterns: ['snow', 'blizzard', 'cold_snap', 'aurora', 'wind'],
		climateTendencies: { rainfall: 30, temperature: 5, windiness: 70, stability: 40 }
	},
	magical_forest: {
		region: 'Magical Forest',
		baseTemperature: 15,
		seasonalVariation: 20,
		weatherPatterns: ['mist', 'fog', 'light_rain', 'aurora', 'meteor_shower'],
		climateTendencies: { rainfall: 50, temperature: 50, windiness: 20, stability: 30 }
	}
};

/**
 * Calculate weather effects based on weather type and intensity
 */
export function calculateWeatherEffects(type: WeatherType, intensity: WeatherIntensity): WeatherEffects {
	const effects = createDefaultWeatherEffects();
	const intensityMultiplier = {
		light: 0.5,
		moderate: 0.75,
		heavy: 1.0,
		extreme: 1.25
	}[intensity];

	switch (type) {
		case 'fog':
		case 'mist':
			effects.visibility = Math.max(10, 100 - (60 * intensityMultiplier));
			effects.movement = Math.max(50, 100 - (30 * intensityMultiplier));
			break;
		
		case 'heavy_rain':
		case 'storm':
		case 'thunderstorm':
			effects.visibility = Math.max(30, 100 - (50 * intensityMultiplier));
			effects.movement = Math.max(60, 100 - (25 * intensityMultiplier));
			effects.combat = Math.max(70, 100 - (20 * intensityMultiplier));
			effects.magic = Math.min(120, 100 + (15 * intensityMultiplier)); // Storms enhance magic
			break;
		
		case 'blizzard':
		case 'sandstorm':
			effects.visibility = Math.max(5, 100 - (80 * intensityMultiplier));
			effects.movement = Math.max(40, 100 - (40 * intensityMultiplier));
			effects.combat = Math.max(60, 100 - (30 * intensityMultiplier));
			effects.comfort = Math.max(20, 100 - (60 * intensityMultiplier));
			break;
		
		case 'heat_wave':
			effects.movement = Math.max(70, 100 - (20 * intensityMultiplier));
			effects.comfort = Math.max(40, 100 - (40 * intensityMultiplier));
			break;
		
		case 'cold_snap':
			effects.movement = Math.max(75, 100 - (15 * intensityMultiplier));
			effects.comfort = Math.max(50, 100 - (35 * intensityMultiplier));
			break;
		
		case 'wind':
			effects.combat = Math.max(80, 100 - (15 * intensityMultiplier));
			effects.movement = Math.max(85, 100 - (10 * intensityMultiplier));
			break;
		
		case 'aurora':
		case 'meteor_shower':
			effects.magic = Math.min(150, 100 + (30 * intensityMultiplier));
			break;
		
		case 'eclipse':
			effects.magic = Math.min(130, 100 + (20 * intensityMultiplier));
			effects.visibility = Math.max(60, 100 - (25 * intensityMultiplier));
			break;
	}

	return effects;
}

/**
 * Generate weather transition based on current weather and environmental factors
 */
export function generateWeatherTransition(
	currentWeather: Weather,
	season: GameTime['season'],
	timeOfDay: GameTime['timeOfDay'],
	region?: string
): Weather {
	const geoData = region ? GEOGRAPHIC_PATTERNS[region] : null;
	const transitions = WEATHER_TRANSITIONS[currentWeather.type] || getDefaultTransitions(currentWeather.type);
	
	// Adjust probabilities based on season
	const seasonAdjustedTransitions = { ...transitions };
	
	// Apply seasonal preferences
	if (season === 'winter') {
		if (seasonAdjustedTransitions.snow) seasonAdjustedTransitions.snow *= 3; // Increased multiplier
		if (seasonAdjustedTransitions.cold_snap) seasonAdjustedTransitions.cold_snap *= 2.5; // Increased multiplier
		if (seasonAdjustedTransitions.heat_wave) seasonAdjustedTransitions.heat_wave *= 0.1;
	} else if (season === 'summer') {
		if (seasonAdjustedTransitions.heat_wave) seasonAdjustedTransitions.heat_wave *= 2;
		if (seasonAdjustedTransitions.clear) seasonAdjustedTransitions.clear *= 1.3;
		if (seasonAdjustedTransitions.snow) seasonAdjustedTransitions.snow *= 0.1;
	}
	
	// Apply time of day effects
	if (timeOfDay === 'dawn' || timeOfDay === 'evening') {
		if (seasonAdjustedTransitions.fog) seasonAdjustedTransitions.fog *= 1.5;
		if (seasonAdjustedTransitions.mist) seasonAdjustedTransitions.mist *= 1.5;
	}
	
	// Apply geographic effects
	if (geoData) {
		geoData.weatherPatterns.forEach(pattern => {
			if (seasonAdjustedTransitions[pattern]) {
				seasonAdjustedTransitions[pattern] *= 1.3;
			}
		});
	}
	
	// Normalize probabilities
	const total = Object.values(seasonAdjustedTransitions).reduce((sum, prob) => sum + prob, 0);
	Object.keys(seasonAdjustedTransitions).forEach(key => {
		seasonAdjustedTransitions[key as WeatherType] /= total;
	});
	
	// Choose new weather type
	const random = Math.random();
	let cumulative = 0;
	let newType = currentWeather.type;
	
	for (const [type, prob] of Object.entries(seasonAdjustedTransitions)) {
		cumulative += prob;
		if (random <= cumulative) {
			newType = type as WeatherType;
			break;
		}
	}
	
	// Generate new intensity
	const intensityChange = Math.random();
	let newIntensity = currentWeather.intensity;
	
	if (intensityChange < 0.1) {
		const intensities: WeatherIntensity[] = ['light', 'moderate', 'heavy', 'extreme'];
		const currentIndex = intensities.indexOf(currentWeather.intensity);
		if (intensityChange < 0.05 && currentIndex > 0) {
			newIntensity = intensities[currentIndex - 1]; // Decrease
		} else if (currentIndex < intensities.length - 1) {
			newIntensity = intensities[currentIndex + 1]; // Increase
		}
	}
	
	// Generate new weather properties
	const baseTemp = geoData?.baseTemperature || 20;
	const seasonTemp = season === 'winter' ? -10 : season === 'summer' ? 10 : 0;
	
	// Generate stability (more stable weather types get higher base stability)
	const stableWeatherTypes = ['clear', 'cloudy', 'heat_wave', 'cold_snap'];
	const baseStability = stableWeatherTypes.includes(newType) ? 75 : 65;
	const stability = Math.floor(Math.random() * 25) + baseStability; // 65-90 or 75-100
	
	const newWeather: Weather = {
		type: newType,
		intensity: newIntensity,
		effects: calculateWeatherEffects(newType, newIntensity),
		duration: generateWeatherDuration(newType, stability),
		stability,
		temperature: baseTemp + seasonTemp + (Math.random() - 0.5) * 10,
		humidity: Math.floor(Math.random() * 60) + 30, // 30-90
		wind: {
			speed: Math.floor(Math.random() * 80) + 10, // 10-90
			direction: ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest'][
				Math.floor(Math.random() * 8)
			] as Weather['wind']['direction']
		},
		pressure: Math.floor(Math.random() * 40) + 40, // 40-80
		events: generateWeatherEvents(newType, newIntensity)
	};
	
	return newWeather;
}

/**
 * Generate special weather events
 */
function generateWeatherEvents(type: WeatherType, intensity: WeatherIntensity): WeatherEvent[] {
	const events: WeatherEvent[] = [];
	const eventChance = intensity === 'extreme' ? 0.3 : intensity === 'heavy' ? 0.15 : 0.05;
	
	if (Math.random() < eventChance) {
		switch (type) {
			case 'thunderstorm':
				events.push({
					type: 'natural_disaster',
					description: 'Lightning strikes illuminate the sky with dangerous beauty',
					duration: 30,
					effects: { magic: 120, combat: 80 }
				});
				break;
			
			case 'blizzard':
				events.push({
					type: 'natural_disaster',
					description: 'The blizzard intensifies, creating whiteout conditions',
					duration: 120,
					effects: { visibility: 5, movement: 30, comfort: 20 }
				});
				break;
			
			case 'aurora':
				events.push({
					type: 'magical_phenomenon',
					description: 'The aurora dances with otherworldly colors, enhancing magical energies',
					duration: 180,
					effects: { magic: 150 }
				});
				break;
			
			case 'eclipse':
				events.push({
					type: 'magical_phenomenon',
					description: 'The eclipse reaches totality, unleashing mysterious powers',
					duration: 10,
					effects: { magic: 200, visibility: 30 }
				});
				break;
		}
	}
	
	return events;
}

/**
 * Generate weather forecast for the next period
 */
export function generateWeatherForecast(
	currentTime: GameTime,
	hoursAhead: number = 24
): WeatherForecast[] {
	const forecast: WeatherForecast[] = [];
	let currentWeather = currentTime.weather;
	let confidence = 90;
	
	for (let hour = 1; hour <= hoursAhead; hour++) {
		// Confidence decreases over time
		confidence = Math.max(20, confidence - (hour * 2));
		
		currentWeather = generateWeatherTransition(
			currentWeather,
			currentTime.season,
			currentTime.timeOfDay,
			currentTime.region
		);
		
		forecast.push({
			time: hour * 60, // Convert to minutes
			weather: currentWeather,
			confidence
		});
	}
	
	return forecast;
}

/**
 * Generate appropriate weather duration based on weather type and stability
 */
function generateWeatherDuration(weatherType: WeatherType, stability: number): number {
	// Base durations in minutes for different weather types
	const baseDurations: Record<WeatherType, [number, number]> = {
		clear: [180, 480], // 3-8 hours
		cloudy: [120, 360], // 2-6 hours
		light_rain: [60, 180], // 1-3 hours
		heavy_rain: [30, 120], // 30min-2 hours
		drizzle: [90, 240], // 1.5-4 hours
		snow: [120, 360], // 2-6 hours
		blizzard: [30, 90], // 30min-1.5 hours
		storm: [15, 60], // 15min-1 hour
		thunderstorm: [15, 45], // 15-45 minutes
		fog: [60, 300], // 1-5 hours
		mist: [30, 180], // 30min-3 hours
		wind: [60, 240], // 1-4 hours
		hail: [10, 30], // 10-30 minutes
		heat_wave: [240, 720], // 4-12 hours
		cold_snap: [180, 600], // 3-10 hours
		sandstorm: [30, 120], // 30min-2 hours
		aurora: [120, 300], // 2-5 hours
		eclipse: [5, 15], // 5-15 minutes
		meteor_shower: [30, 90] // 30min-1.5 hours
	};

	const [minDuration, maxDuration] = baseDurations[weatherType];
	const range = maxDuration - minDuration;
	
	// Higher stability = longer duration
	const stabilityFactor = stability / 100;
	const duration = minDuration + (range * stabilityFactor);
	
	// Add some randomness but favor the stability-based calculation
	const randomFactor = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2
	
	return Math.floor(duration * randomFactor);
}

/**
 * Renew the duration of existing weather
 */
function renewWeatherDuration(weather: Weather): Weather {
	const newDuration = generateWeatherDuration(weather.type, weather.stability);
	
	return {
		...weather,
		duration: newDuration
	};
}

/**
 * Update weather based on time passage
 */
export function updateWeatherForTime(gameTime: GameTime, minutesPassed: number): GameTime {
	let weather = gameTime.weather;
	let weatherChanged = false;
	
	// Decrease weather duration
	if (weather.duration) {
		weather.duration -= minutesPassed;
		
		// If duration is up, decide whether to change weather based on stability
		if (weather.duration <= 0) {
			// Calculate change probability based on stability (lower stability = higher change chance)
			const stabilityFactor = weather.stability || 75; // Default to 75 if not set
			const changeChance = (100 - stabilityFactor) / 100;
			
			if (Math.random() < changeChance) {
				// Weather changes - generate new weather
				weather = generateWeatherTransition(
					weather,
					gameTime.season,
					gameTime.timeOfDay,
					gameTime.region
				);
				weatherChanged = true;
			} else {
				// Weather persists - just renew duration
				weather = renewWeatherDuration(weather);
			}
		}
	}
	
	// Update weather history only if weather actually changed
	const weatherHistory = gameTime.weatherHistory || [];
	if (weatherChanged || weatherHistory.length === 0 || weatherHistory[weatherHistory.length - 1].type !== weather.type) {
		weatherHistory.push(weather);
		// Keep only last 10 weather states
		if (weatherHistory.length > 10) {
			weatherHistory.shift();
		}
	}
	
	// Update forecast
	const forecast = generateWeatherForecast(gameTime, 24);
	
	return {
		...gameTime,
		weather,
		weatherHistory,
		forecast
	};
}

/**
 * Get weather impact description for narrative purposes
 */
export function getWeatherImpactDescription(weather: Weather): string {
	const effects = weather.effects;
	const impacts: string[] = [];
	
	if (effects.visibility < 50) {
		impacts.push('visibility is severely limited');
	} else if (effects.visibility < 80) {
		impacts.push('visibility is reduced');
	}
	
	if (effects.movement < 70) {
		impacts.push('movement is hindered');
	}
	
	if (effects.combat < 80) {
		impacts.push('combat effectiveness is reduced');
	}
	
	if (effects.magic > 110) {
		impacts.push('magical energies are enhanced');
	} else if (effects.magic < 90) {
		impacts.push('magical abilities are weakened');
	}
	
	if (effects.comfort < 60) {
		impacts.push('comfort levels are poor');
	}
	
	if (impacts.length === 0) {
		return 'The weather has no significant impact on activities.';
	}
	
	return `The ${weather.type.replace('_', ' ')} ${weather.intensity} weather means ${impacts.join(', ')}.`;
}
