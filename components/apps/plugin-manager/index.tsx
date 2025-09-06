'use client';
import { isBrowser } from '@/utils/env';
import { useEffect, useState } from 'react';

interface PluginInfo { id: string; file: string; }

interface PluginManifest {
  id: string;
  sandbox: 'worker' | 'iframe';
  code: string;
}

export default function PluginManager() {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [installed, setInstalled] = useState<Record<string, PluginManifest>>(
    () => {
      if (isBrowser()) {
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
    if (isBrowser()) {
      try {
        return JSON.parse(localStorage.getItem('lastPluginRun') || 'null');
      } catch {
        return null;
      }
    }
    return null;
  });
  const [message, setMessage] = useState('');

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

  const exportConfig = (id: string) => {
    const manifest = installed[id];
    if (!manifest) return;
    try {
      const blob = new Blob([JSON.stringify(manifest, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${id}-config.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage(`Exported configuration for ${id}.`);
    } catch {
      setMessage(`Failed to export configuration for ${id}.`);
    }
  };

  const importConfig = async (id: string, file: File | undefined) => {
    if (!file) return;
    try {
      const text = await (file.text
        ? file.text()
        : new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
          }));
      const data = JSON.parse(text);
      const updated = {
        ...installed,
        [id]: { ...installed[id], ...data },
      };
      setInstalled(updated);
      localStorage.setItem('installedPlugins', JSON.stringify(updated));
      setMessage(`Import successful for ${id}.`);
    } catch {
      setMessage(`Import failed for ${id}.`);
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
              <>
                <button
                  className="bg-ub-green text-black px-2 py-1 rounded ml-2"
                  onClick={() => run(p)}
                >
                  Run
                </button>
                <button
                  className="bg-ub-blue text-black px-2 py-1 rounded ml-2"
                  onClick={() => exportConfig(p.id)}
                >
                  Export Config
                </button>
                <input
                  type="file"
                  id={`import-${p.id}`}
                  data-testid={`import-${p.id}`}
                  className="hidden"
                  accept="application/json"
                  onChange={(e) =>
                    importConfig(p.id, e.target.files?.[0])
                  }
                />
                <button
                  className="bg-ub-purple text-black px-2 py-1 rounded ml-2"
                  onClick={() =>
                    document
                      .getElementById(`import-${p.id}`)
                      ?.click()
                  }
                >
                  Import Config
                </button>
              </>
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
      {message && (
        <div className="mt-4 text-ubt-grey text-sm">{message}</div>
      )}
    </div>
  );
}
