'use client';
import { useEffect, useState } from 'react';

interface PluginInfo {
  id: string;
  file: string;
  channel: 'stable' | 'beta';
  changelog: string;
}

interface PluginManifest {
  id: string;
  sandbox: 'worker' | 'iframe';
  code: string;
}

export default function PluginManager() {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [channel, setChannel] = useState<'stable' | 'beta'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('pluginChannel') as 'stable' | 'beta') || 'stable';
    }
    return 'stable';
  });
  const [changelog, setChangelog] = useState<string | null>(null);
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
    fetch('/api/plugins')
      .then((res) => res.json())
      .then(setPlugins)
      .catch(() => setPlugins([]));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('pluginChannel', channel);
    } catch {
      /* ignore */
    }
  }, [channel]);

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
      <div className="mb-4">
        <label className="mr-2" htmlFor="channel-select">
          Channel:
        </label>
        <select
          id="channel-select"
          value={channel}
          onChange={(e) => setChannel(e.target.value as 'stable' | 'beta')}
          className="bg-black text-white border border-gray-600 p-1"
        >
          <option value="stable">stable</option>
          <option value="beta">beta</option>
        </select>
      </div>
      <ul>
        {plugins
          .filter((p) => p.channel === channel)
          .map((p) => (
            <li key={`${p.id}-${p.channel}`} className="flex items-center mb-2">
              <span className="flex-grow">{p.id}</span>
              <button
                className="bg-ub-orange px-2 py-1 rounded disabled:opacity-50"
                onClick={() => install(p)}
                disabled={installed[p.id] !== undefined}
              >
                {installed[p.id] ? 'Installed' : 'Install'}
              </button>
              <button
                className="bg-ub-blue text-white px-2 py-1 rounded ml-2"
                onClick={() => setChangelog(p.changelog)}
              >
                Changelog
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
      {changelog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-black p-4 rounded max-w-md w-full">
            <h2 className="text-lg mb-2">Changelog</h2>
            {/^(https?:\/\/)/.test(changelog) ? (
              <a
                href={changelog}
                target="_blank"
                rel="noopener noreferrer"
                className="underline break-words"
              >
                {changelog}
              </a>
            ) : (
              <pre className="whitespace-pre-wrap break-words">{changelog}</pre>
            )}
            <button
              onClick={() => setChangelog(null)}
              className="mt-2 bg-ub-orange px-2 py-1 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
