'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import usePersistentState from '../../../hooks/usePersistentState';

interface ModuleDef {
  deps: string[];
}

const MODULES: Record<string, ModuleDef> = {
  'DNS Enumeration': { deps: [] },
  'WHOIS Lookup': { deps: ['DNS Enumeration'] },
  'Reverse IP Lookup': { deps: ['WHOIS Lookup'] },
  'Port Scan': { deps: ['Reverse IP Lookup'] },
};

const moduleNames = Object.keys(MODULES);

const ForceGraph2D = dynamic(
  () => import('react-force-graph').then((mod) => mod.ForceGraph2D),
  { ssr: false },
);

const ModulePlanner: React.FC = () => {
  const [plan, setPlan] = usePersistentState<string[]>('reconng-plan', []);

  const toggle = (name: string) => {
    setPlan((p) =>
      p.includes(name) ? p.filter((m) => m !== name) : [...p, name],
    );
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
      <div>
        {moduleNames.map((m) => (
          <label key={m} className="block">
            <input
              type="checkbox"
              checked={plan.includes(m)}
              onChange={() => toggle(m)}
              className="mr-2"
            />
            {m}
          </label>
        ))}
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
    </div>
  );
};

export default ModulePlanner;

