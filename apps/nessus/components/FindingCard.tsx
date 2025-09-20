'use client';

import React from 'react';
import { Plugin, Severity } from '../types';

const colors: Record<Severity, string> = {
  Critical: 'border-red-600',
  High: 'border-orange-500',
  Medium: 'border-yellow-500',
  Low: 'border-green-500',
  Info: 'border-gray-500',
};

interface Props {
  plugin: Plugin;
}

export default function FindingCard({ plugin }: Props) {
  return (
    <div className={`border-l-4 ${colors[plugin.severity]} bg-gray-800 p-3 rounded`}>
      <div className="flex justify-between items-center mb-1">
        <span className="font-mono">{plugin.id}</span>
        <span className="text-sm">{plugin.severity}</span>
      </div>
      <div className="font-semibold">{plugin.name}</div>
      <div className="flex gap-2 mt-2 flex-wrap text-xs">
        <span className="px-2 py-1 bg-blue-700 rounded">{plugin.category}</span>
        {plugin.cwe?.map((cwe) => (
          <span key={cwe} className="px-2 py-1 bg-gray-700 rounded">
            CWE-{cwe}
          </span>
        ))}
        {plugin.cve?.map((cve) => (
          <span key={cve} className="px-2 py-1 bg-gray-700 rounded">
            CVE-{cve}
          </span>
        ))}
      </div>
    </div>
  );
}
