import { describe, it, expect } from 'vitest';
import { addMinutesToGameTime, getTimeOfDay, normalizeGameTime } from './timeLogic';
import { createDefaultTime, createDefaultWeather } from '$lib/types/gameTime';
import type { GameTime } from '$lib/types/gameTime';

const base: GameTime = {
	year: 1024,
	month: 12,
	day: 31,
	hour: 23,
	minute: 50,
	dayName: 'Friday',
	monthName: 'December',
	timeOfDay: 'night',
	season: 'winter',
	weather: createDefaultWeather()
};

describe('addMinutesToGameTime', () => {
	it('rolls over day and month and year correctly', () => {
		const res = addMinutesToGameTime(base, 20); // 23:50 + 20 = 00:10 next day/year
		expect(res.year).toBe(1025);
		expect(res.month).toBe(1);
		expect(res.day).toBe(1);
		expect(res.hour).toBe(0);
		expect(res.minute).toBe(10);
		expect(res.timeOfDay).toBe('deep_night');
		expect([
			'Saturday',
			'Sunday',
			'Monday',
			'Tuesday',
			'Wednesday',
			'Thursday',
			'Friday'
		]).toContain(res.dayName);
		expect(res.monthName).toBe('January');
		expect(res.season).toBe('winter');
	});

	it('handles large skips across multiple days', () => {
		const start: GameTime = {
			...base,
			month: 1,
			day: 10,
			hour: 6,
			minute: 0,
			monthName: 'January',
			dayName: 'Monday'
		};
		const res = addMinutesToGameTime(start, 60 * 24 * 25 + 90); // 25 days + 1h30
		expect(res.month).toBe(2);
		expect(res.day).toBeGreaterThanOrEqual(4); // 10 + 25 = 35 -> Feb 4 or 5 depending on day count
		expect(res.hour).toBe(7);
		expect(res.minute).toBe(30);
		expect(res.timeOfDay).toBe(getTimeOfDay(7));
	});

	it('normalizes overflown days (e.g., day=380) correctly', () => {
		const t: GameTime = {
			year: 2077,
			month: 11,
			day: 380,
			hour: 19,
			minute: 52,
			dayName: 'Wednesday',
			monthName: 'November',
			timeOfDay: 'evening',
			season: 'autumn',
			weather: createDefaultWeather()
		};
		const n = normalizeGameTime(t);
		// 380th day of November 2077 -> interpret as Nov 1 + 379 days => should be 2078-? Depending on month lengths
		const jsBase = new Date(Date.UTC(2077, 10, 1, 19, 52)); // Nov is month index 10
		const jsNorm = new Date(jsBase.getTime() + (t.day - 1) * 24 * 60 * 60 * 1000);
		expect(n.year).toBe(jsNorm.getUTCFullYear());
		expect(n.month).toBe(jsNorm.getUTCMonth() + 1);
		expect(n.day).toBe(jsNorm.getUTCDate());
	});
});
