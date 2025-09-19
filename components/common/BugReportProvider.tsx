import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import type { ErrorInfo } from 'react';
import Modal from '../base/Modal';
import {
  buildErrorContext,
  collectDiagnostics,
  createBugReportPayload,
  DiagnosticsSnapshot,
  SerializedErrorContext,
} from '../../lib/bugReport';
import {
  exportTelemetryJson,
  getTelemetryEntries,
  getTelemetryWindowMs,
  TelemetryEntry,
} from '../../lib/telemetry';

interface BugReportContextValue {
  open: (options?: BugReportOpenOptions) => void;
}

export const BugReportContext = createContext<BugReportContextValue | null>(null);

export function useBugReport() {
  const ctx = useContext(BugReportContext);
  if (!ctx) {
    throw new Error('useBugReport must be used within a BugReportProvider');
  }
  return ctx;
}

interface BugReportProviderProps {
  children: React.ReactNode;
}

interface BugReportOpenOptions {
  description?: string;
  source?: string;
  error?: unknown;
  errorInfo?: ErrorInfo | null;
  note?: string;
}

interface ModalState {
  isOpen: boolean;
  description: string;
  context?: SerializedErrorContext;
  route: string;
  userAgent: string;
  diagnostics: DiagnosticsSnapshot;
  logs: TelemetryEntry[];
  telemetryWindowMs: number;
  status: 'idle' | 'pending' | 'success' | 'error';
  feedback?: string;
}

const INITIAL_STATE: ModalState = {
  isOpen: false,
  description: '',
  route: '',
  userAgent: '',
  diagnostics: {},
  logs: [],
  telemetryWindowMs: getTelemetryWindowMs(),
  status: 'idle',
};

const formatLogEntry = (entry: TelemetryEntry) => {
  const { timestamp, ...rest } = entry;
  return JSON.stringify(
    {
      timestamp: new Date(timestamp).toISOString(),
      ...rest,
    },
    null,
    2,
  );
};

