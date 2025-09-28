'use client';
import { useEffect, useState } from 'react';

import {
  staticPluginCatalog,
  staticPluginManifests,
  type PluginDescriptor,
  type PluginManifest,
} from '../../../data/pluginCatalog';

const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true';

type PluginInfo = PluginDescriptor;

export default function PluginManager() {
  const [plugins, setPlugins] = useState<PluginInfo[]>(() =>
    isStaticExport ? [...staticPluginCatalog] : []
  );
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
    if (isStaticExport) {
      setPlugins([...staticPluginCatalog]);
      return;
    }
    fetch('/api/plugins')
      .then((res) => res.json())
      .then(setPlugins)
      .catch(() => setPlugins([]));
  }, []);

  const install = async (plugin: PluginInfo) => {
    try {
      let manifest: PluginManifest | undefined;
      if (isStaticExport) {
        manifest = staticPluginManifests[plugin.file];
      } else {
        const res = await fetch(`/api/plugins/${plugin.file}`);
        if (res.ok) {
          manifest = await res.json();
        }
      }
      if (!manifest) {
        return;
      }
      const updated = { ...installed, [plugin.id]: manifest };
      setInstalled(updated);
      localStorage.setItem('installedPlugins', JSON.stringify(updated));
    } catch {
      /* ignore */
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

    if (isStaticExport) {
      try {
        if (manifest.sandbox === 'worker') {
          const stubSelf = {
            postMessage(value: unknown) {
              output.push(String(value));
            },
          } as unknown as Worker;
          // eslint-disable-next-line no-new-func
          const runWorker = new Function('self', manifest.code) as (
            scope: Worker
          ) => void;
          runWorker(stubSelf);
        } else {
          const messages: unknown[] = [];
          const stubWindow = {
            parent: {
              postMessage(value: unknown) {
                messages.push(value);
                output.push(String(value));
              },
            },
          } as unknown as Window;
          // eslint-disable-next-line no-new-func
          const runFrame = new Function('window', manifest.code) as (
            scope: Window
          ) => void;
          runFrame(stubWindow);
          if (messages.length === 0) {
            output.push('Plugin executed with no output.');
          }
        }
        if (output.length === 0) {
          output.push('Plugin executed with no output.');
        }
      } catch {
        output.push('error');
      }
      finalize();
      return;
    }

    let receivedMessage = false;
    const finalizeSoon = () => {
      window.setTimeout(() => {
        finalize();
      }, 0);
    };

    if (manifest.sandbox === 'worker') {
      const blob = new Blob([manifest.code], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const worker = new Worker(url);
      worker.onmessage = (e) => {
        output.push(String(e.data));
        receivedMessage = true;
        finalizeSoon();
      };
      worker.onerror = () => {
        output.push('error');
        receivedMessage = true;
        finalizeSoon();
      };
      // collect messages briefly then terminate
      setTimeout(() => {
        worker.terminate();
        URL.revokeObjectURL(url);
        if (!receivedMessage) {
          finalizeSoon();
        }
      }, 1000);
    } else {
      const html = `<!DOCTYPE html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; connect-src 'none';"></head><body><script>${manifest.code}<\/script></body></html>`;
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.sandbox.add('allow-scripts');
      const listener = (e: MessageEvent) => {
        if (e.source === iframe.contentWindow) {
          output.push(String(e.data));
          receivedMessage = true;
          finalizeSoon();
        }
      };
      window.addEventListener('message', listener);
      iframe.src = url;
      document.body.appendChild(iframe);
      setTimeout(() => {
        window.removeEventListener('message', listener);
        document.body.removeChild(iframe);
        URL.revokeObjectURL(url);
        if (!receivedMessage) {
          finalizeSoon();
        }
      }, 1000);
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
      {isStaticExport && (
        <p className="mb-4 text-sm text-gray-300">
          Static export mode ships with a built-in demo plugin catalog; installing
          a plugin loads the bundled manifest instead of calling server APIs.
        </p>
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
