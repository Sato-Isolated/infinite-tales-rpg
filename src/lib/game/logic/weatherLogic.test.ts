import { describe, it, expect } from 'vitest';
import {
	calculateWeatherEffects,
	generateWeatherTransition,
	generateWeatherForecast,
	updateWeatherForTime,
	getWeatherImpactDescription,
	GEOGRAPHIC_PATTERNS
} from './weatherLogic';
import { createDefaultTime, createDefaultWeather } from '$lib/types/gameTime';
import type { WeatherType, WeatherIntensity } from '$lib/types/gameTime';

describe('Weather Logic', () => {
	describe('calculateWeatherEffects', () => {
		it('should calculate correct effects for clear weather', () => {
			const effects = calculateWeatherEffects('clear', 'light');
			expect(effects.visibility).toBe(100);
			expect(effects.movement).toBe(100);
			expect(effects.combat).toBe(100);
			expect(effects.magic).toBe(100);
			expect(effects.comfort).toBe(100);
		});

		it('should reduce visibility in fog', () => {
			const effects = calculateWeatherEffects('fog', 'heavy');
			expect(effects.visibility).toBeLessThan(50);
			expect(effects.movement).toBeLessThan(100);
		});

		it('should enhance magic in storms', () => {
			const effects = calculateWeatherEffects('thunderstorm', 'heavy');
			expect(effects.magic).toBeGreaterThan(100);
			expect(effects.combat).toBeLessThan(100);
		});

		it('should create harsh conditions in blizzards', () => {
			const effects = calculateWeatherEffects('blizzard', 'extreme');
			expect(effects.visibility).toBeLessThan(30);
			expect(effects.movement).toBeLessThan(60);
			expect(effects.comfort).toBeLessThan(40);
		});
	});

	describe('generateWeatherTransition', () => {
		it('should generate valid weather transitions', () => {
			const currentWeather = createDefaultWeather();
			const gameTime = createDefaultTime();
			
			const newWeather = generateWeatherTransition(
				currentWeather,
				gameTime.season,
				gameTime.timeOfDay,
				gameTime.region
			);
			
			expect(newWeather.type).toBeDefined();
			expect(newWeather.intensity).toBeDefined();
			expect(newWeather.effects).toBeDefined();
			expect(newWeather.duration).toBeGreaterThan(0);
			expect(newWeather.stability).toBeGreaterThanOrEqual(0);
			expect(newWeather.stability).toBeLessThanOrEqual(100);
		});

		it('should prefer snow in winter', () => {
			const currentWeather = createDefaultWeather();
			currentWeather.type = 'cloudy';
			
			// Run multiple transitions to test probability
			let snowCount = 0;
			const trials = 100;
			
			for (let i = 0; i < trials; i++) {
				const newWeather = generateWeatherTransition(
					currentWeather,
					'winter',
					'morning',
					'temperate_plains'
				);
				if (newWeather.type === 'snow' || newWeather.type === 'cold_snap') {
					snowCount++;
				}
			}
			
			// Should have some bias towards winter weather
			expect(snowCount).toBeGreaterThan(0);
		});

		it('should consider geographic patterns', () => {
			const currentWeather = createDefaultWeather();
			
			// Generate multiple desert weather instances to test patterns
			const desertWeatherTypes: string[] = [];
			for (let i = 0; i < 20; i++) {
				const desertWeather = generateWeatherTransition(
					currentWeather,
					'summer',
					'midday',
					'desert_lands'
				);
				desertWeatherTypes.push(desertWeather.type);
			}
			
			// Desert should favor appropriate weather patterns
			const hasDesertWeather = desertWeatherTypes.some(type => 
				['clear', 'heat_wave', 'sandstorm', 'wind'].includes(type)
			);
			expect(hasDesertWeather).toBe(true);
		});
	});

	describe('generateWeatherForecast', () => {
		it('should generate forecast with decreasing confidence', () => {
			const gameTime = createDefaultTime();
			const forecast = generateWeatherForecast(gameTime, 12);
			
			expect(forecast).toHaveLength(12);
			expect(forecast[0].confidence).toBeGreaterThan(forecast[11].confidence);
			
			forecast.forEach(prediction => {
				expect(prediction.time).toBeGreaterThan(0);
				expect(prediction.confidence).toBeGreaterThan(0);
				expect(prediction.weather.type).toBeDefined();
			});
		});
	});

	describe('updateWeatherForTime', () => {
		it('should maintain weather if duration not exceeded', () => {
			const gameTime = createDefaultTime();
			gameTime.weather.duration = 300; // 5 hours
			
			const updated = updateWeatherForTime(gameTime, 60); // 1 hour passed
			
			expect(updated.weather.type).toBe(gameTime.weather.type);
			expect(updated.weather.duration).toBe(240); // Decreased by 60 minutes
		});

		it('should change weather when duration expires', () => {
			const gameTime = createDefaultTime();
			gameTime.weather.duration = 30; // 30 minutes
			
			const updated = updateWeatherForTime(gameTime, 60); // 1 hour passed
			
			// Weather should have changed and new duration set
			expect(updated.weather.duration).toBeGreaterThan(0);
		});

		it('should update weather history', () => {
			const gameTime = createDefaultTime();
			gameTime.weatherHistory = [];
			
			const updated = updateWeatherForTime(gameTime, 0);
			
			expect(updated.weatherHistory).toHaveLength(1);
			expect(updated.weatherHistory![0].type).toBe(gameTime.weather.type);
		});

		it('should limit weather history to 10 entries', () => {
			const gameTime = createDefaultTime();
			// Fill with 10 different weather entries
			gameTime.weatherHistory = Array(10).fill(null).map(() => createDefaultWeather());
			gameTime.weather.duration = 1;
			
			const updated = updateWeatherForTime(gameTime, 60);
			
			expect(updated.weatherHistory!.length).toBeLessThanOrEqual(10);
		});

		it('should generate forecast', () => {
			const gameTime = createDefaultTime();
			
			const updated = updateWeatherForTime(gameTime, 0);
			
			expect(updated.forecast).toBeDefined();
			expect(updated.forecast!.length).toBeGreaterThan(0);
		});
	});

	describe('getWeatherImpactDescription', () => {
		it('should provide no impact for perfect weather', () => {
			const weather = createDefaultWeather();
			const description = getWeatherImpactDescription(weather);
			
			expect(description).toBe('The weather has no significant impact on activities.');
		});

		it('should describe impacts for harsh weather', () => {
			const weather = createDefaultWeather();
			weather.type = 'blizzard';
			weather.intensity = 'extreme';
			weather.effects = calculateWeatherEffects('blizzard', 'extreme');
			
			const description = getWeatherImpactDescription(weather);
			
			expect(description).toContain('visibility is severely limited');
			expect(description).toContain('movement is hindered');
			expect(description).toContain('comfort levels are poor');
		});

		it('should describe magical enhancement', () => {
			const weather = createDefaultWeather();
			weather.type = 'thunderstorm';
			weather.intensity = 'heavy';
			weather.effects = calculateWeatherEffects('thunderstorm', 'heavy');
			
			const description = getWeatherImpactDescription(weather);
			
			expect(description).toContain('magical energies are enhanced');
		});
	});

	describe('Geographic patterns', () => {
		it('should have valid geographic data', () => {
			Object.values(GEOGRAPHIC_PATTERNS).forEach(pattern => {
				expect(pattern.region).toBeDefined();
				expect(pattern.baseTemperature).toBeTypeOf('number');
				expect(pattern.seasonalVariation).toBeGreaterThan(0);
				expect(pattern.weatherPatterns).toBeInstanceOf(Array);
				expect(pattern.weatherPatterns.length).toBeGreaterThan(0);
				
				// Climate tendencies should be 0-100
				Object.values(pattern.climateTendencies).forEach(value => {
					expect(value).toBeGreaterThanOrEqual(0);
					expect(value).toBeLessThanOrEqual(100);
				});
			});
		});
	});

	describe('Edge cases', () => {
		it('should handle undefined region gracefully', () => {
			const currentWeather = createDefaultWeather();
			
			expect(() => {
				generateWeatherTransition(
					currentWeather,
					'spring',
					'morning',
					undefined
				);
			}).not.toThrow();
		});

		it('should handle extreme weather intensities', () => {
			const weatherTypes: WeatherType[] = ['blizzard', 'thunderstorm', 'sandstorm'];
			const intensities: WeatherIntensity[] = ['light', 'moderate', 'heavy', 'extreme'];
			
			weatherTypes.forEach(type => {
				intensities.forEach(intensity => {
					expect(() => {
						calculateWeatherEffects(type, intensity);
					}).not.toThrow();
				});
			});
		});

		it('should respect weather stability when duration expires', () => {
			const gameTime = createDefaultTime();
			gameTime.weather.duration = 5; // About to expire
			gameTime.weather.stability = 90; // Very stable
			
			// Run multiple updates to test stability
			let sameWeatherCount = 0;
			const iterations = 10;
			
			for (let i = 0; i < iterations; i++) {
				const updated = updateWeatherForTime(gameTime, 10); // Force duration expiry
				if (updated.weather.type === gameTime.weather.type) {
					sameWeatherCount++;
				}
				// Reset for next iteration
				gameTime.weather = updated.weather;
				gameTime.weather.duration = 5;
			}
			
			// With 90% stability, weather should stay the same most of the time
			expect(sameWeatherCount).toBeGreaterThan(iterations * 0.6); // At least 60% stability
		});

		it('should change weather more often with low stability', () => {
			const gameTime = createDefaultTime();
			gameTime.weather.duration = 5; // About to expire
			gameTime.weather.stability = 20; // Very unstable
			
			// Run multiple updates to test instability
			let differentWeatherCount = 0;
			const iterations = 20; // Increase iterations for more reliable test
			const originalType = gameTime.weather.type;
			
			for (let i = 0; i < iterations; i++) {
				const updated = updateWeatherForTime(gameTime, 10); // Force duration expiry
				if (updated.weather.type !== originalType) {
					differentWeatherCount++;
				}
				// Reset for next iteration but keep the instability
				gameTime.weather = updated.weather;
				gameTime.weather.duration = 5;
				gameTime.weather.stability = 20;
			}
			
			// With 20% stability, weather should change at least sometimes
			// Expectation: At least 10% change rate (realistic given stability logic)
			expect(differentWeatherCount).toBeGreaterThan(iterations * 0.1); // At least 10% change rate
		});

		it('should generate appropriate durations for different weather types', () => {
			// Generate multiple instances to test ranges
			const durations: number[] = [];
			for (let i = 0; i < 20; i++) {
				const weather = generateWeatherTransition(
					createDefaultWeather(),
					'spring',
					'morning'
				);
				durations.push(weather.duration || 0);
			}
			
			// Check that durations are within reasonable ranges
			const minDuration = Math.min(...durations);
			const maxDuration = Math.max(...durations);
			
			expect(minDuration).toBeGreaterThan(0);
			expect(maxDuration).toBeGreaterThan(minDuration);
			expect(maxDuration).toBeLessThan(720); // Less than 12 hours
		});
	});
});