const BugReportProvider: React.FC<BugReportProviderProps> = ({ children }) => {
  const router = useRouter();
  const [state, setState] = useState<ModalState>(INITIAL_STATE);

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false, status: 'idle', feedback: undefined }));
  }, []);

  const open = useCallback(
    (options?: BugReportOpenOptions) => {
      if (typeof window === 'undefined') return;
      const diagnostics = collectDiagnostics();
      const logs = getTelemetryEntries();
      const userAgent = window.navigator?.userAgent || 'unknown';
      const context = buildErrorContext({
        error: options?.error,
        errorInfo: options?.errorInfo ?? null,
        source: options?.source,
        note: options?.note,
      });
      setState({
        isOpen: true,
        description: options?.description ?? '',
        context,
        route: router.asPath ?? '',
        userAgent,
        diagnostics,
        logs,
        telemetryWindowMs: getTelemetryWindowMs(),
        status: 'idle',
        feedback: undefined,
      });
    },
    [router.asPath],
  );

  const handleSubmit = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'pending', feedback: undefined }));
    try {
      const logsSnapshot = getTelemetryEntries(state.telemetryWindowMs);
      const payload = createBugReportPayload({
        description: state.description,
        route: state.route,
        userAgent: state.userAgent,
        diagnostics: state.diagnostics,
        logs: logsSnapshot,
        telemetryWindowMs: state.telemetryWindowMs,
        context: state.context,
      });
      const serialized = JSON.stringify(payload, null, 2);
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(serialized);
        setState((prev) => ({
          ...prev,
          logs: logsSnapshot,
          status: 'success',
          feedback: 'Bug report copied to clipboard.',
        }));
      } else {
        const blob = new Blob([serialized], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bug-report-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setState((prev) => ({
          ...prev,
          logs: logsSnapshot,
          status: 'success',
          feedback: 'Bug report downloaded.',
        }));
      }
    } catch (err) {
      console.error('Failed to prepare bug report payload', err);
      setState((prev) => ({ ...prev, status: 'error', feedback: 'Could not prepare bug report. Please try again.' }));
    }
  }, [state.description, state.route, state.userAgent, state.diagnostics, state.telemetryWindowMs, state.context]);

  const downloadTelemetry = useCallback(() => {
    try {
      const json = exportTelemetryJson(state.telemetryWindowMs);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `telemetry-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setState((prev) => ({ ...prev, feedback: 'Telemetry downloaded.' }));
    } catch (err) {
      console.error('Failed to export telemetry', err);
      setState((prev) => ({ ...prev, feedback: 'Unable to export telemetry.' }));
    }
  }, [state.telemetryWindowMs]);

  const contextValue = useMemo(() => ({ open }), [open]);

  return (
    <BugReportContext.Provider value={contextValue}>
      {children}
      <Modal isOpen={state.isOpen} onClose={close} ariaLabelledby="bug-report-title">
        {state.isOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/70" aria-hidden="true" onClick={close} />
            <div className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-ub-cool-grey p-6 text-white shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="bug-report-title" className="text-2xl font-semibold">
                    Report a bug
                  </h2>
                  <p className="mt-1 text-sm text-ubt-grey">
                    Share what happened and we will bundle recent telemetry, your route, and environment diagnostics.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="rounded bg-black/40 px-2 py-1 text-sm text-white transition hover:bg-black/60"
                >
                  Close
                </button>
              </div>
              <div className="mt-4 flex flex-col gap-4">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">What happened?</span>
                  <textarea
                    value={state.description}
                    onChange={(event) =>
                      setState((prev) => ({ ...prev, description: event.target.value, feedback: undefined }))
                    }
                    rows={4}
                    className="min-h-[120px] w-full rounded-md border border-black/30 bg-black/30 p-3 text-sm text-white focus:border-ubt-ubuntu focus:outline-none"
                    placeholder="Describe the issue, steps to reproduce, and expected behavior."
                  />
                </label>

                {state.context?.error && (
                  <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3">
                    <p className="text-sm font-semibold text-red-200">Captured error</p>
                    <pre className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap text-xs text-red-100">
                      {state.context.error.stack || state.context.error.message}
                    </pre>
                  </div>
                )}

                {state.context?.errorInfo?.componentStack && (
                  <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3">
                    <p className="text-sm font-semibold text-yellow-200">Component stack</p>
                    <pre className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap text-xs text-yellow-100">
                      {state.context.errorInfo.componentStack}
                    </pre>
                  </div>
                )}

                {state.context?.note && (
                  <div className="rounded-md border border-blue-500/30 bg-blue-500/10 p-3">
                    <p className="text-sm font-semibold text-blue-200">Context</p>
                    {state.context?.source && (
                      <p className="text-xs uppercase tracking-wide text-blue-200/80">
                        Source: {state.context.source}
                      </p>
                    )}
                    <p className="mt-1 text-sm text-blue-100">{state.context.note}</p>
                  </div>
                )}

                <section aria-labelledby="bug-report-route">
                  <h3 id="bug-report-route" className="text-lg font-semibold">
                    Route &amp; environment
                  </h3>
                  <dl className="mt-2 grid grid-cols-1 gap-2 text-sm text-ubt-grey sm:grid-cols-2">
                    <div>
                      <dt className="font-medium text-white">Route</dt>
                      <dd className="break-all">{state.route || 'Unknown'}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-white">User agent</dt>
                      <dd className="break-words">{state.userAgent || 'Unavailable'}</dd>
                    </div>
                    {Object.entries(state.diagnostics)
                      .filter(([, value]) => value !== undefined && value !== null && value !== '')
                      .map(([key, value]) => (
                        <div key={key} className="sm:col-span-1">
                          <dt className="font-medium capitalize text-white">{key.replace(/([A-Z])/g, ' $1').trim()}</dt>
                          <dd className="break-words">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </dd>
                        </div>
                      ))}
                  </dl>
                </section>

                <section aria-labelledby="bug-report-logs">
                  <div className="flex items-center justify-between">
                    <h3 id="bug-report-logs" className="text-lg font-semibold">
                      Recent logs
                    </h3>
                    <span className="text-xs text-ubt-grey">
                      Last {Math.round(state.telemetryWindowMs / 1000)} seconds
                    </span>
                  </div>
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-black/40 bg-black/40 p-3">
                    {state.logs.length === 0 ? (
                      <p className="text-sm text-ubt-grey">No telemetry captured in this window.</p>
                    ) : (
                      <ul className="flex flex-col gap-2 text-xs text-ubt-grey">
                        {state.logs.map((entry, index) => (
                          <li key={index}>
                            <pre className="whitespace-pre-wrap break-words text-ubt-grey">
                              {formatLogEntry(entry)}
                            </pre>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={state.status === 'pending'}
                    className="rounded bg-ubt-ubuntu px-4 py-2 text-sm font-semibold text-white transition hover:bg-ubt-ubuntu/80 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {state.status === 'pending' ? 'Preparing…' : 'Copy payload'}
                  </button>
                  <button
                    type="button"
                    onClick={downloadTelemetry}
                    className="rounded border border-ubt-ubuntu px-4 py-2 text-sm font-semibold text-ubt-ubuntu transition hover:bg-ubt-ubuntu/20"
                  >
                    Download telemetry JSON
                  </button>
                  {state.feedback && (
                    <span className="text-sm text-ubt-grey">{state.feedback}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </BugReportContext.Provider>
  );
};

export default BugReportProvider;
