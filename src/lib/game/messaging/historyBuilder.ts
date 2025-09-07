/**
 * History message building utilities for LLM conversations
 */
import { stringifyPretty } from '$lib/util.svelte';
import type { LLMMessage } from '$lib/ai/llm';
import type { GameTime } from '$lib/types/gameTime';
import type { GameActionState } from '$lib/types/actions';
import { addMinutesToGameTime } from '$lib/game/logic/timeLogic';

/**
 * Builds LLM history messages with proper temporal context and state serialization
 * 
 * This function creates user and model messages for LLM conversation history,
 * adding temporal context and ensuring safe access to model state properties.
 */
export function buildHistoryMessages(
  userText: string,
  modelStateObject: GameActionState,
  gameTime?: GameTime | null
): { userMessage: LLMMessage; modelMessage: LLMMessage } {
  const userMessage: LLMMessage = { role: 'user', content: userText };

  // Secure access to modelStateObject properties with null safety
  if (!modelStateObject) {
    console.warn('buildHistoryMessages: modelStateObject is undefined, using fallback');
    return {
      userMessage,
      modelMessage: {
        role: 'model' as const,
        content: stringifyPretty({
          story: '[No previous story available]',
          error: 'Model state object was undefined'
        })
      }
    };
  }

  // Add temporal context hidden in history to improve narrative consistency
  const timePassedMinutes = Number(modelStateObject?.time_passed_minutes || 0) || 0;
  const timePassedText = timePassedMinutes ? ` | Action duration: ${timePassedMinutes}min` : '';

  // Compute effective time (current + time_passed_minutes) for the header so it matches UI state
  const effectiveTime = gameTime && timePassedMinutes
    ? addMinutesToGameTime(gameTime as GameTime, timePassedMinutes)
    : gameTime || null;

  const storyWithTimeContext = effectiveTime
    ? `[Time: ${effectiveTime.dayName} ${effectiveTime.day} ${effectiveTime.monthName} ${effectiveTime.year}, ${effectiveTime.hour}:${effectiveTime.minute.toString().padStart(2, '0')} - ${effectiveTime.timeOfDay} | Season: ${effectiveTime.season || 'Unknown'} | Weather: ${effectiveTime.weather?.description || `${effectiveTime.weather?.type || 'clear'} (${effectiveTime.weather?.intensity || 'light'})`}${timePassedText}]\n${modelStateObject?.story || '[No story content]'}`
    : (modelStateObject?.story || '[No story content]');

  const modelMessage: LLMMessage = {
    role: 'model',
    content: stringifyPretty({
      ...modelStateObject,
      story: storyWithTimeContext
    })
  };

  return { userMessage, modelMessage };
}
