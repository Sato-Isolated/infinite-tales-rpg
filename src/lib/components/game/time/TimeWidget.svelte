<script lang="ts">
	import type { GameTime } from '$lib/types/gameTime';
	import { getWeatherGameplayEffects } from '$lib/game/logic/timeLogic';

	type Props = {
		gameTime: GameTime | null;
		showDetails?: boolean;
		compact?: boolean;
	};

	let { gameTime, showDetails = false, compact = false }: Props = $props();

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
			case 'sandstorm':
				return '🌪️';
			case 'aurora':
				return '🌌';
			case 'eclipse':
				return '🌑';
			case 'meteor_shower':
				return '☄️';
			default:
				return '🌤️';
		}
	};

	const getTemperatureColor = (temp: number) => {
		if (temp > 30) return 'text-red-500';
		if (temp > 20) return 'text-orange-500';
		if (temp > 10) return 'text-yellow-500';
		if (temp > 0) return 'text-blue-500';
		return 'text-cyan-500';
	};

	const getWeatherIntensityBadge = (intensity: string) => {
		const colors = {
			light: 'badge-info',
			moderate: 'badge-warning', 
			heavy: 'badge-error',
			extreme: 'badge-error'
		};
		return colors[intensity as keyof typeof colors] || 'badge-neutral';
	};

	const weatherEffectsText = $derived(() => {
		return gameTime ? getWeatherGameplayEffects(gameTime) : '';
	});

	const getTemperatureIcon = (temp: number) => {
		if (temp >= 30) return '🔥';
		if (temp >= 20) return '☀️';
		if (temp >= 10) return '🌤️';
		if (temp >= 0) return '❄️';
		return '🥶';
	};
</script>

<div class="bg-base-200 rounded-lg p-3 shadow-xs" class:p-2={compact}>
	{#if gameTime}
		<!-- Main time display -->
		<div class="flex items-center gap-2" class:text-sm={compact} class:text-base={!compact}>
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

		<!-- Weather and season info -->
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
						<span class="badge badge-xs {getWeatherIntensityBadge(gameTime.weather.intensity)}">
							{gameTime.weather.intensity}
						</span>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Enhanced weather details -->
		{#if showDetails && gameTime.weather}
			<div class="mt-3 space-y-2">
				<!-- Temperature and conditions -->
				<div class="flex items-center justify-between text-xs">
					<div class="flex items-center gap-2">
						<span class="opacity-75">Temperature:</span>
						<span class="font-medium {getTemperatureColor(gameTime.weather.temperature)}">
							{gameTime.weather.temperature}°
						</span>
					</div>
					
					{#if gameTime.weather.wind}
						<div class="flex items-center gap-1">
							<span class="opacity-75">Wind:</span>
							<span class="font-medium">{gameTime.weather.wind.speed} 💨 {gameTime.weather.wind.direction}</span>
						</div>
					{/if}
				</div>

				<!-- Weather effects on gameplay -->
				{#if weatherEffectsText}
					<div class="alert alert-info py-2 text-xs">
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="h-4 w-4 shrink-0 stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
						<span>{weatherEffectsText}</span>
					</div>
				{/if}

				<!-- Weather events -->
				{#if gameTime.weather.events && gameTime.weather.events.length > 0}
					<div class="space-y-1">
						{#each gameTime.weather.events as event}
							<div class="alert alert-warning py-1 text-xs">
								<span class="text-xs">⚡ {event.description}</span>
							</div>
						{/each}
					</div>
				{/if}

				<!-- Weather duration -->
				{#if gameTime.weather.duration}
					<div class="text-xs opacity-75">
						Weather stable for ~{Math.floor(gameTime.weather.duration / 60)}h {gameTime.weather.duration % 60}min
					</div>
				{/if}

				<!-- Region info -->
				{#if gameTime.region}
					<div class="text-xs opacity-75">
						<span class="opacity-50">Region:</span> {gameTime.region.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Compact mode weather forecast preview -->
		{#if !showDetails && gameTime.forecast && gameTime.forecast.length > 0}
			<div class="mt-2 text-xs opacity-75">
				Next: {getWeatherIcon(gameTime.forecast[0].weather.type)} 
				{gameTime.forecast[0].weather.type.replace('_', ' ')}
				<span class="opacity-50">in {Math.floor(gameTime.forecast[0].time / 60)}h</span>
			</div>
		{/if}
	{:else}
		<div class="flex items-center gap-2 text-sm">
			<span class="text-lg">⏳</span>
			<span class="italic opacity-75">Generating initial time...</span>
		</div>
	{/if}
</div>
