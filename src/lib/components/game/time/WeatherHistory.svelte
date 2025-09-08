<script lang="ts">
	import type { Weather } from '$lib/types/gameTime';

	type Props = {
		weatherHistory: Weather[];
		maxEntries?: number;
	};

	let { weatherHistory, maxEntries = 5 }: Props = $props();

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

	const getIntensityBadge = (intensity: string) => {
		const colors = {
			light: 'badge-info',
			moderate: 'badge-warning', 
			heavy: 'badge-error',
			extreme: 'badge-error'
		};
		return colors[intensity as keyof typeof colors] || 'badge-neutral';
	};

	const recentHistory = $derived(weatherHistory.slice(-maxEntries).reverse());
</script>

<div class="bg-base-100 rounded-lg p-3 shadow-sm">
	<div class="flex items-center gap-2 mb-3">
		<span class="text-lg">📜</span>
		<h3 class="font-semibold text-sm">Weather History</h3>
		<span class="text-xs opacity-50">Recent conditions</span>
	</div>

	{#if recentHistory.length === 0}
		<div class="text-xs opacity-75 italic">
			No weather history available
		</div>
	{:else}
		<div class="space-y-2">
			{#each recentHistory as weather, index}
				<div class="flex items-center gap-3 p-2 bg-base-200 rounded">
					<div class="flex-shrink-0 text-lg">
						{getWeatherIcon(weather.type)}
					</div>
					
					<div class="flex-1">
						<div class="text-sm font-medium">
							{weather.type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
						</div>
						<div class="text-xs opacity-75">
							{weather.temperature}° • {weather.humidity}% humidity
						</div>
					</div>
					
					<div class="flex items-center gap-2">
						<span class="badge badge-xs {getIntensityBadge(weather.intensity)}">
							{weather.intensity}
						</span>
						{#if index === 0}
							<span class="badge badge-xs badge-primary">Current</span>
						{:else}
							<span class="text-xs opacity-50">-{index}</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<!-- Weather pattern analysis -->
		{#if recentHistory.length >= 3}
			{@const averageTemp = Math.round(recentHistory.reduce((sum, w) => sum + w.temperature, 0) / recentHistory.length)}
			{@const stormyWeather = recentHistory.filter(w => ['storm', 'thunderstorm', 'blizzard', 'sandstorm'].includes(w.type)).length}
			{@const clearWeather = recentHistory.filter(w => ['clear', 'cloudy'].includes(w.type)).length}
			
			<div class="mt-3 p-2 bg-base-300 rounded text-xs">
				<div class="flex items-center gap-1 mb-1">
					<span>📊</span>
					<span class="font-medium">Pattern Analysis</span>
				</div>
				
				<div class="opacity-75">
					Average temperature: {averageTemp}° • 
					{#if stormyWeather > recentHistory.length / 2}
						Stormy period
					{:else if clearWeather > recentHistory.length / 2}
						Stable period
					{:else}
						Variable conditions
					{/if}
				</div>
			</div>
		{/if}
	{/if}
</div>
