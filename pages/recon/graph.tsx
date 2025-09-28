import React, { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { kaliTheme } from '../../styles/themes/kali';

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
}

interface GraphLink {
  source: string;
  target: string;
}

const ForceGraph2D = dynamic(
  () => import('react-force-graph').then((mod) => mod.ForceGraph2D),
  { ssr: false },
);

const ReconGraph: React.FC = () => {
  const [data, setData] = useState<ReconChainData | null>(null);
  const [accentColor, setAccentColor] = useState<string>(kaliTheme.rawColors.accent);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    const updateAccent = () => {
      const value = getComputedStyle(root).getPropertyValue('--color-primary').trim();
      if (value) {
        setAccentColor(value);
      }
    };
    updateAccent();
  }, []);

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
    <div
      className="p-4 min-h-screen"
      style={{
        backgroundColor: kaliTheme.colors.background,
        color: kaliTheme.colors.text,
      }}
    >
      <h1 className="text-2xl mb-4">Recon Graph</h1>
      <p className="mb-2 text-sm">
        Nodes: {graphData.nodes.length} | Edges: {graphData.links.length}
      </p>
      <div
        className="h-96 rounded border"
        style={{
          backgroundColor: kaliTheme.colors.surface,
          borderColor: kaliTheme.colors.panelBorder,
          boxShadow: kaliTheme.shadows.panel,
        }}
      >
        <ForceGraph2D
          graphData={graphData}
          nodeId="id"
          nodeCanvasObject={(node: any, ctx) => {
            ctx.fillStyle = accentColor;
            ctx.beginPath();
            ctx.arc(node.x, node.y, 4, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.font = '8px sans-serif';
            const label = node.label || node.id;
            ctx.fillStyle = kaliTheme.rawColors.text;
            ctx.fillText(label, node.x + 6, node.y + 2);
          }}
          linkDirectionalArrowLength={4}
        />
      </div>
    </div>
  );
};

export default ReconGraph;

