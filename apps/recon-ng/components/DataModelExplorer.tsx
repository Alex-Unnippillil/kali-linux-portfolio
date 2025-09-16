'use client';

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

interface EntityNode {
  id: string;
  label: string;
  data: Record<string, unknown>;
}

interface EntityLink {
  source: string;
  target: string;
  label?: string;
}

const ForceGraph2D = dynamic(
  () => import('react-force-graph').then((mod) => mod.ForceGraph2D),
  { ssr: false }
);

const mockData = {
  nodes: [
    {
      id: 'domain',
      label: 'Domain',
      data: { name: 'example.com', type: 'domain' },
    },
    {
      id: 'ip',
      label: 'IP Address',
      data: { address: '1.1.1.1', type: 'ip' },
    },
    {
      id: 'email',
      label: 'Email',
      data: { address: 'admin@example.com', type: 'email' },
    },
  ] as EntityNode[],
  links: [
    { source: 'domain', target: 'ip', label: 'RESOLVES_TO' },
    { source: 'domain', target: 'email', label: 'HAS_EMAIL' },
  ] as EntityLink[],
};

const DataModelExplorer: React.FC = () => {
  const [selected, setSelected] = useState<EntityNode | null>(null);
  const [menu, setMenu] = useState<{
    node: EntityNode;
    x: number;
    y: number;
  } | null>(null);
  const graphData = useMemo(() => mockData, []);

  return (
    <div className="relative h-96 w-full bg-black rounded">
      <ForceGraph2D
        graphData={graphData}
        nodeId="id"
        onBackgroundClick={() => setMenu(null)}
        onNodeClick={(node) => setSelected(node as EntityNode)}
        onNodeRightClick={(node, event) => {
          event.preventDefault();
          setMenu({
            node: node as EntityNode,
            x: (event as MouseEvent).clientX,
            y: (event as MouseEvent).clientY,
          });
        }}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const n = node as EntityNode & { x?: number; y?: number };
          const label = n.label;
          const fontSize = 12 / globalScale;
          ctx.fillStyle = 'lightblue';
          ctx.beginPath();
          ctx.arc(n.x ?? 0, n.y ?? 0, 5, 0, 2 * Math.PI, false);
          ctx.fill();
          ctx.font = `${fontSize}px sans-serif`;
          ctx.fillText(label, (n.x ?? 0) + 8, (n.y ?? 0) + 3);
        }}
        linkDirectionalArrowLength={4}
      />
      {menu && (
        <div
          className="fixed z-10 bg-gray-800 text-white text-xs rounded elevation-1"
          style={{ top: menu.y, left: menu.x }}
        >
          <button
            className="block w-full px-2 py-1 text-left hover:bg-gray-700"
            onClick={() => {
              setSelected(menu.node);
              setMenu(null);
            }}
          >
            View Details
          </button>
          <button
            className="block w-full px-2 py-1 text-left hover:bg-gray-700"
            onClick={() => setMenu(null)}
          >
            Close
          </button>
        </div>
      )}
      {selected && (
        <div className="absolute top-0 right-0 m-2 max-w-xs rounded bg-gray-800 p-2 text-xs text-white elevation-1">
          <div className="mb-1 font-bold">{selected.label}</div>
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(selected.data, null, 2)}
          </pre>
          <button
            className="mt-2 text-blue-400 underline"
            onClick={() => setSelected(null)}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default DataModelExplorer;

