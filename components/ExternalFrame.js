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

export default function ExternalFrame({ src, title, prefetch = false, ...props }) {
  const [cookiesBlocked, setCookiesBlocked] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

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
          Third-party cookies are blocked.{' '}
          <button onClick={() => setShowDialog(true)} className="underline">
            Instructions
          </button>
        </div>
      )}
      <iframe
        src={src}
        title={title}
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; geolocation; gyroscope; picture-in-picture; microphone; camera"
        referrerPolicy="no-referrer"
        {...props}
      />
      {showDialog && (
        <dialog open>
          <p>Enable third-party cookies in your browser settings to use this app.</p>
          <button onClick={() => setShowDialog(false)}>Close</button>
        </dialog>
      )}
    </div>
  );
}

