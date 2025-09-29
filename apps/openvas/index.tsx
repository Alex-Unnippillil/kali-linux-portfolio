'use client';

import React, { useMemo, useState } from 'react';
import ResultDiff from './components/ResultDiff';
import { sampleData } from './data';
import {
  computeAggregatedTotal,
  computeSeverityTimeline,
  computeSeverityTotals,
  flattenFindings,
  severityLevels,
} from './analytics';
import type { Severity } from './types';

const riskColors: Record<Severity, string> = {
  Low: 'bg-green-700',
  Medium: 'bg-yellow-700',
  High: 'bg-orange-700',
  Critical: 'bg-red-700',
};

const cvssColor = (score: number) => {
  if (score >= 9) return 'bg-red-700';
  if (score >= 7) return 'bg-orange-700';
  if (score >= 4) return 'bg-yellow-700';
  return 'bg-green-700';
};

const OpenVASReport: React.FC = () => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const remediationTags = useMemo(() => {
    const tags = new Set<string>();
    sampleData.forEach((h) => h.vulns.forEach((v) => tags.add(v.remediation)));
    return Array.from(tags);
  }, []);

  const findings = useMemo(() => flattenFindings(sampleData), []);

  const riskSummary = useMemo(() => {
    const summary: Record<Severity, number> = {
      Low: 0,
      Medium: 0,
      High: 0,
      Critical: 0,
    };
    sampleData.forEach((h) => {
      summary[h.risk] += 1;
    });
    return summary;
  }, []);

  const severityTimeline = useMemo(
    () => computeSeverityTimeline(sampleData),
    [],
  );

  const severityTotals = useMemo(
    () => computeSeverityTotals(severityTimeline),
    [severityTimeline],
  );

  const aggregatedTotal = useMemo(
    () => computeAggregatedTotal(severityTimeline),
    [severityTimeline],
  );

  const trendData = useMemo(
    () => severityTimeline.map((entry) => entry.total),
    [severityTimeline],
  );
  const maxTrend = Math.max(...trendData, 1);
  const trendWidth = 360;
  const trendHeight = 120;
  const trendStep =
    trendData.length > 1 ? trendWidth / (trendData.length - 1) : trendWidth;
  const trendPath = trendData
    .map((v, i) => {
      const x = i * trendStep;
      const y = trendHeight - (v / maxTrend) * trendHeight;
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');

  const maxHeatValue = useMemo(() => {
    let max = 0;
    severityTimeline.forEach((entry) => {
      severityLevels.forEach((severity) => {
        max = Math.max(max, entry.counts[severity]);
      });
    });
    return Math.max(max, 1);
  }, [severityTimeline]);

  const toggle = (id: string) =>
    setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(findings, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'openvas-findings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const header = 'Host,ID,Name,CVSS,EPSS,Description,Remediation';
    const rows = findings.map(
      (f) =>
        `${f.host},${f.id},"${f.name}",${f.cvss},${f.epss},"${f.description}","${f.remediation}"`,
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'openvas-findings.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">OpenVAS Report</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportJSON}
            className="px-2 py-1 bg-blue-600 rounded text-sm"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={exportCSV}
            className="px-2 py-1 bg-blue-600 rounded text-sm"
          >
            Export CSV
          </button>
        </div>
      </div>

      <section>
        <h2 className="text-xl mb-2">Scan Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {Object.entries(riskSummary).map(([risk, count]) => (
            <div
              key={risk}
              className={`p-4 rounded ${riskColors[risk as keyof typeof riskColors]}`}
            >
              <p className="text-sm">{risk}</p>
              <p className="text-2xl font-bold">{count}</p>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <svg
            width={trendWidth}
            height={trendHeight}
            className="bg-gray-800 rounded"
          >
            <path d={trendPath} stroke="#0ea5e9" strokeWidth={2} fill="none" />
          </svg>
          <div className="text-xs text-gray-300">
            Aggregated timeline total: {aggregatedTotal} findings (dataset total:{' '}
            {findings.length})
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl mb-2">Severity Heatmap</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-700 text-sm">
            <thead className="bg-gray-800">
              <tr>
                <th className="p-2 text-left">Severity</th>
                {severityTimeline.map((entry) => (
                  <th key={entry.date} className="p-2 text-center">
                    {new Date(entry.date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {severityLevels.map((severity) => (
                <tr key={severity}>
                  <th className="p-2 text-left bg-gray-800 font-medium">
                    {severity}
                    <span className="ml-2 text-xs text-gray-400">
                      {severityTotals[severity]}
                    </span>
                  </th>
                  {severityTimeline.map((entry) => {
                    const value = entry.counts[severity];
                    const intensity = value
                      ? 0.2 + (0.7 * value) / maxHeatValue
                      : 0;
                    return (
                      <td
                        key={`${entry.date}-${severity}`}
                        className="p-2 text-center align-middle"
                        style={{
                          backgroundColor: value
                            ? `rgba(14, 165, 233, ${intensity.toFixed(2)})`
                            : 'transparent',
                        }}
                      >
                        {value > 0 ? value : ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl mb-2">Findings</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th className="p-2">Host</th>
              <th className="p-2">Vulnerability</th>
              <th className="p-2">Detected</th>
              <th className="p-2">CVSS</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((f) => {
              const key = `${f.host}-${f.id}`;
              return (
                <React.Fragment key={key}>
                  <tr
                    className="cursor-pointer hover:bg-gray-800"
                    onClick={() => toggle(key)}
                  >
                    <td className="p-2">{f.host}</td>
                    <td className="p-2">{f.name}</td>
                    <td className="p-2 whitespace-nowrap">
                      {new Date(f.detectedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="p-2">
                      <div className="w-full bg-gray-700 rounded h-3">
                        <div
                          className={`${cvssColor(f.cvss)} h-3 rounded`}
                          style={{ width: `${(f.cvss / 10) * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                  {expanded[key] && (
                    <tr>
                      <td colSpan={4} className="p-2 bg-gray-800">
                        <p className="text-sm mb-1">{f.description}</p>
                        <p className="text-xs text-yellow-300">{f.remediation}</p>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </section>

      <h2 className="text-xl">Remediation Summary</h2>
      <div className="flex flex-wrap gap-2" role="list">
        {remediationTags.map((tag) => (
          <span
            key={tag}
            role="listitem"
            className="px-2 py-1 bg-green-700 rounded text-sm"
          >
            {tag}
          </span>
        ))}
      </div>

      <h2 className="text-xl mt-6 mb-2">Compare Reports</h2>
      <ResultDiff />
      <p className="mt-4 text-xs text-gray-400">
        All data is static and for demonstration only. Use OpenVAS responsibly
        and only on systems you are authorized to test.
      </p>
    </div>
  );
};

export default OpenVASReport;

