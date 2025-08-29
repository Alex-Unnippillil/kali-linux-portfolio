'use client';

import React, { useState } from 'react';
import mappings from './control-mappings.json';

interface Finding {
  plugin: number;
  severity: string;
}

interface ControlMapping {
  plugin: number;
  cis: string[];
  nist: string[];
}

const frameworks = ['cis', 'nist'] as const;
type Framework = (typeof frameworks)[number];

const ControlMapper: React.FC<{ findings: Finding[] }> = ({ findings }) => {
  const [filters, setFilters] = useState<Record<Framework, boolean>>({
    cis: true,
    nist: true,
  });

  const toggle = (fw: Framework) =>
    setFilters((f) => ({ ...f, [fw]: !f[fw] }));

  const mappingMap = new Map<number, ControlMapping>(
    (mappings as ControlMapping[]).map((m) => [m.plugin, m])
  );

  return (
    <div>
      <h3 className="text-lg mb-2">Control Mapping</h3>
      <div className="flex gap-2 mb-4">
        {frameworks.map((fw) => (
          <label key={fw} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={filters[fw]}
              onChange={() => toggle(fw)}
            />
            {fw.toUpperCase()}
          </label>
        ))}
      </div>
      <ul className="space-y-1">
        {findings.map((f) => {
          const m = mappingMap.get(f.plugin);
          if (!m) return null;
          return (
            <li key={f.plugin} className="border-b border-gray-700 pb-1">
              <span className="font-mono">{f.plugin}</span>
              {filters.cis && m.cis.length > 0 && (
                <span className="ml-2">CIS: {m.cis.join(', ')}</span>
              )}
              {filters.nist && m.nist.length > 0 && (
                <span className="ml-2">NIST: {m.nist.join(', ')}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ControlMapper;
