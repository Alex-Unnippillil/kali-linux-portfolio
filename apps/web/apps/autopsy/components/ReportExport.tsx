import React, { useMemo } from 'react';
import copyToClipboard from '../../../utils/clipboard';

interface Artifact {
  name: string;
  type: string;
  description: string;
  size: number;
  plugin: string;
  timestamp: string;
}

interface ReportExportProps {
  caseName?: string;
  artifacts: Artifact[];
}

const escapeHtml = (str: string) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const ReportExport: React.FC<ReportExportProps> = ({ caseName = 'case', artifacts }) => {
  const htmlReport = useMemo(() => {
    const rows = artifacts
      .map(
        (a) =>
          `<tr><td>${escapeHtml(a.name)}</td><td>${escapeHtml(a.type)}</td><td>${escapeHtml(a.description)}</td><td>${a.size}</td><td>${escapeHtml(a.plugin)}</td><td>${escapeHtml(a.timestamp)}</td></tr>`
      )
      .join('');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(caseName)} Report</title></head><body><h1>${escapeHtml(caseName)}</h1><table border="1"><tr><th>Name</th><th>Type</th><th>Description</th><th>Size</th><th>Plugin</th><th>Timestamp</th></tr>${rows}</table></body></html>`;
  }, [artifacts, caseName]);

  const exportReport = () => {
    const blob = new Blob([htmlReport], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${caseName || 'case'}-report.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyReport = () => {
    copyToClipboard(htmlReport);
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={copyReport}
        className="rounded border border-kali-border/60 bg-kali-muted px-3 py-1 text-sm text-kali-text shadow-sm transition hover:bg-kali-muted/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus/80"
      >
        Copy HTML Report
      </button>
      <button
        onClick={exportReport}
        className="rounded border border-kali-accent/80 bg-kali-accent px-3 py-1 text-sm font-semibold text-kali-text shadow-sm transition hover:bg-kali-accent/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus"
      >
        Download HTML Report
      </button>
    </div>
  );
};

export default ReportExport;

