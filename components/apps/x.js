"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getNextEmbedTheme } from '../../apps/x/state/theme';
import { loadEmbedScript } from '../../apps/x/embed';

const sanitizeHandle = (handle) =>
  handle.replace(/[^A-Za-z0-9_]/g, '').slice(0, 15);

const DEFAULT_FEED_USER = 'AUnnippillil';

export default function XApp() {
  const [theme, setTheme] = useState('light');
  const [systemTheme, setSystemTheme] = useState('light');
  const [hasManualTheme, setHasManualTheme] = useState(false);
  const [timelineLoaded, setTimelineLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const timelineRef = useRef(null);
  const isMountedRef = useRef(true);
  const manualThemeRef = useRef(false);

  const [feedInput, setFeedInput] = useState('');
  const [feedUser, setFeedUser] = useState(DEFAULT_FEED_USER);
  const [feedPresets, setFeedPresets] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [lastRemovedPreset, setLastRemovedPreset] = useState(null);

  // Load presets from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const presets = JSON.parse(
        localStorage.getItem('x-feed-presets') || '[]'
      );
      const current =
        sanitizeHandle(localStorage.getItem('x-feed-user') || '') ||
        presets[0] ||
        DEFAULT_FEED_USER;
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
    setLastRemovedPreset(null);
    setStatusMessage(`Saved preset @${sanitized}`);
  };

  const handleRemovePreset = (handle) => {
    const index = feedPresets.indexOf(handle);
    if (index === -1) return;
    const updated = feedPresets.filter((preset) => preset !== handle);
    setFeedPresets(updated);
    setLastRemovedPreset({ handle, index });
    setStatusMessage(`Removed preset @${handle}`);
    if (typeof window !== 'undefined') {
      localStorage.setItem('x-feed-presets', JSON.stringify(updated));
    }
    setFeedUser((current) => {
      if (current !== handle) return current;
      if (updated.length > 0) {
        return updated[0];
      }
      return DEFAULT_FEED_USER;
    });
  };

  const handleRestorePreset = () => {
    if (!lastRemovedPreset) return;
    let restored = false;
    setFeedPresets((current) => {
      if (current.includes(lastRemovedPreset.handle)) {
        return current;
      }
      const updated = [...current];
      const insertIndex = Math.min(lastRemovedPreset.index, updated.length);
      updated.splice(insertIndex, 0, lastRemovedPreset.handle);
      if (typeof window !== 'undefined') {
        localStorage.setItem('x-feed-presets', JSON.stringify(updated));
      }
      restored = true;
      return updated;
    });
    if (restored) {
      setFeedUser(lastRemovedPreset.handle);
      setStatusMessage(`Restored preset @${lastRemovedPreset.handle}`);
      setLastRemovedPreset(null);
    }
  };

  // Sync theme with system preference
  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const applySystemTheme = () => {
      const next = mq.matches ? 'dark' : 'light';
      setSystemTheme(next);
      if (!manualThemeRef.current) {
        setTheme(next);
      }
    };
    applySystemTheme();
    mq.addEventListener('change', applySystemTheme);
    return () => mq.removeEventListener('change', applySystemTheme);
  }, []);

  useEffect(() => {
    manualThemeRef.current = hasManualTheme;
    if (!hasManualTheme) {
      setTheme((current) => (current === systemTheme ? current : systemTheme));
    }
  }, [hasManualTheme, systemTheme]);

  useEffect(() => {
    if (hasManualTheme && theme === systemTheme) {
      setHasManualTheme(false);
    }
  }, [hasManualTheme, systemTheme, theme]);

  // Load timeline script and render timeline
  const renderTimeline = useCallback(async () => {
    if (!timelineRef.current || !feedUser) return;
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
      await widgets.createTimeline(
        { sourceType: 'profile', screenName: feedUser },
        timelineRef.current,
        { chrome: 'noheader noborders', theme },
      );
      if (!isMountedRef.current) return;
      setTimelineLoaded(true);
    } catch (error) {
      console.error('Failed to load X timeline', error);
      if (!isMountedRef.current) return;
      setScriptError(true);
    }
  }, [feedUser, theme]);

  useEffect(() => {
    if (!shouldLoad) return undefined;
    void renderTimeline();
    return undefined;
  }, [shouldLoad, renderTimeline]);

  const handleToggleTheme = () => {
    setHasManualTheme(true);
    setTheme((prev) => getNextEmbedTheme(prev));
  };

  const handleResetTheme = () => {
    setTheme(systemTheme);
    setHasManualTheme(false);
  };

  const handleRetry = () => {
    if (!shouldLoad) {
      setShouldLoad(true);
      return;
    }
    void renderTimeline();
  };

  return (
    <div className="h-full w-full overflow-auto bg-ub-cool-grey flex flex-col tweet-container">
      <div className="p-2 flex flex-col gap-2 border-b border-gray-600 bg-gray-900 text-gray-100">
        <form onSubmit={handleAddFeed} className="flex gap-2">
          <label htmlFor="x-handle-input" className="sr-only">
            Feed handle
          </label>
          <input
            type="text"
            value={feedInput}
            onChange={(e) => setFeedInput(e.target.value)}
            placeholder="Add feed handle"
            id="x-handle-input"
            aria-label="Feed handle"
            aria-describedby="feed-handle-guidance"
            title="Handles are cleaned to letters, numbers, and underscores (15 characters max)."
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
        <p id="feed-handle-guidance" className="text-xs text-gray-400">
          Handles keep letters, numbers, and underscores only, and are trimmed to 15 characters.
        </p>
        <div aria-live="polite" className="sr-only">
          {statusMessage}
        </div>
        {statusMessage && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
            <span>{statusMessage}</span>
            {lastRemovedPreset && (
              <button
                type="button"
                onClick={handleRestorePreset}
                className="underline text-blue-400 hover:text-blue-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                Undo
              </button>
            )}
          </div>
        )}
        {feedPresets.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {feedPresets.map((h) => (
              <div
                key={h}
                className={`flex items-center rounded-full text-sm border border-transparent focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-500 ${
                  feedUser === h
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-100'
                }`}
              >
                <button
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
                <button
                  type="button"
                  onClick={() => handleRemovePreset(h)}
                  aria-label={`Remove ${h} preset`}
                  className={`px-1 py-1 text-xs font-semibold transition-colors ${
                    feedUser === h
                      ? 'text-blue-100 hover:text-white'
                      : 'text-gray-200 hover:text-white'
                  }`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gray-300">Timeline theme:</span>
          <button
            type="button"
            onClick={handleToggleTheme}
            className="px-3 py-1 rounded bg-gray-800 text-gray-100 hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            aria-pressed={theme === 'dark'}
          >
            {`Switch to ${getNextEmbedTheme(theme)} mode`}
          </button>
          {hasManualTheme && (
            <button
              type="button"
              onClick={handleResetTheme}
              className="px-3 py-1 rounded border border-gray-700 text-gray-200 hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              {`Use system (${systemTheme})`}
            </button>
          )}
        </div>
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
          <div className="p-4 text-center space-y-2">
            <div className="text-gray-200">
              Timeline failed to load. X embeds may be blocked by your browser or
              an ad blocker.
            </div>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={handleRetry}
                className="px-3 py-1 rounded bg-gray-800 text-gray-100 hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                Retry
              </button>
              <a
                href={`https://x.com/${sanitizeHandle(feedUser)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-blue-400"
              >
                Open on x.com
              </a>
            </div>
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

