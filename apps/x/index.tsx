'use client';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  FormEvent,
  KeyboardEvent,
  type SVGProps,
} from 'react';
import { sanitizeHtml } from '../../lib/sanitize';
import usePersistentState from '../../hooks/usePersistentState';
import { useSettings } from '../../hooks/useSettings';
import useScheduledTweets, {
  ScheduledTweet,
} from './state/scheduled';
import {
  getNextEmbedTheme,
  type EmbedTheme,
  useEmbedTheme,
} from './state/theme';
import { loadEmbedScript } from './embed';

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
  }, [scheduled, setScheduled]);

  const loadTimeline = useCallback(async () => {
    if (!feed || !timelineRef.current) return;
    setLoading(true);
    setScriptError(false);
    setTimelineLoaded(false);
    try {
      const widgets = await loadEmbedScript();
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
  }, [accent, feed, theme, timelineType]);

  useEffect(() => {
    if (!loaded) return;
    void loadTimeline();
  }, [loaded, loadTimeline]);

  const handleAddPreset = (e: FormEvent) => {
    e.preventDefault();
    let value = sanitizeHtml(input.trim());
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
    if (!tweetText.trim() || !tweetTime) return;
    const newTweet: ScheduledTweet = {
      id: Date.now().toString(),
      text: sanitizeHtml(tweetText.trim()),
      time: new Date(tweetTime).getTime(),
    };
    setScheduled([...scheduled, newTweet]);
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
        {!loaded ? (
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
                <div>Timeline failed to load.</div>
                <div className="flex justify-center gap-2">
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
