import React, { useEffect, useState } from 'react';
import Script from 'next/script';
import usePersistentState from '../usePersistentState';

// Available Twitter widget origins for CSP/allowlists
export const TWITTER_ORIGINS = [
  'https://platform.twitter.com',
  'https://syndication.twitter.com',
  'https://cdn.syndication.twimg.com',
];

/**
 * Minimal Twitter/X client using the official widgets.js script.
 * Allows switching between profiles or lists and persisting searches.
 */
export default function XApp() {
  const [input, setInput] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [handle, setHandle] = usePersistentState('x-handle', 'AUnnippillil');
  const [saved, setSaved] = usePersistentState('x-saved', []);
  const [mediaOnly, setMediaOnly] = usePersistentState('x-media-only', false);

  // keep input in sync with persisted handle
  useEffect(() => {
    setInput(handle);
  }, [handle]);

  // render timeline whenever script is loaded and handle/filter change
  useEffect(() => {
    if (!loaded || !handle || typeof window === 'undefined' || !window.twttr) return;
    const container = document.getElementById('timeline');
    if (!container) return;
    container.innerHTML = '';

    const [owner, list] = handle.split('/');
    let config;
    if (mediaOnly) {
      const query = `from:${owner} filter:media`;
      config = {
        sourceType: 'url',
        url: `https://twitter.com/search?q=${encodeURIComponent(query)}`,
      };
    } else if (list) {
      config = {
        sourceType: 'list',
        ownerScreenName: owner,
        slug: list,
      };
    } else {
      config = { sourceType: 'profile', screenName: owner };
    }
    window.twttr.widgets.createTimeline(config, container, {
      height: '100%',
      chrome: 'noheader noborders',
    });
  }, [loaded, handle, mediaOnly]);

  const onSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const h = input.trim();
    setHandle(h);
    if (!saved.includes(h)) setSaved([...saved, h]);
  };

  const loadSaved = (h) => {
    setHandle(h);
  };

  return (
    <div className="h-full w-full overflow-auto bg-ub-cool-grey flex flex-col">
      <Script
        src="https://platform.twitter.com/widgets.js"
        strategy="lazyOnload"
        onLoad={() => setLoaded(true)}
      />
      <form
        onSubmit={onSubmit}
        className="p-2 flex flex-wrap gap-2 items-center border-b border-gray-600"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter handle or user/list"
          className="flex-1 p-2 rounded bg-gray-800 text-white"
        />
        <label className="flex items-center gap-1 text-white">
          <input
            type="checkbox"
            checked={mediaOnly}
            onChange={(e) => setMediaOnly(e.target.checked)}
          />
          Media only
        </label>
        <button
          type="submit"
          className="px-4 py-1 bg-blue-500 text-white rounded"
        >
          Load
        </button>
      </form>
      {saved.length > 0 && (
        <div className="p-2 flex gap-2 flex-wrap border-b border-gray-600">
          {saved.map((h) => (
            <button
              key={h}
              onClick={() => loadSaved(h)}
              className="px-2 py-1 bg-gray-700 text-white rounded"
            >
              {h}
            </button>
          ))}
        </div>
      )}
      <div id="timeline" className="flex-1" />
    </div>
  );
}

export const displayX = () => <XApp />;

