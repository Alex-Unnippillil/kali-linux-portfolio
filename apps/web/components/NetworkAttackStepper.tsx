import React, { useState } from 'react';
import WarningBanner from './WarningBanner';

interface Step {
  title: string;
  description: string;
  mitigation: string;
  warning: string;
  highlight: {
    nodes?: string[];
    edges?: string[];
  };
}

const steps: Step[] = [
  {
    title: 'Reconnaissance',
    description: 'Attacker scans the network for open ports and services.',
    mitigation: 'Monitor traffic and restrict port exposure.',
    warning: 'Unauthorized scanning may violate laws and policies.',
    highlight: { nodes: ['attacker'], edges: ['attacker-firewall'] },
  },
  {
    title: 'Initial Access',
    description: 'Exploits a vulnerability on the web server to gain entry.',
    mitigation: 'Apply patches and use a web application firewall.',
    warning: 'Exploiting vulnerabilities without consent is illegal.',
    highlight: { nodes: ['web'], edges: ['firewall-web'] },
  },
  {
    title: 'Lateral Movement',
    description: 'Moves from the web server to the internal database.',
    mitigation: 'Segment networks and enforce least privilege.',
    warning: 'Unauthorized lateral movement is a breach of policy.',
    highlight: { nodes: ['db'], edges: ['web-db'] },
  },
  {
    title: 'Data Exfiltration',
    description: 'Sensitive data is extracted from the database.',
    mitigation: 'Monitor egress traffic and encrypt sensitive data.',
    warning: 'Data theft is a severe legal violation.',
    highlight: { nodes: ['db'], edges: [] },
  },
];

interface NodeDef {
  id: string;
  label: string;
  x: number;
}

const nodes: NodeDef[] = [
  { id: 'attacker', label: 'Attacker', x: 50 },
  { id: 'firewall', label: 'Firewall', x: 200 },
  { id: 'web', label: 'Web Server', x: 350 },
  { id: 'db', label: 'Database', x: 500 },
];

const edges = [
  { from: 'attacker', to: 'firewall' },
  { from: 'firewall', to: 'web' },
  { from: 'web', to: 'db' },
];

const NetworkAttackStepper: React.FC = () => {
  const [step, setStep] = useState(0);
  const current = steps[step];

  const edgeId = (e: { from: string; to: string }) => `${e.from}-${e.to}`;

  return (
    <div className="p-4">
      <div className="flex flex-col gap-6 md:flex-row">
        <nav aria-label="Attack chain steps" className="md:w-80">
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <ol className="space-y-3">
              {steps.map((stepItem, index) => {
                const isActive = index === step;
                const isComplete = index < step;
                const indicatorClasses = [
                  'flex h-11 w-11 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors duration-200',
                  isComplete && 'border-emerald-400 bg-emerald-500 text-white shadow-[0_0_0_3px_rgba(16,185,129,0.25)]',
                  isActive && !isComplete && 'border-ubt-blue bg-ubt-blue/90 text-white shadow-[0_0_0_3px_rgba(59,130,246,0.35)]',
                  !isActive && !isComplete && 'border-slate-600 bg-slate-800 text-slate-200',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <li key={stepItem.title} className="relative">
                    {index < steps.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute left-[1.375rem] top-[4.25rem] h-[calc(100%-3rem)] w-px bg-slate-700"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setStep(index)}
                      aria-current={isActive ? 'step' : undefined}
                      className={`group relative flex w-full items-center gap-4 rounded-lg border border-transparent px-1 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubt-blue ${
                        isActive ? 'bg-slate-800/80' : 'hover:bg-slate-800/60'
                      }`}
                    >
                      <span className={indicatorClasses}>{isComplete ? '✓' : index + 1}</span>
                      <span className="flex flex-col">
                        <span className="text-xs uppercase tracking-wide text-slate-300">Step {index + 1}</span>
                        <span
                          className={`font-semibold transition-colors ${
                            isActive ? 'text-white' : 'text-slate-200'
                          }`}
                        >
                          {stepItem.title}
                        </span>
                        <span className="mt-1 text-xs text-slate-400">
                          {isComplete ? 'Completed' : isActive ? 'In progress' : 'Pending'}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </nav>
        <div className="flex-1 space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">{current.title}</h2>
              <p className="text-slate-200">{current.description}</p>
            </div>
            <div className="text-sm text-slate-400 md:text-right">
              Step {step + 1} of {steps.length}
            </div>
          </div>
          <svg viewBox="0 0 550 150" className="h-40 w-full rounded-lg border border-slate-700 bg-slate-900/60 p-2">
            {edges.map((e) => {
              const from = nodes.find((n) => n.id === e.from)!;
              const to = nodes.find((n) => n.id === e.to)!;
              const active = current.highlight.edges?.includes(edgeId(e));
              return (
                <line
                  key={edgeId(e)}
                  x1={from.x}
                  y1={75}
                  x2={to.x}
                  y2={75}
                  stroke={active ? '#f87171' : '#4b5563'}
                  strokeWidth={active ? 4 : 2}
                />
              );
            })}
            {nodes.map((n) => {
              const active = current.highlight.nodes?.includes(n.id);
              return (
                <g key={n.id} transform={`translate(${n.x},75)`}>
                  <circle
                    r={25}
                    fill={active ? '#fca5a5' : '#1f2937'}
                    stroke="#9ca3af"
                    strokeWidth={active ? 3 : 2}
                  />
                  <text textAnchor="middle" dy=".3em" className="text-xs fill-white">
                    {n.label}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="space-y-2">
            <div className="rounded-md border-l-4 border-emerald-500 bg-emerald-900/40 p-3 text-sm text-emerald-100">
              <strong className="block text-emerald-200">Mitigation</strong>
              {current.mitigation}
            </div>
            <WarningBanner>{current.warning}</WarningBanner>
          </div>
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="flex h-11 min-w-[6rem] items-center justify-center rounded-lg bg-ubt-gray px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
              disabled={step === steps.length - 1}
              className="flex h-11 min-w-[6rem] items-center justify-center rounded-lg bg-ubt-blue px-4 text-sm font-semibold text-white transition hover:bg-ubt-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkAttackStepper;
