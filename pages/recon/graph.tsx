import React, { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { ForceGraphComponent, ForceGraphProps } from 'react-force-graph';

interface CytoscapeNode {
  data: { id: string; label: string };
}

interface CytoscapeEdge {
  data: { source: string; target: string };
}

interface ReconChainData {
  chain: {
    nodes: CytoscapeNode[];
    edges: CytoscapeEdge[];
  };
  entities: {
    nodes: CytoscapeNode[];
    edges: CytoscapeEdge[];
  };
}

interface GraphNode {
  id: string;
  label: string;
  x?: number;
  y?: number;
  [key: string]: unknown;
}

type GraphLink = { source: string | GraphNode; target: string | GraphNode; [key: string]: unknown };

type ReconGraphProps = ForceGraphProps<GraphNode, GraphLink>;

const ForceGraph2D = dynamic(
  () => import('react-force-graph').then((mod) => mod.ForceGraph2D),
  { ssr: false },
) as unknown as ForceGraphComponent<GraphNode, GraphLink>;

const ReconGraph: React.FC = () => {
  const [data, setData] = useState<ReconChainData | null>(null);

  useEffect(() => {
    fetch('/reconng-chain.json')
      .then((res) => res.json())
      .then((json) => setData(json as ReconChainData))
      .catch(() => setData(null));
  }, []);

  const graphData = useMemo(() => {
    if (!data) return { nodes: [] as GraphNode[], links: [] as GraphLink[] };
    const nodeMap = new Map<string, GraphNode>();
    const links: GraphLink[] = [];

    const addNodes = (nodes: CytoscapeNode[]) => {
      nodes.forEach((n) => {
        const { id, label } = n.data;
        if (!nodeMap.has(id)) {
          nodeMap.set(id, { id, label });
        }
      });
    };

    const addEdges = (edges: CytoscapeEdge[]) => {
      edges.forEach((e) => {
        links.push({ source: e.data.source, target: e.data.target });
      });
    };

    addNodes(data.chain.nodes);
    addNodes(data.entities.nodes);
    addEdges(data.chain.edges);
    addEdges(data.entities.edges);

    return {
      nodes: Array.from(nodeMap.values()),
      links,
    };
  }, [data]);

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl mb-4">Recon Graph</h1>
      <p className="mb-2 text-sm">
        Nodes: {graphData.nodes.length} | Edges: {graphData.links.length}
      </p>
      <div className="h-96 bg-black rounded">
        <ForceGraph2D
          graphData={graphData}
          nodeId="id"
          nodeCanvasObject={(node, ctx) => {
            ctx.fillStyle = 'lightblue';
            ctx.beginPath();
            ctx.arc(node.x ?? 0, node.y ?? 0, 4, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.font = '8px sans-serif';
            const label = node.label || node.id;
            ctx.fillText(label, (node.x ?? 0) + 6, (node.y ?? 0) + 2);
          }}
          linkDirectionalArrowLength={4}
        />
      </div>
    </div>
  );
};

export default ReconGraph;

