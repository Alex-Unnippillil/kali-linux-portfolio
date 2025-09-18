'use client';

import React, { useMemo, useState } from 'react';
import {
  SESSION_FILENAME,
  SameSiteMode,
  SessionHeaders,
  SessionState,
  SubmissionOutcome,
  buildSessionReport,
  exportSessionReport,
} from './exportSession';

const TRUSTED_ORIGIN = 'https://target.example';
const MALICIOUS_ORIGIN = 'https://evil.example';
const MALICIOUS_REFERER = 'https://evil.example/form';

const sameSiteModes: SameSiteMode[] = ['Strict', 'Lax', 'None'];

type SubmissionEvaluation = {
  success: boolean;
  reasons: string[];
};

const evaluateSubmission = (
  mode: SameSiteMode,
  originChecked: boolean,
  refererChecked: boolean,
): SubmissionEvaluation => {
  const reasons: string[] = [];

  if (mode === 'Strict') {
    reasons.push('SameSite=Strict blocked the cross-site request.');
  } else if (mode === 'Lax') {
    reasons.push('SameSite=Lax blocked this cross-site POST request.');
  }

  if (originChecked) {
    reasons.push(
      `Origin header ${MALICIOUS_ORIGIN} did not match expected ${TRUSTED_ORIGIN}.`,
    );
  }

  if (refererChecked) {
    reasons.push(
      `Referer ${MALICIOUS_REFERER} was outside the trusted site and rejected.`,
    );
  }

  return { success: reasons.length === 0, reasons };
};

const formatStatusMessage = (evaluation: SubmissionEvaluation): string => {
  if (evaluation.success) {
    return 'Accepted: Cookies sent with the simulated request.';
  }
  return `Rejected: ${evaluation.reasons.join(' ')}`;
};

const createOutcomeRecord = (
  attempt: number,
  mode: SameSiteMode,
  originChecked: boolean,
  refererChecked: boolean,
  evaluation: SubmissionEvaluation,
): SubmissionOutcome => ({
  attempt,
  mode,
  originChecked,
  refererChecked,
  success: evaluation.success,
  reasons: evaluation.reasons,
  message: formatStatusMessage(evaluation),
  timestamp: new Date().toISOString(),
});

const SameSiteLab: React.FC = () => {
  const [mode, setMode] = useState<SameSiteMode>('Strict');
  const [originChecked, setOriginChecked] = useState(true);
  const [refererChecked, setRefererChecked] = useState(true);
  const [submissions, setSubmissions] = useState<SubmissionOutcome[]>([]);
  const [status, setStatus] = useState('');
  const [exportStatus, setExportStatus] = useState('');

  const headers: SessionHeaders = useMemo(
    () => ({
      Origin: MALICIOUS_ORIGIN,
      Referer: MALICIOUS_REFERER,
      Cookie: `sessionid=demo123; SameSite=${mode}`,
    }),
    [mode],
  );

  const handleSubmit = () => {
    const evaluation = evaluateSubmission(mode, originChecked, refererChecked);
    const outcome = createOutcomeRecord(
      submissions.length + 1,
      mode,
      originChecked,
      refererChecked,
      evaluation,
    );

    setSubmissions((prev) => [...prev, outcome]);
    setStatus(outcome.message);
    setExportStatus('');
  };

  const handleExport = () => {
    const session: SessionState = {
      mode,
      originChecked,
      refererChecked,
      headers,
      submissions,
    };

    try {
      exportSessionReport(session);
      setExportStatus('Session exported to ' + SESSION_FILENAME);
    } catch (error) {
      console.warn('Export failed', error);
      setExportStatus('Export failed. Please try again.');
    }
  };

  const reportPreview = useMemo(() => buildSessionReport({
    mode,
    originChecked,
    refererChecked,
    headers,
    submissions,
  }), [headers, mode, originChecked, refererChecked, submissions]);

  return (
    <div className="flex min-h-screen flex-col gap-4 bg-gray-900 p-4 text-white">
      <header>
        <h1 className="text-2xl font-semibold">SameSite Lab</h1>
        <p className="text-sm text-gray-300">
          Explore how SameSite cookies interact with Origin and Referer checks using
          safe, simulated requests.
        </p>
      </header>

      <section className="grid gap-4 rounded border border-gray-800 bg-gray-950 p-4 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label htmlFor="same-site-mode" className="mb-1 block text-sm font-medium">
              SameSite Mode
            </label>
            <select
              id="same-site-mode"
              data-testid="mode-select"
              className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
              value={mode}
              onChange={(event) => setMode(event.target.value as SameSiteMode)}
            >
              {sameSiteModes.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-gray-200">
              Server-side enforcement
            </legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                data-testid="origin-toggle"
                checked={originChecked}
                onChange={(event) => setOriginChecked(event.target.checked)}
              />
              Enforce Origin header check
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                data-testid="referer-toggle"
                checked={refererChecked}
                onChange={(event) => setRefererChecked(event.target.checked)}
              />
              Enforce Referer header check
            </label>
          </fieldset>

          <div className="rounded border border-gray-800 bg-gray-900 p-3 text-xs">
            <h2 className="text-sm font-semibold text-gray-200">Simulated Request</h2>
            <p>Method: POST</p>
            <p>Origin: {MALICIOUS_ORIGIN}</p>
            <p>Referer: {MALICIOUS_REFERER}</p>
            <p>Expected Origin: {TRUSTED_ORIGIN}</p>
            <p>Cookie: sessionid=demo123; SameSite={mode}</p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            data-testid="submit-button"
            onClick={handleSubmit}
            className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Send simulated request
          </button>
          <div
            role="status"
            data-testid="status-message"
            className="min-h-[3rem] rounded border border-gray-800 bg-gray-900 p-3 text-sm"
          >
            {status || 'No submissions yet.'}
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-200">Submission log</h2>
            <ul
              data-testid="submission-log"
              className="max-h-60 space-y-2 overflow-auto rounded border border-gray-800 bg-gray-900 p-3 text-xs"
            >
              {submissions.length === 0 && (
                <li className="text-gray-500">No requests submitted.</li>
              )}
              {submissions.map((entry) => (
                <li
                  key={entry.attempt}
                  className={entry.success ? 'text-green-400' : 'text-red-400'}
                >
                  Attempt {entry.attempt}: {entry.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="grid gap-3 rounded border border-gray-800 bg-gray-950 p-4 md:grid-cols-2">
        <div className="space-y-2">
          <button
            type="button"
            data-testid="export-button"
            onClick={handleExport}
            className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Export session report
          </button>
          <div
            role="status"
            data-testid="export-status"
            className="min-h-[2.5rem] rounded border border-gray-800 bg-gray-900 p-2 text-xs"
          >
            {exportStatus || 'Export a report to capture this session.'}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-200">Report preview</h2>
          <pre className="max-h-64 overflow-auto rounded border border-gray-800 bg-black p-3 text-xs text-green-300">
            {reportPreview}
          </pre>
        </div>
      </section>
    </div>
  );
};

export default SameSiteLab;
