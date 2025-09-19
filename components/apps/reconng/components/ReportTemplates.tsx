import React, { useMemo, useState } from 'react';
import usePersistentState from '../../../../hooks/usePersistentState';
import defaultTemplates from '../../../../templates/export/report-templates.json';
import { useFileSafetyPrompt } from '../../../../hooks/useFileSafetyPrompt';
import FileSafetyModal from '../../../FileSafetyModal';

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

export default function ReportTemplates() {
  const [templateData, setTemplateData] = useState<Record<string, TemplateDef>>(defaultTemplates);
  const keys = Object.keys(templateData);
  const [template, setTemplate] = usePersistentState('reconng-report-template', keys[0]);
  const { requestFileAccess, modalProps } = useFileSafetyPrompt('ReconngReportTemplates');

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

  const [showDialog, setShowDialog] = useState(false);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await requestFileAccess(
      file,
      async () => {
        try {
          const parsed = JSON.parse(await file.text()) as Record<string, TemplateDef>;
          setTemplateData(parsed);
          const first = Object.keys(parsed)[0];
          if (first) setTemplate(first);
        } catch {
          // ignore parse errors
        }
      },
      { source: 'reconng-report-import' },
    );
    if (e.target) {
      e.target.value = '';
    }
  };

  const shareJson = JSON.stringify(templateData, null, 2);
  const copyShare = () => {
    try {
      navigator.clipboard.writeText(shareJson);
    } catch {
      // ignore
    }
  };

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
        <dialog open className="p-4 bg-gray-800 text-white rounded max-w-md">
          <p className="mb-2">Import templates (JSON)</p>
          <input type="file" accept="application/json" onChange={handleImport} />
          <p className="mt-4 mb-2">Share templates</p>
          <textarea
            readOnly
            value={shareJson}
            className="w-full h-40 p-1 text-black"
          />
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={copyShare}
              className="bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={() => setShowDialog(false)}
              className="bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded"
            >
              Close
            </button>
          </div>
        </dialog>
      )}
      <FileSafetyModal {...modalProps} />
    </div>
  );
}

