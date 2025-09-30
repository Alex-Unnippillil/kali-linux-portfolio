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
  const progress =
    steps.length > 1 ? Math.round((step / (steps.length - 1)) * 100) : 100;

  return (
    <div className="p-4">
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm font-semibold text-slate-200">
          <span>
            Step {step + 1} of {steps.length}
          </span>
          <span>{progress}% complete</span>
        </div>
        <div
          className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-700/60"
          role="progressbar"
          aria-label="Network attack simulation progress"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={steps.length}
        >
          <div
            className="h-full rounded-full bg-ubt-blue transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="flex-1">
          <ol className="flex flex-col gap-4">
            {steps.map((item, index) => {
              const active = index === step;
              return (
                <li key={item.title}>
                  <button
                    type="button"
                    onClick={() => setStep(index)}
                    className="w-full text-left"
                    aria-label={`View the ${item.title} step`}
                    aria-current={active ? 'step' : undefined}
                  >
                    <div className="flex items-stretch gap-4">
                      <div className="flex flex-col items-center">
                        <span
                          className={`flex h-12 w-12 items-center justify-center rounded-full border-2 text-base font-semibold transition-colors ${
                            active
                              ? 'border-ubt-blue bg-ubt-blue text-white shadow-lg'
                              : 'border-slate-500 bg-slate-800 text-slate-200'
                          }`}
                        >
                          {index + 1}
                        </span>
                        {index < steps.length - 1 && (
                          <span className="mt-2 w-px flex-1 bg-slate-700" />
                        )}
                      </div>
                      <div
                        className={`flex-1 rounded-xl border p-4 transition-colors ${
                          active
                            ? 'border-ubt-blue/60 bg-ubt-blue/10'
                            : 'border-slate-700 bg-slate-900/40'
                        }`}
                      >
                        <h3 className="text-lg font-semibold text-white">
                          {item.title}
                        </h3>
                        <p className="text-sm text-slate-200">
                          {item.description}
                        </p>
                        {active && (
                          <div className="mt-4 space-y-3">
                            <div className="rounded-lg border border-green-500/70 bg-green-900/30 p-3 text-sm text-green-100">
                              <strong className="block text-green-200">
                                Mitigation:
                              </strong>{' '}
                              {item.mitigation}
                            </div>
                            <WarningBanner>{item.warning}</WarningBanner>
                            <div className="flex items-center justify-between text-xs text-slate-300">
                              <button
                                type="button"
                                onClick={() => setStep((s) => Math.max(0, s - 1))}
                                disabled={step === 0}
                                className="rounded-full bg-slate-800 px-3 py-1 font-medium uppercase tracking-wide text-slate-200 transition disabled:opacity-50"
                              >
                                Previous
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setStep((s) => Math.min(steps.length - 1, s + 1))
                                }
                                disabled={step === steps.length - 1}
                                className="rounded-full bg-ubt-blue px-3 py-1 font-medium uppercase tracking-wide text-white transition disabled:opacity-50"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
        <div className="flex-1">
          <svg viewBox="0 0 550 260" className="h-64 w-full">
            {edges.map((e) => {
              const from = nodes.find((n) => n.id === e.from)!;
              const to = nodes.find((n) => n.id === e.to)!;
              const active = current.highlight.edges?.includes(edgeId(e));
              return (
                <line
                  key={edgeId(e)}
                  x1={from.x}
                  y1={150}
                  x2={to.x}
                  y2={150}
                  stroke={active ? '#f87171' : '#4b5563'}
                  strokeWidth={active ? 4 : 2}
                />
              );
            })}
            {nodes.map((n) => {
              const active = current.highlight.nodes?.includes(n.id);
              return (
                <g key={n.id} transform={`translate(${n.x},150)`}>
                  <circle
                    r={32}
                    fill={active ? '#fca5a5' : '#1f2937'}
                    stroke={active ? '#ef4444' : '#9ca3af'}
                    strokeWidth={active ? 4 : 2}
                  />
                  <text
                    textAnchor="middle"
                    dy=".3em"
                    className="fill-white text-sm font-semibold"
                  >
                    {n.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
};

export default NetworkAttackStepper;
