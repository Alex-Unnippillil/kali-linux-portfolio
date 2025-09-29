'use client';

import React from 'react';
import { useEttercapFilterState } from './FilterStateProvider';

export default function FilterPreview() {
  const { beforePackets, filteredPackets } = useEttercapFilterState();

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div>
        <h3 className="mb-2 font-bold">Before</h3>
        <ul
          className="space-y-1 rounded border border-gray-800 bg-gray-900 p-2 font-mono text-sm"
          data-testid="ettercap-before-list"
        >
          {beforePackets.map((packet, idx) => (
            <li key={`${packet}-${idx}`}>{packet}</li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-2 font-bold">After</h3>
        <ul
          className="space-y-1 rounded border border-gray-800 bg-gray-900 p-2 font-mono text-sm"
          data-testid="ettercap-after-list"
        >
          {filteredPackets.map((packet, idx) => (
            <li key={`${packet}-${idx}`}>{packet}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
