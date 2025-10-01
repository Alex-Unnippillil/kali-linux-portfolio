'use client';
import { useEffect, useState } from 'react';

import type { ExtensionManifest } from '@/extensions/types';

interface PluginInfo { id: string; file: string; }

export default function PluginManager() {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [installed, setInstalled] = useState<Record<string, ExtensionManifest>>(
    () => {
      if (typeof window !== 'undefined') {
        try {
          return JSON.parse(
            localStorage.getItem('installedPlugins') || '{}'
          ) as Record<string, ExtensionManifest>;
        } catch {
          return {};
        }
      }
      return {};
    }
  );
  const [installWarnings, setInstallWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  interface LastRun {
    id: string;
    output: string[];
  }

  const [lastRun, setLastRun] = useState<LastRun | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('lastPluginRun') || 'null');
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
    setError(null);
    setInstallWarnings([]);
    try {
      const res = await fetch(`/api/plugins/${plugin.file}`);

      if (!res.ok) {
        let message = `Failed to install ${plugin.id}.`;
        try {
          const payload = (await res.json()) as { message?: string } | undefined;
          if (payload?.message) {
            message = payload.message;
          }
        } catch {
          // ignore malformed responses
        }
        setError(message);
        return;
      }

      const manifestWithWarnings = (await res.json()) as ExtensionManifest & {
        warnings?: string[];
      };
      const { warnings = [], ...manifest } = manifestWithWarnings as ExtensionManifest & {
        warnings?: string[];
      };
      const cleanedManifest = manifest as ExtensionManifest;
      const updated = { ...installed, [plugin.id]: cleanedManifest };
      setInstalled(updated);
      try {
        localStorage.setItem('installedPlugins', JSON.stringify(updated));
      } catch {
        /* ignore */
      }
      setInstallWarnings(warnings);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to install ${plugin.id}.`);
    }
  };

  const run = (plugin: PluginInfo) => {
    const manifest = installed[plugin.id];
    if (!manifest) return;
    const output: string[] = [];
    const finalize = () => {
      const result = { id: plugin.id, output };
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
      const listener = (e: MessageEvent) => {
        if (e.source === iframe.contentWindow) {
          output.push(String(e.data));
        }
      };
      window.addEventListener('message', listener);
      iframe.src = url;
      document.body.appendChild(iframe);
      setTimeout(() => {
        window.removeEventListener('message', listener);
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
      {error && (
        <div
          role="alert"
          className="mb-4 rounded border border-red-500 bg-red-900 px-3 py-2 text-sm"
        >
          {error}
        </div>
      )}
      {installWarnings.length > 0 && (
        <div
          role="status"
          className="mb-4 rounded border border-ub-orange bg-gray-900 px-3 py-2 text-sm"
        >
          <p className="font-semibold text-ub-orange">Compatibility warnings</p>
          <ul className="list-disc pl-5 text-ub-orange">
            {installWarnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
      <ul>
        {plugins.map((p) => (
          <li key={p.id} className="flex items-center mb-2">
            <span className="flex-grow">{p.id}</span>
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
        <div className="mt-4">
          <h2 className="text-lg mb-2">Last Run: {lastRun.id}</h2>
          <pre className="bg-black p-2 mb-2 overflow-auto text-xs">
            {lastRun.output.join('\n')}
          </pre>
          <button
            onClick={exportCsv}
            className="bg-ub-green text-black px-2 py-1 rounded"
          >
            Export CSV
          </button>
        </div>
      )}
    </div>
  );
}
