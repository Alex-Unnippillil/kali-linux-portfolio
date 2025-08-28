import React, { useState } from 'react';

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
      <svg viewBox="0 0 550 150" className="w-full h-40 mb-4">
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
              stroke={active ? '#f87171' : '#9ca3af'}
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
                fill={active ? '#fca5a5' : '#e5e7eb'}
                stroke="#4b5563"
                strokeWidth={2}
              />
              <text textAnchor="middle" dy=".3em" className="text-xs">
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mb-2">
        <h2 className="text-lg font-bold">{current.title}</h2>
        <p>{current.description}</p>
      </div>
      <div className="space-y-2">
        <div className="bg-green-100 border-l-4 border-green-500 p-2">
          <strong>Mitigation:</strong> {current.mitigation}
        </div>
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-2">
          <strong>Warning:</strong> {current.warning}
        </div>
      </div>
      <div className="mt-4 flex justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="px-4 py-2 bg-ubt-gray text-white rounded disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
          disabled={step === steps.length - 1}
          className="px-4 py-2 bg-ubt-blue text-white rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default NetworkAttackStepper;
