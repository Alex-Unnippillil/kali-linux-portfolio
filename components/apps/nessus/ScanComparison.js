import React, { useMemo } from 'react';
import previousScan from './fixtures/scan-1.json';
import currentScan from './fixtures/scan-2.json';

const severityOrder = ['Critical', 'High', 'Medium', 'Low'];
const severityColors = {
  Critical: '#991b1b',
  High: '#b45309',
  Medium: '#a16207',
  Low: '#1e40af',
};

const summarize = (scan) => {
  const summary = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  scan.forEach((vuln) => {
    if (summary[vuln.severity] !== undefined) summary[vuln.severity] += 1;
  });
  return summary;
};

const ScanComparison = ({ previous = previousScan, current = currentScan }) => {
  const { added, removed, changed } = useMemo(() => {
    const prevMap = new Map(previous.map((v) => [v.id, v]));
    const curMap = new Map(current.map((v) => [v.id, v]));
    const added = current.filter((v) => !prevMap.has(v.id));
    const removed = previous.filter((v) => !curMap.has(v.id));
    const changed = current
      .filter((v) => {
        const prev = prevMap.get(v.id);
        return prev && prev.severity !== v.severity;
      })
      .map((v) => ({ ...v, previousSeverity: prevMap.get(v.id).severity }));
    return { added, removed, changed };
  }, [previous, current]);

  const summary = useMemo(() => summarize(current), [current]);
  const maxCount = Math.max(
    ...severityOrder.map((level) => summary[level] || 0),
    1
  );

  return (
    <div className="mb-4">
      <h3 className="text-lg mb-2">Executive Summary</h3>
      <svg
        width="260"
        height="120"
        role="img"
        aria-label="Executive summary chart"
        className="mx-auto mb-4"
      >
        {severityOrder.map((level, idx) => {
          const count = summary[level] || 0;
          const barHeight = (count / maxCount) * 80;
          const x = idx * 60 + 20;
          const y = 100 - barHeight;
          return (
            <g key={level}>
              <rect
                x={x}
                y={y}
                width="40"
                height={barHeight}
                fill={severityColors[level]}
              />
              <text
                x={x + 20}
                y={y - 4}
                textAnchor="middle"
                className="text-xs fill-white"
              >
                {count}
              </text>
              <text
                x={x + 20}
                y={110}
                textAnchor="middle"
                className="text-xs fill-white"
              >
                {level}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="space-y-2">
        {added.length > 0 && (
          <div>
            <h4 className="font-semibold text-green-400">New Findings</h4>
            <ul className="ml-4 list-disc">
              {added.map((v) => (
                <li key={v.id} className="text-sm">
                  {v.name} ({v.severity})
                </li>
              ))}
            </ul>
          </div>
        )}
        {removed.length > 0 && (
          <div>
            <h4 className="font-semibold text-blue-400">Resolved</h4>
            <ul className="ml-4 list-disc">
              {removed.map((v) => (
                <li key={v.id} className="text-sm">
                  {v.name} ({v.severity})
                </li>
              ))}
            </ul>
          </div>
        )}
        {changed.length > 0 && (
          <div>
            <h4 className="font-semibold text-yellow-400">Severity Changes</h4>
            <ul className="ml-4 list-disc">
              {changed.map((v) => (
                <li key={v.id} className="text-sm">
                  {v.name}: {v.previousSeverity} → {v.severity}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanComparison;
