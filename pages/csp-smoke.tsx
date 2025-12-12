import { useEffect, useMemo, useState } from 'react';

const iframeEmbeds = [
  {
    name: 'StackBlitz',
    src: 'https://stackblitz.com/github/Alex-Unnippillil/kali-linux-portfolio?embed=1&file=README.md',
  },
  {
    name: 'YouTube (privacy-enhanced)',
    src: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
  },
  {
    name: 'Spotify',
    src: 'https://open.spotify.com/embed/playlist/37i9dQZF1E8NOMDYRneOXj?utm_source=generator',
  },
  {
    name: 'Twitter widget',
    src: 'https://platform.twitter.com/widgets/tweet_button.html?text=CSP%20test',
  },
];

const fetchTargets = [
  { name: 'GitHub API', url: 'https://api.github.com/repos/vercel/next.js' },
  { name: 'Google connectivity', url: 'https://www.google.com/generate_204' },
  {
    name: 'YouTube Data API',
    url: 'https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=csp-smoke',
  },
  { name: 'StackBlitz assets', url: 'https://stackblitz.com/favicon.ico' },
];

type Status = 'pending' | 'loaded' | 'error';

type FetchResult = {
  name: string;
  status: 'ok' | 'blocked';
};

export default function CspSmokeTestPage() {
  const [iframeStatus, setIframeStatus] = useState<Record<string, Status>>(() =>
    Object.fromEntries(iframeEmbeds.map(({ name }) => [name, 'pending'] as const)),
  );
  const [fetchStatus, setFetchStatus] = useState<FetchResult[]>([]);
  const [violations, setViolations] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const runFetches = async () => {
      const results = await Promise.all(
        fetchTargets.map(async ({ name, url }) => {
          try {
            await fetch(url, { mode: 'no-cors', signal: controller.signal });
            return { name, status: 'ok' as const };
          } catch (error) {
            console.error('CSP fetch failure', name, error);
            return { name, status: 'blocked' as const };
          }
        }),
      );
      setFetchStatus(results);
    };

    runFetches();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const handleViolation = (event: SecurityPolicyViolationEvent) => {
      const blockedTarget = event.blockedURI?.replace(/^https?:\/\//, '') ?? 'unknown';
      const detail = `${event.effectiveDirective} blocked ${blockedTarget}`;
      setViolations((prev) => [...prev, detail]);
    };

    document.addEventListener('securitypolicyviolation', handleViolation);
    return () => {
      document.removeEventListener('securitypolicyviolation', handleViolation);
    };
  }, []);

  const summary = useMemo(() => {
    const iframePending = Object.values(iframeStatus).some((status) => status === 'pending');
    const fetchPending = fetchStatus.length === 0;
    if (iframePending || fetchPending) return 'Running checks…';
    if (violations.length > 0) return 'CSP violations detected';
    const anyIframeError = Object.values(iframeStatus).some((status) => status === 'error');
    const anyFetchBlocked = fetchStatus.some((entry) => entry.status === 'blocked');
    if (anyIframeError || anyFetchBlocked) return 'Some resources failed to load';
    return 'All monitored resources loaded without CSP errors';
  }, [fetchStatus, iframeStatus, violations.length]);

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-6 space-y-6">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-indigo-300">Diagnostics</p>
        <h1 className="text-3xl font-bold">CSP Smoke Test</h1>
        <p className="max-w-3xl text-slate-300">
          This page mounts the embedded providers and outbound fetches used across the portfolio. If Content Security Policy
          blocks any requests, they will appear below with details so you can adjust the allowlist before deploying.
        </p>
        <div className="rounded border border-slate-700 bg-slate-800 p-4">
          <p className="text-sm font-semibold text-indigo-200">Status</p>
          <p className="text-lg font-medium text-white">{summary}</p>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Embeds</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {iframeEmbeds.map(({ name, src }) => (
            <div key={name} className="rounded border border-slate-800 bg-slate-950">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
                <span className="font-medium">{name}</span>
                <span
                  className={`rounded px-2 py-1 text-xs font-semibold ${
                    iframeStatus[name] === 'loaded'
                      ? 'bg-emerald-900 text-emerald-200'
                      : iframeStatus[name] === 'error'
                        ? 'bg-red-900 text-red-200'
                        : 'bg-slate-800 text-slate-200'
                  }`}
                >
                  {iframeStatus[name] === 'loaded'
                    ? 'Loaded'
                    : iframeStatus[name] === 'error'
                      ? 'Error'
                      : 'Pending'}
                </span>
              </div>
              <iframe
                title={name}
                src={src}
                loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                className="w-full h-64 border-t border-slate-800"
                onLoad={() => setIframeStatus((prev) => ({ ...prev, [name]: 'loaded' }))}
                onError={() => setIframeStatus((prev) => ({ ...prev, [name]: 'error' }))}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Fetch probes</h2>
        <ul className="space-y-2">
          {(fetchStatus.length ? fetchStatus : fetchTargets).map((probe) => (
            <li
              key={probe.name}
              className="flex items-center justify-between rounded border border-slate-800 bg-slate-950 px-4 py-2 text-sm"
            >
              <div>
                <p className="font-medium text-white">{probe.name}</p>
                {'url' in probe ? (
                  <p className="text-slate-400">{probe.url}</p>
                ) : (
                  <p className="text-slate-400">Probe pending…</p>
                )}
              </div>
              <span
                className={`rounded px-2 py-1 text-xs font-semibold ${
                  probe.status === 'ok'
                    ? 'bg-emerald-900 text-emerald-200'
                    : probe.status === 'blocked'
                      ? 'bg-red-900 text-red-200'
                      : 'bg-slate-800 text-slate-200'
                }`}
              >
                {probe.status === 'ok' ? 'OK' : probe.status === 'blocked' ? 'Blocked' : 'Pending'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">Policy events</h2>
        {violations.length === 0 ? (
          <p className="text-slate-300">No CSP violations have been reported so far.</p>
        ) : (
          <ul className="space-y-2">
            {violations.map((violation, index) => (
              <li key={violation + index} className="rounded border border-red-900 bg-red-950 px-4 py-2 text-sm text-red-100">
                {violation}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
