import { generateInitialGameTime } from '$lib/ai/agents/gameAgent';
import { LLMProvider } from '$lib/ai/llmProvider';
import type { CharacterDescription } from '$lib/ai/agents/characterAgent';
import type { Story } from '$lib/ai/agents/storyAgent';
import { createDefaultTime, type GameTime } from '$lib/types/gameTime';
import type { GameSettings } from '$lib/ai/agents/gameAgent';

/**
 * Generate an initial game time based on story and character context
 * This should be called when starting a new tale/campaign
 */
export async function generateStoryAppropriateTime(
	storyState: Story,
	characterState: CharacterDescription,
	gameSettings: GameSettings,
	apiKey: string,
	language?: string,
	useFallbackLlm?: boolean
): Promise<GameTime> {
	console.log('generateStoryAppropriateTime called with:', {
		storyGame: storyState.game,
		storyTheme: storyState.theme,
		characterName: characterState.name,
		apiKey: apiKey ? 'present' : 'missing',
		language
	});

	try {
		const llm = LLMProvider.provideLLM(
			{
				temperature: 0.8,
				apiKey: apiKey,
				language: language
			},
			useFallbackLlm
		);

		console.log('LLM provider created, calling generateInitialGameTime...');
		const result = await generateInitialGameTime(llm, storyState, characterState, gameSettings);
		console.log('generateInitialGameTime returned:', result);
		return result;
	} catch (error) {
		console.error('Failed to generate story-appropriate time, falling back to default:', error);
		return createDefaultTime();
	}
}

/**
 * Helper function to check if a gameTime should be regenerated (e.g., if it's still the default)
 */
export function shouldRegenerateGameTime(gameTime: GameTime): boolean {
	const defaultTime = createDefaultTime();
	return (
		gameTime.day === defaultTime.day &&
		gameTime.month === defaultTime.month &&
		gameTime.year === defaultTime.year &&
		gameTime.hour === defaultTime.hour &&
		gameTime.minute === defaultTime.minute
	);
}
