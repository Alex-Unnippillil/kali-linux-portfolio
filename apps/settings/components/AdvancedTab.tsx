"use client";

import { useState } from "react";

interface DomainInfo {
  domain: string;
  allowed: boolean;
  purpose: string;
}

const domains: DomainInfo[] = [
  { domain: "*.twitter.com", allowed: true, purpose: "Twitter widgets" },
  { domain: "*.twimg.com", allowed: true, purpose: "Twitter CDN" },
  { domain: "*.x.com", allowed: true, purpose: "Twitter alias" },
  { domain: "stackblitz.com", allowed: true, purpose: "StackBlitz IDE" },
  { domain: "www.youtube-nocookie.com", allowed: true, purpose: "YouTube videos" },
  { domain: "open.spotify.com", allowed: true, purpose: "Spotify embeds" },
  { domain: "*.google.com", allowed: true, purpose: "Google services" },
  { domain: "example.com", allowed: true, purpose: "Chrome demo" },
  { domain: "react.dev", allowed: false, purpose: "React docs" },
];

const snippet = `const ContentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "img-src 'self' https: data:",
  "style-src 'self'",
  "font-src 'self'",
  "script-src 'self' 'unsafe-inline' https://vercel.live https://platform.twitter.com https://syndication.twitter.com https://cdn.syndication.twimg.com https://*.twitter.com https://*.x.com https://www.youtube.com https://www.google.com https://www.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://sdk.scdn.co",
  "connect-src 'self' https://example.com https://*.twitter.com https://*.twimg.com https://*.x.com https://*.google.com https://stackblitz.com",
  "frame-src 'self' https://vercel.live https://stackblitz.com https://*.google.com https://*.twitter.com https://*.x.com https://www.youtube-nocookie.com https://open.spotify.com https://react.dev https://example.com",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join('; ');`;

export default function AdvancedTab() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="mb-2 font-bold">External Domains</h2>
        <ul className="space-y-1">
          {domains.map(({ domain, allowed, purpose }) => (
            <li key={domain} className="flex items-center gap-2">
              <span>{domain}</span>
              <span
                className={`px-2 py-0.5 text-xs rounded text-white ${
                  allowed ? "bg-green-600" : "bg-red-600"
                }`}
              >
                {allowed ? "Allowed" : "Blocked"}
              </span>
              <span className="text-xs text-gray-300">{purpose}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="mb-2 font-bold">next.config.js</h2>
        <pre
          aria-label="next-config-snippet"
          className="bg-ub-cool-grey text-ubt-grey p-2 rounded overflow-auto"
        >
{snippet}
        </pre>
        <button
          type="button"
          onClick={copy}
          className="mt-2 px-4 py-1 rounded bg-ub-orange text-white"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

