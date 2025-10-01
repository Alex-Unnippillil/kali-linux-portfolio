'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ExtensionSandboxBridge,
  type SandboxConsoleEntry,
} from '@/modules/extensions/bridge';

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

  const bridgeRef = useRef<ExtensionSandboxBridge | null>(null);

  useEffect(() => {
    return () => {
      bridgeRef.current?.dispose();
      bridgeRef.current = null;
    };
  }, []);

  const ensureBridge = () => {
    if (typeof window === 'undefined') {
      throw new Error('Sandbox bridge is only available in the browser.');
    }
    if (!bridgeRef.current) {
      bridgeRef.current = new ExtensionSandboxBridge();
    }
    return bridgeRef.current;
  };

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

  const run = async (plugin: PluginInfo) => {
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

    const formatConsoleEntry = (entry: SandboxConsoleEntry) => {
      const parts = entry.args.map((value) => {
        if (typeof value === 'string') return value;
        try {
          return JSON.stringify(value);
        } catch {
          return String(value);
        }
      });
      return `[${entry.level}] ${parts.join(' ')}`.trim();
    };

    try {
      if (manifest.sandbox === 'worker') {
        const runWorker = () =>
          new Promise<string[]>((resolve) => {
            const blob = new Blob([manifest.code], { type: 'text/javascript' });
            const url = URL.createObjectURL(blob);
            const worker = new Worker(url);
            const messages: string[] = [];
            const close = () => {
              window.clearTimeout(timer);
              worker.terminate();
              URL.revokeObjectURL(url);
              resolve(messages);
            };
            let timer = window.setTimeout(close, 25);
            worker.onmessage = (e) => {
              messages.push(String(e.data));
              window.clearTimeout(timer);
              timer = window.setTimeout(close, 25);
            };
            worker.onerror = (e) => {
              messages.push(`error: ${e.message}`);
              window.clearTimeout(timer);
              timer = window.setTimeout(close, 0);
            };
            worker.addEventListener('error', () => {
              window.clearTimeout(timer);
              close();
            });
          });

        const results = await runWorker();
        output.push(...results);
      } else {
        const bridge = ensureBridge();
        const invocation = bridge.execute(manifest.code, { timeoutMs: 500 });
        const result = await invocation.result;
        if (result.logs.length > 0) {
          output.push(...result.logs);
        }
        if (result.console.length > 0) {
          output.push(...result.console.map(formatConsoleEntry));
        }
        if (result.status === 'resolved' && result.value !== undefined && result.value !== null) {
          try {
            output.push(`return: ${JSON.stringify(result.value)}`);
          } catch {
            output.push(`return: ${String(result.value)}`);
          }
        }
        if (result.status === 'timeout') {
          output.push('timeout');
        }
        if (result.status === 'cancelled') {
          output.push('cancelled');
        }
        if (result.status === 'rejected' && result.error) {
          output.push(`error: ${result.error.message}`);
        }
      }
    } catch (error) {
      output.push('error');
    } finally {
      finalize();
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
