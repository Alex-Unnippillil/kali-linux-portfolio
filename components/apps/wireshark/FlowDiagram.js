'use client';
import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';

const ForceGraph2D = dynamic(
  () => import('react-force-graph').then((mod) => mod.ForceGraph2D),
  { ssr: false }
);

const FlowDiagram = ({ packets }) => {
  const data = useMemo(() => {
    const nodes = {};
    const links = {};
    packets.forEach((p) => {
      nodes[p.src] = { id: p.src };
      nodes[p.dest] = { id: p.dest };
      const key = `${p.src}->${p.dest}`;
      if (!links[key]) links[key] = { source: p.src, target: p.dest, value: 0 };
      links[key].value += 1;
    });
    return { nodes: Object.values(nodes), links: Object.values(links) };
  }, [packets]);

  return (
    <div className="w-full h-64 bg-black">
      <ForceGraph2D
        graphData={data}
        linkWidth={(link) => Math.max(1, Math.sqrt(link.value))}
        nodeCanvasObject={(node, ctx) => {
          ctx.fillStyle = 'lightblue';
          ctx.beginPath();
          ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
          ctx.fill();
          ctx.font = '10px sans-serif';
          ctx.fillText(node.id, node.x + 6, node.y + 3);
        }}
      />
    </div>
  );
};

export default FlowDiagram;
