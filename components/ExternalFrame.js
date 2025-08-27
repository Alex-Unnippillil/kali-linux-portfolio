import React, { useEffect, useState } from 'react';
import Link from 'next/link';

const ALLOWLIST = ['vscode.dev', 'stackblitz.com'];

export default function ExternalFrame({ src, title = 'External frame', ...props }) {
  const [cookiesBlocked, setCookiesBlocked] = useState(false);

  useEffect(() => {
    try {
      document.cookie = 'thirdpartytest=1';
      const enabled = document.cookie.includes('thirdpartytest=');
      if (!enabled) setCookiesBlocked(true);
    } catch (e) {
      setCookiesBlocked(true);
    }
  }, []);

  let url;
  try {
    url = new URL(src);
  } catch (e) {
    return null;
  }
  const allowed = ALLOWLIST.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
  if (!allowed) {
    return null;
  }

  return (
    <div className="h-full w-full relative">
      {cookiesBlocked && (
        <div data-testid="cookie-banner" className="absolute inset-0 bg-yellow-200 p-2 text-sm z-10 flex items-center">
          Third-party cookies are disabled.{' '}
          <Link href="https://support.google.com/chrome/answer/95647" prefetch={false} className="underline ml-1">
            Learn more
          </Link>
        </div>
      )}
      <iframe
        src={src}
        title={title}
        data-testid="external-frame"
        className="h-full w-full"
        frameBorder="0"
        {...props}
      ></iframe>
    </div>
  );
}
