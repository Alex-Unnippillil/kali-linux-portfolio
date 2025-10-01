import React, { useEffect, useMemo, useState } from 'react';

export type HydraAttempt = {
  time: number;
  user: string;
  password: string;
  result: string;
};

export type HydraReportProps = {
  target: string;
  service: string;
  attempts: HydraAttempt[];
  totalAttempts: number;
  candidateSpace: number;
  charset?: string;
  rule?: string;
  backoffThreshold?: number;
  lockoutThreshold?: number;
};

type ReportField =
  | 'target'
  | 'service'
  | 'attemptSummary'
  | 'candidateSpace'
  | 'timing'
  | 'redactedAttempts';

type ReportFormat = 'html' | 'pdf';

type RedactionProfileId = 'strict' | 'balanced';

type AuditLogEntry = {
  id: string;
  timestamp: string;
  template: string;
  format: ReportFormat;
  fields: ReportField[];
  redaction: RedactionProfileId;
  attemptCount: number;
};

type TemplateRenderer = (input: {
  title: string;
  fields: ReportField[];
  data: Record<ReportField, string>;
}) => string;

const templates: Record<string, { label: string; description: string; render: TemplateRenderer }> = {
  executive: {
    label: 'Executive summary',
    description: 'High-level overview with mitigations and scope notes.',
    render: ({ title, fields, data }) => {
      const sections = fields
        .map((field) => {
          switch (field) {
            case 'target':
              return `<section><h2>Scope</h2><p>${data[field]}</p></section>`;
            case 'service':
              return `<section><h2>Service Profile</h2><p>${data[field]}</p></section>`;
            case 'attemptSummary':
              return `<section><h2>Attempt Summary</h2>${data[field]}</section>`;
            case 'candidateSpace':
              return `<section><h2>Credential Space</h2><p>${data[field]}</p></section>`;
            case 'timing':
              return `<section><h2>Timing & Controls</h2>${data[field]}</section>`;
            case 'redactedAttempts':
              return `<section><h2>Representative Attempts</h2>${data[field]}</section>`;
            default:
              return '';
          }
        })
        .join('');
      return `<article><header><h1>${title}</h1><p>This simulation illustrates credential stuffing safety guardrails.</p></header>${sections}</article>`;
    },
  },
  compliance: {
    label: 'Compliance ready',
    description: 'Structured layout suitable for audit evidence packets.',
    render: ({ title, fields, data }) => {
      const rows = fields
        .map((field) => `<tr><th>${field}</th><td>${data[field]}</td></tr>`)
        .join('');
      return `<article><h1>${title}</h1><table>${rows}</table><footer><p>Generated for demonstration only – no credentials exposed.</p></footer></article>`;
    },
  },
  analyst: {
    label: 'Analyst detail',
    description: 'Chronological view emphasising defensive signals.',
    render: ({ title, fields, data }) => {
      const parts = fields
        .map((field) => {
          if (field === 'redactedAttempts') {
            return `<section><h2>Timeline</h2>${data[field]}</section>`;
          }
          return `<section><h3>${field}</h3><p>${data[field]}</p></section>`;
        })
        .join('');
      return `<article><h1>${title}</h1>${parts}</article>`;
    },
  },
};

const fieldCatalog: Record<ReportField, { label: string; description: string }> = {
  target: {
    label: 'Target definition',
    description: 'Host and scope statement entered by the operator.',
  },
  service: {
    label: 'Service configuration',
    description: 'Protocol template and throttling guidance.',
  },
  attemptSummary: {
    label: 'Attempt summary',
    description: 'Counts of total attempts and outcomes.',
  },
  candidateSpace: {
    label: 'Credential candidate space',
    description: 'Estimated search space with charset and rule context.',
  },
  timing: {
    label: 'Timing and controls',
    description: 'Backoff, lockout, and pacing behaviour.',
  },
  redactedAttempts: {
    label: 'Redacted attempt samples',
    description: 'Sanitised snapshot of attempts with masked principals.',
  },
};

const redactionProfiles: Record<RedactionProfileId, {
  label: string;
  description: string;
  redactUser: (value: string, index: number) => string;
  redactPassword: (value: string, index: number) => string;
}> = {
  strict: {
    label: 'Strict redaction',
    description: 'Replace all principals with deterministic tokens.',
    redactUser: (value, index) => {
      if (!value) return 'user:anonymous';
      const digest = Math.abs(
        value
          .split('')
          .reduce((acc, char) => acc + char.charCodeAt(0), index + 31)
      ).toString(16);
      return `user:${digest.slice(0, 6)}`;
    },
    redactPassword: (value, index) => {
      if (!value) return 'secret:masked';
      const digest = Math.abs(
        value
          .split('')
          .reduce((acc, char) => acc + char.charCodeAt(0) * 3, index + 17)
      ).toString(36);
      return `secret:${digest.slice(0, 8)}`;
    },
  },
  balanced: {
    label: 'Balanced redaction',
    description: 'Keep structural hints while obfuscating sensitive values.',
    redactUser: (value) => {
      if (!value) return 'user:unknown';
      const [name, domain] = value.split('@');
      const safeName = name ? `${name[0] || ''}***` : '***';
      return domain ? `${safeName}@${domain}` : `${safeName}`;
    },
    redactPassword: (value) => {
      if (!value) return 'secret:unknown';
      return `${value.slice(0, 1)}${'*'.repeat(Math.max(value.length - 1, 3))}`;
    },
  },
};

