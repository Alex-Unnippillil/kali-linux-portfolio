'use client';

import React from 'react';

export interface DorkTemplate {
  id: string;
  operator: string;
  snippet: string;
  description: string;
}

const DORK_TEMPLATES: DorkTemplate[] = [
  {
    id: 'site',
    operator: 'site:',
    snippet: 'site:example.com "login"',
    description: 'Limit results to a specific domain. Combine it with keywords to zero in on interesting areas of a site.',
  },
  {
    id: 'inurl',
    operator: 'inurl:',
    snippet: 'inurl:admin "dashboard"',
    description: 'Match words that appear in the URL path. Handy for finding admin consoles or panels with recognizable routes.',
  },
  {
    id: 'filetype',
    operator: 'filetype:',
    snippet: 'filetype:pdf "confidential"',
    description: 'Search for exposed documents of a specific format. Swap the keyword to look for reports, backups, or plans.',
  },
  {
    id: 'intitle',
    operator: 'intitle:',
    snippet: 'intitle:"index of" "backup"',
    description: 'Target words that appear in a page title. Great for spotting directory listings or forgotten admin tools.',
  },
];

export interface DorkBuilderProps {
  onInsert: (snippet: string) => void;
}

const DorkBuilder: React.FC<DorkBuilderProps> = ({ onInsert }) => {
  return (
    <section className="rounded border border-gray-800 bg-gray-900 p-4 shadow-inner">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-white">Google Dork Builder</h2>
        <p className="mt-1 text-xs text-gray-300">
          Click any template to populate the main query field. Edit the placeholders to match your investigation before
          running it in a real search engine.
        </p>
      </header>
      <ul className="space-y-4" aria-label="Common Google dork operators">
        {DORK_TEMPLATES.map((template) => (
          <li
            key={template.id}
            className="rounded border border-gray-800 bg-black/50 p-3 transition hover:border-blue-500 hover:bg-black/60"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-300">{template.operator}</h3>
                <p className="mt-1 text-xs text-gray-300">{template.description}</p>
              </div>
              <button
                type="button"
                onClick={() => onInsert(template.snippet)}
                className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
              >
                Quick insert
              </button>
            </div>
            <pre className="mt-2 overflow-x-auto rounded bg-gray-950 p-2 text-xs font-mono text-emerald-200">
              {template.snippet}
            </pre>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default DorkBuilder;
