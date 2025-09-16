import React, { useEffect, useState } from 'react';

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

  useEffect(() => {
    if (!prefetch || typeof document === 'undefined') return undefined;
    if (!isAllowed(src)) return undefined;
    let link;
    const selector = `link[rel="prefetch"][href="${src}"]`;
    if (!document.head.querySelector(selector)) {
      link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = src;
      document.head.appendChild(link);
    }
    return () => {
      if (link && link.parentNode === document.head) {
        document.head.removeChild(link);
      }
    };
  }, [prefetch, src]);

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
  );
}
