'use client';
import { useEffect, useRef, useState, FormEvent } from 'react';
import DOMPurify from 'dompurify';
import usePersistentState from '../../hooks/usePersistentState';

export default function XTimeline() {
  const [presets, setPresets] = usePersistentState<string[]>('x-feed-presets', () => ['AUnnippillil']);
  const [input, setInput] = useState('');
  const [feed, setFeed] = useState(presets[0]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timelineLoaded, setTimelineLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
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
    if (!loaded) return;
    loadTimeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, feed]);

  const loadTimeline = () => {
    if (!feed) return;
    setLoading(true);
    const src = 'https://platform.twitter.com/widgets.js';
    let script = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);

    const create = () => {
      if (!timelineRef.current || !window.twttr) return;
      setScriptError(false);
      setTimelineLoaded(false);
      timelineRef.current.innerHTML = '';
      window.twttr.widgets
        .createTimeline(
          { sourceType: 'profile', screenName: feed },
          timelineRef.current,
          { chrome: 'noheader noborders', theme }
        )
        .then(() => {
          setTimelineLoaded(true);
          setLoading(false);
        })
        .catch(() => {
          setScriptError(true);
          setLoading(false);
        });
    };

    if (script && window.twttr) {
      create();
    } else {
      if (!script) {
        script = document.createElement('script');
        script.src = src;
        script.async = true;
        document.body.appendChild(script);
      }
      script.addEventListener('load', create, { once: true });
      script.addEventListener(
        'error',
        () => {
          setScriptError(true);
          setLoading(false);
        },
        { once: true }
      );
    }
  };

  const handleAddPreset = (e: FormEvent) => {
    e.preventDefault();
    const screen = DOMPurify.sanitize(input.trim().replace('@', ''));
    if (screen && !presets.includes(screen)) {
      setPresets([...presets, screen]);
      setFeed(screen);
    }
    setInput('');
  };

  return (
    <div className="p-4 space-y-4">
      <form onSubmit={handleAddPreset} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add screen name"
          className="flex-1 p-2 rounded border bg-transparent"
        />
        <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-white">
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
                feed === p ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              @{p}
            </button>
          ))}
        </div>
      )}
      {!loaded ? (
        <button
          type="button"
          onClick={() => {
            setLoaded(true);
            loadTimeline();
          }}
          className="px-4 py-2 rounded bg-blue-600 text-white"
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
              <a
                href={`https://x.com/${feed}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-blue-600"
              >
                Open on x.com
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
}

