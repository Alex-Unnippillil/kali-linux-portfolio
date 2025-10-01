'use client';
import { useEffect, useMemo, useState } from 'react';
import PermissionPrompt, {
  PermissionKey,
  PermissionSnapshot,
  PermissionStatus,
  loadRememberedPermissions,
} from '../../extensions/PermissionPrompt';

interface PluginInfo {
  id: string;
  file: string;
}

interface PluginManifest {
  id: string;
  sandbox: 'worker' | 'iframe';
  code: string;
}

interface LastRun {
  id: string;
  output: string[];
}

const INSTALLED_KEY = 'installedPlugins';
const LAST_RUN_KEY = 'lastPluginRun';

const SUMMARY_ITEMS: { key: PermissionKey; label: string }[] = [
  { key: 'filesystem', label: 'File system' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'storage', label: 'Persistent storage' },
];

const STATUS_LABEL: Record<PermissionStatus, string> = {
  granted: 'Allowed',
  denied: 'Blocked',
  prompt: 'Pending',
  unsupported: 'Unsupported',
};

const STATUS_CLASS: Record<PermissionStatus, string> = {
  granted: 'text-ub-green',
  denied: 'text-ub-orange',
  prompt: 'text-ub-yellow',
  unsupported: 'text-gray-400',
};

const buildInitialPermissions = (): PermissionSnapshot => {
  const remembered = loadRememberedPermissions();
  return {
    filesystem: remembered.filesystem ?? 'prompt',
    notifications: remembered.notifications ?? 'prompt',
    storage: remembered.storage ?? 'prompt',
  };
};

