'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  NETWORK_POLICIES,
  NetworkPolicy,
  SandboxCleanupResult,
  SandboxSession,
  cleanupSandbox,
  describeNetworkPolicy,
  markWindowAsSandboxed,
  startSandbox,
  unmarkWindowAsSandboxed,
} from '@/utils/sandboxManager';

const SANDBOX_APP_ID = 'sandbox-runner';

interface HomeEntry {
  value: string;
  persisted: boolean;
}

const DEFAULT_HOMES: HomeEntry[] = [
  { value: 'home/sandbox', persisted: true },
  { value: 'tmp/sandbox-cache', persisted: false },
];

const inputSanitize = (value: string) => {
  const trimmed = value.replace(/\\/g, '/').trim();
  return trimmed.replace(/^\/+/, '');
};

export default function SandboxRunner() {
  const [label, setLabel] = useState('Research sandbox');
  const [homeInput, setHomeInput] = useState('workspace/session');
  const [homes, setHomes] = useState<HomeEntry[]>(DEFAULT_HOMES);
  const [networkPolicy, setNetworkPolicy] = useState<NetworkPolicy>('block-external');
  const [session, setSession] = useState<SandboxSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([
    'Sandbox control plane ready. Define a sandbox, then start it.',
  ]);
  const [lastCleanup, setLastCleanup] = useState<SandboxCleanupResult | null>(null);

  const cleanHomes = useMemo(
    () => homes.map((home) => home.value),
    [homes],
  );

  const appendLog = (message: string) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} · ${message}`]);
  };

  useEffect(() => {
    if (session) {
      markWindowAsSandboxed(SANDBOX_APP_ID);
    } else {
      unmarkWindowAsSandboxed(SANDBOX_APP_ID);
    }
  }, [session]);

  useEffect(() => {
    return () => {
      unmarkWindowAsSandboxed(SANDBOX_APP_ID);
      cleanupSandbox().catch(() => {
        // ignore cleanup errors during unmount; UI already gone
      });
    };
  }, []);

  const addHome = (event: FormEvent) => {
    event.preventDefault();
    const sanitized = inputSanitize(homeInput);
    if (!sanitized) return;
    if (cleanHomes.includes(sanitized)) {
      setHomeInput('');
      return;
    }
    setHomes((prev) => [...prev, { value: sanitized, persisted: false }]);
    setHomeInput('');
  };

  const removeHome = (value: string) => {
    setHomes((prev) => prev.filter((entry) => entry.value !== value));
  };

  const handleStart = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setLastCleanup(null);
    appendLog('Starting sandbox environment...');
    try {
      const response = await startSandbox({
        label,
        homes: cleanHomes,
        networkPolicy,
      });
      setSession(response);
      appendLog(
        `Sandbox "${response.label}" online with ${response.homes.length} home paths and ` +
          `${networkPolicy.replace('-', ' ')} network controls.`,
      );
    } catch (err) {
      setError('Failed to start sandbox. Check configuration and try again.');
      appendLog('Sandbox launch failed. No environment was started.');
    } finally {
      setBusy(false);
    }
  };

  const handleCleanup = async () => {
    if (busy) return;
    setBusy(true);
    appendLog('Stopping sandbox and purging storage...');
    try {
      const result = await cleanupSandbox();
      setLastCleanup(result);
      if (result.sessionId) {
        appendLog(
          `Sandbox session ${result.sessionId} cleaned. Removed ${result.removedHomes.length} home ` +
            `paths${result.errors.length ? ' with warnings.' : '.'}`,
        );
      } else {
        appendLog('No active sandbox session detected during cleanup.');
      }
      setSession(null);
      if (result.errors.length > 0) {
        setError('Cleanup completed with warnings. Storage may require manual review.');
      } else {
        setError(null);
      }
    } catch (err) {
      setError('Sandbox cleanup failed. Retry to ensure the environment is reset.');
      appendLog('Cleanup encountered an unexpected error.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-ub-cool-grey text-white p-4 text-sm space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Sandbox Runner</h1>
        <p className="text-white/70">
          Configure a temporary workspace with mock container boundaries. Homes are stored in the
          browser&apos;s Origin Private File System and purged on cleanup.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <form
          onSubmit={addHome}
          className="bg-black/40 border border-white/10 rounded-lg p-4 space-y-3"
          aria-label="Sandbox configuration"
        >
          <div className="space-y-1">
            <label className="block text-xs uppercase tracking-wide text-white/60" htmlFor="sandbox-label">
              Sandbox label
            </label>
            <input
              id="sandbox-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              className="w-full rounded bg-black/60 border border-white/20 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ub-orange"
              placeholder="Research sandbox"
            />
          </div>

          <div className="space-y-2">
            <label
              className="block text-xs uppercase tracking-wide text-white/60"
              htmlFor="sandbox-home-input"
            >
              Temporary home paths
            </label>
            <div className="flex gap-2">
              <input
                id="sandbox-home-input"
                value={homeInput}
                onChange={(event) => setHomeInput(event.target.value)}
                className="flex-1 rounded bg-black/60 border border-white/20 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ub-orange"
                placeholder="workspace/session"
              />
              <button
                type="submit"
                className="bg-ub-orange text-black font-semibold px-3 py-1 rounded disabled:opacity-50"
                disabled={!homeInput.trim()}
              >
                Add home
              </button>
            </div>
            <ul className="space-y-1" aria-live="polite">
              {homes.map((home) => (
                <li
                  key={home.value}
                  className="flex items-center justify-between rounded bg-white/5 px-2 py-1"
                >
                  <span className="truncate" title={home.value}>
                    {home.value}
                    {home.persisted && <span className="ml-2 text-xs text-ubt-grey">(default)</span>}
                  </span>
                  <button
                    type="button"
                    className="text-xs text-white/70 hover:text-white"
                    onClick={() => removeHome(home.value)}
                    aria-label={`Remove ${home.value}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs uppercase tracking-wide text-white/60">
              Network controls
            </legend>
            <div className="space-y-2">
              {NETWORK_POLICIES.map((policy) => (
                <label
                  key={policy.id}
                  className="flex items-start gap-2 rounded border border-white/10 bg-white/5 p-3"
                >
                  <input
                    type="radio"
                    name="network-policy"
                    value={policy.id}
                    checked={networkPolicy === policy.id}
                    onChange={() => setNetworkPolicy(policy.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-semibold">{policy.label}</span>
                    <span className="block text-white/70 text-xs">{policy.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={handleStart}
              className="bg-ub-green text-black font-semibold px-4 py-2 rounded disabled:opacity-50"
              disabled={busy || !!session}
            >
              Start sandbox
            </button>
            <button
              type="button"
              onClick={handleCleanup}
              className="bg-white/10 border border-white/20 px-4 py-2 rounded disabled:opacity-50"
              disabled={busy || (!session && !lastCleanup)}
            >
              Cleanup
            </button>
          </div>
          {error && <p className="text-ub-orange text-xs" role="alert">{error}</p>}
        </form>

        <aside className="bg-black/30 border border-white/5 rounded-lg p-4 space-y-4">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Status</h2>
            <div className="rounded bg-black/40 p-3 text-sm" aria-live="polite">
              {session ? (
                <div className="space-y-1">
                  <p>
                    <span className="font-semibold">Active sandbox:</span> {session.label}
                  </p>
                  <p>
                    <span className="font-semibold">Network policy:</span>{' '}
                    {NETWORK_POLICIES.find((item) => item.id === session.networkPolicy)?.label}
                  </p>
                  <p>
                    <span className="font-semibold">Homes:</span> {session.homes.join(', ')}
                  </p>
                  <p className="text-white/60 text-xs">
                    {describeNetworkPolicy(session.networkPolicy)}
                  </p>
                </div>
              ) : (
                <p>No sandbox running. Configure options and press “Start sandbox”.</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Cleanup summary</h3>
            <div className="rounded bg-black/40 p-3 text-xs space-y-1" aria-live="polite">
              {lastCleanup ? (
                <>
                  <p>
                    Removed homes: {lastCleanup.removedHomes.length}
                    {lastCleanup.removedHomes.length > 0 && (
                      <span className="block text-white/60">{lastCleanup.removedHomes.join(', ')}</span>
                    )}
                  </p>
                  <p>Storage touched: {lastCleanup.hadStorage ? 'Yes' : 'No'}</p>
                  <p>
                    Errors:{' '}
                    {lastCleanup.errors.length > 0
                      ? lastCleanup.errors.join(', ')
                      : 'None'}
                  </p>
                </>
              ) : (
                <p>No cleanup performed yet.</p>
              )}
            </div>
          </div>
        </aside>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Event log</h2>
        <div
          className="h-40 overflow-auto rounded bg-black/60 border border-white/10 p-3 text-xs leading-5"
          role="log"
          aria-live="polite"
        >
          {logs.map((line, index) => (
            <div key={`${line}-${index}`} className="whitespace-pre-wrap">
              {line}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

