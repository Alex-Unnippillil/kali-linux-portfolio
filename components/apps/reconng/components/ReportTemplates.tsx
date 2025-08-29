import React, { useMemo } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

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

const templates = {
  executive: {
    name: 'Executive Summary',
    render: (findings: Finding[]) =>
      `Executive Summary\n\nFindings:\n${findings
        .map((f) => `- ${f.title} (${f.severity})`)
        .join('\n')}`,
  },
  detailed: {
    name: 'Detailed Report',
    render: (findings: Finding[]) =>
      `Detailed Report\n\n${findings
        .map(
          (f, i) =>
            `${i + 1}. ${f.title}\nSeverity: ${f.severity}\n${f.description}`,
        )
        .join('\n\n')}`,
  },
};

type TemplateKey = keyof typeof templates;

export default function ReportTemplates() {
  const [template, setTemplate] = usePersistentState('reconng-report-template', 'executive');

  const templateKey = template as TemplateKey;
  const report = useMemo(
    () => templates[templateKey].render(mockFindings),
    [templateKey],
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
          {Object.entries(templates).map(([key, t]) => (
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
      </div>
      <pre className="flex-1 bg-black p-2 overflow-auto whitespace-pre-wrap text-sm">
        {report}
      </pre>
    </div>
  );
}

