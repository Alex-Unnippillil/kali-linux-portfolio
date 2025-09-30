import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';

const ALLOWLIST = ['https://vscode.dev', 'https://stackblitz.com'];

const isAllowed = (src) => {
  try {
    const url = new URL(src);
    return ALLOWLIST.some((allowed) => url.href.startsWith(allowed));
  } catch {
    return false;
  }
};

/**
 * Iframe wrapper for allowed external sources.
 * Optionally prefetches the iframe source.
 */
export default function ExternalFrame({ src, title, prefetch = false, onLoad: onLoadProp, ...props }) {
  const [cookiesBlocked, setCookiesBlocked] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [hasMeasured, setHasMeasured] = useState(false);
  const [frameHeight, setFrameHeight] = useState(null);
  const [isCrossOrigin, setIsCrossOrigin] = useState(false);
  const iframeRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const rafRef = useRef(null);

  const originLabel = useMemo(() => {
    try {
      return new URL(src, typeof window !== 'undefined' ? window.location.href : undefined).origin;
    } catch {
      return null;
    }
  }, [src]);

  useEffect(() => {
    try {
      document.cookie = 'third_party_cookie_test=1';
      const blocked = !document.cookie.includes('third_party_cookie_test=1');
      setCookiesBlocked(blocked);
    } catch {
      setCookiesBlocked(true);
    }
  }, []);

  useEffect(() => {
    setFrameHeight(null);
    setHasMeasured(false);
    setIsCrossOrigin(false);

    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, [src]);

  useEffect(() => () => {
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const measureHeight = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) {
      return false;
    }

    try {
      const doc = iframe.contentDocument;
      if (!doc) {
        return false;
      }

      const root = doc.documentElement;
      const body = doc.body;
      const heights = [
        root?.offsetHeight,
        root?.scrollHeight,
        body?.offsetHeight,
        body?.scrollHeight,
      ].map((value) => (typeof value === 'number' ? value : 0));

      const next = Math.max(...heights, 0);

      if (next > 0) {
        setFrameHeight((prev) => (prev !== next ? next : prev));
        setHasMeasured(true);
        return true;
      }
      return false;
    } catch {
      setIsCrossOrigin(true);
      setFrameHeight(null);
      setHasMeasured(true);
      return true;
    }
  }, []);

  const scheduleMeasure = useCallback(() => {
    if (measureHeight()) {
      rafRef.current = null;
      return;
    }

    rafRef.current = requestAnimationFrame(scheduleMeasure);
  }, [measureHeight]);

  const handleLoad = useCallback(
    (event) => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      setIsCrossOrigin(false);

      const initialMeasured = measureHeight();
      if (!initialMeasured) {
        rafRef.current = requestAnimationFrame(scheduleMeasure);
      }

      const iframe = iframeRef.current;
      if (iframe) {
        try {
          const doc = iframe.contentDocument;
          if (doc && typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(() => {
              measureHeight();
            });
            observer.observe(doc.documentElement);
            if (doc.body) {
              observer.observe(doc.body);
            }
            resizeObserverRef.current = observer;
          }
        } catch {
          // Access will throw for cross-origin frames. measureHeight handles fallback state.
        }
      }

      onLoadProp?.(event);
    },
    [measureHeight, onLoadProp, scheduleMeasure]
  );

  if (!isAllowed(src)) {
    return null;
  }

  const { className = '', style, ...restProps } = props;
  const showSkeleton = !hasMeasured;
  const iframeClassName = ['w-full', 'h-full', className, hasMeasured ? '' : 'invisible']
    .filter(Boolean)
    .join(' ');
  const iframeStyle = frameHeight != null ? { ...(style || {}), height: `${frameHeight}px` } : style;

  return (
    <>
      {prefetch && (
        <Head>
          <link rel="prefetch" href={src} />
        </Head>
      )}
      <div className="flex h-full w-full flex-col">
        {cookiesBlocked && (
          <div role="alert" className="bg-red-600 text-white text-sm p-2 text-center">
            Third-party cookies are blocked{' '}
            <button onClick={() => setShowDialog(true)} className="underline">
              Instructions
            </button>
          </div>
        )}
        <div className="group relative flex-1" aria-busy={showSkeleton}>
          {isCrossOrigin && (
            <div className="pointer-events-none absolute left-2 top-2 z-20 max-w-xs text-left">
              <div
                className="pointer-events-auto flex items-start gap-2 rounded bg-black/70 px-3 py-2 text-xs text-white shadow-lg"
                role="note"
              >
                <svg
                  aria-hidden="true"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-0.5 flex-shrink-0"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>
                  {originLabel ? `Content from ${originLabel}` : 'External content'} cannot share its height with this window.
                  Use the scrollbars or open it in a new tab if it appears clipped.
                </span>
              </div>
            </div>
          )}
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-2 right-2 z-10 rounded bg-white px-2 py-1 text-xs text-black opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          >
            Open Externally
          </a>
          <iframe
            ref={iframeRef}
            src={src}
            title={title}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; geolocation; gyroscope; picture-in-picture; microphone; camera"
            referrerPolicy="no-referrer"
            onLoad={handleLoad}
            className={iframeClassName}
            style={iframeStyle}
            {...restProps}
          />
          {showSkeleton && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200/80 animate-pulse" aria-hidden="true">
              <span className="sr-only">Loading...</span>
            </div>
          )}
        </div>
        {showDialog && (
          <dialog open>
            <p>Enable third-party cookies in your browser settings to use this app.</p>
            <button onClick={() => setShowDialog(false)}>Close</button>
          </dialog>
        )}
      </div>
    </>
  );
}
