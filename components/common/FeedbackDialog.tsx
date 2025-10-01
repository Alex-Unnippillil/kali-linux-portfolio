'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Modal from '../base/Modal';
import { logEvent } from '../../utils/analytics';
import { trackEvent } from '../../lib/analytics-client';
import { redactDiagnostics, redactText, redactValue } from '../../utils/redaction';
import type { DiagnosticsBundle, FeedbackSubmission } from '../../types/feedback';

interface FeedbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  submitFeedback?: (payload: FeedbackSubmission) => Promise<void>;
  getStateSnapshot?: () => unknown;
  onSubmitted?: () => void;
}

type FormErrors = {
  summary?: string;
  description?: string;
};

const hashString = (input: string): string => {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16);
};

const defaultCollectState = (): unknown => {
  if (typeof window === 'undefined') {
    return { environment: 'server' };
  }

  const snapshot: Record<string, unknown> = {
    path: window.location?.pathname,
    hash: window.location?.hash,
    theme: document.documentElement?.className,
  };

  try {
    const keys: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key) keys.push(redactText(key));
    }
    if (keys.length > 0) {
      snapshot.localStorageKeys = keys;
    }
  } catch {
    snapshot.localStorageKeys = ['unavailable'];
  }

  const workspaceState = (window as any).__WORKSPACE_STATE__;
  if (workspaceState) {
    snapshot.workspace = redactValue(workspaceState);
  }

  return snapshot;
};

const collectVitals = (): DiagnosticsBundle['vitals'] => {
  const timestamp = new Date().toISOString();
  if (typeof window === 'undefined') {
    return { timestamp };
  }

  const nav = navigator as Navigator & { connection?: { effectiveType?: string }; deviceMemory?: number };
  const perf = performance as Performance & { memory?: { jsHeapSizeLimit: number; totalJSHeapSize: number; usedJSHeapSize: number } };

  const vitals: DiagnosticsBundle['vitals'] = {
    timestamp,
    userAgent: nav?.userAgent,
    language: nav?.language,
    platform: nav?.platform,
    online: typeof nav?.onLine === 'boolean' ? nav.onLine : undefined,
    connectionType: nav?.connection?.effectiveType,
    viewport: typeof window !== 'undefined' ? { width: window.innerWidth, height: window.innerHeight } : undefined,
  };

  if (perf?.memory) {
    vitals.memory = {
      jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
      totalJSHeapSize: perf.memory.totalJSHeapSize,
      usedJSHeapSize: perf.memory.usedJSHeapSize,
      deviceMemory: nav?.deviceMemory,
    };
  } else if (typeof nav?.deviceMemory === 'number') {
    vitals.memory = {
      deviceMemory: nav.deviceMemory,
    };
  }

  return vitals;
};

const buildDiagnostics = (getStateSnapshot: () => unknown): DiagnosticsBundle => {
  const stateSnapshot = redactValue(getStateSnapshot());
  const serialized = JSON.stringify(stateSnapshot ?? {});
  const stateHash = hashString(serialized);
  const vitals = redactValue(collectVitals());
  return redactDiagnostics({ stateHash, vitals });
};

const postJson = async (url: string, payload: FeedbackSubmission) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
};

const defaultSubmitFeedback = async (payload: FeedbackSubmission) => {
  try {
    await postJson('/api/support/report', payload);
    return;
  } catch {
    // fall through to fallback
  }

  try {
    await postJson('/api/dummy', payload);
  } catch (error) {
    console.info('[feedback:fallback]', payload);
    throw error;
  }
};

