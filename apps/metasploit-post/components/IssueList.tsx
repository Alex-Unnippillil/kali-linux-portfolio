'use client';

import React, { useEffect } from 'react';
import issues from '../issues.json';

interface Issue {
  id: number;
  issue: string;
  remediation: string;
  severity: string;
}

const severityClass = (sev: string) => {
  switch (sev) {
    case 'High':
      return 'bg-red-600 text-white';
    case 'Medium':
      return 'bg-yellow-500 text-black';
    case 'Low':
      return 'bg-green-600 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
};

const IssueList: React.FC = () => {
  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
    if (hash) {
      const el = document.getElementById(hash) as HTMLDetailsElement | null;
      if (el) {
        el.open = true;
        el.scrollIntoView();
      }
    }
  }, []);

  return (
    <div className="mt-4">
      <h3 className="font-semibold mb-2">Issues</h3>
      <ul className="space-y-2">
        {(issues as Issue[]).map((item) => (
          <li key={item.id}>
            <details id={`issue-${item.id}`} className="bg-gray-800 rounded">
              <summary className="cursor-pointer px-3 py-2 flex items-center justify-between">
                <span>{item.issue}</span>
                <span className={`ml-2 px-2 py-0.5 rounded text-xs ${severityClass(item.severity)}`}>
                  {item.severity}
                </span>
              </summary>
              <div className="px-3 py-2 text-sm text-yellow-300">{item.remediation}</div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default IssueList;

