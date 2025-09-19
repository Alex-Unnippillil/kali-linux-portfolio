import React, { useEffect, useRef, useState } from 'react';
import {
  CDN_SCRIPT_IDS,
  CDN_SCRIPT_URLS,
  applySriToScript,
  createSriScript,
} from '../../utils/cdnSri';

const sanitizeHandle = (handle) =>
  handle.replace(/[^A-Za-z0-9_]/g, '').slice(0, 15);

export default function XApp() {
  const [theme, setTheme] = useState('light');
  const [timelineLoaded, setTimelineLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const timelineRef = useRef(null);

  const [feedInput, setFeedInput] = useState('');
  const [feedUser, setFeedUser] = useState('AUnnippillil');
  const [feedPresets, setFeedPresets] = useState([]);

  // Load presets from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const presets = JSON.parse(
        localStorage.getItem('x-feed-presets') || '[]'
      );
      const current =
        sanitizeHandle(localStorage.getItem('x-feed-user') || '') ||
        presets[0] ||
        'AUnnippillil';
      setFeedPresets(presets);
      setFeedUser(current);
    }
  }, []);

  // Persist selected feed
  useEffect(() => {
    if (typeof window !== 'undefined' && feedUser) {
      localStorage.setItem('x-feed-user', feedUser);
    }
  }, [feedUser]);

  // Add new feed preset
  const handleAddFeed = (e) => {
    e.preventDefault();
    const sanitized = sanitizeHandle(feedInput);
    if (!sanitized) return;
    const updated = Array.from(new Set([sanitized, ...feedPresets]));
    setFeedPresets(updated);
    setFeedUser(sanitized);
    if (typeof window !== 'undefined') {
      localStorage.setItem('x-feed-presets', JSON.stringify(updated));
    }
    setFeedInput('');
  };

  // Sync theme with system preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const update = () => setTheme(mq.matches ? 'dark' : 'light');
      update();
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }
  }, []);

  // Load timeline script and render timeline
  useEffect(() => {
    if (!shouldLoad) return;
    const src = CDN_SCRIPT_URLS.twitterWidgets;
    let script = document.querySelector(`script[src="${src}"]`);
    let timeout;
    const handleError = () => {
      clearTimeout(timeout);
      setScriptError(true);
    };
    const loadTimeline = () => {
      clearTimeout(timeout);
      if (!timelineRef.current || !window.twttr) return;
      setScriptError(false);
      setTimelineLoaded(false);
      timelineRef.current.innerHTML = '';
      window.twttr.widgets
        .createTimeline(
          { sourceType: 'profile', screenName: feedUser },
          timelineRef.current,
          { chrome: 'noheader noborders', theme }
        )
        .then(() => setTimelineLoaded(true))
        .catch(() => setScriptError(true));
    };
    if (script instanceof HTMLScriptElement) {
      applySriToScript(script, CDN_SCRIPT_IDS.twitterWidgets);
    }
    if (script && window.twttr) {
      loadTimeline();
    } else {
      if (!script) {
        script = createSriScript(CDN_SCRIPT_IDS.twitterWidgets);
        script.async = true;
        document.body.appendChild(script);
      }
      timeout = window.setTimeout(handleError, 10000);
      script.addEventListener('load', loadTimeline, { once: true });
      script.addEventListener('error', handleError, { once: true });
    }
    return () => {
      clearTimeout(timeout);
      script && script.removeEventListener('error', handleError);
    };
  }, [shouldLoad, feedUser, theme]);

  return (
    <div className="h-full w-full overflow-auto bg-ub-cool-grey flex flex-col tweet-container">
      <div className="p-2 flex flex-col gap-2 border-b border-gray-600 bg-gray-900 text-gray-100">
        <form onSubmit={handleAddFeed} className="flex gap-2">
          <input
            type="text"
            value={feedInput}
            onChange={(e) => setFeedInput(e.target.value)}
            placeholder="Add feed handle"
            className="flex-1 p-2 rounded bg-gray-800 text-gray-100 placeholder-gray-400"
          />
          <button
            type="submit"
            className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
            disabled={!feedInput.trim()}
          >
            Add
          </button>
        </form>
        {feedPresets.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {feedPresets.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setFeedUser(h)}
                className={`px-2 py-1 rounded-full text-sm ${
                  feedUser === h
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-100 hover:bg-gray-600'
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 relative">
        {!shouldLoad && (
          <div className="p-4 text-center">
            <button
              type="button"
              onClick={() => setShouldLoad(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Load timeline
            </button>
          </div>
        )}
        {shouldLoad && !timelineLoaded && !scriptError && (
          <ul className="p-4 space-y-4 tweet-feed" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <li
                key={i}
                className="flex gap-4 border-b border-gray-700 pb-4 last:border-b-0"
              >
                <div className="w-12 h-12 rounded-full bg-gray-700 motion-safe:animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-700 rounded w-3/4 motion-safe:animate-pulse" />
                  <div className="h-4 bg-gray-700 rounded w-1/2 motion-safe:animate-pulse" />
                  <div className="h-4 bg-gray-700 rounded w-full motion-safe:animate-pulse" />
                </div>
              </li>
            ))}
          </ul>
        )}
        <div
          ref={timelineRef}
          className={`${timelineLoaded ? 'block h-full' : 'hidden'} tweet-feed`}
        />
        {scriptError && (
          <div className="p-4 text-center">
            <a
              href={`https://x.com/${sanitizeHandle(feedUser)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-blue-500"
            >
              Open on x.com
            </a>
          </div>
        )}
      </div>
      <style jsx>{`
        .tweet-container {
          container-type: inline-size;
        }
        .tweet-feed {
          max-inline-size: 60ch;
          margin-inline: auto;
          width: 100%;
        }
        @container (max-width: 480px) {
          .tweet-feed iframe,
          .tweet-feed img {
            width: 100%;
            height: auto;
          }
        }
      `}</style>
    </div>
  );
}

export const displayX = () => <XApp />;

