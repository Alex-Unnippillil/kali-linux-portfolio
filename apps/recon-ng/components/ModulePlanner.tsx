'use client';

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import usePersistentState from '../../../hooks/usePersistentState';

interface ModuleDef {
  deps: string[];
  tags: string[];
}

const MODULES: Record<string, ModuleDef> = {
  'DNS Enumeration': { deps: [], tags: ['dns', 'recon'] },
  'WHOIS Lookup': { deps: ['DNS Enumeration'], tags: ['whois', 'network'] },
  'Reverse IP Lookup': { deps: ['WHOIS Lookup'], tags: ['ip'] },
  'Port Scan': { deps: ['Reverse IP Lookup'], tags: ['ports', 'network'] },
};

const moduleNames = Object.keys(MODULES);
const WORKSPACES = ['default', 'testing', 'production'] as const;
const DEFAULT_WORKSPACE = WORKSPACES.at(0) ?? 'default';

const ForceGraph2D = dynamic(
  () => import('react-force-graph').then((mod) => mod.ForceGraph2D),
  { ssr: false },
);

const ModulePlanner: React.FC = () => {
  const [plan, setPlan] = usePersistentState<string[]>('reconng-plan', []);
  const [workspace, setWorkspace] = usePersistentState<string>(
    'reconng-workspace',
    DEFAULT_WORKSPACE,
  );
  const [log, setLog] = useState('');

  const toggle = (name: string) => {
    setPlan((p) =>
      p.includes(name) ? p.filter((m) => m !== name) : [...p, name],
    );
  };

  const exportPlan = () => {
    const lines = [
      `Workspace: ${workspace}`,
      'Modules:',
      ...plan.map((m) => `- ${m}`),
    ];
    setLog(lines.join('\n'));
  };

  const graphData = useMemo(() => {
    const nodes = new Set<string>();
    const links: { source: string; target: string }[] = [];

    const visit = (m: string) => {
      if (nodes.has(m)) return;
      nodes.add(m);
      MODULES[m]?.deps.forEach((d) => {
        visit(d);
        links.push({ source: d, target: m });
      });
    };

    plan.forEach(visit);

    return {
      nodes: Array.from(nodes).map((id) => ({ id })),
      links,
    };
  }, [plan]);

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-900 text-white h-full">
      <div className="flex items-center gap-2">
        <label htmlFor="workspace">Workspace:</label>
        <select
          id="workspace"
          value={workspace}
          onChange={(e) => setWorkspace(e.target.value)}
          className="text-black p-1 rounded"
        >
          {WORKSPACES.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {moduleNames.map((m) => {
          const mod = MODULES[m];
          const active = plan.includes(m);
          return (
            <div
              key={m}
              className={`border rounded p-2 cursor-pointer ${
                active
                  ? 'bg-blue-900 border-blue-500'
                  : 'bg-gray-800 border-gray-700'
              }`}
              onClick={() => toggle(m)}
            >
              <div className="font-bold">{m}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {mod.tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs bg-gray-700 px-1 rounded"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {graphData.nodes.length > 0 && (
        <div className="h-64 bg-black rounded">
          <ForceGraph2D
            graphData={graphData}
            nodeCanvasObject={(node: any, ctx) => {
              ctx.fillStyle = 'lightblue';
              ctx.beginPath();
              ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
              ctx.fill();
              ctx.font = '10px sans-serif';
              ctx.fillText(node.id, node.x + 6, node.y + 3);
            }}
          />
        </div>
      )}
      <div>
        <button
          type="button"
          onClick={exportPlan}
          className="px-2 py-1 bg-blue-700 rounded"
        >
          Export Plan
        </button>
        {log && (
          <pre className="mt-2 bg-black text-green-400 p-2 rounded font-mono whitespace-pre-wrap">
            {log}
          </pre>
        )}
      </div>
    </div>
  );
};

export default ModulePlanner;

