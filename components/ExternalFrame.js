import React, { useEffect, useId, useMemo, useState } from 'react';
import Head from 'next/head';

const ALLOWLIST = ['https://vscode.dev', 'https://stackblitz.com'];

const DEFAULT_LOCALE = 'en';

const SANDBOX_PERMISSIONS = [
  'allow-scripts',
  'allow-same-origin',
  'allow-forms',
  'allow-popups',
  'allow-downloads',
];

const DEFAULT_COPY_BY_LOCALE = {
  en: {
    title: 'Sandboxed embed',
    description:
      'This embedded tool runs inside a restricted sandbox. Features such as persistent sign-in, clipboard sync, or local files may be limited here.',
    messaging:
      'For safety, the embedded tool cannot exchange messages with other windows or the desktop shell.',
    learnMore: 'Learn more about sandbox limits',
  },
};

const hasCopyShape = (value) =>
  value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).some((key) => key in DEFAULT_COPY_BY_LOCALE.en);

const normalizeLocale = (locale) => {
  if (!locale || typeof locale !== 'string') {
    return DEFAULT_LOCALE;
  }
  const [language] = locale.toLowerCase().split('-');
  return language || DEFAULT_LOCALE;
};

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
export default function ExternalFrame({
  src,
  title,
  locale = DEFAULT_LOCALE,
  localizedCopy,
  prefetch = false,
  onLoad: onLoadProp,
  ...props
}) {
  const [cookiesBlocked, setCookiesBlocked] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const sandboxDescriptionId = useId();
  const sandboxAttributes = useMemo(() => SANDBOX_PERMISSIONS.join(' '), []);

  const copy = useMemo(() => {
    const normalizedLocale = normalizeLocale(locale);
    const baseCopy = DEFAULT_COPY_BY_LOCALE[normalizedLocale] ?? DEFAULT_COPY_BY_LOCALE[DEFAULT_LOCALE];

    if (!localizedCopy || typeof localizedCopy !== 'object') {
      return baseCopy;
    }

    if (hasCopyShape(localizedCopy)) {
      return { ...baseCopy, ...localizedCopy };
    }

    const overridesForLocale = localizedCopy[normalizedLocale] ?? localizedCopy[DEFAULT_LOCALE];
    if (hasCopyShape(overridesForLocale)) {
      return { ...baseCopy, ...overridesForLocale };
    }

    return baseCopy;
  }, [locale, localizedCopy]);

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
        <div
          id={sandboxDescriptionId}
          role="note"
          aria-live="polite"
          className="mb-3 rounded-md border border-sky-500/50 bg-sky-900/70 p-3 text-sm text-sky-100"
        >
          <p className="font-semibold text-sky-50">{copy.title}</p>
          <p className="mt-1">{copy.description}</p>
          <p className="mt-1">{copy.messaging}</p>
          <a
            className="mt-2 inline-flex items-center gap-1 text-sky-200 underline hover:text-sky-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200"
            href="https://developer.mozilla.org/docs/Web/HTML/Element/iframe#attr-sandbox"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span aria-hidden="true">ℹ️</span>
            <span>{copy.learnMore}</span>
          </a>
        </div>
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
            sandbox={sandboxAttributes}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; geolocation; gyroscope; picture-in-picture; microphone; camera"
            referrerPolicy="no-referrer"
            aria-describedby={sandboxDescriptionId}
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
}
