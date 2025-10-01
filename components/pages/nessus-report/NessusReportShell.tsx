import React from 'react';
import type { NessusReportShellData } from '../../../utils/ssg/nessus';

const severityColors: Record<string, string> = {
  Critical: '#991b1b',
  High: '#b45309',
  Medium: '#a16207',
  Low: '#1e40af',
};

interface NessusReportShellProps {
  generatedAt: string;
  shell: NessusReportShellData;
}

export const NessusReportShell: React.FC<NessusReportShellProps> = ({
  generatedAt,
  shell,
}) => {
  return (
    <div className="min-h-screen bg-gray-900 p-4 text-white" data-hydrated="false">
      <h1 className="mb-2 text-2xl">Sample Nessus Report</h1>
      <p className="mb-4 text-xs text-slate-300">
        Static snapshot generated {new Date(generatedAt).toLocaleString()}
      </p>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {['Critical', 'High', 'Medium', 'Low'].map((sev) => (
          <div
            key={sev}
            className="flex items-center justify-between rounded bg-gray-800 p-2"
          >
            <span
              className="rounded-full px-2 py-0.5 text-xs text-white"
              style={{ backgroundColor: severityColors[sev] }}
            >
              {sev}
            </span>
            <span className="font-mono">{shell.severityCounts[sev] ?? 0}</span>
          </div>
        ))}
      </div>
      <p className="mb-3 text-xs text-slate-400">
        {shell.totalFindings} findings available. Interactive filters load once hydration completes.
      </p>
      <div className="space-y-2 rounded border border-gray-800 bg-gray-950 p-3 text-sm">
        {shell.topFindings.map((finding) => (
          <article key={finding.id}>
            <header className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">{finding.name}</h2>
              <span
                className="rounded-full px-2 py-0.5 text-xs text-white"
                style={{ backgroundColor: severityColors[finding.severity] }}
              >
                {finding.severity}
              </span>
            </header>
            <p className="text-xs text-slate-400">
              CVSS {finding.cvss} · Host {finding.host} · {finding.pluginFamily}
            </p>
            <p className="mt-2 text-sm text-slate-200 line-clamp-3">
              {finding.description}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
};

export default NessusReportShell;
