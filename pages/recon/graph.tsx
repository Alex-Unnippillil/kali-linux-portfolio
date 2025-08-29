import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import Meta from '../../components/SEO/Meta';
import { aggregateRelationships, Relationship } from '../../recon/graph';

const ForceGraph2D = dynamic(
  () => import('react-force-graph').then((mod) => mod.ForceGraph2D),
  { ssr: false },
);

const sample: Relationship[] = [
  { source: 'example.com', target: '93.184.216.34', type: 'RESOLVES_TO' },
  { source: '93.184.216.34', target: 'Jane Smith', type: 'ASSOCIATED_WITH' },
  { source: 'example.com', target: '93.184.216.34', type: 'RESOLVES_TO' },
];

const ReconGraphPage: React.FC = () => {
  const data = useMemo(() => aggregateRelationships(sample), []);

  return (
    <>
      <Meta />
      <main className="bg-ub-cool-grey text-white min-h-screen p-4">
        <div className="h-96 w-full bg-black rounded">
          <ForceGraph2D
            graphData={{ nodes: data.nodes, links: data.links }}
            nodeId="id"
            linkDirectionalArrowLength={4}
            nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
              const label = node.id;
              const fontSize = 12 / globalScale;
              ctx.fillStyle = 'lightblue';
              ctx.beginPath();
              ctx.arc(node.x || 0, node.y || 0, 5, 0, 2 * Math.PI, false);
              ctx.fill();
              ctx.font = `${fontSize}px sans-serif`;
              ctx.fillText(label, (node.x || 0) + 8, (node.y || 0) + 3);
            }}
          />
        </div>
      </main>
    </>
  );
};

export default ReconGraphPage;
