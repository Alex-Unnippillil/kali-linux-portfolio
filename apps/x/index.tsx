'use client';
import {
  useEffect,
  useRef,
  useState,
  FormEvent,
  KeyboardEvent,
  type SVGProps,
} from 'react';
import DOMPurify from 'dompurify';
import Script from 'next/script';
import { CDN_SCRIPT_URLS, getCdnScriptIntegrity } from '../../utils/cdnSri';
import usePersistentState from '../../hooks/usePersistentState';
import { useSettings } from '../../hooks/useSettings';
import useScheduledTweets, {
  ScheduledTweet,
} from './state/scheduled';

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

const TWITTER_WIDGETS_SRC = CDN_SCRIPT_URLS.twitterWidgets;
const TWITTER_WIDGETS_INTEGRITY = getCdnScriptIntegrity(TWITTER_WIDGETS_SRC);

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
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light'
  );
  const timelineRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<Record<string, number>>({});
  const [scheduled, setScheduled] = useScheduledTweets();
  const [showSetup, setShowSetup] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setTheme(root.classList.contains('dark') ? 'dark' : 'light');
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

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

  useEffect(() => {
    if (!loaded || !scriptLoaded) return;
    loadTimeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, feed, timelineType, scriptLoaded]);

  const loadTimeline = () => {
    if (!feed || !window.twttr || !timelineRef.current) return;
    setLoading(true);
    setScriptError(false);
    setTimelineLoaded(false);
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
    window.twttr.widgets
      .createTimeline(source as any, timelineRef.current, options)
      .then(() => {
        setTimelineLoaded(true);
        setLoading(false);
      })
      .catch(() => {
        setScriptError(true);
        setLoading(false);
      });
  };

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
    if (!tweetText.trim() || !tweetTime) return;
    const newTweet: ScheduledTweet = {
      id: Date.now().toString(),
      text: DOMPurify.sanitize(tweetText.trim()),
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
      <Script
        src={TWITTER_WIDGETS_SRC}
        strategy="lazyOnload"
        integrity={TWITTER_WIDGETS_INTEGRITY}
        crossOrigin="anonymous"
        onLoad={() => {
          setScriptLoaded(true);
          if (loaded) loadTimeline();
        }}
        onError={() => setScriptError(true)}
      />
      <div className="flex flex-col h-full">
        <header className="flex items-center justify-between p-1.5 border-b gap-1.5">
          <button
            type="button"
            aria-label="Refresh timeline"
            onClick={() => loaded && loadTimeline()}
            className="p-1 rounded hover:bg-[var(--color-muted)]"
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
            className="p-1 rounded hover:bg-[var(--color-muted)]"
          >
            <IconShare className="w-6 h-6" />
          </button>
        </header>
        <div className="p-1.5 space-y-4 flex-1 overflow-auto">
        <form onSubmit={handleScheduleTweet} className="space-y-2">
          <textarea
            value={tweetText}
            onChange={(e) => setTweetText(e.target.value)}
            placeholder="Tweet text"
            className="w-full p-2 rounded border bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          />
          <div className="flex gap-2 items-center">
            <input
              type="datetime-local"
              value={tweetTime}
              onChange={(e) => setTweetTime(e.target.value)}
              className="flex-1 p-2 rounded border bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            />
            <button
              type="submit"
              className="px-3 py-1 rounded text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              style={{ backgroundColor: accent }}
            >
              Schedule
            </button>
          </div>
        </form>
        {scheduled.length > 0 && (
          <ul className="space-y-2">
            {scheduled.map((t) => (
              <li key={t.id}>
                <div
                  tabIndex={0}
                  data-scheduled-item
                  onKeyDown={(e) => handleScheduledKey(e, t.id)}
                  className="flex justify-between items-center p-2 rounded border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                >
                  <span>
                    {t.text} - {new Date(t.time).toLocaleString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeScheduled(t.id)}
                    className="ml-2 px-2 py-1 rounded bg-[var(--color-muted)] text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTimelineType('profile')}
            className={`px-2 py-1 rounded text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
              timelineType === 'profile'
                ? 'text-[var(--color-text)]'
                : 'bg-[var(--color-muted)]'
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
            className={`px-2 py-1 rounded text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
              timelineType === 'list'
                ? 'text-[var(--color-text)]'
                : 'bg-[var(--color-muted)]'
            }`}
            style={
              timelineType === 'list' ? { backgroundColor: accent } : undefined
            }
          >
            List
          </button>
        </div>
        <form onSubmit={handleAddPreset} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              timelineType === 'profile'
                ? 'Add screen name'
                : 'Add list (owner/slug or id)'
            }
            className="flex-1 p-2 rounded border bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          />
          <button
            type="submit"
            className="px-3 py-1 rounded text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            style={{ backgroundColor: accent }}
          >
            Save
          </button>
        </form>
        {presets.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setFeed(p);
                }}
                className={`px-2 py-1 rounded-full text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                  feed === p
                    ? 'text-[var(--color-text)]'
                    : 'bg-[var(--color-muted)]'
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
              if (scriptLoaded) loadTimeline();
            }}
            className="px-4 py-2 rounded text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            style={{ backgroundColor: accent }}
          >
            Load timeline
          </button>
        ) : (
          <>
            {loading && !timelineLoaded && !scriptError && (
              <ul className="tweet-feed space-y-1.5" aria-hidden="true">
                {Array.from({ length: 3 }).map((_, i) => (
                  <li
                    key={i}
                    className="flex gap-1.5 p-1.5 rounded-md border"
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-[var(--color-muted)] animate-pulse" />
                      <IconBadge className="w-3 h-3 absolute bottom-0 right-0 text-[var(--color-muted)]" />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-[var(--color-muted)] rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-[var(--color-muted)] rounded animate-pulse w-1/2" />
                      <div className="h-3 bg-[var(--color-muted)] rounded animate-pulse w-full" />
                    </div>
                    <IconShare className="w-5 h-5 text-[var(--color-muted)]" />
                  </li>
                ))}
              </ul>
            )}
            <div
              ref={timelineRef}
              className={`tweet-feed ${timelineLoaded ? 'block' : 'hidden'}`}
            />
            {scriptError && (
              <div className="text-center">
                <div className="mb-2">Nothing to see</div>
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
      `}</style>
    </>
  );
}
