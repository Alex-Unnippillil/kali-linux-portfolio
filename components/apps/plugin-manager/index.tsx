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
    try {
      localStorage.setItem('installedPlugins', JSON.stringify(updated));
    } catch {
      /* ignore */
    }
  };

  const uninstall = (pluginId: string) => {
    const shouldUninstall = window.confirm(
      `Uninstall ${pluginId}? This removes it from your installed list.`
    );
    if (!shouldUninstall) return;

    const updated = { ...installed };
    delete updated[pluginId];
    setInstalled(updated);

    try {
      localStorage.setItem('installedPlugins', JSON.stringify(updated));
    } catch {
      /* ignore */
    }

    if (lastRun?.id === pluginId) {
      setLastRun(null);
      try {
        localStorage.removeItem('lastPluginRun');
      } catch {
        /* ignore */
      }
    }
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
    <div className="p-4 text-[color:var(--color-text)]">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-semibold">Plugin Catalog</h1>
          <p className="text-sm text-[color:color-mix(in_srgb,var(--color-text)_70%,transparent)]">
            Discover sandboxed utilities and keep installed plugins up to date.
          </p>
        </div>
        <div className="flex flex-wrap gap-4" role="group" aria-label="Plugin filters">
          <label className="flex flex-col text-xs uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-text)_65%,transparent)]">
            Show
            <select
              className="mt-1 min-w-[10rem] rounded border border-[color:var(--kali-border)] bg-[var(--kali-panel)] px-3 py-2 text-sm text-[color:var(--color-text)] shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-accent)]"
              value={filter}
              onChange={(event) => setFilter(event.target.value as FilterOption)}
            >
              <option value="all">All plugins</option>
              <option value="installed">Installed only</option>
              <option value="available">Available to install</option>
            </select>
          </label>
          <label className="flex flex-col text-xs uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-text)_65%,transparent)]">
            Sort by
            <select
              className="mt-1 min-w-[10rem] rounded border border-[color:var(--kali-border)] bg-[var(--kali-panel)] px-3 py-2 text-sm text-[color:var(--color-text)] shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-accent)]"
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
            <li key={p.id} className="list-none" title={p.description || undefined}>
              <article
                className="flex flex-col gap-4 rounded-xl border border-[color:var(--kali-border)] bg-[var(--kali-panel)] p-5 shadow-kali-panel transition hover:border-[color:var(--color-accent)] focus-within:border-[color:var(--color-accent)]"
              >
                <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold leading-tight">{p.id}</h2>
                    {p.description && (
                      <p className="mt-1 text-sm text-[color:color-mix(in_srgb,var(--color-text)_72%,transparent)]">{p.description}</p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 self-start rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                      isInstalled
                        ? 'border-[color:color-mix(in_srgb,var(--color-accent)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--color-accent)_18%,transparent)] text-[color:var(--color-accent)]'
                        : 'border-[color:var(--kali-border)] bg-[var(--kali-panel-highlight)] text-[color:color-mix(in_srgb,var(--color-text)_75%,transparent)]'
                    }`}
                    aria-label={isInstalled ? 'Plugin installed' : 'Plugin not installed'}
                  >
                    {isInstalled ? 'Installed' : 'Not installed'}
                  </span>
                </header>
                <dl className="grid grid-cols-1 gap-2 text-sm text-[color:color-mix(in_srgb,var(--color-text)_70%,transparent)] sm:grid-cols-2">
                  <div className="flex flex-col">
                    <dt className="text-xs uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-text)_55%,transparent)]">Sandbox</dt>
                    <dd className="text-[color:var(--color-text)]">
                      {p.sandbox === 'worker' ? 'Worker' : 'Iframe'}
                      <span className="sr-only">
                        {`Sandbox: ${p.sandbox === 'worker' ? 'Worker' : 'Iframe'}`}
                      </span>
                    </dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-xs uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-text)_55%,transparent)]">Package size</dt>
                    <dd className="text-[color:var(--color-text)]">{formatBytes(p.size)}</dd>
                  </div>
                </dl>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className={`rounded-full px-4 py-2 text-sm font-semibold text-kali-inverse transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-accent)] ${
                      isInstalled
                        ? 'bg-kali-accent hover:bg-[color:color-mix(in_srgb,var(--color-accent)_85%,#000000)]'
                        : 'bg-kali-accent hover:bg-[color:color-mix(in_srgb,var(--color-accent)_85%,#000000)]'
                    }`}
                    onClick={() => install(p)}
                    disabled={isInstalled}
                  >
                    {isInstalled ? 'Installed' : 'Install'}
                  </button>
                  <button
                    className="rounded-full border border-[color:var(--kali-border)] px-4 py-2 text-sm font-semibold text-[color:var(--color-text)] transition hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-accent)] disabled:cursor-not-allowed disabled:border-[color:color-mix(in_srgb,var(--kali-border)_70%,transparent)] disabled:text-[color:color-mix(in_srgb,var(--color-text)_45%,transparent)]"
                    onClick={() => run(p)}
                    disabled={!isInstalled}
                    aria-disabled={!isInstalled}
                    aria-label={isInstalled ? `Run ${p.id}` : `Run ${p.id} (install required)`}
                  >
                    Run
                  </button>
                  {isInstalled && (
                    <button
                      className="rounded-full border border-[color:color-mix(in_srgb,var(--color-error)_55%,transparent)] px-4 py-2 text-sm font-semibold text-[color:var(--color-error)] transition hover:border-[color:var(--color-error)] hover:bg-[color:color-mix(in_srgb,var(--color-error)_12%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-error)]"
                      onClick={() => uninstall(p.id)}
                      aria-label={`Uninstall ${p.id}`}
                    >
                      Uninstall
                    </button>
                  )}
                </div>
              </article>
            </li>
          );
        })}
        {filteredPlugins.length === 0 && (
          <li className="list-none rounded-xl border border-[color:var(--kali-border)] bg-[var(--kali-panel)] p-6 text-center text-sm text-[color:color-mix(in_srgb,var(--color-text)_60%,transparent)]">
            No plugins match the current filters.
          </li>
        )}
      </ul>
      {lastRun && (
        <div className="mt-4 max-w-xl">
          <div className="rounded-lg border border-[color:var(--kali-border)] bg-[var(--kali-panel)] p-4 shadow-kali-panel">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold">Last Run: {lastRun.id}</h2>
              <time className="text-xs text-[color:color-mix(in_srgb,var(--color-text)_65%,transparent)]">
                {formatTimestamp(lastRun.timestamp)}
              </time>
            </div>
            {lastRun.error && (
              <div
                className="mb-3 rounded border border-[color:color-mix(in_srgb,var(--color-error)_65%,transparent)] bg-[color:color-mix(in_srgb,var(--color-error)_18%,var(--kali-panel))] px-3 py-2 text-sm text-[color:var(--color-error)]"
                role="alert"
              >
                The last run reported an error. Review the output below for details.
              </div>
            )}
            <pre className="mb-3 max-h-48 overflow-auto rounded bg-[color:var(--color-dark)] p-3 text-xs">
              {lastRun.output.join('\n')}
            </pre>
            <button
              onClick={exportCsv}
              className="rounded bg-kali-accent px-3 py-1 text-sm font-semibold text-kali-inverse transition hover:bg-[color:color-mix(in_srgb,var(--color-accent)_85%,#000000)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-accent)]"
            >
              Export CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
