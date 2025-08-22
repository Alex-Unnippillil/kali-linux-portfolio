'use client';

import Script from 'next/script';
import { useEffect, useRef } from 'react';

interface XTimelineProps {
  username: string;
  theme?: 'light' | 'dark';
  height?: number;
}

declare global {
  interface Window {
    twttr?: {
      widgets: {
        load: (element?: HTMLElement | null) => void;
      };
    };
  }
}

export default function XTimeline({ username, theme = 'light', height = 600 }: XTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.twttr?.widgets?.load(containerRef.current || undefined);
  }, [username, theme, height]);

  return (
    <div ref={containerRef} className="w-full max-w-full">
      <Script src="https://platform.twitter.com/widgets.js" strategy="afterInteractive" />
      <a
        className="twitter-timeline"
        data-theme={theme}
        data-height={height}
        data-width="100%"
        href={`https://twitter.com/${username}`}
      >
        Tweets by {username}
      </a>
      <noscript>
        <a href={`https://twitter.com/${username}`}>View {username} on X</a>
      </noscript>
    </div>
  );
}
