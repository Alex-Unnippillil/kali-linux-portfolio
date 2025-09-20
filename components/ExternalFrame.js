import React, { useEffect, useId, useRef, useState } from 'react';

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
 */
export default function ExternalFrame({ src, title, onLoad: onLoadProp, ...props }) {
  const [cookiesBlocked, setCookiesBlocked] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const closeDialogButtonRef = useRef(null);
  const dialogTitleId = useId();
  const dialogDescriptionId = useId();

  const actionButtonClass =
    'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

  useEffect(() => {
    try {
      document.cookie = 'third_party_cookie_test=1';
      const blocked = !document.cookie.includes('third_party_cookie_test=1');
      if (!blocked) {
        document.cookie = 'third_party_cookie_test=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
      setCookiesBlocked(blocked);
      setShowBanner(blocked);
    } catch {
      setCookiesBlocked(true);
      setShowBanner(true);
    }
  }, []);

  useEffect(() => {
    if (showDialog) {
      closeDialogButtonRef.current?.focus();
    }
  }, [showDialog]);

  useEffect(() => {
    if (!showDialog) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setShowDialog(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDialog]);

  if (!isAllowed(src)) {
    return null;
  }

  return (
    <>
      <div className="flex h-full w-full flex-col">
        {cookiesBlocked && showBanner && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-md bg-red-600/95 px-4 py-3 text-sm text-white shadow-md focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-white sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/20"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M10 3.333a.833.833 0 0 1 .737.45l5.833 10.834a.833.833 0 0 1-.737 1.25H4.167a.833.833 0 0 1-.737-1.25l5.833-10.834a.833.833 0 0 1 .737-.45Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path d="M10 7.5v3.333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="10" cy="13.333" r="0.833" fill="currentColor" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="font-semibold">Third-party cookies are blocked.</p>
                <p className="text-xs text-white/80">
                  Embedded editors and dashboards may not load until cookies are enabled.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => setShowDialog(true)}
                className={`${actionButtonClass} border border-white/60 hover:bg-white/20`}
              >
                Instructions
              </button>
              <button
                type="button"
                onClick={() => setShowBanner(false)}
                className={`${actionButtonClass} bg-white text-red-700 hover:bg-white/90`}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        <div className="relative flex-1">
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-2 right-2 z-10 rounded bg-white px-2 py-1 text-xs font-medium text-black opacity-0 shadow transition hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
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
      </div>
      {showDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={dialogTitleId}
          aria-describedby={dialogDescriptionId}
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 text-gray-900 shadow-xl">
            <h2 id={dialogTitleId} className="text-lg font-semibold">
              Enable third-party cookies
            </h2>
            <p id={dialogDescriptionId} className="mt-2 text-sm text-gray-700">
              Allow third-party cookies for this site in your browser&rsquo;s privacy settings, then reload the page to
              continue using the embedded workspace.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700">
              <li>Open your browser&rsquo;s privacy or cookies settings.</li>
              <li>Add an exception or enable third-party cookies for this site.</li>
              <li>Refresh the window once the setting has been updated.</li>
            </ul>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                ref={closeDialogButtonRef}
                onClick={() => setShowDialog(false)}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
