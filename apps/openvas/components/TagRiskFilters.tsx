'use client';

import React, { useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

export interface Vulnerability {
  id: string;
  name: string;
  cvss: number;
  epss: number;
  description: string;
  remediation: string;
}

export interface HostReport {
  host: string;
  risk: 'Low' | 'Medium' | 'High' | 'Critical';
  vulns: Vulnerability[];
}

interface Props {
  reports: HostReport[];
}

const TagRiskFilters: React.FC<Props> = ({ reports }) => {
  const [tagMap, setTagMap] = usePersistentState<Record<string, string[]>>(
    'openvas-tags',
    {},
  );
  const [risk, setRisk] = useState<HostReport['risk'] | 'All'>('All');
  const [tagFilter, setTagFilter] = useState('');

  const allTags = Array.from(new Set(Object.values(tagMap).flat()));

  const addTag = (id: string, tag: string) => {
    const t = tag.trim();
    if (!t) return;
    setTagMap((prev) => {
      const existing = prev[id] || [];
      if (existing.includes(t)) return prev;
      return { ...prev, [id]: [...existing, t] };
    });
  };

  const filtered = reports
    .filter((r) => risk === 'All' || r.risk === risk)
    .map((r) => ({
      ...r,
      vulns: r.vulns.filter((v) => {
        const tags = tagMap[v.id] || [];
        return !tagFilter || tags.includes(tagFilter);
      }),
    }))
    .filter((r) => r.vulns.length > 0);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <select
          value={risk}
          onChange={(e) => setRisk(e.target.value as HostReport['risk'] | 'All')}
          className="bg-gray-800 p-1 rounded"
        >
          <option value="All">All severities</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="bg-gray-800 p-1 rounded"
        >
          <option value="">All tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 md:grid-cols-2" role="list">
        {filtered.map((host) => (
          <div
            key={host.host}
            className="bg-gray-800 p-4 rounded"
            role="listitem"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl">{host.host}</h2>
              <span
                className={`px-2 py-1 rounded text-sm ${
                  {
                    Low: 'bg-green-700',
                    Medium: 'bg-yellow-700',
                    High: 'bg-orange-700',
                    Critical: 'bg-red-700',
                  }[host.risk]
                }`}
              >
                {host.risk}
              </span>
            </div>
            <ul className="space-y-2">
              {host.vulns.map((v) => (
                <li key={v.id} className="bg-gray-900 p-2 rounded">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold">{v.name}</p>
                    <div className="flex gap-1">
                      <span
                        className="px-1.5 py-0.5 rounded text-xs bg-blue-700"
                        aria-label={`CVSS score ${v.cvss}`}
                      >
                        CVSS {v.cvss}
                      </span>
                      <span
                        className="px-1.5 py-0.5 rounded text-xs bg-purple-700"
                        aria-label={`EPSS probability ${v.epss}`}
                      >
                        EPSS {Math.round(v.epss * 100)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-sm mb-1">{v.description}</p>
                  <p className="text-xs text-yellow-300">{v.remediation}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(tagMap[v.id] || []).map((t) => (
                      <span
                        key={t}
                        className="px-1.5 py-0.5 bg-green-700 rounded text-xs"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Add tag"
                    className="mt-1 w-full bg-gray-800 p-1 rounded text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addTag(v.id, (e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TagRiskFilters;
