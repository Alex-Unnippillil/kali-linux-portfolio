import React, { forwardRef, useEffect, useState } from 'react';
import Head from 'next/head';
import useDataSaverPreference from '../hooks/useDataSaverPreference';

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
const ExternalFrame = (
  { src, title, prefetch = false, onLoad: onLoadProp, onError: onErrorProp, ...props },
  ref,
) => {
  const [cookiesBlocked, setCookiesBlocked] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const dataSaverEnabled = useDataSaverPreference();
  const [manualAllow, setManualAllow] = useState(false);

  const shouldLoad = !dataSaverEnabled || manualAllow;

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
    if (!shouldLoad) {
      setLoaded(false);
    }
  }, [shouldLoad]);

  useEffect(() => {
    if (dataSaverEnabled) {
      setManualAllow(false);
    }
  }, [dataSaverEnabled]);

  if (!isAllowed(src)) {
    return null;
  }

  return (
    <>
      {prefetch && shouldLoad && (
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
          {shouldLoad ? (
            <>
              <iframe
                src={src}
                title={title}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; geolocation; gyroscope; picture-in-picture; microphone; camera"
                referrerPolicy="no-referrer"
                ref={ref}
                onLoad={(e) => {
                  setLoaded(true);
                  onLoadProp?.(e);
                }}
                onError={(e) => {
                  setLoaded(false);
                  onErrorProp?.(e);
                }}
                className={`w-full h-full ${loaded ? '' : 'invisible'}`}
                {...props}
              />
              {!loaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-200 animate-pulse" aria-hidden="true">
                  <span className="sr-only">Loading...</span>
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-200/80 text-center text-sm text-gray-800">
              <p className="max-w-xs">
                Data saver is on. Heavy embeds stay paused until you choose to load them.
              </p>
              <button
                type="button"
                className="rounded bg-black px-3 py-1 text-white shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                onClick={() => setManualAllow(true)}
              >
                Load once
              </button>
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-gray-900 underline"
              >
                Open in new tab
              </a>
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
};

export default forwardRef(ExternalFrame);
