'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  clearInstallJob,
  getInstallJobs,
  loadStoredInstallJobs,
  markInstallFailed,
  restartInstallJob,
  resumeInstallJob,
  startInstallJob,
  subscribeToInstallJobs,
  type InstallJob,
} from '../../../utils/installManager';

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

  const [installJobs, setInstallJobs] = useState<InstallJob[]>(() => getInstallJobs());

  useEffect(() => {
    fetch('/api/plugins')
      .then((res) => res.json())
      .then(setPlugins)
      .catch(() => setPlugins([]));
  }, []);

  useEffect(() => {
    loadStoredInstallJobs();
    const unsub = subscribeToInstallJobs((jobs) => setInstallJobs(jobs));
    return () => {
      unsub();
    };
  }, []);

  const jobsByPlugin = useMemo(() => {
    const map = new Map<string, InstallJob>();
    installJobs.forEach((job) => map.set(job.pluginId, job));
    return map;
  }, [installJobs]);

  const packageListFor = useCallback((pluginId: string): string[] => {
    const base = pluginId.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'plugin';
    const suffixes = ['core', 'ui', 'docs', 'examples', 'tests'];
    return suffixes.map((suffix) => `${base}-${suffix}`);
  }, []);

  const finalizingInstalls = useRef<Set<string>>(new Set());

  const beginInstall = useCallback(
    (plugin: PluginInfo) => {
      if (installed[plugin.id]) return;
      if (jobsByPlugin.has(plugin.id)) return;
      const packages = packageListFor(plugin.id);
      startInstallJob(plugin.id, packages);
    },
    [installed, jobsByPlugin, packageListFor],
  );

  const startOver = useCallback(
    (plugin: PluginInfo) => {
      const existing = jobsByPlugin.get(plugin.id);
      const packages = existing?.packages.length
        ? existing.packages
        : packageListFor(plugin.id);
      restartInstallJob(plugin.id, packages);
    },
    [jobsByPlugin, packageListFor],
  );

  const finalizeInstall = useCallback(
    async (job: InstallJob, plugin: PluginInfo) => {
      try {
        const res = await fetch(`/api/plugins/${plugin.file}`);
        if (!res.ok) throw new Error('Failed to fetch manifest');
        const manifest: PluginManifest = await res.json();
        const updated = { ...installed, [plugin.id]: manifest };
        setInstalled(updated);
        localStorage.setItem('installedPlugins', JSON.stringify(updated));
        clearInstallJob(job.pluginId);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Installation failed';
        markInstallFailed(job.pluginId, message);
      }
    },
    [installed],
  );

  useEffect(() => {
    installJobs.forEach((job) => {
      if (job.phase !== 'completed' || installed[job.pluginId]) return;
      if (finalizingInstalls.current.has(job.pluginId)) return;
      const plugin = plugins.find((p) => p.id === job.pluginId);
      if (!plugin) return;
      finalizingInstalls.current.add(job.pluginId);
      finalizeInstall(job, plugin).finally(() => {
        finalizingInstalls.current.delete(job.pluginId);
      });
    });
  }, [installJobs, installed, plugins, finalizeInstall]);

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
      <ul>
        {plugins.map((p) => (
          <li key={p.id} className="mb-4">
            <div className="flex items-center gap-2">
              <span className="flex-grow">{p.id}</span>
              {installed[p.id] ? (
                <>
                  <button
                    className="bg-ub-orange px-2 py-1 rounded disabled:opacity-50"
                    disabled
                  >
                    Installed
                  </button>
                  <button
                    className="bg-ub-green text-black px-2 py-1 rounded"
                    onClick={() => run(p)}
                  >
                    Run
                  </button>
                </>
              ) : (
                (() => {
                  const job = jobsByPlugin.get(p.id);
                  if (!job) {
                    return (
                      <button
                        className="bg-ub-orange px-2 py-1 rounded"
                        onClick={() => beginInstall(p)}
                      >
                        Install
                      </button>
                    );
                  }

                  const progress = job.packages.length
                    ? Math.min(
                        100,
                        (job.completedPackages.length / job.packages.length) *
                          100,
                      )
                    : 0;
                  const resumeDisabled =
                    job.active || job.phase === 'completed' || job.phase === 'failed';
                  const startOverDisabled = job.phase === 'completed' && !job.error;

                  return (
                    <div className="flex items-center gap-2">
                      <button
                        className="bg-ub-orange px-2 py-1 rounded disabled:opacity-50"
                        onClick={() => resumeInstallJob(p.id)}
                        disabled={resumeDisabled}
                      >
                        {job.phase === 'completed'
                          ? 'Finalizing…'
                          : job.active
                          ? 'Installing…'
                          : job.phase === 'failed'
                          ? 'Failed'
                          : 'Resume'}
                      </button>
                      <button
                        className="bg-ub-cool-grey px-2 py-1 rounded disabled:opacity-50"
                        onClick={() => startOver(p)}
                        disabled={startOverDisabled}
                      >
                        Start Over
                      </button>
                      <div className="flex-1" aria-hidden>
                        <div className="h-2 bg-gray-700 rounded w-40">
                          <div
                            className={`h-2 rounded ${
                              job.phase === 'failed' ? 'bg-ub-red' : 'bg-ub-orange'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
            {(() => {
              const job = jobsByPlugin.get(p.id);
              if (!job) return null;
              const total = job.packages.length;
              const completed = job.completedPackages.length;
              return (
                <div className="mt-2 text-xs text-gray-300">
                  <div className="flex justify-between mb-1">
                    <span className="capitalize">
                      {job.phase}
                      {!job.active &&
                        job.phase !== 'completed' &&
                        job.phase !== 'failed' && ' (paused)'}
                    </span>
                    <span>
                      {completed}/{total}
                    </span>
                  </div>
                  {completed > 0 && job.phase !== 'failed' && (
                    <div className="text-[10px] text-gray-400 truncate">
                      Last package: {job.completedPackages[completed - 1]}
                    </div>
                  )}
                  {job.error && (
                    <div className="text-[10px] text-ub-red mt-1">
                      {job.error}
                    </div>
                  )}
                </div>
              );
            })()}
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
