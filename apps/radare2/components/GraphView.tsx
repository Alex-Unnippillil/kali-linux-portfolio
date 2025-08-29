'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';

interface Block {
  addr: string;
  edges?: string[];
}

interface GraphViewProps {
  blocks: Block[];
}

const ForceGraph2D = dynamic(
  () => import('react-force-graph').then((mod) => mod.ForceGraph2D),
  { ssr: false }
);

const GraphView: React.FC<GraphViewProps> = ({ blocks }) => {
  const fgRef = useRef<any>();

  const graphData = useMemo(() => {
    const nodes = blocks.map((b) => ({ id: b.addr }));
    const links: { source: string; target: string }[] = [];
    blocks.forEach((b) =>
      (b.edges || []).forEach((e) => links.push({ source: b.addr, target: e }))
    );
    return { nodes, links };
  }, [blocks]);

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(400, 20);
    }
  }, [graphData]);

  const zoomIn = () => {
    if (!fgRef.current) return;
    const current = fgRef.current.zoom();
    fgRef.current.zoom(current * 1.2, 200);
  };

  const zoomOut = () => {
    if (!fgRef.current) return;
    const current = fgRef.current.zoom();
    fgRef.current.zoom(current / 1.2, 200);
  };

  return (
    <div className="h-full w-full">
      <div className="flex gap-2 mb-2">
        <button
          onClick={zoomIn}
          className="px-2 py-1 bg-gray-700 rounded"
        >
          +
        </button>
        <button
          onClick={zoomOut}
          className="px-2 py-1 bg-gray-700 rounded"
        >
          -
        </button>
      </div>
      <div className="h-64 bg-black rounded">
        <ForceGraph2D ref={fgRef} graphData={graphData} />
      </div>
    </div>
  );
};

export default GraphView;

