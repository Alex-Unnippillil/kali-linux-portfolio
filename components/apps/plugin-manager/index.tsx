'use client';
import { useEffect, useState } from 'react';

interface PluginInfo {
  id: string;
  file: string;
  name?: string;
  description?: string;
  version?: string;
  devOnly?: boolean;
}

interface CommandContribution {
  id: string;
  title?: string;
  description?: string;
}

interface PanelContribution {
  id: string;
  title?: string;
  description?: string;
  source?: string;
  html?: string;
}

interface SettingContribution {
  id: string;
  type?: string;
  default?: unknown;
  description?: string;
}

interface PluginManifest {
  id: string;
  sandbox: 'worker' | 'iframe';
  code: string;
  name?: string;
  description?: string;
  version?: string;
  assetsBase?: string;
  devOnly?: boolean;
  contributes?: {
    commands?: CommandContribution[];
    panels?: PanelContribution[];
    settings?: SettingContribution[];
  };
  permissions?: Record<string, unknown>;
}

const formatMessage = (data: unknown): string => {
  if (typeof data === 'string') return data;
  if (data === undefined) return 'undefined';
  try {
    return JSON.stringify(data, null, 2);
  } catch (error) {
    return String(data);
  }
};

const formatPermissionValue = (value: unknown): string => {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => formatPermissionValue(item)).join(', ');
  }
  try {
    return JSON.stringify(value);
  } catch (error) {
    return String(value);
  }
};