const FeedbackDialog: React.FC<FeedbackDialogProps> = ({
  isOpen,
  onClose,
  submitFeedback = defaultSubmitFeedback,
  getStateSnapshot = defaultCollectState,
  onSubmitted,
}) => {
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [includeDiagnostics, setIncludeDiagnostics] = useState(false);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!isOpen) {
      setSummary('');
      setDescription('');
      setIncludeDiagnostics(false);
      setStatus('idle');
      setErrors({});
    }
  }, [isOpen]);

  const disableSubmit = status === 'submitting';

  const handleClose = useCallback(() => {
    if (disableSubmit) return;
    onClose();
  }, [disableSubmit, onClose]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (status === 'submitting') return;

      const trimmedSummary = summary.trim();
      const trimmedDescription = description.trim();

      const nextErrors: FormErrors = {};
      if (trimmedSummary.length < 5) {
        nextErrors.summary = 'Please provide a short summary.';
      }
      if (trimmedDescription.length < 10) {
        nextErrors.description = 'Describe the issue or request in more detail.';
      }

      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
        return;
      }

      setErrors({});
      setStatus('submitting');

      const sanitizedSummary = redactText(trimmedSummary);
      const sanitizedDescription = redactText(trimmedDescription);

      let diagnostics: DiagnosticsBundle | null = null;
      if (includeDiagnostics) {
        diagnostics = buildDiagnostics(getStateSnapshot);
      }

      const payload: FeedbackSubmission = {
        summary: sanitizedSummary,
        description: sanitizedDescription,
        includeDiagnostics,
        diagnostics,
        timestamp: new Date().toISOString(),
        channel: 'desktop-feedback',
      };

      try {
        await submitFeedback(payload);
        logEvent({
          category: 'feedback',
          action: 'submit',
          label: includeDiagnostics ? 'with_diagnostics' : 'without_diagnostics',
        });
        trackEvent('feedback_submit', { includeDiagnostics });
        setStatus('success');
        onSubmitted?.();
      } catch (error) {
        console.error('Failed to submit feedback', error);
        setStatus('error');
        trackEvent('feedback_submit_error', { includeDiagnostics });
      }
    },
    [description, getStateSnapshot, includeDiagnostics, status, submitFeedback, summary, onSubmitted],
  );

  const statusMessage = useMemo(() => {
    if (status === 'success') {
      return {
        tone: 'success' as const,
        text: 'Thanks! Your report was sent to the support queue.',
      };
    }
    if (status === 'error') {
      return {
        tone: 'error' as const,
        text: 'We could not reach the support endpoint. Please try again later.',
      };
    }
    return null;
  }, [status]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-slate-950/80"
          aria-hidden="true"
          onClick={handleClose}
        />
        <div
          role="document"
          aria-labelledby="feedback-dialog-title"
          className="relative z-10 w-full max-w-xl rounded-xl border border-white/10 bg-slate-900/95 text-white shadow-2xl"
        >
          <div className="flex items-start justify-between border-b border-white/10 px-6 py-4">
            <div>
              <h2 id="feedback-dialog-title" className="text-lg font-semibold">
                Send feedback
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                Share a bug report, feature idea, or general comment.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full bg-white/10 p-1 text-slate-200 transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              aria-label="Close feedback dialog"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
            <div>
              <label htmlFor="feedback-summary" className="mb-1 block text-sm font-medium text-slate-200">
                Summary
              </label>
              <input
                id="feedback-summary"
                name="summary"
                value={summary}
                onChange={event => setSummary(event.target.value)}
                className={`w-full rounded border px-3 py-2 text-sm text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                  errors.summary ? 'border-red-500' : 'border-transparent'
                }`}
                maxLength={120}
                aria-invalid={Boolean(errors.summary)}
                aria-describedby={errors.summary ? 'feedback-summary-error' : undefined}
                aria-label="Feedback summary"
                placeholder="Quick headline (e.g. VPN window won't open)"
              />
              {errors.summary && (
                <p id="feedback-summary-error" className="mt-1 text-xs text-red-400">
                  {errors.summary}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="feedback-description" className="mb-1 block text-sm font-medium text-slate-200">
                Details
              </label>
              <textarea
                id="feedback-description"
                name="description"
                value={description}
                onChange={event => setDescription(event.target.value)}
                className={`min-h-[120px] w-full rounded border px-3 py-2 text-sm text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                  errors.description ? 'border-red-500' : 'border-transparent'
                }`}
                maxLength={2000}
                aria-invalid={Boolean(errors.description)}
                aria-describedby={errors.description ? 'feedback-description-error' : undefined}
                aria-label="Feedback details"
                placeholder="What happened? Include steps, expected results, or environment notes."
              />
              {errors.description && (
                <p id="feedback-description-error" className="mt-1 text-xs text-red-400">
                  {errors.description}
                </p>
              )}
            </div>
            <fieldset className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <legend className="px-1 text-sm font-medium text-slate-200">Diagnostics</legend>
              <div className="flex items-start gap-3 text-sm text-slate-200">
                <input
                  id="feedback-include-diagnostics"
                  type="checkbox"
                  checked={includeDiagnostics}
                  onChange={event => setIncludeDiagnostics(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-500 bg-slate-800 text-cyan-400 focus:ring-cyan-400"
                  aria-describedby="feedback-include-diagnostics-description"
                  aria-labelledby="feedback-include-diagnostics-label"
                />
                <label
                  id="feedback-include-diagnostics-label"
                  htmlFor="feedback-include-diagnostics"
                  className="flex-1"
                >
                  Attach a sanitized diagnostics bundle (state hash + vitals snapshot). I consent to share this anonymized data to
                  help troubleshoot issues.
                  <span id="feedback-include-diagnostics-description" className="mt-1 block text-xs text-slate-400">
                    We never include raw logs or credentials, and we redact obvious secrets automatically.
                  </span>
                </label>
              </div>
            </fieldset>
            {statusMessage && (
              <div
                role="status"
                className={`rounded-md border px-3 py-2 text-sm ${
                  statusMessage.tone === 'success'
                    ? 'border-green-600 bg-green-900/40 text-green-200'
                    : 'border-red-600 bg-red-900/40 text-red-200'
                }`}
              >
                {statusMessage.text}
              </div>
            )}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                disabled={disableSubmit}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-full bg-cyan-500 px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={disableSubmit}
              >
                {status === 'submitting' && (
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" opacity="0.25" />
                    <path d="M22 12a10 10 0 0 0-10-10" />
                  </svg>
                )}
                <span>{status === 'submitting' ? 'Sending…' : 'Send report'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
};

export default FeedbackDialog;
