import React, { useState } from 'react';

interface Entry {
  title: string;
  company: string;
  period: string;
  concise: string;
  narrative: string;
  caseStudy: string;
  proof: string;
}

const entries: Entry[] = [
  {
    title: 'Security Analyst',
    company: 'Kali Labs',
    period: '2022 – Present',
    concise: 'Monitor and mitigate threats for global clients.',
    narrative:
      'Lead analysis of security incidents, creating dashboards and mitigation strategies for enterprise clients.',
    caseStudy: '/case-studies/kali-labs',
    proof: 'https://example.com/kali-labs-proof',
  },
  {
    title: 'Open Source Contributor',
    company: 'Various Projects',
    period: '2019 – 2022',
    concise: 'Authored patches to well-known security tools.',
    narrative:
      'Implemented features and fixes in widely used open-source security projects while collaborating with global teams.',
    caseStudy: '/case-studies/oss',
    proof: 'https://github.com/example',
  },
];

const ResumePage = () => {
  const [view, setView] = useState<'tile' | 'list'>('tile');
  const [narrative, setNarrative] = useState(false);

  return (
    <main className="p-4">
      <div className="no-print flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={() => setView('tile')}
          className={`px-2 py-1 border rounded ${view === 'tile' ? 'bg-gray-200' : ''}`}
          aria-pressed={view === 'tile'}
        >
          Tile View
        </button>
        <button
          type="button"
          onClick={() => setView('list')}
          className={`px-2 py-1 border rounded ${view === 'list' ? 'bg-gray-200' : ''}`}
          aria-pressed={view === 'list'}
        >
          List View
        </button>
        <label className="flex items-center gap-1 ml-auto">
          <input
            type="checkbox"
            checked={narrative}
            onChange={() => setNarrative((n) => !n)}
          />
          Narrative entries
        </label>
      </div>
      <div
        id="resume-content"
        className={
          view === 'tile'
            ? 'grid gap-4 md:grid-cols-2 print:block'
            : 'space-y-4'
        }
      >
        {entries.map((e) => (
          <div key={e.title} className="border p-4 break-inside-avoid">
            <h2 className="font-bold text-lg">
              {e.title} – {e.company}
            </h2>
            <span className="text-sm text-gray-400">{e.period}</span>
            <p className="mt-2 text-sm">
              {narrative ? e.narrative : e.concise}{' '}
              <a href={e.caseStudy} className="text-blue-400 underline">
                Case Study
              </a>{' '}
              |
              {' '}
              <a
                href={e.proof}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline"
              >
                Proof
              </a>
            </p>
          </div>
        ))}
      </div>
    </main>
  );
};

export default ResumePage;

