'use client';
import { useEffect, useState } from 'react';

interface PluginInfo {
  id: string;
  file: string;
  sandbox: 'worker' | 'iframe';
  size: number;
  description?: string;
}

interface PluginManifest {
  id: string;
  sandbox: 'worker' | 'iframe';
  code: string;
}

interface LastRun {
  id: string;
  output: string[];
  timestamp: string;
  error: boolean;
}

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / 1024 ** exponent;
  return `${value < 10 && exponent > 0 ? value.toFixed(1) : Math.round(value)} ${units[exponent]}`;
};

const formatTimestamp = (timestamp: string) => {
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return timestamp;
  }
};

type FilterOption = 'all' | 'installed' | 'available';
type SortOption = 'alpha' | 'size';

export default function PluginManager() {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [installed, setInstalled] = useState<Record<string, PluginManifest>>(
    () => {
      if (typeof window !== 'undefined') {
        try {
          return JSON.parse(localStorage.getItem('installedPlugins') || '{}');
        } catch {
          return {};
        }
      }
      return {};
    }
  );

  const [lastRun, setLastRun] = useState<LastRun | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = JSON.parse(localStorage.getItem('lastPluginRun') || 'null');
        if (!raw) return null;
        const normalized: LastRun = {
          id: raw.id,
          output: Array.isArray(raw.output) ? raw.output : [],
          timestamp:
            typeof raw.timestamp === 'string'
              ? raw.timestamp
              : new Date().toISOString(),
          error: Boolean(raw.error),
        };
        if (typeof raw.timestamp !== 'string') {
          try {
            localStorage.setItem('lastPluginRun', JSON.stringify(normalized));
          } catch {
            /* ignore */
          }
        }
        return normalized;
      } catch {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    fetch('/api/plugins')
      .then((res) => res.json())
      .then(setPlugins)
      .catch(() => setPlugins([]));
  }, []);

  const install = async (plugin: PluginInfo) => {
    const res = await fetch(`/api/plugins/${plugin.file}`);
    const manifest: PluginManifest = await res.json();
    const updated = { ...installed, [plugin.id]: manifest };
    setInstalled(updated);
    localStorage.setItem('installedPlugins', JSON.stringify(updated));
  };

  const run = (plugin: PluginInfo) => {
    const manifest = installed[plugin.id];
    if (!manifest) return;
    const output: string[] = [];
    let hadError = false;
    const finalize = () => {
      const result: LastRun = {
        id: plugin.id,
        output,
        timestamp: new Date().toISOString(),
        error: hadError,
      };
      setLastRun(result);
      try {
        localStorage.setItem('lastPluginRun', JSON.stringify(result));
      } catch {
        /* ignore */
      }
    };

    if (manifest.sandbox === 'worker') {
      const blob = new Blob([manifest.code], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const worker = new Worker(url);
      worker.onmessage = (e) => {
        output.push(String(e.data));
      };
      worker.onerror = () => {
        output.push('error');
        hadError = true;
      };
      // collect messages briefly then terminate
      setTimeout(() => {
        worker.terminate();
        URL.revokeObjectURL(url);
        finalize();
      }, 10);
    } else {
      const html = `<!DOCTYPE html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; connect-src 'none';"></head><body><script>${manifest.code}<\/script></body></html>`;
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.sandbox.add('allow-scripts');
      const handleError = () => {
        output.push('error');
        hadError = true;
      };
      const listener = (e: MessageEvent) => {
        if (e.source === iframe.contentWindow) {
          output.push(String(e.data));
        }
      };
      window.addEventListener('message', listener);
      iframe.addEventListener('error', handleError);
      iframe.src = url;
      document.body.appendChild(iframe);
      setTimeout(() => {
        window.removeEventListener('message', listener);
        iframe.removeEventListener('error', handleError);
        document.body.removeChild(iframe);
        URL.revokeObjectURL(url);
        finalize();
      }, 10);
    }
  };

  const exportCsv = () => {
    if (!lastRun) return;
    const csv = ['result', ...lastRun.output.map((line) => JSON.stringify(line))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${lastRun.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [filter, setFilter] = useState<FilterOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('alpha');

  const filteredPlugins = plugins
    .filter((plugin) => {
      const isInstalled = installed[plugin.id] !== undefined;
      if (filter === 'installed') return isInstalled;
      if (filter === 'available') return !isInstalled;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'size') {
        return a.size - b.size;
      }
      return a.id.localeCompare(b.id);
    });

  return (
    <div className="p-4 text-kali-text">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-semibold">Plugin Catalog</h1>
          <p className="text-sm text-white/70">
            Discover sandboxed utilities and keep installed plugins up to date.
          </p>
        </div>
        <div className="flex flex-wrap gap-4" role="group" aria-label="Plugin filters">
          <label className="flex flex-col text-xs uppercase tracking-wide text-white/60">
            Show
            <select
              className="mt-1 min-w-[10rem] rounded border border-kali-border/60 bg-kali-surface/80 px-3 py-2 text-sm text-kali-text shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
              value={filter}
              onChange={(event) => setFilter(event.target.value as FilterOption)}
            >
              <option value="all">All plugins</option>
              <option value="installed">Installed only</option>
              <option value="available">Available to install</option>
            </select>
          </label>
          <label className="flex flex-col text-xs uppercase tracking-wide text-white/60">
            Sort by
            <select
              className="mt-1 min-w-[10rem] rounded border border-kali-border/60 bg-kali-surface/80 px-3 py-2 text-sm text-kali-text shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
            >
              <option value="alpha">Name (A–Z)</option>
              <option value="size">Package size</option>
            </select>
          </label>
        </div>
      </div>
      <ul className="grid gap-4" aria-live="polite">
        {filteredPlugins.map((p) => {
          const isInstalled = installed[p.id] !== undefined;
          return (
            <li key={p.id} className="list-none">
              <article
                className="flex flex-col gap-4 rounded-xl border border-kali-border/50 bg-kali-surface/80 p-5 shadow-md transition hover:border-kali-primary/60 focus-within:border-kali-primary/60"
                title={p.description || undefined}
              >
                <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold leading-tight">{p.id}</h2>
                    {p.description && (
                      <p className="mt-1 text-sm text-white/70">{p.description}</p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 self-start rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                      isInstalled
                        ? 'border-[color:color-mix(in_srgb,var(--color-success)_40%,transparent)] bg-[color:color-mix(in_srgb,var(--color-success)_12%,transparent)] text-[color:var(--color-success)]'
                        : 'border-kali-border/60 bg-kali-surface/60 text-white/70'
                    }`}
                    aria-label={isInstalled ? 'Plugin installed' : 'Plugin not installed'}
                  >
                    {isInstalled ? 'Installed' : 'Not installed'}
                  </span>
                </header>
                <dl className="grid grid-cols-1 gap-2 text-sm text-white/70 sm:grid-cols-2">
                  <div className="flex flex-col">
                    <dt className="text-xs uppercase tracking-wide text-white/60">Sandbox</dt>
                    <dd className="text-kali-text">{p.sandbox === 'worker' ? 'Worker' : 'Iframe'}</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-xs uppercase tracking-wide text-white/60">Package size</dt>
                    <dd className="text-kali-text">{formatBytes(p.size)}</dd>
                  </div>
                </dl>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className={`rounded-full px-4 py-2 text-sm font-semibold text-kali-inverse transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus ${
                      isInstalled
                        ? 'bg-[color:var(--color-success)] hover:bg-[color:color-mix(in_srgb,var(--color-success)_85%,transparent)]'
                        : 'bg-kali-control hover:bg-kali-control/90'
                    }`}
                    onClick={() => install(p)}
                  >
                    {isInstalled ? 'Update plugin' : 'Install plugin'}
                  </button>
                  <button
                    className="rounded-full border border-kali-border/60 px-4 py-2 text-sm font-semibold text-kali-text transition hover:border-kali-primary/60 hover:text-kali-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus disabled:cursor-not-allowed disabled:border-kali-border/40 disabled:text-white/40"
                    onClick={() => run(p)}
                    disabled={!isInstalled}
                    aria-disabled={!isInstalled}
                    aria-label={isInstalled ? `Run ${p.id}` : `Run ${p.id} (install required)`}
                  >
                    Run sandbox
                  </button>
                </div>
              </article>
            </li>
          );
        })}
        {filteredPlugins.length === 0 && (
          <li className="list-none rounded-xl border border-kali-border/50 bg-kali-surface/80 p-6 text-center text-sm text-white/70">
            No plugins match the current filters.
          </li>
        )}
      </ul>
      {lastRun && (
        <div className="mt-4 max-w-xl">
          <div className="rounded-lg border border-kali-border/50 bg-kali-surface/85 p-4 shadow-lg">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold">Last Run: {lastRun.id}</h2>
              <time className="text-xs text-white/60">
                {formatTimestamp(lastRun.timestamp)}
              </time>
            </div>
            {lastRun.error && (
              <div
                className="mb-3 rounded border border-[color:color-mix(in_srgb,var(--color-error)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--color-error)_12%,transparent)] px-3 py-2 text-sm text-[color:color-mix(in_srgb,var(--color-error)_85%,white)]"
                role="alert"
              >
                The last run reported an error. Review the output below for details.
              </div>
            )}
            <pre className="mb-3 max-h-48 overflow-auto rounded bg-kali-surface-muted p-3 text-xs text-kali-text/90">
              {lastRun.output.join('\n')}
            </pre>
            <button
              onClick={exportCsv}
              className="rounded bg-kali-control px-3 py-1 text-sm font-semibold text-kali-inverse transition hover:bg-kali-control/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
            >
              Export CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
