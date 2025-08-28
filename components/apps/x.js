import React, { useEffect, useRef, useState } from 'react';

const MAX_CHARS = 280;
const RADIUS = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function XApp() {
  const theme = 'dark';
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [timelineKey, setTimelineKey] = useState(0);
  const [timelineLoaded, setTimelineLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const [media, setMedia] = useState([]);
  const [status, setStatus] = useState('');
  const [strokeOffset, setStrokeOffset] = useState(CIRCUMFERENCE);
  const fileInputRef = useRef(null);
  const timelineRef = useRef(null);
  const panelRef = useRef(null);
  const [shouldLoadTimeline, setShouldLoadTimeline] = useState(false);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const targetOffset =
      CIRCUMFERENCE - (Math.min(text.length, MAX_CHARS) / MAX_CHARS) * CIRCUMFERENCE;
    if (prefersReducedMotion) {
      setStrokeOffset(targetOffset);
      return;
    }
    let frame;
    const animate = () => {
      setStrokeOffset(targetOffset);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [text, prefersReducedMotion]);

  const handleMedia = (e) => {
    const files = Array.from(e.target.files || []);
    const mapped = files.map((f) => ({ file: f, url: URL.createObjectURL(f) }));
    setMedia((m) => [...m, ...mapped]);
  };

  const removeMedia = (url) => {
    setMedia((m) => {
      const updated = m.filter((item) => item.url !== url);
      URL.revokeObjectURL(url);
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/x', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (res.ok) {
        setText('');
        setMedia([]);
        setTimelineKey((k) => k + 1);
        setStatus('Post submitted');
      }
    } catch (err) {
      setStatus('Post failed');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setShouldLoadTimeline(true);
        observer.disconnect();
      }
    });
    if (panelRef.current) observer.observe(panelRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoadTimeline) return;
    const src = 'https://platform.twitter.com/widgets.js';
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
      timelineRef.current.innerHTML = '';
      setTimelineLoaded(false);
      window.twttr.widgets
        .createTimeline(
          { sourceType: 'profile', screenName: 'AUnnippillil' },
          timelineRef.current,
          { chrome: 'noheader noborders', theme }
        )
        .then(() => setTimelineLoaded(true))
        .catch(() => setScriptError(true));
    };
    if (script && window.twttr) {
      loadTimeline();
    } else {
      if (!script) {
        script = document.createElement('script');
        script.src = src;
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
  }, [timelineKey, shouldLoadTimeline]);

  return (
    <div className="h-full w-full overflow-auto bg-ub-cool-grey flex flex-col tweet-container">
      <form
        onSubmit={handleSubmit}
        className="p-2 flex flex-col gap-2 border-b border-gray-600 bg-gray-900 text-gray-100 tweet-form"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's happening?"
          maxLength={MAX_CHARS}
          className="w-full p-2 rounded bg-gray-800 text-gray-100 placeholder-gray-400"
          style={{ maxInlineSize: '60ch' }}
        />

        {media.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {media.map((m) => (
              <div key={m.url} className="relative">
                <img
                  src={m.url}
                  alt={m.file.name}
                  className="max-h-32 rounded object-cover media-image"
                />
                <button
                  type="button"
                  aria-label="Remove media"
                  onClick={() => removeMedia(m.url)}
                  className="absolute top-1 right-1 bg-black/70 text-white rounded-full px-1"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label
              className="cursor-pointer text-blue-300 hover:text-blue-200"
              aria-label="Add media"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleMedia}
              />
              📎
            </label>
          </div>
          <div className="flex items-center gap-2">
            <svg
              width="40"
              height="40"
              role="img"
              aria-label={`${text.length} of ${MAX_CHARS} characters used`}
            >
              <circle
                r={RADIUS}
                cx="20"
                cy="20"
                stroke="#4b5563"
                strokeWidth="4"
                fill="transparent"
              />
              <circle
                r={RADIUS}
                cx="20"
                cy="20"
                stroke="#3b82f6"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeOffset}
              />
            </svg>
            <button
              type="submit"
              disabled={
                submitting || !text.trim() || text.length > MAX_CHARS
              }
              className="px-4 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {submitting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
        <div aria-live="polite" className="sr-only">
          {status}
        </div>
      </form>
      <div ref={panelRef} className="flex-1 relative">
        {!timelineLoaded && !scriptError && (
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
              href="https://x.com/AUnnippillil"
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
          .tweet-form {
            padding: 0.25rem;
          }
          .media-image {
            max-height: 4rem;
            object-fit: contain;
          }
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

