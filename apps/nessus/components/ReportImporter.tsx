'use client';

import React, { useState } from 'react';

interface Finding {
  id: string;
  name: string;
  severity: string;
}

const severities = ['Critical', 'High', 'Medium', 'Low', 'Info'] as const;

type Groups = Record<string, Finding[]>;

const ReportImporter: React.FC = () => {
  const [groups, setGroups] = useState<Groups>({});
  const [error, setError] = useState('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const text = await file.text();
      let findings: Finding[] = [];
      if (file.name.endsWith('.csv')) {
        findings = parseCsv(text);
      } else if (file.name.endsWith('.html')) {
        findings = parseHtml(text);
      } else {
        setError('Unsupported file type. Upload HTML or CSV export.');
        return;
      }
      const grouped: Groups = {};
      for (const f of findings) {
        const sev = f.severity || 'Info';
        grouped[sev] = grouped[sev] ? [...grouped[sev], f] : [f];
      }
      setGroups(grouped);
    } catch {
      setError('Failed to parse report.');
    }
  };

  const parseCsv = (text: string): Finding[] => {
    const lines = text.trim().split(/\r?\n/);
    const header = lines.shift()?.split(',') || [];
    const idIdx = header.findIndex((h) => /plugin id/i.test(h));
    const nameIdx = header.findIndex((h) => /plugin name/i.test(h));
    const sevIdx = header.findIndex((h) => /severity/i.test(h));
    return lines.map((line) => {
      const cols = line.split(',');
      return {
        id: cols[idIdx] || '',
        name: cols[nameIdx] || '',
        severity: cols[sevIdx] || 'Info',
      };
    });
  };

  const parseHtml = (text: string): Finding[] => {
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const rows = Array.from(doc.querySelectorAll('table tr'));
    if (rows.length === 0) return [];
    const headerCells = Array.from(rows[0].querySelectorAll('th,td')).map((c) => c.textContent?.trim() || '');
    const idIdx = headerCells.findIndex((h) => /plugin id/i.test(h));
    const nameIdx = headerCells.findIndex((h) => /name/i.test(h));
    const sevIdx = headerCells.findIndex((h) => /severity/i.test(h));
    const findings: Finding[] = [];
    for (const row of rows.slice(1)) {
      const cells = Array.from(row.querySelectorAll('td'));
      if (!cells.length) continue;
      findings.push({
        id: cells[idIdx]?.textContent?.trim() || '',
        name: cells[nameIdx]?.textContent?.trim() || '',
        severity: cells[sevIdx]?.textContent?.trim() || 'Info',
      });
    }
    return findings;
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept=".html,.csv"
        onChange={handleFile}
        className="block w-full text-sm text-gray-200"
      />
      {error && <p className="text-red-400">{error}</p>}
      {Object.keys(groups).length > 0 && (
        <div className="space-y-6">
          {severities.map((sev) => {
            const list = groups[sev] || [];
            if (list.length === 0) return null;
            return (
              <div key={sev}>
                <h3 className="text-lg mb-2">
                  {sev} ({list.length})
                </h3>
                <ul className="space-y-1">
                  {list.map((f) => (
                    <li key={f.id} className="border-b border-gray-700 pb-1">
                      {f.name || `Plugin ${f.id}`}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReportImporter;
