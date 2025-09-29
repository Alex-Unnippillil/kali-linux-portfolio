'use client';

import React, { useMemo, useRef } from 'react';
import { toPng } from 'html-to-image';
import { Severity, severities } from '../types';

const colors: Record<Severity, string> = {
  Critical: 'bg-red-700',
  High: 'bg-orange-600',
  Medium: 'bg-yellow-600',
  Low: 'bg-green-600',
  Info: 'bg-gray-600',
};

interface Props {
  summary: Record<Severity, number>;
  trend: number[];
  filters?: {
    severity?: Record<Severity, boolean>;
    tags?: string[];
  };
  onExport?: (type: 'csv' | 'json' | 'image', payload: string) => void;
}

export interface SummaryRow {
  severity: Severity;
  count: number;
  included: boolean;
}

export const buildSummaryRows = (
  summary: Record<Severity, number>,
  severityFilters?: Record<Severity, boolean>,
): SummaryRow[] =>
  severities.map((severity) => {
    const included = severityFilters ? Boolean(severityFilters[severity]) : true;
    const value = summary[severity] ?? 0;
    return {
      severity,
      count: included ? value : 0,
      included,
    };
  });

export const formatSummaryCsv = (
  rows: SummaryRow[],
  tags: string[],
  trend: number[],
): string => {
  const activeSeverities = rows
    .filter((row) => row.included)
    .map((row) => row.severity)
    .join('|');
  const filtersLine = `Active Severities,${activeSeverities || 'None'}`;
  const tagsLine = `Selected Tags,${tags.length > 0 ? tags.join('|') : 'All'}`;
  const header = 'Severity,Count,Included';
  const entries = rows.map(
    (row) => `${row.severity},${row.count},${row.included ? 'true' : 'false'}`,
  );
  const totals = `Trend,${trend.join('|')},`;
  return [filtersLine, tagsLine, header, ...entries, totals].join('\n');
};

export const formatSummaryJson = (
  rows: SummaryRow[],
  tags: string[],
  trend: number[],
) =>
  JSON.stringify(
    {
      filters: {
        severities: rows
          .filter((row) => row.included)
          .map((row) => row.severity),
        tags,
      },
      summary: rows.map(({ severity, count, included }) => ({
        severity,
        count,
        included,
      })),
      totals: {
        overall: rows.reduce((acc, row) => acc + row.count, 0),
        trend,
      },
    },
    null,
    2,
  );

const triggerDownload = (filename: string, content: string, mime: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export default function SummaryDashboard({ summary, trend, filters, onExport }: Props) {
  const max = Math.max(1, ...trend);
  const width = 100;
  const height = 24;
  const step = trend.length > 1 ? width / (trend.length - 1) : width;
  const d = trend
    .map((v, i) => {
      const x = i * step;
      const y = height - (v / max) * height;
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');

  const containerRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(
    () => buildSummaryRows(summary, filters?.severity),
    [summary, filters?.severity],
  );

  const tags = filters?.tags ?? [];

  const handleCsvExport = () => {
    const csv = formatSummaryCsv(rows, tags, trend);
    onExport?.('csv', csv);
    triggerDownload('nessus-summary.csv', csv, 'text/csv;charset=utf-8');
  };

  const handleJsonExport = () => {
    const json = formatSummaryJson(rows, tags, trend);
    onExport?.('json', json);
    triggerDownload('nessus-summary.json', json, 'application/json');
  };

  const handleImageExport = async () => {
    if (!containerRef.current) return;
    try {
      const dataUrl = await toPng(containerRef.current);
      onExport?.('image', dataUrl);
      const link = document.createElement('a');
      link.download = 'nessus-summary.png';
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      // ignore errors
    }
  };

  return (
    <div ref={containerRef} className="space-y-4">
      <div className="grid grid-cols-5 gap-2">
        {rows.map((row) => (
          <div
            key={row.severity}
            data-testid={`summary-card-${row.severity}`}
            className={`p-2 rounded ${colors[row.severity]} ${
              row.included ? '' : 'opacity-50'
            }`}
          >
            <div className="text-xs flex items-center justify-between">
              <span>{row.severity}</span>
              {!row.included && <span className="text-[10px] uppercase">Filtered</span>}
            </div>
            <div className="text-lg font-bold">{row.count}</div>
          </div>
        ))}
      </div>
      {trend.length > 0 && (
        <svg width={width} height={height} className="bg-gray-800 rounded">
          <path d={d} fill="none" stroke="#3b82f6" strokeWidth={2} />
        </svg>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCsvExport}
          className="px-3 py-1 bg-gray-700 rounded"
        >
          Export CSV
        </button>
        <button
          type="button"
          onClick={handleJsonExport}
          className="px-3 py-1 bg-gray-700 rounded"
        >
          Export JSON
        </button>
        <button
          type="button"
          onClick={handleImageExport}
          className="px-3 py-1 bg-gray-700 rounded"
        >
          Export Image
        </button>
      </div>
    </div>
  );
}