const renderManifestDetails = (manifest: PluginManifest) => {
  const commands = manifest.contributes?.commands ?? [];
  const settings = manifest.contributes?.settings ?? [];
  const panels = manifest.contributes?.panels ?? [];
  const permissions = manifest.permissions
    ? Object.entries(manifest.permissions)
    : [];

  if (
    commands.length === 0 &&
    settings.length === 0 &&
    panels.length === 0 &&
    permissions.length === 0
  ) {
    return null;
  }

  return (
    <div className="mt-3 space-y-3 text-xs text-white/70">
      {commands.length > 0 && (
        <div>
          <h3 className="font-semibold text-white/80 uppercase text-[11px] tracking-wide">
            Commands
          </h3>
          <ul className="mt-1 space-y-1 list-disc list-inside">
            {commands.map((command) => (
              <li key={command.id}>
                <span className="font-mono text-white/80">{command.id}</span>
                {command.title && <span className="ml-1">— {command.title}</span>}
                {command.description && (
                  <div className="ml-4 text-white/60">{command.description}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {settings.length > 0 && (
        <div>
          <h3 className="font-semibold text-white/80 uppercase text-[11px] tracking-wide">
            Settings
          </h3>
          <ul className="mt-1 space-y-1 list-disc list-inside">
            {settings.map((setting) => (
              <li key={setting.id}>
                <span className="font-mono text-white/80">{setting.id}</span>
                {setting.description && (
                  <div className="ml-4 text-white/60">{setting.description}</div>
                )}
                <div className="ml-4 text-white/50">
                  Default:{' '}
                  {setting.default === undefined
                    ? 'undefined'
                    : typeof setting.default === 'string'
                      ? `"${setting.default}"`
                      : JSON.stringify(setting.default)}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {panels.length > 0 && (
        <div>
          <h3 className="font-semibold text-white/80 uppercase text-[11px] tracking-wide">
            Panels
          </h3>
          <ul className="mt-1 space-y-1 list-disc list-inside">
            {panels.map((panel) => (
              <li key={panel.id}>
                <span className="font-mono text-white/80">{panel.id}</span>
                {panel.title && <span className="ml-1">— {panel.title}</span>}
                {panel.description && (
                  <div className="ml-4 text-white/60">{panel.description}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {permissions.length > 0 && (
        <div>
          <h3 className="font-semibold text-white/80 uppercase text-[11px] tracking-wide">
            Permissions
          </h3>
          <ul className="mt-1 space-y-1 list-disc list-inside">
            {permissions.map(([key, value]) => (
              <li key={key}>
                <span className="font-mono text-white/80">{key}</span>
                <span className="ml-2 text-white/60">
                  {formatPermissionValue(value)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
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
    let cancelled = false;
    fetch('/api/plugins')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setPlugins(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setPlugins([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const install = async (plugin: PluginInfo) => {
    try {
      const res = await fetch(`/api/plugins/${plugin.file}`);
      if (!res.ok) {
        throw new Error(`Failed to load manifest for ${plugin.id}`);
      }
      const manifest: PluginManifest = await res.json();
      const updated = { ...installed, [plugin.id]: manifest };
      setInstalled(updated);
      localStorage.setItem('installedPlugins', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to install plugin', error);
    }
  };

  const run = (plugin: PluginInfo) => {
    const manifest = installed[plugin.id];
    if (!manifest?.code) return;
    const { code, ...manifestMeta } = manifest;
    const manifestJson = JSON.stringify(manifestMeta).replace(/</g, '\\u003c');
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
      const workerSource = `const __EXTENSION_MANIFEST__ = ${manifestJson};\n${code}`;
      const blob = new Blob([workerSource], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const worker = new Worker(url);
      worker.onmessage = (e) => {
        output.push(formatMessage(e.data));
      };
      worker.onerror = (event) => {
        output.push(event.message ? `error: ${event.message}` : 'error');
      };
      setTimeout(() => {
        worker.terminate();
        URL.revokeObjectURL(url);
        finalize();
      }, 120);
    } else {
      const escapedCode = code.replace(/<\/script/gi, '<\\/script');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self';" /><style>body{margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0b0e11;color:#f8fafc;}</style></head><body><script>window.__EXTENSION_MANIFEST__ = ${manifestJson};<\/script><script>${escapedCode}<\/script></body></html>`;
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.sandbox.add('allow-scripts');
      iframe.setAttribute('title', manifest.name ?? plugin.id);
      iframe.setAttribute('aria-hidden', 'true');
      iframe.style.display = 'none';
      const listener = (e: MessageEvent) => {
        if (e.source === iframe.contentWindow) {
          output.push(formatMessage(e.data));
        }
      };
      window.addEventListener('message', listener);
      document.body.appendChild(iframe);
      iframe.src = url;
      setTimeout(() => {
        window.removeEventListener('message', listener);
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
        URL.revokeObjectURL(url);
        finalize();
      }, 220);
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
    <div className="p-4 text-white space-y-4">
      <div>
        <h1 className="text-xl mb-1">Plugin Catalog</h1>
        <p className="text-xs text-white/70 mb-4">
          Install sandboxed plugins from the catalog. Dev Mode surfaces local examples under
          <span className="font-mono ml-1">extensions/examples</span>.
        </p>
        {plugins.length === 0 ? (
          <p className="text-xs text-white/60">
            No plugins discovered. Enable Dev Mode to load the bundled examples.
          </p>
        ) : (
          <ul className="space-y-3">
            {plugins.map((p) => {
              const manifest = installed[p.id];
              return (
                <li
                  key={p.id}
                  className="rounded-md border border-white/10 bg-white/5 backdrop-blur-sm p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-white/90">
                      {p.name ?? p.id}
                    </span>
                    {p.version && (
                      <span className="text-xs text-white/60">v{p.version}</span>
                    )}
                    {p.devOnly && (
                      <span className="uppercase text-[10px] tracking-wide bg-ub-orange/20 text-ub-orange px-2 py-[2px] rounded-full">
                        Dev Mode
                      </span>
                    )}
                  </div>
                  {(p.description || manifest?.description) && (
                    <p className="text-xs text-white/70 mt-1">
                      {p.description ?? manifest?.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      className="bg-ub-orange px-2 py-1 rounded disabled:opacity-50"
                      onClick={() => install(p)}
                      disabled={manifest !== undefined}
                    >
                      {manifest ? 'Installed' : 'Install'}
                    </button>
                    {manifest && (
                      <button
                        className="bg-ub-green text-black px-2 py-1 rounded"
                        onClick={() => run(p)}
                      >
                        Run
                      </button>
                    )}
                  </div>
                  {manifest && renderManifestDetails(manifest)}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {lastRun && (
        <div className="rounded-md border border-white/10 bg-black/60 p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg">Last Run: {lastRun.id}</h2>
            <button
              onClick={exportCsv}
              className="bg-ub-green text-black px-2 py-1 rounded"
            >
              Export CSV
            </button>
          </div>
          <pre className="bg-black/80 p-2 mb-2 overflow-auto text-xs rounded">
            {lastRun.output.join('\n')}
          </pre>
          {installed[lastRun.id] && renderManifestDetails(installed[lastRun.id])}
        </div>
      )}
    </div>
  );
}
