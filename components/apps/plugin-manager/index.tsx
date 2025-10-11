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

  return (
    <div className="p-4 text-white">
      <h1 className="text-xl mb-4">Plugin Catalog</h1>
      <ul>
        {plugins.map((p) => (
          <li
            key={p.id}
            className="flex items-center mb-3 gap-3 rounded border border-white/10 bg-black/40 p-3"
            title={p.description || undefined}
          >
            <div className="flex flex-col flex-grow">
              <span className="font-semibold">{p.id}</span>
              <span className="text-xs text-ubt-grey">
                Sandbox: {p.sandbox === 'worker' ? 'Worker' : 'Iframe'} · Size: {formatBytes(p.size)}
              </span>
            </div>
            <button
              className="bg-ub-orange px-2 py-1 rounded disabled:opacity-50"
              onClick={() => install(p)}
              disabled={installed[p.id] !== undefined}
            >
              {installed[p.id] ? 'Installed' : 'Install'}
            </button>
            {installed[p.id] && (
              <button
                className="bg-ub-green text-black px-2 py-1 rounded ml-2"
                onClick={() => run(p)}
              >
                Run
              </button>
            )}
          </li>
        ))}
      </ul>
      {lastRun && (
        <div className="mt-4 max-w-xl">
          <div className="rounded-lg border border-white/10 bg-black/50 p-4 shadow-lg">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold">Last Run: {lastRun.id}</h2>
              <time className="text-xs text-ubt-grey">
                {formatTimestamp(lastRun.timestamp)}
              </time>
            </div>
            {lastRun.error && (
              <div
                className="mb-3 rounded border border-red-500/60 bg-red-900/60 px-3 py-2 text-sm text-red-100"
                role="alert"
              >
                The last run reported an error. Review the output below for details.
              </div>
            )}
            <pre className="mb-3 max-h-48 overflow-auto rounded bg-black/70 p-3 text-xs">
              {lastRun.output.join('\n')}
            </pre>
            <button
              onClick={exportCsv}
              className="bg-ub-green text-black px-3 py-1 rounded"
            >
              Export CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
