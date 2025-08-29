'use client';

import React, { useMemo } from 'react';
import { XMLParser } from 'fast-xml-parser';
import sampleXml from '../../../public/demo-data/nikto/sample.xml?raw';

interface Issue {
  host: string;
  url: string;
  description: string;
}

const parser = new XMLParser({ ignoreAttributes: false });

const parseReport = (xml: string): Issue[] => {
  try {
    const json = parser.parse(xml);
    const details = json.niktoscan?.scandetails;
    const hosts = Array.isArray(details) ? details : details ? [details] : [];
    const issues: Issue[] = [];
    hosts.forEach((h: any) => {
      const host = h['@_targethostname'] || h['@_targetip'] || 'unknown';
      const items = Array.isArray(h.item) ? h.item : h.item ? [h.item] : [];
      items.forEach((it: any) => {
        issues.push({
          host,
          url: it.uri || it.url || '',
          description: it.description || it.namelink || '',
        });
      });
    });
    return issues;
  } catch {
    return [];
  }
};

const ReportRenderer: React.FC = () => {
  const issues = useMemo(() => parseReport(sampleXml), []);

  const grouped = useMemo(
    () =>
      issues.reduce<Record<string, { url: string; description: string }[]>>(
        (acc, i) => {
          acc[i.host] = acc[i.host] || [];
          acc[i.host].push({ url: i.url, description: i.description });
          return acc;
        },
        {}
      ),
    [issues]
  );

  const jsonReport = useMemo(() => JSON.stringify(issues, null, 2), [issues]);

  const copyJson = async () => {
    try {
      await navigator.clipboard?.writeText(jsonReport);
    } catch {
      // ignore
    }
  };

  const exportJson = () => {
    const blob = new Blob([jsonReport], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nikto-issues.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-800 p-4 rounded">
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={copyJson}
          className="px-2 py-1 bg-blue-600 rounded text-sm"
        >
          Copy JSON
        </button>
        <button
          type="button"
          onClick={exportJson}
          className="px-2 py-1 bg-blue-600 rounded text-sm"
        >
          Export JSON
        </button>
      </div>
      {Object.entries(grouped).map(([host, list]) => (
        <div key={host} className="mb-4">
          <h3 className="text-lg mb-1">{host}</h3>
          <ul className="list-disc pl-4 space-y-1 text-sm">
            {list.map((item, idx) => (
              <li key={idx}>
                <span className="text-green-300">{item.url}</span> - {item.description}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default ReportRenderer;

