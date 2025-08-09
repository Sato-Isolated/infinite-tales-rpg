import type { RenderedGameUpdate } from './gameLogic';

export type StoryProgressionWithImageProps = {
        storyTextRef?: HTMLElement;
        story: string;
        gameUpdates?: Array<RenderedGameUpdate | undefined>;
        imagePrompt?: string;
        stream_finished?: boolean;
};

export interface LevelUpState {
        buttonEnabled: boolean;
        dialogOpened: boolean;
        playerName: string;
}

export const initialLevelUpState: LevelUpState = {
        buttonEnabled: false,
        dialogOpened: false,
        playerName: ''
};

