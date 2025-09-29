import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';

const ALLOWLIST = ['https://vscode.dev', 'https://stackblitz.com'];

const ALLOWED_ORIGINS = ALLOWLIST.map((allowed) => {
  try {
    return new URL(allowed).origin;
  } catch {
    return null;
  }
}).filter(Boolean);

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
  if (!title || title.trim().length === 0) {
    throw new Error('ExternalFrame requires a descriptive title.');
  }

  const [cookiesBlocked, setCookiesBlocked] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [iframeHeight, setIframeHeight] = useState('100%');
  const iframeRef = useRef(null);
  const handshakeAcknowledged = useRef(false);

  useEffect(() => {
    setIframeHeight('100%');
  }, [src]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleMessage = (event) => {
      if (!ALLOWED_ORIGINS.includes(event.origin)) {
        return;
      }

      const { data } = event;
      if (!data || typeof data !== 'object') {
        return;
      }

      if (data.type === 'external-frame:ack' || data.type === 'external-frame:ready') {
        handshakeAcknowledged.current = true;
      }

      if (data.type === 'external-frame:resize' && typeof data.height === 'number') {
        handshakeAcknowledged.current = true;
        setIframeHeight(`${Math.max(data.height, 120)}px`);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

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
    if (!loaded || typeof window === 'undefined') {
      return undefined;
    }

    const frame = iframeRef.current;
    if (!frame?.contentWindow) {
      return undefined;
    }

    let isCancelled = false;
    handshakeAcknowledged.current = false;

    let origin;
    try {
      origin = new URL(src).origin;
    } catch {
      origin = undefined;
    }

    if (!origin) {
      return undefined;
    }

    const sendHandshake = () => {
      if (isCancelled || !frame.contentWindow) {
        return;
      }
      frame.contentWindow.postMessage({ type: 'external-frame:handshake' }, origin);
    };

    sendHandshake();
    const intervalId = window.setInterval(() => {
      if (handshakeAcknowledged.current) {
        window.clearInterval(intervalId);
        return;
      }
      sendHandshake();
    }, 2000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [loaded, src]);

  if (!isAllowed(src)) {
    return null;
  }

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
        <div className="relative flex-1">
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-2 right-2 z-10 px-2 py-1 text-xs bg-white text-black rounded opacity-0 focus-visible:opacity-100"
          >
            Open Externally
          </a>
          <iframe
            src={src}
            title={title}
            sandbox="allow-scripts allow-same-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; geolocation; gyroscope; picture-in-picture"
            referrerPolicy="no-referrer"
            ref={iframeRef}
            style={{ height: iframeHeight }}
            onLoad={(e) => {
              setLoaded(true);
              onLoadProp?.(e);
            }}
            className={`w-full h-full ${loaded ? '' : 'invisible'}`}
            {...props}
          />
          {!loaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-200 animate-pulse" role="status" aria-live="polite">
              <span className="text-sm font-medium text-gray-700">Loading embedded content…</span>
              <span className="text-xs text-gray-500">If it does not load, open the experience in a new tab.</span>
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
