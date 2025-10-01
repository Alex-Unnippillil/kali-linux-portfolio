import React, { useMemo, useState } from 'react';
import usePersistentState from '../../../../hooks/usePersistentState';
import defaultTemplates from '../../../../templates/export/report-templates.json';
import {
  openFileDialog,
  FileDialogError,
  getFileDialogConstraint,
} from '../../../../utils/fileDialogs';

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
  const [importInfo, setImportInfo] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const constraint = getFileDialogConstraint('reconTemplates');

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

  const applyTemplates = (
    parsed: Record<string, TemplateDef>,
    sourceLabel: string,
    successMessage?: string,
  ) => {
    setTemplateData(parsed);
    const first = Object.keys(parsed)[0];
    if (first) setTemplate(first);
    setImportError(null);
    setImportInfo(
      successMessage ??
        `Loaded ${Object.keys(parsed).length} template${
          Object.keys(parsed).length === 1 ? '' : 's'
        } from ${sourceLabel}`,
    );
  };

  const importFromText = (text: string, label: string, successMessage?: string) => {
    setImportError(null);
    setImportInfo(null);
    try {
      const parsed = JSON.parse(text) as Record<string, TemplateDef>;
      applyTemplates(parsed, label, successMessage);
    } catch {
      setImportError('Template files must contain valid JSON.');
    }
  };

  const importFromFile = async (file: File, label: string, successMessage?: string) => {
    setImportError(null);
    setImportInfo(null);
    let text: string;
    try {
      text = await file.text();
    } catch {
      setImportError('Unable to read the selected template file.');
      return;
    }
    importFromText(text, label, successMessage);
  };

  const handleImport = async () => {
    try {
      const handle = await openFileDialog('reconTemplates');
      if (!handle) return;
      const file = await handle.getFile();
      await importFromFile(file, file.name);
    } catch (error) {
      if (error instanceof FileDialogError) {
        setImportError(error.message);
        setImportInfo(null);
        return;
      }
      console.error(error);
      setImportError('An unexpected error occurred while opening the file.');
    }
  };

  const handleSample = async () => {
    if (!constraint.sampleData) return;
    const { getContent, fileName, label, successMessage } = constraint.sampleData;
    const text = await getContent();
    importFromText(text, label ?? fileName, successMessage);
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
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleImport}
              className="bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded"
            >
              Select JSON file
            </button>
            {constraint.sampleData && (
              <button
                type="button"
                onClick={handleSample}
                className="underline text-xs self-start text-gray-300 hover:text-white"
              >
                {constraint.sampleData.label}
              </button>
            )}
            {importInfo && (
              <p className="text-green-300 text-sm">{importInfo}</p>
            )}
            {importError && (
              <p className="text-red-300 text-sm">{importError}</p>
            )}
          </div>
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
    </div>
  );
}

