'use client';
import React, { useMemo, useState } from 'react';
import issues from './data.json';

interface Issue {
  id: number;
  issue: string;
  remediation: string;
  severity: string;
}

type SortKey = keyof Issue;

const RemediationTable: React.FC = () => {
  const data: Issue[] = issues as Issue[];
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'issue',
    direction: 'asc',
  });

  const sorted = useMemo(() => {
    const sortedData = [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortConfig.direction === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
    return sortedData;
  }, [data, sortConfig]);

  const requestSort = (key: SortKey) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    );
  };

  const indicator = (key: SortKey) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? '▲' : '▼';
  };

  return (
    <div className="mt-4">
      <h3 className="font-semibold mb-2">Remediation Tips</h3>
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            <th className="cursor-pointer" onClick={() => requestSort('issue')}>
              Issue {indicator('issue')}
            </th>
            <th className="cursor-pointer" onClick={() => requestSort('remediation')}>
              Remediation {indicator('remediation')}
            </th>
            <th className="cursor-pointer" onClick={() => requestSort('severity')}>
              Severity {indicator('severity')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item) => (
            <tr key={item.id} className="border-t border-gray-700">
              <td className="py-1 pr-2">{item.issue}</td>
              <td className="py-1 pr-2 text-yellow-300">{item.remediation}</td>
              <td className="py-1 pr-2">{item.severity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RemediationTable;
