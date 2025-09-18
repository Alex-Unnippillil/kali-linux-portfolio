import { safeLocalStorage } from '../safeStorage';

export type EmojiTone =
  | 'default'
  | 'light'
  | 'medium-light'
  | 'medium'
  | 'medium-dark'
  | 'dark';

export const EMOJI_TONES: EmojiTone[] = [
  'default',
  'light',
  'medium-light',
  'medium',
  'medium-dark',
  'dark',
];

const TONE_KEY = 'emoji-preferred-tone';
const RECENTS_KEY = 'emoji-recent-list';
const MAX_RECENTS = 30;
const DEFAULT_TONE: EmojiTone = 'default';

const isEmojiTone = (value: string): value is EmojiTone =>
  (EMOJI_TONES as string[]).includes(value);

export const getPreferredTone = (): EmojiTone => {
  if (!safeLocalStorage) return DEFAULT_TONE;
  const stored = safeLocalStorage.getItem(TONE_KEY);
  if (stored && isEmojiTone(stored)) return stored;
  return DEFAULT_TONE;
};

export const setPreferredTone = (tone: EmojiTone): void => {
  safeLocalStorage?.setItem(TONE_KEY, tone);
};

export const getRecentEmojis = (): string[] => {
  if (!safeLocalStorage) return [];
  try {
    const raw = safeLocalStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
};

export const pushRecentEmoji = (emoji: string): string[] => {
  if (!emoji) return getRecentEmojis();
  const current = getRecentEmojis().filter((entry) => entry !== emoji);
  current.unshift(emoji);
  const trimmed = current.slice(0, MAX_RECENTS);
  safeLocalStorage?.setItem(RECENTS_KEY, JSON.stringify(trimmed));
  return trimmed;
};

export const clearRecentEmojis = (): void => {
  safeLocalStorage?.removeItem(RECENTS_KEY);
};