export default function PluginManager() {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const initialPermissions = useMemo(buildInitialPermissions, []);
  const [permissions, setPermissions] = useState<PermissionSnapshot>(initialPermissions);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState<boolean>(() =>
    Object.values(initialPermissions).some((status) => status === 'prompt'),
  );
  const [installed, setInstalled] = useState<Record<string, PluginManifest>>({});
  const [lastRun, setLastRun] = useState<LastRun | null>(null);

  const canPersist = permissions.storage === 'granted';
  const canExport = permissions.filesystem === 'granted';
  const notificationsAllowed = permissions.notifications === 'granted';
  const pendingDecision = permissions.filesystem === 'prompt' ||
    permissions.notifications === 'prompt' ||
    permissions.storage === 'prompt';

  const permissionMessages = useMemo(() => {
    const messages: string[] = [];
    if (permissions.storage === 'denied') {
      messages.push('Installations and run history will reset after this session because persistent storage was denied.');
    } else if (permissions.storage === 'unsupported') {
      messages.push('Persistent storage is not supported in this browser; installations are temporary.');
    }
    if (permissions.filesystem === 'denied') {
      messages.push('File exports are disabled until file system access is allowed.');
    } else if (permissions.filesystem === 'unsupported') {
      messages.push('File exports are unavailable because the File System Access API is not supported.');
    }
    if (permissions.notifications === 'denied') {
      messages.push('Desktop notifications are disabled, so completion alerts remain inside the window.');
    } else if (permissions.notifications === 'unsupported') {
      messages.push('Desktop notifications are not supported in this environment.');
    }
    if (pendingDecision) {
      messages.push('Some permissions are still pending. Review them to unlock the full extension experience.');
    }
    return messages;
  }, [permissions, pendingDecision]);

  useEffect(() => {
    fetch('/api/plugins')
      .then((res) => res.json())
      .then(setPlugins)
      .catch(() => setPlugins([]));
  }, []);

  useEffect(() => {
    if (permissions.storage === 'granted') {
      if (typeof window === 'undefined') {
        return;
      }
      try {
        const storedInstalled = JSON.parse(window.localStorage.getItem(INSTALLED_KEY) || '{}');
        setInstalled(storedInstalled);
      } catch {
        setInstalled({});
      }
      try {
        const storedLastRun = JSON.parse(window.localStorage.getItem(LAST_RUN_KEY) || 'null');
        setLastRun(storedLastRun);
      } catch {
        setLastRun(null);
      }
    } else if ((permissions.storage === 'denied' || permissions.storage === 'unsupported') && typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(INSTALLED_KEY);
        window.localStorage.removeItem(LAST_RUN_KEY);
      } catch {
        /* ignore */
      }
    }
  }, [permissions.storage]);

  const handlePermissionsResolved = (next: PermissionSnapshot) => {
    setPermissions(next);
    setShowPermissionPrompt(false);
  };

  const install = async (plugin: PluginInfo) => {
    try {
      const res = await fetch(`/api/plugins/${plugin.file}`);
      if (!res.ok) {
        return;
      }
      const manifest: PluginManifest = await res.json();
      setInstalled((prev) => {
        const updated = { ...prev, [plugin.id]: manifest };
        if (canPersist && typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(INSTALLED_KEY, JSON.stringify(updated));
          } catch {
            /* ignore */
          }
        }
        return updated;
      });
    } catch {
      /* ignore network errors */
    }
  };

  const run = (plugin: PluginInfo) => {
    const manifest = installed[plugin.id];
    if (!manifest) return;
    const output: string[] = [];
    const finalize = () => {
      const result = { id: plugin.id, output };
      setLastRun(result);
      if (canPersist && typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(LAST_RUN_KEY, JSON.stringify(result));
        } catch {
          /* ignore */
        }
      }
      if (notificationsAllowed && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const recent = output.slice(-3).join('\n') || 'Execution completed.';
          new Notification(`Plugin ${plugin.id} finished`, { body: recent });
        } catch {
          /* ignore */
        }
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
      setTimeout(() => {
        worker.terminate();
        URL.revokeObjectURL(url);
        finalize();
      }, 10);
    } else {
      const html = `<!DOCTYPE html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; connect-src 'none';"></head><body><script>${manifest.code}<\\/script></body></html>`;
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
    if (!lastRun || !canExport) return;
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
      <PermissionPrompt
        isOpen={showPermissionPrompt}
        onClose={() => setShowPermissionPrompt(false)}
        onResolved={handlePermissionsResolved}
        initialState={permissions}
      />
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-semibold">Plugin Catalog</h1>
          <button
            type="button"
            onClick={() => setShowPermissionPrompt(true)}
            className="self-start rounded border border-gray-600 px-3 py-1 text-sm transition hover:border-ub-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-blue"
          >
            Review permissions
          </button>
        </header>
        <section className="rounded border border-gray-700 bg-gray-900 p-4" aria-labelledby="plugin-permission-summary">
          <h2 id="plugin-permission-summary" className="text-lg font-semibold">
            Extension environment status
          </h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-3">
            {SUMMARY_ITEMS.map(({ key, label }) => (
              <div key={key} className="flex flex-col rounded bg-gray-800 p-3">
                <dt className="text-xs uppercase tracking-wide text-gray-400">{label}</dt>
                <dd className={`text-sm font-semibold ${STATUS_CLASS[permissions[key]]}`}>
                  {STATUS_LABEL[permissions[key]]}
                </dd>
              </div>
            ))}
          </dl>
          {permissionMessages.length > 0 && (
            <ul className="mt-3 space-y-2 text-xs text-gray-300">
              {permissionMessages.map((message, index) => (
                <li key={index}>{message}</li>
              ))}
            </ul>
          )}
        </section>
        <section aria-label="Available plugins">
          <ul className="space-y-2">
            {plugins.map((p) => (
              <li key={p.id} className="flex items-center gap-2 rounded border border-gray-700 bg-gray-900 px-3 py-2">
                <span className="flex-grow truncate">{p.id}</span>
                <button
                  type="button"
                  className="rounded bg-ub-orange px-2 py-1 text-sm font-medium text-black disabled:opacity-50"
                  onClick={() => void install(p)}
                  disabled={installed[p.id] !== undefined}
                >
                  {installed[p.id] ? 'Installed' : canPersist ? 'Install' : 'Install (temporary)'}
                </button>
                {installed[p.id] && (
                  <button
                    type="button"
                    className="rounded bg-ub-green px-2 py-1 text-sm font-semibold text-black"
                    onClick={() => run(p)}
                  >
                    Run
                  </button>
                )}
              </li>
            ))}
            {plugins.length === 0 && (
              <li className="rounded border border-gray-700 bg-gray-900 px-3 py-4 text-sm text-gray-300" role="status">
                No extensions available right now. Check your connection or try again later.
              </li>
            )}
          </ul>
        </section>
        {lastRun && (
          <section aria-live="polite">
            <h2 className="text-lg font-semibold">Last Run: {lastRun.id}</h2>
            <pre className="mt-2 max-h-48 overflow-auto rounded bg-black p-2 text-xs">
              {lastRun.output.join('\n')}
            </pre>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={exportCsv}
                className="w-full rounded bg-ub-green px-3 py-2 text-sm font-semibold text-black disabled:opacity-50 sm:w-auto"
                disabled={!canExport}
              >
                Export CSV
              </button>
              {!canExport && (
                <p className="text-xs text-gray-300">
                  {permissions.filesystem === 'unsupported'
                    ? 'File exports are unavailable because this browser lacks the File System Access API.'
                    : 'Grant file system access to export plugin output to your device.'}
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
