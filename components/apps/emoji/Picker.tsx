'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import emojiDataset from '@/data/emoji.json';
import copyToClipboard from '@/utils/clipboard';
import {
  addRecentEmoji,
  clearRecentEmojis,
  getPreferredSkinTone,
  getRecentEmojis,
  setPreferredSkinTone,
  SKIN_TONE_OPTIONS,
  DEFAULT_SKIN_TONE,
  type EmojiRecent,
  type RecentEmojiInput,
  type SkinTone,
} from '@/utils/settings/emoji';
import {
  ensureInputBridge,
  insertText,
  subscribeToInputTarget,
  INPUT_BRIDGE_IGNORE_ATTRIBUTE,
  type InputTargetSnapshot,
} from '@/modules/desktop/inputBridge';

type EmojiRecord = {
  id: string;
  char: string;
  name: string;
  shortcodes: string[];
  keywords?: string[];
  skins?: string[];
};

type EmojiCategory = {
  id: string;
  label: string;
  items: EmojiRecord[];
};

type EmojiDataset = {
  categories: EmojiCategory[];
};

type EmojiSource = {
  id: string;
  char: string;
  name: string;
  shortcodes: string[];
  skins?: string[];
};

const dataset = emojiDataset as EmojiDataset;

const BRIDGE_IGNORE_ATTRIBUTE = {
  [INPUT_BRIDGE_IGNORE_ATTRIBUTE]: 'true',
} as const;

const GRID_TEMPLATE =
  'grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 xl:grid-cols-9';

const normaliseQuery = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/^:+|:+$/g, '');

const formatShortcodes = (shortcodes: string[]) =>
  shortcodes.length ? shortcodes.map((code) => `:${code}:`).join(' ') : '';

const hasToneVariants = (source: EmojiSource) =>
  Boolean(source.skins && source.skins.length > 1);

const getEmojiForTone = (source: EmojiSource, tone: SkinTone) => {
  if (!source.skins || source.skins.length === 0) return source.char;
  const index = SKIN_TONE_OPTIONS.findIndex((option) => option.id === tone);
  const safeIndex = index < 0 ? 0 : Math.min(index, source.skins.length - 1);
  return source.skins[safeIndex] || source.char;
};

const toRecentInput = (
  source: EmojiSource,
  tone: SkinTone,
  char: string
): RecentEmojiInput => ({
  id: source.id,
  char,
  name: source.name,
  shortcodes: source.shortcodes,
  skinTone: hasToneVariants(source) ? tone : DEFAULT_SKIN_TONE,
  skins: source.skins,
});

