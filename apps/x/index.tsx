'use client';
import { useEffect, useRef, useState, FormEvent } from 'react';
import DOMPurify from 'dompurify';
import Script from 'next/script';
import usePersistentState from '../../hooks/usePersistentState';
import { useSettings } from '../../hooks/useSettings';

declare global {
  interface Window {
    twttr?: any;
  }
}

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

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setTheme(root.classList.contains('dark') ? 'dark' : 'light');
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

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

  return (
    <>
      <Script
        src="https://platform.twitter.com/widgets.js"
        strategy="lazyOnload"
        onLoad={() => {
          setScriptLoaded(true);
          if (loaded) loadTimeline();
        }}
        onError={() => setScriptError(true)}
      />
      <div className="p-4 space-y-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTimelineType('profile')}
            className={`px-2 py-1 rounded text-sm ${
              timelineType === 'profile'
                ? 'text-white'
                : 'bg-gray-200 dark:bg-gray-700'
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
            className={`px-2 py-1 rounded text-sm ${
              timelineType === 'list'
                ? 'text-white'
                : 'bg-gray-200 dark:bg-gray-700'
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
            className="flex-1 p-2 rounded border bg-transparent"
          />
          <button
            type="submit"
            className="px-3 py-1 rounded text-white"
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
                className={`px-2 py-1 rounded-full text-sm ${
                  feed === p
                    ? 'text-white'
                    : 'bg-gray-200 dark:bg-gray-700'
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
            className="px-4 py-2 rounded text-white"
            style={{ backgroundColor: accent }}
          >
            Load timeline
          </button>
        ) : (
          <>
            {loading && !timelineLoaded && !scriptError && (
              <ul className="space-y-4" aria-hidden="true">
                {Array.from({ length: 3 }).map((_, i) => (
                  <li
                    key={i}
                    className="h-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse"
                  />
                ))}
              </ul>
            )}
            <div ref={timelineRef} className={timelineLoaded ? 'block' : 'hidden'} />
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
              <div className="text-center text-gray-500">Nothing to see</div>
            )}
          </>
        )}
      </div>
    </>
  );
}
