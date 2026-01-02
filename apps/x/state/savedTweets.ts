import DOMPurify from 'dompurify';
import usePersistentState from '../../../hooks/usePersistentState';
import { sanitizeHandle, sanitizeTweetText } from '../utils';

export interface SavedTweet {
  id: string;
  text: string;
  timestamp: number;
  author: string;
}

const isSavedTweet = (value: unknown): value is SavedTweet => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SavedTweet>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.text === 'string' &&
    typeof candidate.author === 'string' &&
    typeof candidate.timestamp === 'number' &&
    Number.isFinite(candidate.timestamp)
  );
};

const isSavedTweetArray = (value: unknown): value is SavedTweet[] =>
  Array.isArray(value) && value.every(isSavedTweet);

const normalizeTweet = (
  tweet: unknown,
  authorFallback: string,
  timeKey: 'time' | 'timestamp' = 'timestamp',
): SavedTweet | null => {
  if (!tweet || typeof tweet !== 'object') return null;
  const candidate = tweet as Record<string, unknown>;
  const text = sanitizeTweetText(String(candidate.text ?? ''));
  const author =
    sanitizeHandle(DOMPurify.sanitize(String(candidate.author ?? authorFallback))) ||
    authorFallback;
  const timestamp = Number(candidate[timeKey]);
  if (!text || !Number.isFinite(timestamp)) return null;
  const providedId =
    typeof candidate.id === 'string' && candidate.id.trim()
      ? candidate.id
      : null;
  const id =
    providedId ||
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  return { id, text, author, timestamp };
};

const readLegacyTweets = (): SavedTweet[] => {
  if (typeof window === 'undefined') return [];
  const authorFallback =
    sanitizeHandle(
      DOMPurify.sanitize(
        window.localStorage.getItem('x-profile-feed') ||
          window.localStorage.getItem('x-feed-user') ||
          'AUnnippillil',
      ),
    ) || 'AUnnippillil';

  const legacyKeys: { key: string; timeKey?: 'time' | 'timestamp' }[] = [
    { key: 'x-thread-published', timeKey: 'time' },
    { key: 'x-thread-scheduled', timeKey: 'time' },
    { key: 'x-scheduled-tweets', timeKey: 'time' },
  ];

  const migrated = new Map<string, SavedTweet>();

  legacyKeys.forEach(({ key, timeKey }) => {
    try {
      const stored = window.localStorage.getItem(key);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          const normalized = normalizeTweet(item, authorFallback, timeKey);
          if (normalized) {
            migrated.set(normalized.id, normalized);
          }
        });
      }
      window.localStorage.removeItem(key);
    } catch {
      // ignore legacy read errors
    }
  });

  return Array.from(migrated.values());
};

export default function useSavedTweets() {
  return usePersistentState<SavedTweet[]>(
    'x-saved-tweets',
    () => readLegacyTweets(),
    isSavedTweetArray,
  );
}

export { isSavedTweetArray };
