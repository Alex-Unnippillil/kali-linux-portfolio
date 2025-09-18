import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
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
const ExternalFrame = React.forwardRef(function ExternalFrame(
  { src, title, prefetch = false, onLoad: onLoadProp, messaging, ...props },
  forwardedRef,
) {
  const [cookiesBlocked, setCookiesBlocked] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const iframeRef = useRef(null);

  const allowedOrigins = messaging?.allowedOrigins ?? [];
  const nonce = messaging?.nonce;
  const onMessage = messaging?.onMessage;

  useEffect(() => {
    if (!messaging || !iframeRef.current || !nonce || allowedOrigins.length === 0) {
      return undefined;
    }

    const allowedSet = new Set(allowedOrigins);
    const targetOrigin = typeof window !== 'undefined' && window.location ? window.location.origin : '*';

    const handler = (event) => {
      if (!iframeRef.current) return;
      if (event.source !== iframeRef.current.contentWindow) return;
      if (event.data && event.data.__externalFrameForwarded) return;
      if (!allowedSet.has(event.origin)) return;
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.nonce !== nonce) return;

      onMessage?.(event.data, event);

      try {
        window.postMessage(
          {
            __externalFrameForwarded: true,
            origin: event.origin,
            payload: event.data,
          },
          targetOrigin,
        );
      } catch {
        // Swallow errors to avoid breaking the app when postMessage is unavailable.
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [allowedOrigins, nonce, onMessage, messaging]);

  useImperativeHandle(
    forwardedRef,
    () => ({
      postMessage: (message, targetOrigin) => {
        if (!messaging || !iframeRef.current || !iframeRef.current.contentWindow) return;
        if (!nonce) return;
        if (!allowedOrigins.some((origin) => targetOrigin === origin)) return;

        const payload = { ...message, nonce };
        iframeRef.current.contentWindow.postMessage(payload, targetOrigin);
      },
      reload: () => {
        if (!iframeRef.current) return;
        iframeRef.current.src = iframeRef.current.src;
      },
      getIframe: () => iframeRef.current,
    }),
    [allowedOrigins, nonce, messaging],
  );

  useEffect(() => {
    try {
      document.cookie = 'third_party_cookie_test=1';
      const blocked = !document.cookie.includes('third_party_cookie_test=1');
      setCookiesBlocked(blocked);
    } catch {
      setCookiesBlocked(true);
    }
  }, []);

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
            ref={iframeRef}
            src={src}
            title={title}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; geolocation; gyroscope; picture-in-picture; microphone; camera"
            referrerPolicy="no-referrer"
            onLoad={(e) => {
              setLoaded(true);
              onLoadProp?.(e);
            }}
            className={`w-full h-full ${loaded ? '' : 'invisible'}`}
            {...props}
          />
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200 animate-pulse" aria-hidden="true">
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
});

export default ExternalFrame;
