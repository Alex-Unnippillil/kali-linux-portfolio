import React, { useEffect, useState } from 'react';
import { sendTelemetry } from '@lib/game';

const SANDBOX = 'allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms';
const BANNED_FEATURES = ['camera', 'microphone', 'geolocation', 'usb', 'payment', 'serial'];

const ALLOWED_HOSTS = [
  'stackblitz.com',
  'open.spotify.com',
  'todoist.com',
  'ghbtns.com',
  'samesite-sandbox.vercel.app',
];
const ALLOWED_SUFFIXES = [
  '.google.com',
  '.twitter.com',
  '.x.com',
  '.youtube.com',
  '.youtube-nocookie.com',
];

function isAllowedHost(host) {
  return (
    ALLOWED_HOSTS.includes(host) ||
    ALLOWED_SUFFIXES.some((s) => host.endsWith(s))
  );
}

function isPublicIP(ip) {
  const blocks = [
    /^0\./,
    /^10\./,
    /^127\./,
    /^169\.254\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./,
  ];
  return !blocks.some((re) => re.test(ip));
}

async function resolvesToPublic(hostname) {
  try {
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${hostname}&type=A`, {
      headers: { Accept: 'application/dns-json' },
    });
    const data = await res.json();
    if (!data.Answer) return false;
    return data.Answer.every((a) => isPublicIP(a.data));
  } catch {
    return false;
  }
}

export default function ExternalFrame({ src, title, className = '', ...rest }) {
  const [error, setError] = useState(false);
  const [key, setKey] = useState(0);
  const [allowed, setAllowed] = useState(true);

  useEffect(() => {
    const hostname = new URL(src).hostname;
    if (!isAllowedHost(hostname)) {
      setAllowed(false);
      sendTelemetry({ name: 'iframe-blocked', data: { src, reason: 'not_allowed' } });
      return;
    }
    resolvesToPublic(hostname).then((ok) => {
      if (!ok) {
        setAllowed(false);
        sendTelemetry({ name: 'iframe-blocked', data: { src, reason: 'dns' } });
      }
    });
  }, [src]);

  if (!/^https:\/\//i.test(src)) {
    return (
      <div className={className}>
        <p className="text-center text-sm">Insecure content blocked.</p>
      </div>
    );
  }

  const { allow, ...restProps } = rest;
  const sanitizedAllow = allow
    ? allow
        .split(';')
        .map((p) => p.trim())
        .filter((p) => p && !BANNED_FEATURES.some((b) => p.startsWith(b)))
        .join('; ')
    : undefined;

  const handleError = () => {
    setError(true);
    sendTelemetry({ name: 'iframe-load-error', data: { src } });
  };

  const retry = () => {
    setError(false);
    setKey((k) => k + 1);
  };

  if (!allowed) {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <p className="mb-2 text-center text-sm">Blocked content.</p>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1 bg-gray-700 rounded text-white text-sm"
        >
          Open in new tab
        </a>
      </div>
    );
  }

  if (error) {
    const offline = typeof navigator !== 'undefined' && !navigator.onLine;
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <p className="mb-2 text-center text-sm">
          {offline ? 'You appear to be offline.' : 'Failed to load content.'}
        </p>
        <div className="space-x-2">
          <button
            type="button"
            onClick={retry}
            className="px-3 py-1 bg-blue-600 rounded text-white text-sm"
          >
            Retry
          </button>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 bg-gray-700 rounded text-white text-sm"
          >
            Open in new tab
          </a>
        </div>
      </div>
    );
  }

  return (
    <iframe
      key={key}
      src={src}
      title={title}
      sandbox={SANDBOX}
      onError={handleError}
      className={className}
      {...(sanitizedAllow ? { allow: sanitizedAllow } : {})}
      {...restProps}
    />
  );
}
