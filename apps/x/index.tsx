'use client';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  FormEvent,
  KeyboardEvent,
  type SVGProps,
} from 'react';
import DOMPurify from 'dompurify';
import usePersistentState from '../../hooks/usePersistentState';
import { useSettings } from '../../hooks/useSettings';
import useScheduledTweets, {
  ScheduledTweet,
} from './state/scheduled';
import useSavedTweets from './state/savedTweets';
import {
  getNextEmbedTheme,
  type EmbedTheme,
  useEmbedTheme,
} from './state/theme';
import { loadEmbedScript } from './embed';
import {
  formatTimestampInput,
  sanitizeHandle,
  sanitizeTweetText,
} from './utils';

const IconRefresh = (
  props: SVGProps<SVGSVGElement>,
) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.36-3.36L23 10M1 14l5.63 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const IconShare = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
  </svg>
);

const IconBadge = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const iconButtonClasses =
  'inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text)] transition-colors hover:bg-[var(--color-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-accent)]';

const pillButtonClasses =
  'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-accent)]';

const subtleButtonClasses =
  'inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-accent)]';

export default function XTimeline() {
  const { accent } = useSettings();
  const [profilePresets, setProfilePresets] = usePersistentState<string[]>(
    'x-profile-presets',
    () => ['AUnnippillil']
  );
  const [listPresets, setListPresets] = usePersistentState<string[]>(
    'x-list-presets',
    () => []
  );
  const [timelineType, setTimelineType] = usePersistentState<'profile' | 'list'>(
    'x-timeline-type',
    'profile'
  );
  const [profileFeed, setProfileFeed] = usePersistentState<string>(
    'x-profile-feed',
    () => profilePresets[0] || ''
  );
  const [listFeed, setListFeed] = usePersistentState<string>(
    'x-list-feed',
    () => listPresets[0] || ''
  );
  const presets = timelineType === 'profile' ? profilePresets : listPresets;
  const setPresets = timelineType === 'profile' ? setProfilePresets : setListPresets;
  const feed = timelineType === 'profile' ? profileFeed : listFeed;
  const setFeed = timelineType === 'profile' ? setProfileFeed : setListFeed;
  const [timelineMode, setTimelineMode] = usePersistentState<'embed' | 'saved'>(
    'x-timeline-mode',
    'embed',
  );
  const [savedTweets, setSavedTweets] = useSavedTweets();
  const [savedAuthor, setSavedAuthor] = useState('');
  const [savedText, setSavedText] = useState('');
  const [savedTime, setSavedTime] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [input, setInput] = useState('');
  const [tweetText, setTweetText] = useState('');
  const [tweetTime, setTweetTime] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timelineLoaded, setTimelineLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const [systemTheme, setSystemTheme] = useState<EmbedTheme>('light');
  const [hasManualTheme, setHasManualTheme] = useState(false);
  const manualThemeRef = useRef(false);
  const randomId = useCallback(
    () =>
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`),
    [],
  );
  const initialTheme: EmbedTheme =
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light';
  const { theme, setTheme, toggleTheme } = useEmbedTheme(initialTheme);
  const timelineRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<Record<string, number>>({});
  const [scheduled, setScheduled] = useScheduledTweets();
  const [showSetup, setShowSetup] = useState(true);
  const isMountedRef = useRef(true);
  const defaultAuthor = useMemo(
    () =>
      sanitizeHandle(
        DOMPurify.sanitize(
          timelineType === 'profile'
            ? feed || profilePresets[0] || 'AUnnippillil'
            : feed.split('/')[0] || feed || 'AUnnippillil',
        ),
      ) || 'AUnnippillil',
    [feed, profilePresets, timelineType],
  );
  const sortedSavedTweets = useMemo(
    () => [...savedTweets].sort((a, b) => b.timestamp - a.timestamp),
    [savedTweets],
  );

  const upsertSavedTweet = useCallback(
    (incoming: { id?: string; text: string; timestamp: number; author?: string }) => {
      const text = sanitizeTweetText(incoming.text);
      const timestamp = Number(incoming.timestamp);
      if (!text || !Number.isFinite(timestamp)) return;
      const author =
        sanitizeHandle(
          DOMPurify.sanitize(incoming.author || defaultAuthor),
        ) || defaultAuthor;
      const id = incoming.id || randomId();
      setSavedTweets((prev) => {
        const filtered = prev.filter((tweet) => tweet.id !== id);
        return [
          ...filtered,
          { id, text, author, timestamp },
        ].sort((a, b) => b.timestamp - a.timestamp);
      });
    },
    [defaultAuthor, randomId, setSavedTweets],
  );

  const removeSavedTweet = useCallback(
    (id: string) => {
      setSavedTweets((prev) => prev.filter((tweet) => tweet.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setSavedText('');
        setSavedTime('');
      }
    },
    [editingId, setSavedTweets],
  );

  useEffect(() => {
    setSavedAuthor((prev) => prev || defaultAuthor);
  }, [defaultAuthor]);

  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  useEffect(() => {
    manualThemeRef.current = hasManualTheme;
  }, [hasManualTheme]);

  useEffect(() => {
    const root = document.documentElement;
    const updateTheme = () => {
      const next = root.classList.contains('dark') ? 'dark' : 'light';
      setSystemTheme(next);
      if (!manualThemeRef.current) {
        setTheme(next);
      }
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [setTheme]);

  useEffect(() => {
    if (!hasManualTheme) {
      setTheme((current) => (current === systemTheme ? current : systemTheme));
    }
  }, [hasManualTheme, setTheme, systemTheme]);

  useEffect(() => {
    if (hasManualTheme && theme === systemTheme) {
      setHasManualTheme(false);
    }
  }, [hasManualTheme, systemTheme, theme]);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      Notification.requestPermission().catch(() => {});
    }
    const timeouts = timeoutsRef.current;
    return () => {
      Object.values(timeouts).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    scheduled.forEach((t) => {
      if (!timeoutsRef.current[t.id]) {
        const delay = t.time - Date.now();
        if (delay > 0) {
          timeoutsRef.current[t.id] = window.setTimeout(() => {
            if (
              'Notification' in window &&
              Notification.permission === 'granted'
            ) {
              new Notification('Tweet reminder', { body: t.text });
            }
            upsertSavedTweet({
              id: t.id,
              text: t.text,
              timestamp: Date.now(),
              author: defaultAuthor,
            });
            setScheduled((prev) => prev.filter((s) => s.id !== t.id));
            delete timeoutsRef.current[t.id];
          }, delay);
        }
      }
    });
    Object.keys(timeoutsRef.current).forEach((id) => {
      if (!scheduled.some((t) => t.id === id)) {
        clearTimeout(timeoutsRef.current[id]);
        delete timeoutsRef.current[id];
      }
    });
  }, [defaultAuthor, scheduled, setScheduled, upsertSavedTweet]);

  const loadTimeline = useCallback(async () => {
    if (!feed || !timelineRef.current || timelineMode !== 'embed') return;
    setLoading(true);
    setScriptError(false);
    setTimelineLoaded(false);
    try {
      const widgets = await loadEmbedScript();
      if (!widgets) {
        if (!isMountedRef.current) return;
        setScriptError(true);
        return;
      }
      if (!isMountedRef.current || !timelineRef.current) return;
      timelineRef.current.innerHTML = '';
      const options = {
        chrome: 'noheader noborders',
        theme,
        linkColor: accent,
      } as const;
      const source =
        timelineType === 'profile'
          ? { sourceType: 'profile', screenName: feed }
          : feed.includes('/')
              ? {
                  sourceType: 'list',
                  ownerScreenName: feed.split('/')[0],
                  slug: feed.split('/')[1],
                }
              : { sourceType: 'list', id: feed };
      await widgets.createTimeline(source as any, timelineRef.current, options);
      if (!isMountedRef.current) return;
      setTimelineLoaded(true);
    } catch (error) {
      console.error('Failed to load X timeline', error);
      if (!isMountedRef.current) return;
      setScriptError(true);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [accent, feed, theme, timelineMode, timelineType]);

  useEffect(() => {
    if (!loaded) return;
    void loadTimeline();
  }, [loaded, loadTimeline]);

  const handleAddPreset = (e: FormEvent) => {
    e.preventDefault();
    let value = DOMPurify.sanitize(input.trim());
    if (timelineType === 'profile') value = value.replace('@', '');
    if (value) {
      if (!presets.includes(value)) {
        setPresets([...presets, value]);
      }
      setFeed(value);
    }
    setInput('');
  };

  const handleScheduleTweet = (e: FormEvent) => {
    e.preventDefault();
    const sanitizedText = sanitizeTweetText(tweetText);
    if (!sanitizedText || !tweetTime) return;
    const timestamp = new Date(tweetTime).getTime();
    if (!Number.isFinite(timestamp)) return;
    const newTweet: ScheduledTweet = {
      id: randomId(),
      text: sanitizedText,
      time: timestamp,
    };
    setScheduled([...scheduled, newTweet]);
    upsertSavedTweet({
      id: newTweet.id,
      text: newTweet.text,
      timestamp: newTweet.time,
      author: defaultAuthor,
    });
    setTweetText('');
    setTweetTime('');
  };

  const removeScheduled = (id: string) => {
    setScheduled(scheduled.filter((t) => t.id !== id));
  };

  const handleScheduledKey = (
    e: KeyboardEvent<HTMLDivElement>,
    id: string,
  ) => {
    if (e.key === 'Delete') {
      removeScheduled(id);
    } else if (e.key === 'ArrowDown') {
      const next = (e.currentTarget.parentElement
        ?.nextElementSibling as HTMLElement | null)?.querySelector(
        '[data-scheduled-item]',
      ) as HTMLElement | null;
      next?.focus();
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      const prev = (e.currentTarget.parentElement
        ?.previousElementSibling as HTMLElement | null)?.querySelector(
        '[data-scheduled-item]',
      ) as HTMLElement | null;
      prev?.focus();
      e.preventDefault();
    }
  };

  const handleSavedSubmit = (e: FormEvent) => {
    e.preventDefault();
    const timestamp = savedTime ? new Date(savedTime).getTime() : Date.now();
    if (!Number.isFinite(timestamp)) return;
    upsertSavedTweet({
      id: editingId ?? undefined,
      author: savedAuthor || defaultAuthor,
      text: savedText,
      timestamp,
    });
    setSavedText('');
    setSavedTime('');
    setEditingId(null);
    setTimelineMode('saved');
  };

  const handleSavedEdit = (id: string) => {
    const tweet = savedTweets.find((t) => t.id === id);
    if (!tweet) return;
    setEditingId(id);
    setSavedAuthor(tweet.author);
    setSavedText(tweet.text);
    setSavedTime(formatTimestampInput(tweet.timestamp));
  };

  const handleSavedKey = (
    e: KeyboardEvent<HTMLDivElement>,
    id: string,
  ) => {
    if (e.key === 'Delete') {
      removeSavedTweet(id);
    }
    if (e.key === 'Enter' || e.key === ' ') {
      handleSavedEdit(id);
      e.preventDefault();
    }
  };

  return (
    <>
      {showSetup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            backgroundColor:
              'color-mix(in srgb, var(--color-inverse) 50%, transparent)',
          }}
        >
          <div
            className="p-4 rounded max-w-sm text-sm"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            <p className="mb-2">
              To use this app you need X API credentials: API key, API secret,
              access token and access token secret.
            </p>
            <p className="mb-4">
              You can explore with a demo account{' '}
              <a
                href="https://x.com/AUnnippillil"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                @AUnnippillil
              </a>
              .
            </p>
            <button
              type="button"
              onClick={() => setShowSetup(false)}
              className="px-3 py-1 rounded text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              style={{ backgroundColor: accent }}
            >
              Close
            </button>
          </div>
        </div>
      )}
      <div className="flex flex-col h-full">
        <header className="flex items-center justify-between px-3 py-2 border-b gap-2">
          <button
            type="button"
            aria-label="Refresh timeline"
            onClick={() => {
              if (loaded) {
                void loadTimeline();
              }
            }}
            className={iconButtonClasses}
          >
            <IconRefresh className="w-6 h-6" />
          </button>
          <div className="flex-1 text-center text-sm font-semibold">
            Timeline
          </div>
          <button
            type="button"
            aria-label="Open on x.com"
            onClick={() => window.open(`https://x.com/${feed}`, '_blank')}
            className={iconButtonClasses}
          >
            <IconShare className="w-6 h-6" />
          </button>
        </header>
        <div className="flex-1 overflow-auto space-y-5 px-3 py-4">
          <div
            className="space-y-2 rounded-xl border px-4 py-3 text-sm"
            style={{
              borderColor:
                'color-mix(in srgb, var(--color-muted) 35%, transparent)',
              backgroundColor:
                'color-mix(in srgb, var(--color-surface) 85%, transparent)',
            }}
          >
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <div className="font-semibold text-[var(--color-text)] uppercase tracking-wide text-xs">
                Timeline mode
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTimelineMode('embed')}
                  aria-pressed={timelineMode === 'embed'}
                  className={`${pillButtonClasses} ${
                    timelineMode === 'embed'
                      ? 'text-[var(--color-text)]'
                      : 'bg-[var(--color-muted)] text-[var(--color-text)]'
                  }`}
                  style={
                    timelineMode === 'embed' ? { backgroundColor: accent } : undefined
                  }
                >
                  Embed
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineMode('saved')}
                  aria-pressed={timelineMode === 'saved'}
                  className={`${pillButtonClasses} ${
                    timelineMode === 'saved'
                      ? 'text-[var(--color-text)]'
                      : 'bg-[var(--color-muted)] text-[var(--color-text)]'
                  }`}
                  style={
                    timelineMode === 'saved' ? { backgroundColor: accent } : undefined
                  }
                >
                  Saved
                </button>
              </div>
            </div>
            <p className="text-[var(--color-muted)] leading-6">
              Switch to Saved to browse tweets stored on this device when live embeds are
              blocked or unavailable. Newly posted or scheduled tweets are kept here.
            </p>
          </div>
          <div
            className="flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-xs uppercase tracking-wide text-[var(--color-muted)]"
            style={{
              borderColor:
                'color-mix(in srgb, var(--color-muted) 35%, transparent)',
              backgroundColor:
                'color-mix(in srgb, var(--color-surface) 85%, transparent)',
            }}
          >
            <span className="font-semibold text-[var(--color-text)]">
              Timeline theme
            </span>
            <button
              type="button"
              onClick={() => {
                setHasManualTheme(true);
                toggleTheme();
              }}
              aria-pressed={theme === 'dark'}
              className={pillButtonClasses}
              style={{
                backgroundColor: accent,
                color: 'var(--color-text)',
              }}
            >
              {`Switch to ${getNextEmbedTheme(theme)} mode`}
            </button>
            {hasManualTheme && (
              <button
                type="button"
                onClick={() => {
                  setHasManualTheme(false);
                  setTheme(systemTheme);
                }}
                className={`${subtleButtonClasses} border`}
                style={{
                  color: 'var(--color-text)',
                  borderColor:
                    'color-mix(in srgb, var(--color-muted) 40%, transparent)',
                }}
              >
                {`Use system (${systemTheme})`}
              </button>
            )}
          </div>
          <form
            onSubmit={handleScheduleTweet}
            className="space-y-3 rounded-xl border px-4 py-3"
            style={{
              borderColor:
                'color-mix(in srgb, var(--color-muted) 35%, transparent)',
              backgroundColor:
                'color-mix(in srgb, var(--color-surface) 85%, transparent)',
            }}
          >
            <textarea
              value={tweetText}
              onChange={(e) => setTweetText(e.target.value)}
              placeholder="Tweet text"
              aria-label="Tweet text"
              className="w-full rounded-xl border bg-transparent p-3 text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="datetime-local"
                value={tweetTime}
                onChange={(e) => setTweetTime(e.target.value)}
                aria-label="Schedule time"
                className="flex-1 rounded-xl border bg-transparent p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              />
              <button
                type="submit"
                className={pillButtonClasses}
                style={{ backgroundColor: accent, color: 'var(--color-text)' }}
              >
                Schedule
              </button>
            </div>
          </form>
          {scheduled.length > 0 && (
            <ul
              className="space-y-3 rounded-xl border px-4 py-3"
              style={{
                borderColor:
                  'color-mix(in srgb, var(--color-muted) 35%, transparent)',
                backgroundColor:
                  'color-mix(in srgb, var(--color-surface) 85%, transparent)',
              }}
            >
              {scheduled.map((t) => (
                <li key={t.id}>
                  <div
                    tabIndex={0}
                    data-scheduled-item
                    onKeyDown={(e) => handleScheduledKey(e, t.id)}
                    className="flex items-start justify-between gap-3 rounded-xl border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                    style={{
                      borderColor:
                        'color-mix(in srgb, var(--color-muted) 40%, transparent)',
                    }}
                  >
                    <span className="leading-6">
                      {t.text} - {new Date(t.time).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeScheduled(t.id)}
                      className={`${subtleButtonClasses} ml-2 bg-[var(--color-muted)] text-[var(--color-text)]`}
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <form
            onSubmit={handleSavedSubmit}
            className="space-y-3 rounded-xl border px-4 py-3"
            style={{
              borderColor:
                'color-mix(in srgb, var(--color-muted) 35%, transparent)',
              backgroundColor:
                'color-mix(in srgb, var(--color-surface) 85%, transparent)',
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs uppercase tracking-wide text-[var(--color-muted)]">
                {editingId ? 'Edit saved tweet' : 'Save a tweet locally'}
              </div>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setSavedText('');
                    setSavedTime('');
                  }}
                  className={`${subtleButtonClasses} border`}
                  style={{
                    color: 'var(--color-text)',
                    borderColor:
                      'color-mix(in srgb, var(--color-muted) 40%, transparent)',
                  }}
                >
                  Cancel edit
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr,1fr]">
              <div className="space-y-3">
                <input
                  type="text"
                  value={savedAuthor}
                  onChange={(e) => setSavedAuthor(sanitizeHandle(e.target.value))}
                  placeholder="Handle"
                  aria-label="Tweet handle"
                  className="w-full rounded-xl border bg-transparent p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                />
                <textarea
                  value={savedText}
                  onChange={(e) => setSavedText(e.target.value)}
                  placeholder="Tweet text"
                  aria-label="Saved tweet text"
                  className="w-full rounded-xl border bg-transparent p-3 text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                />
              </div>
              <div className="space-y-3">
                <input
                  type="datetime-local"
                  value={savedTime}
                  onChange={(e) => setSavedTime(e.target.value)}
                  aria-label="Saved tweet time"
                  className="w-full rounded-xl border bg-transparent p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className={`${pillButtonClasses} flex-1`}
                    style={{ backgroundColor: accent, color: 'var(--color-text)' }}
                  >
                    {editingId ? 'Update saved tweet' : 'Add to saved timeline'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSavedText('');
                      setSavedTime('');
                      setEditingId(null);
                      setSavedAuthor(defaultAuthor);
                    }}
                    className={`${subtleButtonClasses} flex-1 border`}
                    style={{
                      color: 'var(--color-text)',
                      borderColor:
                        'color-mix(in srgb, var(--color-muted) 40%, transparent)',
                    }}
                  >
                    Reset
                  </button>
                </div>
                <p className="text-xs text-[var(--color-muted)] leading-5">
                  Saved tweets live in your browser storage and update automatically when
                  you schedule or publish from this desk.
                </p>
              </div>
            </div>
          </form>
        <div
          className="flex flex-wrap gap-2 rounded-xl border px-4 py-3"
          style={{
            borderColor:
              'color-mix(in srgb, var(--color-muted) 35%, transparent)',
            backgroundColor:
              'color-mix(in srgb, var(--color-surface) 85%, transparent)',
          }}
        >
          <button
            type="button"
            onClick={() => setTimelineType('profile')}
            className={`${pillButtonClasses} ${
              timelineType === 'profile'
                ? 'text-[var(--color-text)]'
                : 'bg-[var(--color-muted)] text-[var(--color-text)]'
            }`}
            style={
              timelineType === 'profile' ? { backgroundColor: accent } : undefined
            }
          >
            Profile
          </button>
          <button
            type="button"
            onClick={() => setTimelineType('list')}
            className={`${pillButtonClasses} ${
              timelineType === 'list'
                ? 'text-[var(--color-text)]'
                : 'bg-[var(--color-muted)] text-[var(--color-text)]'
            }`}
            style={
              timelineType === 'list' ? { backgroundColor: accent } : undefined
            }
          >
            List
          </button>
        </div>
        <form
          onSubmit={handleAddPreset}
          className="flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row"
          style={{
            borderColor:
              'color-mix(in srgb, var(--color-muted) 35%, transparent)',
            backgroundColor:
              'color-mix(in srgb, var(--color-surface) 85%, transparent)',
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              timelineType === 'profile'
                ? 'Add screen name'
                : 'Add list (owner/slug or id)'
            }
            aria-label={
              timelineType === 'profile'
                ? 'Add screen name'
                : 'Add list (owner and slug or id)'
            }
            className="flex-1 rounded-xl border bg-transparent p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          />
          <button
            type="submit"
            className={pillButtonClasses}
            style={{ backgroundColor: accent, color: 'var(--color-text)' }}
          >
            Save
          </button>
        </form>
        {presets.length > 0 && (
          <div
            className="flex flex-wrap gap-2 rounded-xl border px-4 py-3"
            style={{
              borderColor:
                'color-mix(in srgb, var(--color-muted) 35%, transparent)',
              backgroundColor:
                'color-mix(in srgb, var(--color-surface) 85%, transparent)',
            }}
          >
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setFeed(p);
                }}
                className={`${pillButtonClasses} ${
                  feed === p
                    ? 'text-[var(--color-text)]'
                    : 'bg-[var(--color-muted)] text-[var(--color-text)]'
                }`}
                style={feed === p ? { backgroundColor: accent } : undefined}
              >
                {timelineType === 'profile' ? `@${p}` : p}
              </button>
            ))}
          </div>
        )}
        {timelineMode === 'saved' ? (
          <div className="space-y-3">
            {sortedSavedTweets.length === 0 ? (
              <div
                className="rounded-xl border px-4 py-3 text-center text-[var(--color-muted)]"
                style={{
                  borderColor:
                    'color-mix(in srgb, var(--color-muted) 35%, transparent)',
                  backgroundColor:
                    'color-mix(in srgb, var(--color-surface) 90%, transparent)',
                }}
              >
                Saved tweets will appear here when embeds are offline.
              </div>
            ) : (
              <ul className="tweet-feed space-y-3">
                {sortedSavedTweets.map((tweet) => (
                  <li
                    key={tweet.id}
                    className="flex gap-3 rounded-2xl border px-4 py-3"
                    style={{
                      borderColor:
                        'color-mix(in srgb, var(--color-muted) 40%, transparent)',
                      backgroundColor:
                        'color-mix(in srgb, var(--color-surface) 92%, transparent)',
                    }}
                  >
                    <div
                      className="relative flex h-12 w-12 items-center justify-center rounded-full text-xs font-semibold sm:h-14 sm:w-14"
                      style={{
                        backgroundColor:
                          'color-mix(in srgb, var(--color-muted) 70%, transparent)',
                      }}
                    >
                      @{tweet.author}
                      <IconBadge className="absolute -bottom-1 -right-1 h-4 w-4 text-[var(--color-muted)]" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-semibold text-[var(--color-text)]">
                          @{tweet.author}
                        </div>
                        <div className="text-xs text-[var(--color-muted)]">
                          {new Date(tweet.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <div className="whitespace-pre-wrap text-sm leading-6">
                        {tweet.text}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleSavedEdit(tweet.id)}
                          onKeyDown={(e) => handleSavedKey(e, tweet.id)}
                          tabIndex={0}
                          className={`${subtleButtonClasses} border text-xs`}
                          style={{
                            color: 'var(--color-text)',
                            borderColor:
                              'color-mix(in srgb, var(--color-muted) 40%, transparent)',
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSavedTweet(tweet.id)}
                          className={`${subtleButtonClasses} bg-[var(--color-muted)] text-xs text-[var(--color-text)]`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <IconShare className="h-5 w-5 text-[var(--color-muted)]" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : !loaded ? (
          <button
            type="button"
            onClick={() => {
              setLoaded(true);
              void loadTimeline();
            }}
            className={`${pillButtonClasses} mx-auto`}
            style={{ backgroundColor: accent, color: 'var(--color-text)' }}
          >
            Load timeline
          </button>
        ) : (
          <>
            {loading && !timelineLoaded && !scriptError && (
              <ul className="tweet-feed space-y-3" aria-hidden="true">
                {Array.from({ length: 3 }).map((_, i) => (
                  <li
                    key={i}
                    className="flex gap-3 rounded-2xl border px-4 py-3"
                    style={{
                      borderColor:
                        'color-mix(in srgb, var(--color-muted) 40%, transparent)',
                      backgroundColor:
                        'color-mix(in srgb, var(--color-surface) 92%, transparent)',
                    }}
                  >
                    <div className="relative">
                      <div className="h-12 w-12 rounded-full bg-[var(--color-muted)] animate-pulse sm:h-14 sm:w-14" />
                      <IconBadge className="absolute -bottom-1 -right-1 h-4 w-4 text-[var(--color-muted)]" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-3/4 rounded bg-[var(--color-muted)] animate-pulse" />
                      <div className="h-3 w-1/2 rounded bg-[var(--color-muted)] animate-pulse" />
                      <div className="h-3 w-full rounded bg-[var(--color-muted)] animate-pulse" />
                    </div>
                    <IconShare className="h-5 w-5 text-[var(--color-muted)]" />
                  </li>
                ))}
              </ul>
            )}
            <div
              ref={timelineRef}
              className={`tweet-feed ${timelineLoaded ? 'block' : 'hidden'}`}
            />
            {scriptError && (
              <div className="text-center space-y-2">
                <div>
                  Timeline failed to load. X embeds may be blocked by your browser
                  or an ad blocker. Switch to Saved mode to keep reading.
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!loaded) {
                        setLoaded(true);
                        return;
                      }
                      void loadTimeline();
                    }}
                    className={pillButtonClasses}
                    style={{
                      backgroundColor: accent,
                      color: 'var(--color-text)',
                    }}
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimelineMode('saved')}
                    className={`${pillButtonClasses} bg-[var(--color-muted)] text-[var(--color-text)]`}
                  >
                    Open saved timeline
                  </button>
                  <a
                    href={`https://x.com/${feed}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                    style={{ color: accent }}
                  >
                    Open on x.com
                  </a>
                </div>
              </div>
            )}
            {!loading && !timelineLoaded && !scriptError && (
              <div className="text-center text-[var(--color-muted)]">Nothing to see</div>
            )}
          </>
        )}
        </div>
      </div>
      <style jsx>{`
        .tweet-feed {
          max-inline-size: 60ch;
          margin-inline: auto;
          width: 100%;
        }
        .tweet-feed :global(.twitter-timeline) {
          margin-block: 1.5rem;
          border-radius: 1.25rem;
          overflow: hidden;
          border: 1px solid
            color-mix(in srgb, var(--color-muted) 35%, transparent);
          background-color: color-mix(
            in srgb,
            var(--color-surface) 92%,
            transparent
          );
        }
        .tweet-feed :global(iframe) {
          border: 0;
        }
      `}</style>
    </>
  );
}
