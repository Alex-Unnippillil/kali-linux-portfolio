import React, { useState } from 'react';
import WarningBanner from './WarningBanner';
import { tokenVar } from '../lib/designTokens';

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
    <div className="p-lg space-y-md bg-surface-panel rounded-lg shadow-md">
      <svg viewBox="0 0 550 150" className="w-full h-40">
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
              stroke={active ? tokenVar('status', 'danger') : tokenVar('border', 'subtle')}
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
                fill={active ? tokenVar('status', 'warning') : tokenVar('surface', 'muted')}
                stroke={tokenVar('border', 'strong')}
                strokeWidth={2}
              />
              <text textAnchor="middle" dy=".3em" className="text-xs">
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-text-primary">{current.title}</h2>
        <p className="text-text-secondary">{current.description}</p>
      </div>
      <div className="space-y-2">
        <div className="border-l-4 border-status-success border-opacity-80 bg-surface-muted p-sm rounded-md text-text-primary">
          <strong className="text-status-success">Mitigation:</strong> {current.mitigation}
        </div>
        <WarningBanner>{current.warning}</WarningBanner>
      </div>
      <div className="flex justify-between pt-md">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="px-md py-sm rounded-md bg-surface-muted text-text-primary disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
          disabled={step === steps.length - 1}
          className="px-md py-sm rounded-md bg-brand-primary text-text-inverse disabled:opacity-50 transition-colors duration-fast hover:bg-brand-secondary"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default NetworkAttackStepper;
