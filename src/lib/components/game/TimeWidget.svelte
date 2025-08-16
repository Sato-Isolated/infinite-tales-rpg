<script lang="ts">
	import type { GameTime } from '$lib/types/gameTime';

	type Props = {
		gameTime: GameTime | null;
	};

	let { gameTime }: Props = $props();

	const formatTime = (time: GameTime) => {
		const hourStr = time.hour.toString().padStart(2, '0');
		const minuteStr = time.minute.toString().padStart(2, '0');
		return `${hourStr}:${minuteStr}`;
	};

	const getTimeIcon = (timeOfDay: GameTime['timeOfDay']) => {
		switch (timeOfDay) {
			case 'dawn':
				return '🌅';
			case 'morning':
				return '🌞';
			case 'midday':
				return '☀️';
			case 'afternoon':
				return '🌤️';
			case 'evening':
				return '🌇';
			case 'night':
				return '🌙';
			case 'deep_night':
				return '🌃';
			default:
				return '⏰';
		}
	};

	const getTimeDescription = (timeOfDay: GameTime['timeOfDay']) => {
		switch (timeOfDay) {
			case 'dawn':
				return 'Dawn';
			case 'morning':
				return 'Morning';
			case 'midday':
				return 'Midday';
			case 'afternoon':
				return 'Afternoon';
			case 'evening':
				return 'Evening';
			case 'night':
				return 'Night';
			case 'deep_night':
				return 'Deep Night';
			default:
				return 'Unknown';
		}
	};

	const getSeasonIcon = (season: GameTime['season']) => {
		switch (season) {
			case 'spring':
				return '🌸';
			case 'summer':
				return '☀️';
			case 'autumn':
				return '🍂';
			case 'winter':
				return '❄️';
			default:
				return '🌍';
		}
	};

	const getWeatherIcon = (weatherType: string) => {
		switch (weatherType) {
			case 'clear':
				return '☀️';
			case 'cloudy':
				return '☁️';
			case 'light_rain':
			case 'drizzle':
				return '🌦️';
			case 'heavy_rain':
				return '🌧️';
			case 'snow':
				return '🌨️';
			case 'blizzard':
				return '❄️';
			case 'storm':
			case 'thunderstorm':
				return '⛈️';
			case 'fog':
			case 'mist':
				return '🌫️';
			case 'wind':
				return '💨';
			case 'hail':
				return '🧊';
			case 'heat_wave':
				return '🔥';
			case 'cold_snap':
				return '🥶';
			default:
				return '🌤️';
		}
	};
</script>

<div class="rounded-lg bg-base-200 p-3 shadow-sm">
	{#if gameTime}
		<div class="flex items-center gap-2 text-sm">
			<span class="text-lg" aria-label="Time icon">{getTimeIcon(gameTime.timeOfDay)}</span>
			<div class="flex flex-1 flex-col">
				<span class="font-semibold">
					{gameTime.dayName}
					{gameTime.day}
					{gameTime.monthName}
					{gameTime.year}
				</span>
				<span class="text-xs opacity-75">
					{formatTime(gameTime)} - {getTimeDescription(gameTime.timeOfDay)}
				</span>
			</div>
		</div>

		{#if gameTime.season || gameTime.weather}
			<div class="mt-2 flex items-center gap-3 text-xs">
				{#if gameTime.season}
					<div class="flex items-center gap-1">
						<span aria-label="Season icon">{getSeasonIcon(gameTime.season)}</span>
						<span class="capitalize opacity-75">{gameTime.season}</span>
					</div>
				{/if}
				{#if gameTime.weather}
					<div class="flex items-center gap-1">
						<span aria-label="Weather icon">{getWeatherIcon(gameTime.weather.type)}</span>
						<span class="opacity-75">
							{gameTime.weather.description ||
								`${gameTime.weather.type.replace('_', ' ')} (${gameTime.weather.intensity})`}
						</span>
					</div>
				{/if}
			</div>
		{/if}
	{:else}
		<div class="flex items-center gap-2 text-sm">
			<span class="text-lg">⏳</span>
			<span class="italic opacity-75">Generating initial time...</span>
		</div>
	{/if}
</div>
