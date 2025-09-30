import React, { useCallback, useEffect, useRef, useState } from 'react';
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

const getContentDocument = (iframe) => {
  try {
    return iframe?.contentDocument || iframe?.contentWindow?.document || null;
  } catch {
    return null;
  }
};

const getPreferredHeight = (doc) => {
  if (!doc) return null;
  const body = doc.body;
  const html = doc.documentElement;

  const measurements = [
    body?.scrollHeight,
    html?.scrollHeight,
    body?.offsetHeight,
    html?.offsetHeight,
    body?.clientHeight,
    html?.clientHeight,
  ].filter((value) => typeof value === 'number');

  if (!measurements.length) return null;
  return Math.max(...measurements);
};

/**
 * Iframe wrapper for allowed external sources.
 * Automatically resizes when the iframe is same-origin and exposes a warning overlay when it is not.
 */
export default function ExternalFrame({ src, title, prefetch = false, onLoad: onLoadProp, ...props }) {
  const iframeRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const fallbackListenersRef = useRef([]);

  const [cookiesBlocked, setCookiesBlocked] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [frameHeight, setFrameHeight] = useState(null);
  const [crossOrigin, setCrossOrigin] = useState(false);

  useEffect(() => {
    try {
      document.cookie = 'third_party_cookie_test=1';
      const blocked = !document.cookie.includes('third_party_cookie_test=1');
      setCookiesBlocked(blocked);
    } catch {
      setCookiesBlocked(true);
    }
  }, []);

  const cleanupObservers = useCallback(() => {
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }

    if (fallbackListenersRef.current.length) {
      fallbackListenersRef.current.forEach(({ target, type, handler }) => {
        target?.removeEventListener(type, handler);
      });
      fallbackListenersRef.current = [];
    }
  }, []);

  const updateHeight = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = getContentDocument(iframe);
    if (!doc) return;

    const measuredHeight = getPreferredHeight(doc);
    if (typeof measuredHeight === 'number' && measuredHeight > 0) {
      setFrameHeight((prev) => (prev !== measuredHeight ? measuredHeight : prev));
    }
  }, []);

  const setupResizing = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    cleanupObservers();

    const doc = getContentDocument(iframe);

    if (!doc) {
      setCrossOrigin(true);
      setFrameHeight(null);
      return;
    }

    setCrossOrigin(false);
    updateHeight();

    const observerTargets = [doc.body, doc.documentElement].filter(Boolean);

    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(() => {
        updateHeight();
      });

      observerTargets.forEach((target) => resizeObserver.observe(target));

      resizeObserverRef.current = resizeObserver;
    } else {
      const resizeHandler = () => {
        updateHeight();
      };

      const win = iframe.contentWindow;
      if (win) {
        win.addEventListener('resize', resizeHandler);
        fallbackListenersRef.current.push({ target: win, type: 'resize', handler: resizeHandler });
      }
    }
  }, [cleanupObservers, updateHeight]);

  useEffect(() => {
    return () => {
      cleanupObservers();
    };
  }, [cleanupObservers]);

  useEffect(() => {
    setLoaded(false);
    setCrossOrigin(false);
    setFrameHeight(null);
    cleanupObservers();
  }, [src, cleanupObservers]);

  if (!isAllowed(src)) {
    return null;
  }

  const containerClass = frameHeight ? 'relative w-full' : 'relative flex-1 w-full';
  const containerStyle = frameHeight ? { height: `${frameHeight}px` } : undefined;

  return (
    <>
      {prefetch && (
        <Head>
          <link rel="prefetch" href={src} />
        </Head>
      )}
      <div className="h-full w-full flex flex-col">
        {cookiesBlocked && (
          <div role="alert" className="bg-red-600 text-white text-sm p-2 text-center">
            Third-party cookies are blocked{' '}
            <button onClick={() => setShowDialog(true)} className="underline">
              Instructions
            </button>
          </div>
        )}
        <div className={containerClass} style={containerStyle}>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-2 right-2 z-10 px-2 py-1 text-xs bg-white text-black rounded opacity-0 focus-visible:opacity-100"
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
            scrolling="no"
            onLoad={(event) => {
              setLoaded(true);
              setupResizing();
              updateHeight();
              onLoadProp?.(event);
            }}
            className={`w-full h-full ${loaded ? '' : 'invisible'}`}
            style={{ border: 'none', display: 'block', overflow: 'hidden' }}
            {...props}
          />
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200 animate-pulse" aria-hidden="true">
              <span className="sr-only">Loading...</span>
            </div>
          )}
          {crossOrigin && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/70 text-white text-sm text-center p-4">
              <p>
                Unable to resize external content automatically due to cross-origin restrictions. Use the “Open Externally” button for
                the best experience.
              </p>
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
