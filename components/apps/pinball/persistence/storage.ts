import { STORAGE_HIGHSCORES_KEY, STORAGE_SETTINGS_KEY } from '../constants';
import type { HighScoreEntry, PinballSettings } from '../types';

const DEFAULT_SETTINGS: PinballSettings = { reducedMotion: false, masterVolume: 0.8, muted: false };

export const loadSettings = (): PinballSettings => {
  try {
    const raw = window.localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<PinballSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings: PinballSettings): void => {
  window.localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
};

export const loadHighScores = (): HighScoreEntry[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_HIGHSCORES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { version?: number; entries?: HighScoreEntry[] } | HighScoreEntry[];
    const entries = Array.isArray(parsed) ? parsed : parsed.entries ?? [];
    return entries.filter((e) => Number.isFinite(e.score)).sort((a, b) => b.score - a.score).slice(0, 10);
  } catch {
    return [];
  }
};

export const saveHighScores = (entries: HighScoreEntry[]): void => {
  window.localStorage.setItem(STORAGE_HIGHSCORES_KEY, JSON.stringify({ version: 1, entries: entries.slice(0, 10) }));
};

export const insertHighScore = (entries: HighScoreEntry[], candidate: HighScoreEntry): HighScoreEntry[] => {
  return [...entries, candidate].sort((a, b) => b.score - a.score).slice(0, 10);
};

export const defaults = { DEFAULT_SETTINGS };
