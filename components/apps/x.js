import React, { useState, useEffect, useRef } from 'react';

import dynamic from 'next/dynamic';

// Load the Twitter embed only on the client to avoid SSR issues.
const TwitterTimelineEmbed = dynamic(
  () => import('react-twitter-embed').then((mod) => mod.TwitterTimelineEmbed),
  { ssr: false }
);

export default function XApp() {
  const [input, setInput] = useState('@AUnnippillil');
  const [target, setTarget] = useState('@AUnnippillil');
  const [timelineKey, setTimelineKey] = useState(0);
  const [error, setError] = useState(false);
  const timeoutRef = useRef();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setTarget(input.trim());
    setTimelineKey((k) => k + 1);
  };

  useEffect(() => {
    clearTimeout(timeoutRef.current);
    setError(false);
    timeoutRef.current = setTimeout(() => setError(true), 8000);
    return () => clearTimeout(timeoutRef.current);
  }, [timelineKey]);

  const handleLoad = () => {
    clearTimeout(timeoutRef.current);
    setError(false);
  };

  const isTag = target.startsWith('#');
  const normalized = target.replace(/^[@#]/, '');
  const embedProps = isTag
    ? { sourceType: 'url', url: `https://twitter.com/hashtag/${normalized}` }
    : { sourceType: 'profile', screenName: normalized };

  const externalUrl = isTag
    ? `https://x.com/hashtag/${normalized}`
    : `https://x.com/${normalized}`;

  return (
    <div className="h-full w-full overflow-auto bg-ub-cool-grey flex flex-col">
      <form
        onSubmit={handleSubmit}
        className="p-2 flex gap-2 border-b border-gray-600"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="@user or #tag"
          className="flex-1 p-2 rounded bg-gray-800 text-white"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="px-4 py-1 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Load
        </button>
      </form>
      <p className="px-2 py-1 text-xs text-gray-400">
        Timeline is read-only; interactions like posting or liking are disabled. Rate limits may prevent loading.
      </p>
      <div className="flex-1">
        {!error ? (
          <TwitterTimelineEmbed
            key={timelineKey}
            {...embedProps}
            options={{ chrome: 'noheader noborders' }}
            onLoad={handleLoad}
            className="w-full h-full"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 p-4 text-center text-gray-200">
            <p>Unable to load timeline. Rate limits or embed restrictions may apply.</p>
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Open on X
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export const displayX = () => <XApp />;

