import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../../hooks/useTheme';

/**
 * Timeline component for X (formerly Twitter).
 * Loads the embed script and creates a profile timeline.
 * Falls back to a button linking to x.com if the script fails to load.
 */

declare global {
  interface Window {
    twttr?: any;
  }
}

const DEFAULT_HEIGHT = 600;

export default function XApp() {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>(DEFAULT_HEIGHT);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Load widgets script
  useEffect(() => {
    if (loaded || error) return;
    if (typeof window === 'undefined') return;

    if (window.twttr && window.twttr.widgets) {
      setLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://platform.twitter.com/widgets.js';
    script.async = true;
    script.onload = () => setLoaded(true);
    script.onerror = () => setError(true);
    document.body.appendChild(script);
  }, [loaded, error]);

  // Create timeline when script/theme/height changes
  useEffect(() => {
    if (!loaded || error) return;
    if (!containerRef.current) return;
    if (typeof window === 'undefined' || !window.twttr) return;

    containerRef.current.innerHTML = '';

    const source = {
      sourceType: 'profile',
      screenName: 'AUnnippillil',
    } as const;

    window.twttr.widgets.createTimeline(source, containerRef.current, {
      theme,
      height,
      chrome: 'noheader noborders',
    });
  }, [loaded, error, theme, height]);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-ub-cool-grey">
        <a
          href="https://x.com/AUnnippillil"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded bg-blue-600 text-white"
        >
          Open on x.com
        </a>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-ub-cool-grey">
      <div className="p-2">
        <label htmlFor="x-height" className="block mb-1 text-xs text-ubt-grey">
          Height: {height}px
        </label>
        <input
          id="x-height"
          type="range"
          min={300}
          max={1000}
          value={height}
          onChange={(e) => setHeight(Number(e.target.value))}
          className="w-full"
        />
      </div>
      <div ref={containerRef} className="flex-1 overflow-hidden" />
    </div>
  );
}

export const displayX = () => <XApp />;

