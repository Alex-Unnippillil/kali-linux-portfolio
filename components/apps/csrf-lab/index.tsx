'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import LabMode from '../../LabMode';
import ToggleSwitch from '../../ToggleSwitch';

interface LabSettings {
  requireToken: boolean;
  sameSiteStrict: boolean;
}

interface AttackLogEntry {
  id: number;
  timestamp: number;
  success: boolean;
  message: string;
  version: number;
}

interface AttackSubmitMessage {
  attemptId: number;
  token?: string;
  version?: number;
}

interface AttackLogMessage {
  attemptId?: number;
  success?: boolean;
  message?: string;
  version?: number;
}

const MAX_LOG_ENTRIES = 20;

const generateToken = () =>
  Math.random().toString(36).slice(2, 10).toUpperCase();

const formatTimestamp = (value: number) =>
  new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const CSRFLab: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const configVersionRef = useRef(0);
  const [settings, setSettings] = useState<LabSettings>({
    requireToken: true,
    sameSiteStrict: true,
  });
  const [labToken, setLabToken] = useState<string>(() => generateToken());
  const [manualResult, setManualResult] = useState<string>('No submissions yet.');
  const [logs, setLogs] = useState<AttackLogEntry[]>([]);
  const [attackReady, setAttackReady] = useState(false);

  const settingsRef = useRef(settings);
  const tokenRef = useRef(labToken);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    tokenRef.current = labToken;
  }, [labToken]);

  const evaluateAttempt = useCallback((token: string | undefined) => {
    let success = true;
    const reasons: string[] = [];

    if (settingsRef.current.sameSiteStrict) {
      success = false;
      reasons.push('SameSite cookie prevented the session from leaving the lab');
    }

    if (settingsRef.current.requireToken) {
      if (!token || token !== tokenRef.current) {
        success = false;
        reasons.push('Missing or invalid anti-CSRF token');
      }
    }

    return { success, reasons };
  }, []);

  const sendConfig = useCallback(() => {
    const target = iframeRef.current?.contentWindow;
    if (!target) return;

    configVersionRef.current += 1;

    target.postMessage(
      {
        type: 'csrf-lab-config',
        version: configVersionRef.current,
        settings: {
          requireToken: settingsRef.current.requireToken,
          sameSiteStrict: settingsRef.current.sameSiteStrict,
          exposedToken: settingsRef.current.requireToken ? null : tokenRef.current,
        },
      },
      '*'
    );
  }, []);

  const handleAttackSubmit = useCallback(
    (data: AttackSubmitMessage) => {
      const attemptId = Number.isFinite(data.attemptId)
        ? data.attemptId
        : Date.now();
      const { success, reasons } = evaluateAttempt(data.token);

      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'csrf-attack-response',
          attemptId,
          success,
          reasons,
          version: typeof data.version === 'number' ? data.version : configVersionRef.current,
        },
        '*'
      );
    },
    [evaluateAttempt]
  );

  const handleAttackLog = useCallback((data: AttackLogMessage) => {
    if (typeof data.message !== 'string') {
      return;
    }

    const entry: AttackLogEntry = {
      id: Number.isFinite(data.attemptId) ? (data.attemptId as number) : Date.now(),
      timestamp: Date.now(),
      success: Boolean(data.success),
      message: data.message,
      version: typeof data.version === 'number' ? data.version : configVersionRef.current,
    };

    setLogs((prev) => [entry, ...prev].slice(0, MAX_LOG_ENTRIES));
  }, []);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      const data = event.data;
      if (!data || typeof data !== 'object') {
        return;
      }

      if (data.type === 'csrf-attack-ready') {
        setAttackReady(true);
        sendConfig();
      } else if (data.type === 'csrf-attack-submit') {
        handleAttackSubmit(data as AttackSubmitMessage);
      } else if (data.type === 'csrf-attack-log') {
        handleAttackLog(data as AttackLogMessage);
      }
    };

    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [handleAttackLog, handleAttackSubmit, sendConfig]);

  useEffect(() => {
    if (attackReady) {
      sendConfig();
    }
  }, [attackReady, labToken, settings, sendConfig]);

  const latestStatus = logs[0];

  const settingsSummary = useMemo(
    () => [
      settings.requireToken ? 'Token required' : 'Token disabled',
      settings.sameSiteStrict ? 'SameSite=strict' : 'SameSite=None',
    ].join(' · '),
    [settings]
  );

  const rotateToken = () => {
    setLabToken(generateToken());
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setManualResult('Transfer executed with valid session and token (simulated).');
  };

  const toggleRequireToken = (next: boolean) => {
    setSettings((prev) => ({ ...prev, requireToken: next }));
    if (next) {
      setLabToken(generateToken());
    }
  };

  const toggleSameSite = (next: boolean) => {
    setSettings((prev) => ({ ...prev, sameSiteStrict: next }));
  };

  return (
    <LabMode>
      <div className="h-full w-full bg-gray-900 text-white p-4 overflow-auto space-y-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">CSRF Lab</h1>
          <p className="text-sm text-gray-300">
            Experiment with common anti-CSRF defenses while a hostile page attempts to trigger a hidden
            bank transfer.
          </p>
          <p className="text-xs text-gray-400">Current defenses: {settingsSummary}</p>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="space-y-4 rounded border border-gray-700 bg-gray-800 p-4" aria-label="Lab controls">
            <h2 className="text-lg font-semibold">Lab controls</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">Require anti-CSRF token</p>
                  <p className="text-xs text-gray-400">
                    When enabled the legitimate form embeds a fresh token that the hostile page cannot read.
                  </p>
                </div>
                <ToggleSwitch
                  ariaLabel="Toggle anti-CSRF token requirement"
                  checked={settings.requireToken}
                  onChange={toggleRequireToken}
                />
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">SameSite=strict session cookie</p>
                  <p className="text-xs text-gray-400">
                    Blocks the bank session from being sent with cross-site requests initiated by the attacker.
                  </p>
                </div>
                <ToggleSwitch
                  ariaLabel="Toggle SameSite strict cookie"
                  checked={settings.sameSiteStrict}
                  onChange={toggleSameSite}
                />
              </div>
            </div>

            <div className="rounded border border-gray-700 bg-gray-900 p-3 text-xs">
              <h3 className="text-sm font-semibold text-gray-200">Legitimate bank form</h3>
              <p className="mb-2 text-gray-400">
                Submitting here represents a real user action. The attack iframe has to spoof the same
                request without user consent.
              </p>
              <form onSubmit={handleFormSubmit} className="space-y-2">
                <label className="block">
                  <span className="text-gray-300">Destination account</span>
                  <input
                    type="text"
                    className="mt-1 w-full rounded bg-gray-800 p-2 text-white"
                    defaultValue="savings-2042"
                    readOnly
                  />
                </label>
                <label className="block">
                  <span className="text-gray-300">Amount</span>
                  <input
                    type="text"
                    className="mt-1 w-full rounded bg-gray-800 p-2 text-white"
                    defaultValue="$5,000.00"
                    readOnly
                  />
                </label>
                {settings.requireToken && (
                  <label className="block">
                    <span className="text-gray-300">Anti-CSRF token</span>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="text"
                        className="w-full rounded bg-gray-800 p-2 font-mono text-ubt-grey"
                        value={labToken}
                        readOnly
                      />
                      <button
                        type="button"
                        onClick={rotateToken}
                        className="rounded bg-ub-orange px-2 py-1 text-xs font-semibold text-black"
                      >
                        Rotate
                      </button>
                    </div>
                  </label>
                )}
                {!settings.requireToken && (
                  <p className="text-gray-400">
                    Token disabled — the form no longer checks a per-request secret.
                  </p>
                )}
                <button
                  type="submit"
                  className="mt-2 rounded bg-ub-green px-3 py-2 text-xs font-semibold text-black"
                >
                  Submit transfer
                </button>
              </form>
              <p className="mt-2 text-[11px] text-gray-400" aria-live="polite">
                {manualResult}
              </p>
            </div>
          </section>

          <section className="space-y-4" aria-label="Attack instrumentation">
            <div className="rounded border border-gray-700 bg-gray-800 p-4">
              <h2 className="text-lg font-semibold">Attack log</h2>
              <p className="text-xs text-gray-400">
                The hostile iframe reports whether it could force the transfer under the current settings.
              </p>
              <div
                className="mt-3 max-h-72 overflow-auto rounded border border-gray-700 bg-gray-900 p-3"
                role="log"
                aria-live="polite"
              >
                {logs.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    {attackReady
                      ? 'Awaiting hostile attempts…'
                      : 'Loading hostile page inside the sandbox…'}
                  </p>
                ) : (
                  <ul className="space-y-2 text-xs">
                    {logs.map((log) => (
                      <li
                        key={log.id}
                        className={`rounded border px-3 py-2 ${
                          log.success
                            ? 'border-green-500/60 bg-green-900/30 text-green-100'
                            : 'border-red-500/60 bg-red-900/30 text-red-100'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] uppercase tracking-wide">
                          <span>{log.success ? 'Success' : 'Blocked'}</span>
                          <span className="text-gray-200">{formatTimestamp(log.timestamp)}</span>
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-gray-100">{log.message}</p>
                        <p className="mt-1 text-[10px] text-gray-300">
                          Settings snapshot #{log.version}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {latestStatus && (
                <p className="mt-2 text-[11px] text-gray-300">
                  Latest result: {latestStatus.success ? 'Attack succeeded' : 'Attack blocked'} at{' '}
                  {formatTimestamp(latestStatus.timestamp)}.
                </p>
              )}
            </div>

            <div className="rounded border border-gray-700 bg-gray-800 p-4">
              <h2 className="text-lg font-semibold">Sandboxed hostile page</h2>
              <p className="text-xs text-gray-400">
                Runs with <code>sandbox=&quot;allow-scripts&quot;</code>. Navigation and storage access are denied,
                but scripts can still attempt cross-site requests.
              </p>
              <iframe
                ref={iframeRef}
                title="Hostile CSRF demo"
                src="/demo-data/csrf/attack.html"
                sandbox="allow-scripts"
                className="mt-3 h-64 w-full rounded border border-gray-700 bg-black"
              />
            </div>
          </section>
        </div>
      </div>
    </LabMode>
  );
};

export default CSRFLab;
