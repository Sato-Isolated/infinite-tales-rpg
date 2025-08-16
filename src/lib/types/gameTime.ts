// Types for the game time system
export interface GameTime {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  dayName: string; // "Monday", "Tuesday", etc.
  monthName: string; // "January", "February", etc.
  timeOfDay: 'dawn' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night' | 'deep_night';
}

export const createDefaultTime = (): GameTime => {
  return {
    year: 1024,
    month: 3,
    day: 15,
    hour: 10,
    minute: 0,
    dayName: 'Wednesday',
    monthName: 'March',
    timeOfDay: 'morning'
  };
};
