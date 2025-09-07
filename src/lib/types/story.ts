/**
 * Story and narrative type definitions
 */

export type StoryState = {
  story: string;
  chapterTitle: string;
};

export const defaultStoryState = (): StoryState => ({
  story: '',
  chapterTitle: ''
});

export type StoryProgressionHistoryEntry = {
  story: string;
  chosenAction: string;
  timestamp: string;
  gameTime: string;
  plotPointAdvancingNudgeExplanation?: string;
};

export type ThoughtEntry = {
  thought: string;
  timestamp: string;
  kind: string;
};
