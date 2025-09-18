'use client';

import React, {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import emojiJson from '../../../data/emoji.json';
import copyToClipboard from '../../../utils/clipboard';
import {
  EMOJI_TONES,
  EmojiTone,
  clearRecentEmojis,
  getPreferredTone,
  getRecentEmojis,
  pushRecentEmoji,
  setPreferredTone,
} from '../../../utils/settings/emoji';
import {
  EditableSnapshot,
  canInsert,
  captureEditableSnapshot,
  insertText,
  restoreEditableSnapshot,
} from '../../../modules/desktop/inputBridge';

interface EmojiSkin {
  tone: string;
  unified: string;
  emoji: string;
}

interface EmojiEntry {
  emoji: string;
  name: string;
  shortcodes: string[];
  keywords?: string[];
  skins: EmojiSkin[];
  version?: number;
}

const emojiData = emojiJson as EmojiEntry[];

const tonePreview: Record<EmojiTone, string> = {
  default: '🖐️',
  light: '🖐🏻',
  'medium-light': '🖐🏼',
  medium: '🖐🏽',
  'medium-dark': '🖐🏾',
  dark: '🖐🏿',
};

const MAX_RESULTS = 400;

const buildEmojiMap = (entries: EmojiEntry[]) => {
  const map = new Map<string, EmojiEntry>();
  entries.forEach((entry) => {
    entry.skins.forEach((skin) => {
      if (skin.emoji) {
        map.set(skin.emoji, entry);
      }
    });
  });
  return map;
};

const toDisplayCodes = (codes: string[]) =>
  codes
    .slice(0, 4)
    .map((code) => `:${code}:`)
    .join(' ');

const matchesQuery = (entry: EmojiEntry, query: string) => {
  if (!query) return true;
  const q = query.toLowerCase();
  if (entry.name.toLowerCase().includes(q)) return true;
  if (entry.shortcodes.some((code) => code.toLowerCase().includes(q))) return true;
  if (entry.keywords?.some((word) => word.toLowerCase().includes(q))) return true;
  return false;
};

const EmojiPicker: React.FC = () => {
  const [query, setQuery] = useState('');
  const [tone, setTone] = useState<EmojiTone>('default');
  const [snapshot, setSnapshot] = useState<EditableSnapshot | null>(null);
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    const snap = captureEditableSnapshot();
    setSnapshot(snap);
    setTone(getPreferredTone());
    setRecents(getRecentEmojis());
    const timer = window.setTimeout(() => {
      const input = document.getElementById('emoji-search-input') as HTMLInputElement | null;
      input?.focus();
      input?.select();
    }, 60);
    return () => window.clearTimeout(timer);
  }, []);

  const emojiMap = useMemo(() => buildEmojiMap(emojiData), []);

  const filteredEmojis = useMemo(() => {
    const results = emojiData.filter((entry) => matchesQuery(entry, query));
    return results.slice(0, MAX_RESULTS);
  }, [query]);

  const recentEntries = useMemo(
    () =>
      recents
        .map((char) => {
          const entry = emojiMap.get(char);
          if (!entry) return null;
          return { entry, char };
        })
        .filter(
          (value): value is { entry: EmojiEntry; char: string } =>
            value !== null
        ),
    [emojiMap, recents]
  );

  const resolveEmoji = useCallback(
    (entry: EmojiEntry, preferredTone?: EmojiTone) => {
      const desiredTone = preferredTone ?? tone;
      const match = entry.skins.find((skin) => skin.tone === desiredTone);
      return match?.emoji ?? entry.skins[0]?.emoji ?? entry.emoji;
    },
    [tone]
  );

  const closeWindow = useCallback(() => {
    window.setTimeout(() => {
      document.getElementById('close-emoji-picker')?.click();
    }, 0);
  }, []);

  const handleToneChange = useCallback((next: EmojiTone) => {
    setTone(next);
    setPreferredTone(next);
  }, []);

  const handleInsert = useCallback(
    async (entry: EmojiEntry, explicitChar?: string) => {
      const char = explicitChar ?? resolveEmoji(entry);
      if (!char) return;

      if (snapshot) {
        restoreEditableSnapshot(snapshot);
      }
      const target = snapshot?.element ?? null;
      const inserted = insertText(char, target ?? undefined);
      if (inserted) {
        setRecents(pushRecentEmoji(char));
        closeWindow();
        return;
      }

      const copied = await copyToClipboard(char);
      if (copied) {
        setRecents(pushRecentEmoji(char));
      }
      closeWindow();
    },
    [closeWindow, resolveEmoji, snapshot]
  );

  const handleCopy = useCallback(
    async (entry: EmojiEntry, explicitChar?: string) => {
      const char = explicitChar ?? resolveEmoji(entry);
      if (!char) return;
      const copied = await copyToClipboard(char);
      if (copied) {
        setRecents(pushRecentEmoji(char));
      }
      closeWindow();
    },
    [closeWindow, resolveEmoji]
  );

  const handleSearchSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!filteredEmojis.length) return;
      void handleInsert(filteredEmojis[0]);
    },
    [filteredEmojis, handleInsert]
  );

  const canDirectInsert = useMemo(() => canInsert(snapshot), [snapshot]);

  const clearRecents = useCallback(() => {
    clearRecentEmojis();
    setRecents([]);
  }, []);

  return (
    <div className="flex h-full w-full flex-col bg-ub-cool-grey text-white">
      <header className="border-b border-black/40 px-4 py-3">
        <h1 className="text-lg font-semibold">Emoji Picker</h1>
        <p className="text-xs text-ubt-grey">
          Press Ctrl+Period anywhere to search emoji. Enter inserts the first match.
        </p>
      </header>
      <div className="flex flex-1 flex-col gap-4 overflow-hidden px-4 py-4">
        <form className="flex flex-col gap-3 md:flex-row md:items-center" onSubmit={handleSearchSubmit}>
          <input
            id="emoji-search-input"
            type="search"
            autoComplete="off"
            placeholder="Search by name or :shortcode:"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded border border-black/40 bg-black/40 px-3 py-2 text-base text-white focus:outline-none focus:ring-2 focus:ring-ubt-bg-shimmer"
          />
          <div className="flex items-center gap-2">
            {EMOJI_TONES.map((itemTone) => (
              <button
                key={itemTone}
                type="button"
                onClick={() => handleToneChange(itemTone)}
                className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
                  tone === itemTone
                    ? 'border-white bg-white/10'
                    : 'border-transparent bg-black/30 hover:bg-black/40'
                }`}
                aria-pressed={tone === itemTone}
                title={`Use ${itemTone.replace('-', ' ')} tone`}
              >
                <span className="text-xl" aria-hidden="true">
                  {tonePreview[itemTone]}
                </span>
              </button>
            ))}
          </div>
        </form>
        {!canDirectInsert && (
          <div className="rounded border border-yellow-600/50 bg-yellow-600/10 px-3 py-2 text-xs text-yellow-200">
            Focus an input or editable area before opening the picker to enable direct insert.
          </div>
        )}
        {recentEntries.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-ubt-grey">
              <span>Recent</span>
              <button
                type="button"
                onClick={clearRecents}
                className="text-ubt-grey hover:text-white"
              >
                Clear
              </button>
            </div>
            <div className="grid grid-cols-8 gap-2 md:grid-cols-12">
              {recentEntries.map(({ entry, char }) => (
                <button
                  key={`${entry.name}-${char}`}
                  type="button"
                  onClick={() =>
                    canDirectInsert ? void handleInsert(entry, char) : void handleCopy(entry, char)
                  }
                  className="flex items-center justify-center rounded-lg border border-black/20 bg-black/30 py-2 transition hover:border-white/40 hover:bg-black/50"
                  title={`${entry.name} (${char})`}
                >
                  <span className="text-2xl" aria-hidden="true">
                    {char}
                  </span>
                  <span className="sr-only">{entry.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}
        <div className="flex-1 overflow-auto">
          {filteredEmojis.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-ubt-grey">
              No emoji found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {filteredEmojis.map((entry) => {
                const displayChar = resolveEmoji(entry);
                return (
                  <div
                    key={entry.skins[0]?.unified ?? entry.emoji}
                    className="flex items-center gap-3 rounded-lg border border-black/30 bg-black/20 p-3"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded bg-black/40 text-3xl">
                      <span aria-hidden="true">{displayChar}</span>
                      <span className="sr-only">{entry.name}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{entry.name}</p>
                      <p className="truncate text-xs text-ubt-grey">{toDisplayCodes(entry.shortcodes)}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => void handleInsert(entry)}
                          disabled={!canDirectInsert}
                          className={`rounded px-2 py-1 transition ${
                            canDirectInsert
                              ? 'bg-ubt-bg-shimmer/80 text-black hover:bg-ubt-bg-shimmer'
                              : 'bg-black/40 text-ubt-grey cursor-not-allowed'
                          }`}
                        >
                          Insert
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleCopy(entry)}
                          className="rounded bg-black/50 px-2 py-1 text-white transition hover:bg-black/70"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const displayEmojiPicker = () => <EmojiPicker />;

export default EmojiPicker;
