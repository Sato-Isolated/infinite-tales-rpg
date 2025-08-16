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
</script>

<div class="rounded-lg bg-base-200 p-3 shadow-sm">
	{#if gameTime}
		<div class="flex items-center gap-2 text-sm">
			<span class="text-lg" aria-label="Icône temps">{getTimeIcon(gameTime.timeOfDay)}</span>
			<div class="flex flex-col">
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
	{:else}
		<div class="flex items-center gap-2 text-sm">
			<span class="text-lg">⏳</span>
			<span class="italic opacity-75">Generating initial time...</span>
		</div>
	{/if}
</div>
