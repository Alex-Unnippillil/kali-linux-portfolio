import React, { useMemo, useState } from 'react';
import usePersistentState from '../../../../hooks/usePersistentState';
import defaultTemplates from '../../../../templates/export/report-templates.json';
import {
  computeImportRisk,
  logImportMetadata,
  type ImportRisk,
  type RiskLevel,
} from '../utils/importRisk';

interface Finding {
  title: string;
  description: string;
  severity: string;
}

const mockFindings: Finding[] = [
  {
    title: 'Open Port 80',
    description: 'HTTP service detected on port 80',
    severity: 'Low',
  },
  {
    title: 'Deprecated TLS Version',
    description: 'Server supports TLS 1.0',
    severity: 'Medium',
  },
  {
    title: 'SQL Injection',
    description: 'User parameter vulnerable to injection',
    severity: 'High',
  },
];

interface TemplateDef {
  name: string;
  template: string;
}

const renderTemplate = (tpl: string, findings: Finding[]) =>
  tpl.replace(/{{#findings}}([\s\S]*?){{\/findings}}/, (_, segment) =>
    findings
      .map((f, i) =>
        segment
          .replace(/{{index}}/g, String(i + 1))
          .replace(/{{title}}/g, f.title)
          .replace(/{{severity}}/g, f.severity)
          .replace(/{{description}}/g, f.description),
      )
      .join(''),
  );

const MAX_PREVIEW_LENGTH = 2000;

const isTemplateRecord = (value: unknown): value is Record<string, TemplateDef> => {
  if (!value || typeof value !== 'object') return false;
  return Object.values(value).every(
    (entry) =>
      entry &&
      typeof entry === 'object' &&
      'name' in entry &&
      'template' in entry &&
      typeof (entry as TemplateDef).name === 'string' &&
      typeof (entry as TemplateDef).template === 'string',
  );
};

function RiskBadge({ level }: { level: RiskLevel }) {
  const styles: Record<RiskLevel, string> = {
    low: 'bg-green-700 text-green-100',
    medium: 'bg-yellow-700 text-yellow-100',
    high: 'bg-red-700 text-red-100',
  };

  const labelMap: Record<RiskLevel, string> = {
    low: 'Low risk',
    medium: 'Medium risk',
    high: 'High risk',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${styles[level]}`}
      role="status"
      aria-live="polite"
    >
      {labelMap[level]}
    </span>
  );
}

export default function ReportTemplates() {
  const [templateData, setTemplateData] = useState<Record<string, TemplateDef>>(defaultTemplates);
  const keys = Object.keys(templateData);
  const [template, setTemplate] = usePersistentState('reconng-report-template', keys[0]);

  const [showDialog, setShowDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [importRisk, setImportRisk] = useState<ImportRisk | null>(null);
  const [hasPreviewed, setHasPreviewed] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const templateKey = keys.includes(template) ? template : keys[0];
  const report = useMemo(
    () => renderTemplate(templateData[templateKey].template, mockFindings),
    [templateKey, templateData],
  );

  const exportReport = () => {
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${templateKey}-report.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetImportState = () => {
    setPendingFile(null);
    setImportRisk(null);
    setHasPreviewed(false);
    setPreviewContent('');
    setImportError(null);
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const riskAssessment = computeImportRisk(file);
    setPendingFile(file);
    setImportRisk(riskAssessment);
    setHasPreviewed(riskAssessment.level !== 'high');
    setPreviewContent('');
    setImportError(null);
  };

  const readFileAsText = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Unsupported file result.'));
        }
      };
      reader.onerror = () => {
        reject(reader.error ?? new Error('Failed to read file.'));
      };
      reader.readAsText(file);
    });

  const previewFile = async () => {
    if (!pendingFile) return;
    try {
      const text = await readFileAsText(pendingFile);
      setPreviewContent(text.slice(0, MAX_PREVIEW_LENGTH));
      setHasPreviewed(true);
    } catch (error) {
      setImportError('Unable to preview file.');
    }
  };

  const importFile = async () => {
    if (!pendingFile) return;

    try {
      const text = await readFileAsText(pendingFile);
      const parsed = JSON.parse(text) as unknown;
      if (!isTemplateRecord(parsed)) {
        throw new Error('Invalid template format');
      }
      setTemplateData(parsed);
      const first = Object.keys(parsed)[0];
      if (first) setTemplate(first);
      logImportMetadata({
        fileName: pendingFile.name,
        fileType: pendingFile.type,
        fileSize: pendingFile.size,
        level: importRisk?.level ?? 'low',
        timestamp: Date.now(),
      });
      setShowDialog(false);
      resetImportState();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error(error);
      }
      setImportError('Unable to import template file. Ensure it is valid JSON.');
    }
  };

  const closeDialog = () => {
    setShowDialog(false);
    resetImportState();
  };

  const shareJson = JSON.stringify(templateData, null, 2);
  const copyShare = () => {
    try {
      navigator.clipboard.writeText(shareJson);
    } catch {
      // ignore
    }
  };

  const importDisabled =
    !pendingFile || (importRisk?.level === 'high' && !hasPreviewed);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-2">
        <label htmlFor="template">Template</label>
        <select
          id="template"
          value={templateKey}
          onChange={(e) => setTemplate(e.target.value)}
          className="bg-gray-800 px-2 py-1"
        >
          {Object.entries(templateData).map(([key, t]) => (
            <option key={key} value={key}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={exportReport}
          className="bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded"
        >
          Export
        </button>
        <button
          type="button"
          onClick={() => setShowDialog(true)}
          className="bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded"
        >
          Import/Share
        </button>
      </div>
      <pre className="flex-1 bg-black p-2 overflow-auto whitespace-pre-wrap text-sm">
        {report}
      </pre>
      {showDialog && (
        <dialog open className="p-4 bg-gray-800 text-white rounded max-w-2xl">
          <form method="dialog" className="space-y-3">
            <div>
              <label htmlFor="template-upload" className="font-semibold">
                Import templates (JSON)
              </label>
              <input
                id="template-upload"
                type="file"
                accept="application/json"
                onChange={handleFileSelection}
                className="mt-1"
              />
              {importRisk && (
                <div className="mt-2 space-y-1">
                  <RiskBadge level={importRisk.level} />
                  <ul className="list-disc list-inside text-xs text-gray-200">
                    {importRisk.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                  {importRisk.level === 'high' && (
                    <p className="text-xs text-red-300">
                      Preview is required before importing high risk files.
                    </p>
                  )}
                </div>
              )}
              <p className="text-xs text-gray-300 mt-2">
                Templates never leave your browser. File name, type, size, and
                risk rating are logged locally for auditability.
              </p>
            </div>

            {previewContent && (
              <div>
                <label htmlFor="template-preview" className="font-semibold">
                  Preview
                </label>
                <textarea
                  id="template-preview"
                  readOnly
                  value={previewContent}
                  className="w-full h-40 p-2 text-black"
                  aria-label="Template preview"
                />
                {pendingFile && pendingFile.size > MAX_PREVIEW_LENGTH && (
                  <p className="text-xs text-gray-300 mt-1">
                    Preview truncated to first {MAX_PREVIEW_LENGTH.toLocaleString()} characters.
                  </p>
                )}
              </div>
            )}

            {importError && (
              <p className="text-sm text-red-300" role="alert">
                {importError}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  void previewFile();
                }}
                className="bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded"
                disabled={!pendingFile}
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => {
                  void importFile();
                }}
                className="bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded disabled:opacity-60"
                disabled={importDisabled}
              >
                Import
              </button>
              <button
                type="button"
                onClick={copyShare}
                className="bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded"
              >
                Copy Share JSON
              </button>
              <button
                type="button"
                onClick={closeDialog}
                className="bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded"
              >
                Close
              </button>
            </div>

            <div>
              <label htmlFor="template-share" className="font-semibold">
                Share templates
              </label>
              <textarea
                id="template-share"
                readOnly
                value={shareJson}
                className="w-full h-40 p-1 text-black"
                aria-label="Template JSON"
              />
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
}
