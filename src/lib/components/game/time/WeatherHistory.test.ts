import { describe, it, expect } from 'vitest';
import type { Weather } from '$lib/types/gameTime';
import { createDefaultWeatherEffects } from '$lib/types/gameTime';

describe('WeatherHistory component data processing', () => {
	const mockWeatherHistory: Weather[] = [
		{
			type: 'clear',
			temperature: 20,
			humidity: 60,
			wind: { speed: 5, direction: 'west' },
			pressure: 60,
			intensity: 'light',
			effects: createDefaultWeatherEffects(),
			events: [],
			stability: 75
		},
		{
			type: 'cloudy',
			temperature: 18,
			humidity: 70,
			wind: { speed: 8, direction: 'west' },
			pressure: 55,
			intensity: 'moderate',
			effects: { ...createDefaultWeatherEffects(), visibility: 90 },
			events: [],
			stability: 65
		},
		{
			type: 'light_rain',
			temperature: 15,
			humidity: 85,
			wind: { speed: 12, direction: 'southwest' },
			pressure: 45,
			intensity: 'moderate',
			effects: { ...createDefaultWeatherEffects(), visibility: 70, movement: 85 },
			events: [],
			stability: 50
		},
		{
			type: 'storm',
			temperature: 12,
			humidity: 95,
			wind: { speed: 25, direction: 'west' },
			pressure: 30,
			intensity: 'extreme',
			effects: { ...createDefaultWeatherEffects(), visibility: 30, movement: 40, combat: 70 },
			events: [{ 
				type: 'natural_disaster', 
				description: 'Lightning illuminates the sky',
				duration: 30
			}],
			stability: 20
		}
	];

	it('processes weather history data correctly', () => {
		expect(mockWeatherHistory).toHaveLength(4);
		expect(mockWeatherHistory[0].type).toBe('clear');
		expect(mockWeatherHistory[3].intensity).toBe('extreme');
	});

	it('calculates average temperature correctly', () => {
		const averageTemp = Math.round(
			mockWeatherHistory.reduce((sum, w) => sum + w.temperature, 0) / mockWeatherHistory.length
		);
		expect(averageTemp).toBe(16); // (20 + 18 + 15 + 12) / 4 = 16.25 → 16
	});

	it('identifies stormy weather patterns', () => {
		const stormyWeather = mockWeatherHistory.filter(w => 
			['storm', 'thunderstorm', 'blizzard', 'sandstorm'].includes(w.type)
		).length;
		expect(stormyWeather).toBe(1);
	});

	it('identifies clear weather patterns', () => {
		const clearWeather = mockWeatherHistory.filter(w => 
			['clear', 'cloudy'].includes(w.type)
		).length;
		expect(clearWeather).toBe(2);
	});

	it('formats weather type names correctly', () => {
		const formatWeatherType = (type: string) => 
			type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
		
		expect(formatWeatherType('light_rain')).toBe('Light Rain');
		expect(formatWeatherType('clear')).toBe('Clear');
		expect(formatWeatherType('meteor_shower')).toBe('Meteor Shower');
	});

	it('assigns correct intensity badge classes', () => {
		const getIntensityBadge = (intensity: string) => {
			const colors = {
				light: 'badge-info',
				moderate: 'badge-warning', 
				heavy: 'badge-error',
				extreme: 'badge-error'
			};
			return colors[intensity as keyof typeof colors] || 'badge-neutral';
		};

		expect(getIntensityBadge('light')).toBe('badge-info');
		expect(getIntensityBadge('moderate')).toBe('badge-warning');
		expect(getIntensityBadge('extreme')).toBe('badge-error');
		expect(getIntensityBadge('unknown')).toBe('badge-neutral');
	});

	it('gets correct weather icons', () => {
		const getWeatherIcon = (weatherType: string) => {
			switch (weatherType) {
				case 'clear': return '☀️';
				case 'cloudy': return '☁️';
				case 'light_rain':
				case 'drizzle': return '🌦️';
				case 'storm':
				case 'thunderstorm': return '⛈️';
				default: return '🌤️';
			}
		};

		expect(getWeatherIcon('clear')).toBe('☀️');
		expect(getWeatherIcon('storm')).toBe('⛈️');
		expect(getWeatherIcon('light_rain')).toBe('🌦️');
		expect(getWeatherIcon('unknown')).toBe('🌤️');
	});

	it('limits history entries correctly', () => {
		const maxEntries = 2;
		const recentHistory = mockWeatherHistory.slice(-maxEntries).reverse();
		expect(recentHistory).toHaveLength(2);
		expect(recentHistory[0].type).toBe('storm'); // Most recent first
		expect(recentHistory[1].type).toBe('light_rain');
	});
});
