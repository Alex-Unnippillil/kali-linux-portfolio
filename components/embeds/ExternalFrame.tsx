import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import EmbedPlaceholder from './EmbedPlaceholder';

const ALLOWLIST = ['https://vscode.dev', 'https://stackblitz.com'];

const isAllowed = (src: string) => {
  try {
    const url = new URL(src);
    return ALLOWLIST.some((allowed) => url.href.startsWith(allowed));
  } catch {
    return false;
  }
};

interface ExternalFrameProps
  extends Omit<React.IframeHTMLAttributes<HTMLIFrameElement>, 'src'> {
  src: string;
  prefetch?: boolean;
  onAllow?: () => void;
}

const ExternalFrame: React.FC<ExternalFrameProps> = ({
  src,
  title,
  prefetch = false,
  onLoad: onLoadProp,
  onAllow,
  className,
  ...props
}) => {
  const [cookiesBlocked, setCookiesBlocked] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [consented, setConsented] = useState(false);

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
    setLoaded(false);
  }, [consented, src]);

  const originLabel = useMemo(() => {
    try {
      return new URL(src).origin;
    } catch {
      return 'external site';
    }
  }, [src]);

  if (!isAllowed(src)) {
    return null;
  }

  const handleAllow = () => {
    setConsented(true);
    onAllow?.();
  };

  return (
    <>
      {consented && prefetch && (
        <Head>
          <link rel="prefetch" href={src} />
        </Head>
      )}
      <div className="h-full w-full flex flex-col">
        {consented && cookiesBlocked && (
          <div role="alert" className="bg-red-600 text-white text-sm p-2 text-center">
            Third-party cookies are blocked{' '}
            <button type="button" onClick={() => setShowDialog(true)} className="underline">
              Instructions
            </button>
          </div>
        )}
        <div className="relative flex-1">
          {!consented ? (
            <EmbedPlaceholder
              className="absolute inset-0"
              service={originLabel}
              description={`${originLabel} may collect usage data when this embed loads.`}
              allowLabel="Load embed"
              onAllow={handleAllow}
            />
          ) : (
            <>
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
                className={
                  ['h-full w-full', loaded ? '' : 'invisible', className]
                    .filter(Boolean)
                    .join(' ')
                }
                {...props}
              />
              {!loaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-200 animate-pulse" aria-hidden="true">
                  <span className="sr-only">Loading...</span>
                </div>
              )}
            </>
          )}
        </div>
        {showDialog && (
          <dialog open>
            <p>Enable third-party cookies in your browser settings to use this app.</p>
            <button type="button" onClick={() => setShowDialog(false)}>
              Close
            </button>
          </dialog>
        )}
      </div>
    </>
  );
};

export default ExternalFrame;
