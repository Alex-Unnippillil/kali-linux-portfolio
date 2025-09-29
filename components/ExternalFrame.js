import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useSettings } from '../hooks/useSettings';

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
  const [loaded, setLoaded] = useState(false);
  const [allowOnce, setAllowOnce] = useState(false);
  const { allowEmbeds, setAllowEmbeds } = useSettings();
  const hasConsent = allowEmbeds || allowOnce;

  useEffect(() => {
    if (!hasConsent) return undefined;
    try {
      document.cookie = 'third_party_cookie_test=1';
      const blocked = !document.cookie.includes('third_party_cookie_test=1');
      setCookiesBlocked(blocked);
    } catch {
      setCookiesBlocked(true);
    }
  }, [hasConsent]);

  useEffect(() => {
    setAllowOnce(false);
  }, [src]);

  useEffect(() => {
    if (!allowEmbeds) {
      setAllowOnce(false);
    }
  }, [allowEmbeds]);

  if (!isAllowed(src)) {
    return null;
  }

  return (
    <>
      {prefetch && hasConsent && (
        <Head>
          <link rel="prefetch" href={src} />
        </Head>
      )}
      <div className="h-full w-full flex flex-col">
        {!hasConsent && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded border border-ubt-cool-grey bg-ub-cool-grey/40 p-6 text-center text-sm text-ubt-grey">
            <div>
              <p className="mb-2 font-medium">Embedded content blocked</p>
              <p>
                This app loads an external frame. Enable embeds to always allow third-party content or load this tool once.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                className="rounded bg-ub-orange px-3 py-1 text-black transition hover:bg-ub-orange/80"
                onClick={() => setAllowEmbeds(true)}
              >
                Always allow embeds
              </button>
              <button
                type="button"
                className="rounded border border-ubt-grey px-3 py-1 text-ubt-grey transition hover:bg-ub-grey/60"
                onClick={() => setAllowOnce(true)}
              >
                Load once
              </button>
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded border border-ubt-grey px-3 py-1 text-ubt-grey transition hover:bg-ub-grey/60"
              >
                Open in new tab
              </a>
            </div>
          </div>
        )}
        {hasConsent && cookiesBlocked && (
          <div role="alert" className="bg-red-600 text-white text-sm p-2 text-center">
            Third-party cookies are blocked{' '}
            <button onClick={() => setShowDialog(true)} className="underline">
              Instructions
            </button>
          </div>
        )}
        {hasConsent && (
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
        )}
        {hasConsent && showDialog && (
          <dialog open>
            <p>Enable third-party cookies in your browser settings to use this app.</p>
            <button onClick={() => setShowDialog(false)}>Close</button>
          </dialog>
        )}
      </div>
    </>
  );
}
