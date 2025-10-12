import type { RefObject } from 'react';

export interface GameDirection {
  x: number;
  y: number;
}

export interface GameSettings {
  paused: boolean;
  togglePause: () => void;
  speed: number;
  setSpeed: (value: number) => void;
  muted: boolean;
  toggleMute: () => void;
  screenShake: boolean;
  setScreenShake: (value: boolean) => void;
  palette: string;
  setPalette: (value: string) => void;
}

export interface GamePersistence {
  saveSnapshot: (data: unknown) => void;
  loadSnapshot: () => unknown;
  getHighScore: () => number;
  setHighScore: (score: number) => void;
  getAchievements: () => unknown[];
  unlockAchievement: (id: string) => void;
}

declare module 'components/apps/useGameControls' {
  export default function useGameControls(
    arg?: ((direction: GameDirection) => void) | RefObject<HTMLCanvasElement>,
    gameId?: string,
  ): any;

  export const colorBlindPalettes: Record<string, string[]>;
  export function useGameSettings(gameId?: string): GameSettings;
  export function useGamePersistence(gameId?: string): GamePersistence;
  export function useInputLatencyTest(): { latency: number | null; start: () => void };
}
