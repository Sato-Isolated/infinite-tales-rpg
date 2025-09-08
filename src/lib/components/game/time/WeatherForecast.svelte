<script lang="ts">
	import type { WeatherForecast } from '$lib/types/gameTime';

	type Props = {
		forecast: WeatherForecast[];
		showHours?: number;
		compact?: boolean;
	};

	let { forecast, showHours = 12, compact = false }: Props = $props();

	const getWeatherIcon = (weatherType: string) => {
		switch (weatherType) {
			case 'clear': return '☀️';
			case 'cloudy': return '☁️';
			case 'light_rain':
			case 'drizzle': return '🌦️';
			case 'heavy_rain': return '🌧️';
			case 'snow': return '🌨️';
			case 'blizzard': return '❄️';
			case 'storm':
			case 'thunderstorm': return '⛈️';
			case 'fog':
			case 'mist': return '🌫️';
			case 'wind': return '💨';
			case 'hail': return '🧊';
			case 'heat_wave': return '🔥';
			case 'cold_snap': return '🥶';
			case 'sandstorm': return '🌪️';
			case 'aurora': return '🌌';
			case 'eclipse': return '🌑';
			case 'meteor_shower': return '☄️';
			default: return '🌤️';
		}
	};

	const getConfidenceColor = (confidence: number) => {
		if (confidence >= 80) return 'text-success';
		if (confidence >= 60) return 'text-warning';
		return 'text-error';
	};

	const getIntensityIndicator = (intensity: string) => {
		const indicators = { light: '●', moderate: '●●', heavy: '●●●', extreme: '●●●●' };
		return indicators[intensity as keyof typeof indicators] || '●';
	};

	const formatHoursFromNow = (minutes: number) => {
		const hours = Math.floor(minutes / 60);
		const remainingMinutes = minutes % 60;
		
		if (hours === 0) return `${remainingMinutes}min`;
		if (remainingMinutes === 0) return `${hours}h`;
		return `${hours}h${remainingMinutes}m`;
	};

	const visibleForecast = $derived(forecast.slice(0, showHours));
</script>

<div class="bg-base-100 rounded-lg p-3 shadow-sm">
	<div class="flex items-center gap-2 mb-3">
		<span class="text-lg">🔮</span>
		<h3 class="font-semibold text-sm">Weather Forecast</h3>
		<span class="text-xs opacity-50">Next {showHours} hours</span>
	</div>

	{#if visibleForecast.length === 0}
		<div class="text-xs opacity-75 italic">
			No forecast available
		</div>
	{:else}
		{#if compact}
			<!-- Compact horizontal layout -->
			<div class="flex gap-2 overflow-x-auto pb-2">
				{#each visibleForecast as prediction, index}
					<div class="flex-shrink-0 text-center min-w-16">
						<div class="text-xs opacity-75 mb-1">
							{index === 0 ? 'Now' : `+${formatHoursFromNow(prediction.time)}`}
						</div>
						<div class="text-lg mb-1">
							{getWeatherIcon(prediction.weather.type)}
						</div>
						<div class="text-xs opacity-75">
							{prediction.weather.temperature}°
						</div>
						<div class="text-xs {getConfidenceColor(prediction.confidence)} mt-1">
							{prediction.confidence}%
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<!-- Detailed vertical layout -->
			<div class="space-y-2">
				{#each visibleForecast as prediction, index}
					<div class="flex items-center gap-3 p-2 bg-base-200 rounded">
						<div class="flex-shrink-0 w-12 text-center">
							<div class="text-xs opacity-75">
								{index === 0 ? 'Now' : `+${formatHoursFromNow(prediction.time)}`}
							</div>
						</div>
						
						<div class="flex-shrink-0 text-lg">
							{getWeatherIcon(prediction.weather.type)}
						</div>
						
						<div class="flex-1">
							<div class="text-sm font-medium">
								{prediction.weather.type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
							</div>
							<div class="text-xs opacity-75">
								{prediction.weather.intensity} intensity 
								<span class="ml-1">{getIntensityIndicator(prediction.weather.intensity)}</span>
							</div>
						</div>
						
						<div class="text-right flex-shrink-0">
							<div class="text-sm font-medium">
								{prediction.weather.temperature}°
							</div>
							<div class="text-xs {getConfidenceColor(prediction.confidence)}">
								{prediction.confidence}% sure
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Forecast reliability note -->
		<div class="mt-3 text-xs opacity-50 italic">
			Weather predictions become less reliable over time. 
			Magical phenomena may cause sudden changes.
		</div>
	{/if}
</div>
