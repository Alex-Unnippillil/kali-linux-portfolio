'use client';

import React, { useState } from 'react';

interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  plan: string[];
}

const templates: TaskTemplate[] = [
  {
    id: 'full-and-fast',
    name: 'Full and Fast',
    description: 'Comprehensive network scan with optimized performance.',
    plan: [
      'Discover live hosts',
      'Enumerate open ports and services',
      'Launch vulnerability checks',
    ],
  },
  {
    id: 'web-server',
    name: 'Web Server',
    description: 'Targeted scan focusing on common web server issues.',
    plan: [
      'Crawl HTTP endpoints',
      'Test for SQL injection',
      'Check for cross-site scripting',
    ],
  },
  {
    id: 'quick-scan',
    name: 'Quick Scan',
    description: 'Lightweight scan for fast host assessment.',
    plan: [
      'Ping sweep',
      'Top 100 ports scan',
      'Report high-level findings',
    ],
  },
];

const TaskTemplates: React.FC = () => {
  const [selected, setSelected] = useState<TaskTemplate | null>(null);

  return (
    <div className="mt-8">
      <h2 className="text-xl mb-2">Task Templates</h2>
      <ul className="space-y-2" role="list">
        {templates.map((t) => (
          <li
            key={t.id}
            role="listitem"
            className={`p-3 bg-gray-800 rounded cursor-pointer hover:bg-gray-700 ${selected?.id === t.id ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setSelected(t)}
          >
            <p className="font-semibold">{t.name}</p>
            <p className="text-sm text-gray-400">{t.description}</p>
          </li>
        ))}
      </ul>
      {selected && (
        <div className="mt-4">
          <h3 className="text-lg mb-2">{selected.name} Plan</h3>
          <ul className="list-disc pl-5 space-y-1">
            {selected.plan.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TaskTemplates;

