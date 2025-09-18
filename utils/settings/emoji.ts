import { safeLocalStorage } from '../safeStorage';

export const SKIN_TONE_OPTIONS = [
  { id: 'default', label: 'Default', sample: '👍' },
  { id: 'light', label: 'Light', sample: '👍🏻' },
  { id: 'medium-light', label: 'Medium-Light', sample: '👍🏼' },
  { id: 'medium', label: 'Medium', sample: '👍🏽' },
  { id: 'medium-dark', label: 'Medium-Dark', sample: '👍🏾' },
  { id: 'dark', label: 'Dark', sample: '👍🏿' },
] as const;

export type SkinTone = (typeof SKIN_TONE_OPTIONS)[number]['id'];

export const DEFAULT_SKIN_TONE: SkinTone = 'default';

const SKIN_TONE_KEY = 'emoji-skin-tone';
const RECENTS_KEY = 'emoji-recents';
export const MAX_RECENT_EMOJIS = 24;

export interface EmojiRecent {
  id: string;
  char: string;
  name: string;
  shortcodes: string[];
  skinTone: SkinTone;
  skins?: string[];
  updatedAt: number;
}

export type RecentEmojiInput = Omit<EmojiRecent, 'updatedAt'>;

const isSkinTone = (value: unknown): value is SkinTone =>
  typeof value === 'string' &&
  SKIN_TONE_OPTIONS.some((option) => option.id === value);

const parseRecents = (raw: string | null): EmojiRecent[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const {
          id,
          char,
          name,
          shortcodes,
          skinTone,
          skins,
          updatedAt,
        } = item as Partial<EmojiRecent> & { shortcodes?: unknown };

        if (typeof id !== 'string' || typeof char !== 'string' || typeof name !== 'string') {
          return null;
        }
        if (
          !Array.isArray(shortcodes) ||
          !shortcodes.every((code) => typeof code === 'string')
        ) {
          return null;
        }
        if (!isSkinTone(skinTone)) return null;

        const validSkins = Array.isArray(skins)
          ? skins.filter((value): value is string => typeof value === 'string')
          : undefined;
        const timestamp = typeof updatedAt === 'number' ? updatedAt : 0;

        return {
          id,
          char,
          name,
          shortcodes,
          skinTone,
          skins: validSkins,
          updatedAt: timestamp,
        };
      })
      .filter((value): value is EmojiRecent => Boolean(value))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
};

export const getPreferredSkinTone = (): SkinTone => {
  const stored = safeLocalStorage?.getItem(SKIN_TONE_KEY);
  if (isSkinTone(stored)) return stored;
  return DEFAULT_SKIN_TONE;
};

export const setPreferredSkinTone = (tone: SkinTone) => {
  if (!safeLocalStorage) return;
  safeLocalStorage.setItem(SKIN_TONE_KEY, tone);
};

export const getRecentEmojis = (): EmojiRecent[] => {
  if (!safeLocalStorage) return [];
  return parseRecents(safeLocalStorage.getItem(RECENTS_KEY));
};

export const addRecentEmoji = (recent: RecentEmojiInput): EmojiRecent[] => {
  const entry: EmojiRecent = { ...recent, updatedAt: Date.now() };
  const existing = getRecentEmojis();
  const filtered = existing.filter((item) => item.id !== entry.id);
  const next = [entry, ...filtered].slice(0, MAX_RECENT_EMOJIS);
  safeLocalStorage?.setItem(RECENTS_KEY, JSON.stringify(next));
  return next;
};

export const clearRecentEmojis = () => {
  safeLocalStorage?.removeItem?.(RECENTS_KEY);
};
