import React, { useEffect, useMemo, useState } from 'react';

const severityLevels = ['All', 'Critical', 'High', 'Medium', 'Low'];
const severityColors = {
  Critical: '#991b1b',
  High: '#b45309',
  Medium: '#a16207',
  Low: '#1e40af',
};

const sampleHosts = [
  { id: 1, host: '192.168.0.1', cvss: 9.8, severity: 'Critical' },
  { id: 2, host: '192.168.0.2', cvss: 7.5, severity: 'High' },
  { id: 3, host: '192.168.0.3', cvss: 5.0, severity: 'Medium' },
  { id: 4, host: '192.168.0.4', cvss: 2.5, severity: 'Low' },
];

const scaleRadius = (cvss) => cvss * 5;

const HostBubbleChart = ({ hosts = sampleHosts }) => {
  const [filter, setFilter] = useState('All');
  const [displayData, setDisplayData] = useState(hosts);
  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  useEffect(() => {
    let raf = requestAnimationFrame(() => {
      const filtered =
        filter === 'All' ? hosts : hosts.filter((h) => h.severity === filter);
      setDisplayData(filtered);
    });
    return () => cancelAnimationFrame(raf);
  }, [filter, hosts]);

  return (
    <div className="mb-4">
      <div
        role="radiogroup"
        aria-label="Filter hosts by severity"
        className="flex flex-wrap gap-2 mb-2"
      >
        {severityLevels.map((level) => (
          <button
            key={level}
            onClick={() => setFilter(level)}
            aria-pressed={filter === level}
            className={`px-3 py-1 rounded-full text-sm border focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              filter === level
                ? 'bg-white text-black border-gray-300'
                : 'bg-gray-800 text-white border-gray-600'
            }`}
          >
            {level}
          </button>
        ))}
      </div>
      <svg
        width="400"
        height="300"
        role="img"
        aria-label="Host vulnerabilities bubble chart"
        className="mx-auto"
      >
        {displayData.map((host, i) => {
          const radius = scaleRadius(host.cvss);
          const x = ((i + 1) * 400) / (displayData.length + 1);
          const y = 150;
          return (
            <g key={host.id} transform={`translate(${x},${y})`}>
              <circle
                r={radius}
                fill={severityColors[host.severity]}
                aria-label={`${host.host} severity ${host.severity} CVSS ${host.cvss}`}
                style={{
                  transition: prefersReducedMotion ? 'none' : 'all 0.3s ease',
                }}
              />
              <text
                textAnchor="middle"
                dy="0.3em"
                className="text-xs fill-white"
              >
                {host.cvss}
              </text>
            </g>
          );
        })}
      </svg>
      <div aria-live="polite" className="sr-only">
        Showing {displayData.length} hosts for {filter} severity
      </div>
    </div>
  );
};

export default HostBubbleChart;