const Picker: React.FC = () => {
  const [skinTone, setSkinTone] = useState<SkinTone>(DEFAULT_SKIN_TONE);
  const [recents, setRecents] = useState<EmojiRecent[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [target, setTarget] = useState<InputTargetSnapshot | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const emojiMap = useMemo(() => {
    const map = new Map<string, EmojiRecord>();
    dataset.categories.forEach((category) => {
      category.items.forEach((item) => {
        map.set(item.id, item);
      });
    });
    return map;
  }, []);

  const terms = useMemo(() => {
    if (!query.trim()) return [] as string[];
    return query
      .split(/\s+/)
      .map(normaliseQuery)
      .filter(Boolean);
  }, [query]);

  const matchesQuery = useCallback(
    (item: EmojiRecord) => {
      if (!terms.length) return true;
      const haystack = [
        item.name,
        ...item.shortcodes,
        ...(item.keywords ?? []),
      ]
        .join(' ')
        .toLowerCase();
      return terms.every((term) => haystack.includes(term));
    },
    [terms]
  );

  const filteredCategories = useMemo(() => {
    if (!terms.length) return dataset.categories;
    return dataset.categories
      .map((category) => ({
        ...category,
        items: category.items.filter(matchesQuery),
      }))
      .filter((category) => category.items.length > 0);
  }, [matchesQuery, terms.length]);

  const matchingRecents = useMemo(() => {
    if (!recents.length) return [] as EmojiRecent[];
    if (!terms.length) return recents;
    return recents.filter((recent) => {
      const source = emojiMap.get(recent.id);
      const haystack = [
        source?.name ?? recent.name,
        ...(source?.shortcodes ?? recent.shortcodes),
        ...(source?.keywords ?? []),
      ]
        .join(' ')
        .toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [emojiMap, recents, terms]);

  useEffect(() => {
    setSkinTone(getPreferredSkinTone());
    setRecents(getRecentEmojis());
    ensureInputBridge();
    const unsubscribe = subscribeToInputTarget(setTarget);
    searchRef.current?.focus();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(null), 2400);
    return () => window.clearTimeout(timer);
  }, [status]);

  const handleSkinToneChange = useCallback(
    (tone: SkinTone) => {
      if (tone === skinTone) return;
      setSkinTone(tone);
      setPreferredSkinTone(tone);
    },
    [skinTone]
  );

  const handleInsert = useCallback(
    (source: EmojiSource) => {
      const toneToUse = hasToneVariants(source) ? skinTone : DEFAULT_SKIN_TONE;
      const char = getEmojiForTone(source, toneToUse);
      if (!char) return;
      const inserted = insertText(char);
      if (!inserted) {
        setStatus('Focus a text field to insert emoji.');
        return;
      }
      const next = addRecentEmoji(toRecentInput(source, toneToUse, char));
      setRecents(next);
      setStatus(`Inserted ${char}`);
    },
    [skinTone]
  );

  const handleCopy = useCallback(
    async (source: EmojiSource) => {
      const toneToUse = hasToneVariants(source) ? skinTone : DEFAULT_SKIN_TONE;
      const char = getEmojiForTone(source, toneToUse);
      const copied = await copyToClipboard(char);
      if (!copied) {
        setStatus('Clipboard access is unavailable.');
        return;
      }
      const next = addRecentEmoji(toRecentInput(source, toneToUse, char));
      setRecents(next);
      setStatus(`Copied ${char} to clipboard`);
    },
    [skinTone]
  );

  const handleClearRecents = useCallback(() => {
    clearRecentEmojis();
    setRecents([]);
    setStatus('Cleared recently used emoji.');
  }, []);

  const handleSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (matchingRecents.length > 0) {
          const recent = matchingRecents[0];
          const fallback: EmojiSource = {
            id: recent.id,
            char: recent.char,
            name: recent.name,
            shortcodes: recent.shortcodes,
            skins: recent.skins,
          };
          const source = emojiMap.get(recent.id) ?? fallback;
          handleInsert(source);
          return;
        }
        const firstCategory = filteredCategories[0];
        if (firstCategory && firstCategory.items.length > 0) {
          handleInsert(firstCategory.items[0]);
        }
      } else if (event.key === 'Escape') {
        event.currentTarget.blur();
      }
    },
    [emojiMap, filteredCategories, handleInsert, matchingRecents]
  );

  const renderTile = useCallback(
    (source: EmojiSource, key?: React.Key) => {
      const toneToUse = hasToneVariants(source) ? skinTone : DEFAULT_SKIN_TONE;
      const char = getEmojiForTone(source, toneToUse);
      const shortLabel = formatShortcodes(source.shortcodes);
      return (
        <div
          key={key ?? source.id}
          className="rounded-lg bg-black/30 p-2 transition hover:bg-black/40 focus-within:ring-2 focus-within:ring-blue-500"
        >
          <button
            type="button"
            onClick={() => handleInsert(source)}
            title={shortLabel ? `${source.name} ${shortLabel}` : source.name}
            className="flex w-full flex-col items-center gap-1 text-center"
          >
            <span className="text-3xl" aria-hidden="true">
              {char}
            </span>
            <span className="text-[11px] leading-snug text-gray-200">
              {source.name}
            </span>
          </button>
          <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
            <span className="truncate" title={shortLabel}>
              {shortLabel}
            </span>
            <button
              type="button"
              onClick={() => {
                void handleCopy(source);
              }}
              className="rounded px-1 py-0.5 text-gray-300 hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-white"
            >
              Copy
            </button>
          </div>
        </div>
      );
    },
    [handleCopy, handleInsert, skinTone]
  );

  const hasResults =
    matchingRecents.length > 0 || filteredCategories.some((category) => category.items.length > 0);

  return (
    <div
      {...BRIDGE_IGNORE_ATTRIBUTE}
      className="flex h-full flex-col bg-ub-cool-grey text-white"
    >
      <header className="space-y-3 border-b border-black/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-semibold">Emoji Picker</h1>
          <span className="text-xs text-gray-300">
            {target
              ? `Active field: ${target.label}`
              : 'Focus a text field to enable direct insert.'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search by name or :shortcode:"
            className="min-w-[200px] flex-1 rounded-md bg-black/30 px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center gap-1">
            {SKIN_TONE_OPTIONS.map((tone) => {
              const active = tone.id === skinTone;
              return (
                <button
                  key={tone.id}
                  type="button"
                  onClick={() => handleSkinToneChange(tone.id)}
                  className={`flex h-10 w-10 items-center justify-center rounded-md border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${
                    active
                      ? 'border-blue-400 bg-black/40'
                      : 'border-transparent bg-black/20 hover:border-blue-300'
                  }`}
                  aria-pressed={active}
                  aria-label={`Use ${tone.label} skin tone`}
                >
                  <span aria-hidden="true" className="text-xl">
                    {tone.sample}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        {status ? <p className="text-xs text-gray-300">{status}</p> : null}
      </header>
      <main className="flex-1 space-y-6 overflow-y-auto p-4">
        {matchingRecents.length > 0 && (
          <section>
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wider text-gray-300">
              <h2 className="font-semibold text-gray-200">Recents</h2>
              <button
                type="button"
                onClick={handleClearRecents}
                className="rounded px-2 py-1 text-[11px] text-gray-400 hover:bg-black/30 hover:text-white"
              >
                Clear
              </button>
            </div>
            <div className={GRID_TEMPLATE}>
              {matchingRecents.map((recent) => {
                const fallback: EmojiSource = {
                  id: recent.id,
                  char: recent.char,
                  name: recent.name,
                  shortcodes: recent.shortcodes,
                  skins: recent.skins,
                };
                const source = emojiMap.get(recent.id) ?? fallback;
                return renderTile(source, `recent-${recent.id}`);
              })}
            </div>
          </section>
        )}
        {filteredCategories.map((category) => (
          <section key={category.id} className="space-y-2">
            <div className="flex items-center justify-between text-xs uppercase tracking-wider text-gray-300">
              <h2 className="font-semibold text-gray-200">{category.label}</h2>
              <span className="text-[11px] text-gray-400">{category.items.length}</span>
            </div>
            <div className={GRID_TEMPLATE}>
              {category.items.map((item) => renderTile(item))}
            </div>
          </section>
        ))}
        {!hasResults && (
          <p className="text-center text-sm text-gray-300">
            No emoji matched “{query.trim()}”.
          </p>
        )}
      </main>
    </div>
  );
};

export default Picker;
