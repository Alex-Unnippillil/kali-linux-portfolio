'use client';
import { useEffect, useMemo, useState } from 'react';

interface PluginInfo {
  id: string;
  file: string;
}

interface PluginManifest {
  id: string;
  sandbox: 'worker' | 'iframe';
  code: string;
}

interface PluginManagerState {
  manifests: Record<string, PluginManifest>;
  order: string[];
  enabled: Record<string, boolean>;
}

const STORAGE_KEY = 'pluginManagerConfig';

const defaultState: PluginManagerState = {
  manifests: {},
  order: [],
  enabled: {},
};

function loadState(): PluginManagerState {
  if (typeof window === 'undefined') {
    return defaultState;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<PluginManagerState>;
      const manifests = parsed.manifests ?? {};
      const order = Array.isArray(parsed.order) ? parsed.order : Object.keys(manifests);
      const enabled = parsed.enabled ?? {};
      return {
        manifests,
        order: order.filter((id) => manifests[id]),
        enabled,
      };
    }
  } catch {
    /* ignore malformed payloads */
  }

  // migrate legacy installedPlugins storage if present
  try {
    const legacy = JSON.parse(localStorage.getItem('installedPlugins') || '{}');
    if (legacy && typeof legacy === 'object') {
      const manifests = legacy as Record<string, PluginManifest>;
      const order = Object.keys(manifests);
      const enabled: Record<string, boolean> = {};
      for (const id of order) {
        enabled[id] = true;
      }
      const migratedState: PluginManagerState = { manifests, order, enabled };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedState));
      localStorage.removeItem('installedPlugins');
      return migratedState;
    }
  } catch {
    /* ignore */
  }

  return defaultState;
}

