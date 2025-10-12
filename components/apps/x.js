"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getNextEmbedTheme } from '../../apps/x/state/theme';
import { loadEmbedScript } from '../../apps/x/embed';

const sanitizeHandle = (handle) =>
  handle.replace(/[^A-Za-z0-9_]/g, '').slice(0, 15);

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
      <div className="p-2 flex flex-col gap-2 border-b border-kali-border/60 bg-kali-surface/95 text-white/90">
        <form onSubmit={handleAddFeed} className="flex gap-2">
          <input
            type="text"
            value={feedInput}
            onChange={(e) => setFeedInput(e.target.value)}
            placeholder="Add feed handle"
            aria-label="Add feed handle"
            className="flex-1 rounded border border-white/10 bg-white/5 px-3 py-2 text-white/90 placeholder:text-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
          />
          <button
            type="submit"
            className="rounded border border-transparent bg-kali-control px-3 py-1 text-sm font-medium text-black transition hover:bg-kali-control/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus disabled:opacity-60"
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
                className={`rounded-full border px-3 py-1 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus ${
                  feedUser === h
                    ? 'border-kali-control/70 bg-kali-control text-black shadow-[0_0_0_1px_rgba(255,255,255,0.2)]'
                    : 'border-white/10 bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-white/70">Timeline theme:</span>
          <button
            type="button"
            onClick={handleToggleTheme}
            className="rounded border border-white/10 bg-white/10 px-3 py-1 text-white/80 transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
            aria-pressed={theme === 'dark'}
          >
            {`Switch to ${getNextEmbedTheme(theme)} mode`}
          </button>
          {hasManualTheme && (
            <button
              type="button"
              onClick={handleResetTheme}
              className="rounded border border-white/15 px-3 py-1 text-white/80 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
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
              className="rounded border border-transparent bg-kali-control px-4 py-2 text-sm font-semibold text-black transition hover:bg-kali-control/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
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
                className="flex gap-4 border-b border-white/10 pb-4 last:border-b-0"
              >
                <div className="h-12 w-12 rounded-full bg-white/10 motion-safe:animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-white/10 motion-safe:animate-pulse" />
                  <div className="h-4 w-1/2 rounded bg-white/10 motion-safe:animate-pulse" />
                  <div className="h-4 w-full rounded bg-white/10 motion-safe:animate-pulse" />
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
            <div className="text-white/80">Timeline failed to load.</div>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={handleRetry}
                className="rounded border border-white/10 bg-white/10 px-3 py-1 text-white/80 transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
              >
                Retry
              </button>
              <a
                href={`https://x.com/${sanitizeHandle(feedUser)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-kali-control underline underline-offset-4 transition hover:text-kali-control/80"
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

