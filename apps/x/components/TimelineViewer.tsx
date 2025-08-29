'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import DOMPurify from 'dompurify';
import Script from 'next/script';
import { useSettings } from '../../hooks/useSettings';

declare global {
  interface Window {
    twttr?: any;
  }
}

export default function TimelineViewer() {
  const { accent } = useSettings();
  const [input, setInput] = useState('');
  const [url, setUrl] = useState('');
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
    if (!scriptLoaded || !url || !window.twttr || !timelineRef.current) return;
    timelineRef.current.innerHTML = '';
    window.twttr.widgets.createTimeline(
      { sourceType: 'url', url },
      timelineRef.current,
      { theme, chrome: 'noheader noborders', linkColor: accent }
    );
  }, [scriptLoaded, url, theme, accent]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const sanitized = DOMPurify.sanitize(input.trim());
    setUrl(sanitized);
  };

  return (
    <>
      <Script
        src="https://platform.twitter.com/widgets.js"
        strategy="lazyOnload"
        onLoad={() => setScriptLoaded(true)}
      />
      <form onSubmit={handleSubmit} className="flex gap-2 p-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter X or Twitter URL"
          className="flex-1 p-2 rounded border bg-transparent"
        />
        <button
          type="submit"
          className="px-3 py-1 rounded text-white"
          style={{ backgroundColor: accent }}
        >
          Load
        </button>
      </form>
      <div ref={timelineRef} className="p-4" />
    </>
  );
}