const defaultFields: ReportField[] = [
  'target',
  'service',
  'attemptSummary',
  'candidateSpace',
  'timing',
  'redactedAttempts',
];

const STORAGE_KEY = 'hydra/report-audit-log';

const Reports: React.FC<HydraReportProps> = ({
  target,
  service,
  attempts,
  totalAttempts,
  candidateSpace,
  charset,
  rule,
  backoffThreshold,
  lockoutThreshold,
}) => {
  const [selectedFields, setSelectedFields] = useState<ReportField[]>(defaultFields);
  const [templateId, setTemplateId] = useState<string>('executive');
  const [format, setFormat] = useState<ReportFormat>('html');
  const [redactionId, setRedactionId] = useState<RedactionProfileId>('strict');
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(() => {
    if (typeof window === 'undefined') {
      return [];
    }
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored) as AuditLogEntry[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('Failed to parse hydra report audit log', error);
      return [];
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(auditLog));
  }, [auditLog]);

  const activeRedaction = redactionProfiles[redactionId];

  const sanitizedAttempts = useMemo(() => {
    return attempts.map((attempt, index) => ({
      ...attempt,
      user: activeRedaction.redactUser(attempt.user, index),
      password: activeRedaction.redactPassword(attempt.password, index),
    }));
  }, [attempts, activeRedaction]);

  const successCount = useMemo(
    () => attempts.filter((attempt) => attempt.result === 'success').length,
    [attempts]
  );

  const timingSummary = useMemo(() => {
    if (!attempts.length) {
      return 'No attempts recorded yet. Generate activity before exporting.';
    }
    const last = attempts[attempts.length - 1];
    const firstTime = attempts[0]?.time ?? 0;
    const lastTime = last?.time ?? firstTime;
    const windowSeconds = Math.max(lastTime - firstTime, 0).toFixed(1);
    return [
      `Observation window: ${windowSeconds}s`,
      backoffThreshold
        ? `Adaptive throttling engaged after ${backoffThreshold} attempts.`
        : 'Adaptive throttling threshold not configured.',
      lockoutThreshold
        ? `Account lockout simulated at ${lockoutThreshold} attempts.`
        : 'Lockout threshold not configured.',
    ].join(' ');
  }, [attempts, backoffThreshold, lockoutThreshold]);

  const dataByField: Record<ReportField, string> = useMemo(
    () => ({
      target:
        target?.trim()
          ? `Target host: <strong>${target.trim()}</strong>.`
          : 'Target host not configured.',
      service: `Protocol: <strong>${service || 'N/A'}</strong>.`,
      attemptSummary: attempts.length
        ? `Total attempts simulated: <strong>${attempts.length}</strong> (success signals: ${successCount}, lockouts prevented: ${Math.max(
            0,
            Math.min(totalAttempts, lockoutThreshold ?? totalAttempts) - attempts.length
          )}).`
        : 'No attempts executed in this session.',
      candidateSpace: candidateSpace
        ? `Estimated credential search space: <strong>${candidateSpace.toLocaleString()}</strong> combinations${
            charset ? ` with charset "${charset}"` : ''
          }${rule ? ` and rule ${rule}` : ''}.`
        : 'Credential search space not calculated.',
      timing: `<p>${timingSummary}</p>`,
      redactedAttempts: sanitizedAttempts.length
        ? `<ol>${sanitizedAttempts
            .map(
              (attempt, index) =>
                `<li><span class="font-mono">${index + 1}.</span> ${
                  attempt.result
                } as ${attempt.user} / ${attempt.password} at ${attempt.time}s.</li>`
            )
            .join('')}</ol>`
        : '<p>No attempts to display yet.</p>',
    }),
    [
      attempts.length,
      candidateSpace,
      charset,
      lockoutThreshold,
      rule,
      sanitizedAttempts,
      service,
      successCount,
      target,
      timingSummary,
      totalAttempts,
    ]
  );

  const previewHtml = useMemo(() => {
    const template = templates[templateId] ?? templates.executive;
    return template.render({
      title: 'Hydra Simulation Report',
      fields: selectedFields,
      data: dataByField,
    });
  }, [dataByField, selectedFields, templateId]);

  const handleFieldToggle = (field: ReportField) => {
    setSelectedFields((current) => {
      if (current.includes(field)) {
        return current.filter((item) => item !== field);
      }
      return [...current, field];
    });
  };

  const handleExport = () => {
    const template = templates[templateId] ?? templates.executive;
    const sanitizedHtml = template.render({
      title: 'Hydra Simulation Report',
      fields: selectedFields,
      data: dataByField,
    });

    const metadata: AuditLogEntry = {
      id: `${Date.now()}`,
      timestamp: new Date().toISOString(),
      template: templateId,
      format,
      fields: selectedFields,
      redaction: redactionId,
      attemptCount: attempts.length,
    };
    setAuditLog((current) => [metadata, ...current].slice(0, 20));

    if (format === 'html') {
      const blob = new Blob([
        `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /><title>Hydra Report</title></head><body>${sanitizedHtml}</body></html>`,
      ], {
        type: 'text/html',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'hydra-report.html';
      anchor.click();
      URL.revokeObjectURL(url);
    } else {
      const pdfPlaceholder = `Hydra Simulation Report\nGenerated: ${metadata.timestamp}\nTemplate: ${templates[templateId]?.label}\nRedaction: ${redactionProfiles[redactionId].label}\n\nThis PDF export is a simulation. Sanitised report contents:\n\n${sanitizedHtml
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')}\n`;
      const blob = new Blob([pdfPlaceholder], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'hydra-report.pdf';
      anchor.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <section className="mt-6 bg-gray-800 rounded p-4" aria-labelledby="hydra-reporting-heading">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 id="hydra-reporting-heading" className="text-lg font-semibold">
            Reporting & Transparency
          </h2>
          <p className="text-sm text-gray-300 max-w-2xl">
            Generate sanitised HTML or PDF reports for demos without exposing raw credentials. Select the
            data points to include, choose a template, and every export is logged for auditing.
          </p>
        </div>
        <div className="text-xs text-gray-400">
          <p>Exports logged: {auditLog.length}</p>
          <p>Active redaction: {redactionProfiles[redactionId].label}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-400 mb-2">
            Fields
          </h3>
          <ul className="space-y-2">
            {Object.entries(fieldCatalog).map(([field, info]) => {
              const typedField = field as ReportField;
              return (
                <li key={field} className="flex items-start gap-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(typedField)}
                      onChange={() => handleFieldToggle(typedField)}
                      className="mt-0.5"
                      aria-label={info.label}
                    />
                    <span>
                      <span className="font-medium text-sm text-white block">
                        {info.label}
                      </span>
                      <span className="text-xs text-gray-400">{info.description}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 space-y-2">
            <label className="block text-sm font-semibold text-gray-300" htmlFor="report-template">
              Template
            </label>
            <select
              id="report-template"
              value={templateId}
              onChange={(event) => setTemplateId(event.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm"
            >
              {Object.entries(templates).map(([id, info]) => (
                <option key={id} value={id}>
                  {info.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400">
              {templates[templateId]?.description}
            </p>
          </div>
          <div className="mt-4 space-y-2">
            <label className="block text-sm font-semibold text-gray-300" htmlFor="report-redaction">
              Redaction profile
            </label>
            <select
              id="report-redaction"
              value={redactionId}
              onChange={(event) => setRedactionId(event.target.value as RedactionProfileId)}
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm"
            >
              {Object.entries(redactionProfiles).map(([id, info]) => (
                <option key={id} value={id}>
                  {info.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400">
              {redactionProfiles[redactionId]?.description}
            </p>
          </div>
          <div className="mt-4 space-y-2">
            <span className="block text-sm font-semibold text-gray-300">
              Export format
            </span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="report-format"
                  value="html"
                  checked={format === 'html'}
                  onChange={() => setFormat('html')}
                  aria-label="Export as HTML"
                />
                HTML
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="report-format"
                  value="pdf"
                  checked={format === 'pdf'}
                  onChange={() => setFormat('pdf')}
                  aria-label="Export as PDF"
                />
                PDF
              </label>
            </div>
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-sm rounded disabled:opacity-50"
            disabled={selectedFields.length === 0}
          >
            Export report
          </button>
        </div>
        <div>
          <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-400 mb-2">
            Preview
          </h3>
          <div className="bg-gray-900 border border-gray-700 rounded p-3 h-80 overflow-auto text-sm">
            <div
              className="report-preview space-y-2"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
          <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-400 mt-6 mb-2">
            Audit trail
          </h3>
          <div className="bg-gray-900 border border-gray-700 rounded p-3 h-40 overflow-auto text-xs">
            {auditLog.length === 0 ? (
              <p className="text-gray-400">No exports logged yet.</p>
            ) : (
              <ul className="space-y-2">
                {auditLog.map((entry) => (
                  <li key={entry.id} className="border-b border-gray-800 pb-2 last:border-b-0 last:pb-0">
                    <p className="text-gray-300">
                      {new Date(entry.timestamp).toLocaleString()} – {entry.format.toUpperCase()} via {entry.template}
                    </p>
                    <p className="text-gray-400">Fields: {entry.fields.join(', ') || 'none'}</p>
                    <p className="text-gray-500">Redaction: {entry.redaction}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Reports;
