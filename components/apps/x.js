"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import useSavedTweets from '../../apps/x/state/savedTweets';
import { getNextEmbedTheme } from '../../apps/x/state/theme';
import { loadEmbedScript } from '../../apps/x/embed';
import {
  formatTimestampInput,
  sanitizeHandle,
  sanitizeTweetText,
} from '../../apps/x/utils';

export default function XApp() {
  const [theme, setTheme] = useState('light');
  const [systemTheme, setSystemTheme] = useState('light');
  const [hasManualTheme, setHasManualTheme] = useState(false);
  const [timelineLoaded, setTimelineLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [timelineMode, setTimelineMode] = useState('embed');
  const timelineRef = useRef(null);
  const isMountedRef = useRef(true);
  const manualThemeRef = useRef(false);

  const [feedInput, setFeedInput] = useState('');
  const [feedUser, setFeedUser] = useState('AUnnippillil');
  const [feedPresets, setFeedPresets] = useState([]);
  const [savedTweets, setSavedTweets] = useSavedTweets();
  const [savedText, setSavedText] = useState('');
  const [savedAuthor, setSavedAuthor] = useState('');
  const [savedTime, setSavedTime] = useState('');
  const [editingId, setEditingId] = useState(null);

  // Load presets from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const presets = JSON.parse(
        localStorage.getItem('x-feed-presets') || '[]',
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

  useEffect(() => {
    setSavedAuthor((prev) => prev || sanitizeHandle(feedUser));
  }, [feedUser]);

  const upsertSavedTweet = useCallback(
    (incoming) => {
      const text = sanitizeTweetText(incoming.text || '');
      const timestamp = incoming.timestamp || Date.now();
      if (!text || !Number.isFinite(timestamp)) return;
      const author = sanitizeHandle(incoming.author || feedUser) || feedUser;
      const id =
        incoming.id ||
        (typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
      setSavedTweets((prev) => {
        const filtered = prev.filter((tweet) => tweet.id !== id);
        return [
          ...filtered,
          { id, text, author, timestamp },
        ].sort((a, b) => b.timestamp - a.timestamp);
      });
    },
    [feedUser, setSavedTweets],
  );

  const removeSavedTweet = useCallback(
    (id) => {
      setSavedTweets((prev) => prev.filter((tweet) => tweet.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setSavedText('');
        setSavedTime('');
      }
    },
    [editingId, setSavedTweets],
  );

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

  const sortedSavedTweets = [...savedTweets].sort(
    (a, b) => b.timestamp - a.timestamp,
  );

  const handleSavedSubmit = (e) => {
    e.preventDefault();
    const timestamp = savedTime ? new Date(savedTime).getTime() : Date.now();
    if (!Number.isFinite(timestamp)) return;
    upsertSavedTweet({
      id: editingId || undefined,
      author: savedAuthor || feedUser,
      text: savedText,
      timestamp,
    });
    setSavedText('');
    setSavedTime('');
    setEditingId(null);
    setTimelineMode('saved');
  };

  const handleSavedEdit = (id) => {
    const tweet = savedTweets.find((t) => t.id === id);
    if (!tweet) return;
    setEditingId(id);
    setSavedAuthor(tweet.author);
    setSavedText(tweet.text);
    setSavedTime(formatTimestampInput(tweet.timestamp));
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
    if (!timelineRef.current || !feedUser || timelineMode !== 'embed') return;
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
  }, [feedUser, theme, timelineMode]);

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
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gray-300">View mode:</span>
          <button
            type="button"
            onClick={() => setTimelineMode('embed')}
            className={`px-3 py-1 rounded ${
              timelineMode === 'embed'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-100'
            }`}
            aria-pressed={timelineMode === 'embed'}
          >
            Embed
          </button>
          <button
            type="button"
            onClick={() => setTimelineMode('saved')}
            className={`px-3 py-1 rounded ${
              timelineMode === 'saved'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-100'
            }`}
            aria-pressed={timelineMode === 'saved'}
          >
            Saved
          </button>
          <span className="text-gray-400">
            Saved tweets stay local when embeds fail.
          </span>
        </div>
        <form
          onSubmit={handleSavedSubmit}
          className="grid gap-2 sm:grid-cols-[1fr,2fr,auto] text-sm"
        >
          <input
            type="text"
            value={savedAuthor}
            onChange={(e) => setSavedAuthor(sanitizeHandle(e.target.value))}
            placeholder="Handle"
            className="p-2 rounded bg-gray-800 text-gray-100 placeholder-gray-400"
            aria-label="Saved tweet handle"
          />
          <input
            type="text"
            value={savedText}
            onChange={(e) => setSavedText(e.target.value)}
            placeholder="Saved tweet text"
            className="p-2 rounded bg-gray-800 text-gray-100 placeholder-gray-400"
            aria-label="Saved tweet text"
          />
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={savedTime}
              onChange={(e) => setSavedTime(e.target.value)}
              className="p-2 rounded bg-gray-800 text-gray-100"
              aria-label="Saved tweet time"
            />
            <button
              type="submit"
              className="px-3 py-1 bg-blue-600 text-white rounded"
            >
              {editingId ? 'Update' : 'Save'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setSavedText('');
                  setSavedTime('');
                }}
                className="px-3 py-1 rounded border border-gray-700 text-gray-200"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
      <div className="flex-1 relative">
        {timelineMode === 'saved' ? (
          <div className="p-4 space-y-3">
            {sortedSavedTweets.length === 0 ? (
              <div className="text-center text-gray-400">
                Saved tweets will appear here when the live API is blocked.
              </div>
            ) : (
              <ul className="space-y-3 tweet-feed">
                {sortedSavedTweets.map((tweet) => (
                  <li
                    key={tweet.id}
                    className="flex items-start gap-3 rounded border border-gray-700 p-3"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 text-xs font-semibold">
                      @{tweet.author}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>@{tweet.author}</span>
                        <span>{new Date(tweet.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="text-sm text-gray-100 whitespace-pre-wrap">
                        {tweet.text}
                      </div>
                      <div className="flex gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => handleSavedEdit(tweet.id)}
                          className="px-2 py-1 rounded bg-gray-800 text-gray-100 hover:bg-gray-700"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSavedTweet(tweet.id)}
                          className="px-2 py-1 rounded bg-gray-800 text-gray-100 hover:bg-gray-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <>
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
                  Timeline failed to load. X embeds may be blocked by your browser
                  or an ad blocker. Switch to Saved mode to keep reading.
                </div>
                <div className="flex justify-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="px-3 py-1 rounded bg-gray-800 text-gray-100 hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimelineMode('saved')}
                    className="px-3 py-1 rounded bg-gray-700 text-gray-100 hover:bg-gray-600"
                  >
                    Open saved timeline
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
          </>
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