export default function PluginManager() {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [managerState, setManagerState] = useState<PluginManagerState>(loadState);
  const [draggingId, setDraggingId] = useState<string | null>(null);

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
    if (typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(managerState));
    } catch {
      /* ignore write errors */
    }
  }, [managerState]);

  const install = async (plugin: PluginInfo) => {
    const res = await fetch(`/api/plugins/${plugin.file}`);
    const manifest: PluginManifest = await res.json();
    setManagerState((prev) => {
      const manifests = { ...prev.manifests, [plugin.id]: manifest };
      const order = prev.order.includes(plugin.id)
        ? prev.order
        : [...prev.order, plugin.id];
      const enabled = {
        ...prev.enabled,
        [plugin.id]: prev.enabled[plugin.id] ?? true,
      };
      return { manifests, order, enabled };
    });
  };

  const run = (pluginId: string) => {
    const manifest = managerState.manifests[pluginId];
    if (!manifest) return;
    if (managerState.enabled[pluginId] === false) return;
    const output: string[] = [];
    const finalize = () => {
      const result = { id: pluginId, output };
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

  const togglePlugin = (pluginId: string) => {
    setManagerState((prev) => ({
      manifests: prev.manifests,
      order: prev.order,
      enabled: {
        ...prev.enabled,
        [pluginId]: !(prev.enabled[pluginId] !== false),
      },
    }));
  };

  const installedOrder = useMemo(
    () => managerState.order.filter((id) => managerState.manifests[id]),
    [managerState]
  );

  const isDragging = Boolean(draggingId);

  const handleDrop = (sourceId: string, targetId: string | null) => {
    setManagerState((prev) => {
      if (!sourceId || !prev.manifests[sourceId]) {
        return prev;
      }
      if (targetId === sourceId) {
        return prev;
      }
      const filtered = prev.order.filter((id) => id !== sourceId && prev.manifests[id]);
      const nextOrder = [...filtered];
      if (targetId && sourceId !== targetId) {
        const index = nextOrder.indexOf(targetId);
        if (index >= 0) {
          nextOrder.splice(index, 0, sourceId);
        } else {
          nextOrder.push(sourceId);
        }
      } else {
        nextOrder.push(sourceId);
      }
      if (
        nextOrder.length === prev.order.length &&
        nextOrder.every((id, idx) => id === prev.order[idx])
      ) {
        return prev;
      }
      return {
        manifests: prev.manifests,
        order: nextOrder,
        enabled: prev.enabled,
      };
    });
  };

  return (
    <div className="p-4 text-white">
      <h1 className="text-xl mb-4">Plugin Catalog</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <h2 className="text-lg mb-2">Available Plugins</h2>
          <ul>
            {plugins.map((p) => {
              const installedManifest = managerState.manifests[p.id];
              const enabled = managerState.enabled[p.id] !== false;
              return (
                <li key={p.id} className="flex items-center mb-2" data-plugin-id={p.id}>
                  <span className="flex-grow">{p.id}</span>
                  <button
                    className="bg-ub-orange px-2 py-1 rounded disabled:opacity-50"
                    onClick={() => install(p)}
                    disabled={Boolean(installedManifest)}
                    data-testid={`install-${p.id}`}
                    data-plugin-id={p.id}
                  >
                    {installedManifest ? 'Installed' : 'Install'}
                  </button>
                  {installedManifest && (
                    <button
                      className="bg-ub-green text-black px-2 py-1 rounded ml-2 disabled:opacity-50"
                      onClick={() => run(p.id)}
                      disabled={!enabled}
                      data-testid={`run-${p.id}`}
                    >
                      Run
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
        <section>
          <h2 className="text-lg mb-2">Installed Plugins</h2>
          <p className="text-xs text-gray-300 mb-2">
            Drag items to change their order. Use the toggle to enable or disable plugins for the next launch.
          </p>
          <ul
            className="space-y-2"
            onDragOver={(event) => {
              if (draggingId) {
                event.preventDefault();
              }
            }}
            onDrop={(event) => {
              if (!draggingId) return;
              event.preventDefault();
              handleDrop(draggingId, null);
              setDraggingId(null);
            }}
            data-testid="installed-list"
          >
            {installedOrder.map((pluginId) => {
              const manifest = managerState.manifests[pluginId];
              const enabled = managerState.enabled[pluginId] !== false;
              return (
                <li
                  key={pluginId}
                  className={`flex items-center rounded border border-gray-600 px-2 py-2 bg-black/40 ${
                    isDragging ? 'transition-colors' : ''
                  }`}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/plain', pluginId);
                    event.dataTransfer.effectAllowed = 'move';
                    setDraggingId(pluginId);
                  }}
                  onDragEnd={() => setDraggingId(null)}
                  onDragOver={(event) => {
                    if (draggingId && draggingId !== pluginId) {
                      event.preventDefault();
                    }
                  }}
                  onDrop={(event) => {
                    const sourceId = event.dataTransfer.getData('text/plain') || draggingId;
                    if (!sourceId) return;
                    event.preventDefault();
                    handleDrop(sourceId, pluginId);
                    setDraggingId(null);
                  }}
                  data-plugin-id={pluginId}
                  data-testid={`installed-plugin-${pluginId}`}
                  aria-grabbed={draggingId === pluginId}
                >
                  <span className="cursor-move select-none text-gray-300" aria-hidden="true">
                    ☰
                  </span>
                  <span className="flex-grow ml-2">{pluginId}</span>
                  <label className="flex items-center gap-2 text-xs mr-3" htmlFor={`toggle-${pluginId}`}>
                    <span>{enabled ? 'Enabled' : 'Disabled'}</span>
                    <input
                      id={`toggle-${pluginId}`}
                      type="checkbox"
                      className="h-4 w-4"
                      checked={enabled}
                      onChange={() => togglePlugin(pluginId)}
                      data-testid={`toggle-${pluginId}`}
                      aria-label={`Toggle ${pluginId}`}
                    />
                  </label>
                  <button
                    className="bg-ub-green text-black px-2 py-1 rounded disabled:opacity-50"
                    onClick={() => run(pluginId)}
                    disabled={!manifest || !enabled}
                    data-testid={`installed-run-${pluginId}`}
                  >
                    Run
                  </button>
                </li>
              );
            })}
            {installedOrder.length === 0 && (
              <li className="text-sm text-gray-400">No plugins installed yet.</li>
            )}
          </ul>
        </section>
      </div>
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
