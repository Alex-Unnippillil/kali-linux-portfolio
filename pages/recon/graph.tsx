import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import dynamic from 'next/dynamic';

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const updateSize = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { clientWidth, clientHeight } = el;
    setSize((prev) =>
      prev.width === clientWidth && prev.height === clientHeight
        ? prev
        : { width: clientWidth, height: clientHeight },
    );
  }, []);

  useEffect(() => {
    fetch('/reconng-chain.json')
      .then((res) => res.json())
      .then((json) => setData(json as ReconChainData))
      .catch(() => setData(null));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    updateSize();

    let frame = 0;
    const handle = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateSize);
    };

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(handle);
      observer.observe(el);
      return () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
      };
    }

    window.addEventListener('resize', handle);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', handle);
    };
  }, [updateSize]);

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
      <div
        ref={containerRef}
        className="relative w-full bg-black rounded"
        style={{ aspectRatio: '4 / 3' }}
        data-chart-ready={Boolean(data)}
        aria-busy={!data}
      >
        {!data && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
            Loading graph…
          </div>
        )}
        {data && size.width > 0 && size.height > 0 ? (
          <ForceGraph2D
            width={size.width}
            height={size.height}
            graphData={graphData}
            nodeId="id"
            nodeCanvasObject={(node: any, ctx) => {
              ctx.fillStyle = 'lightblue';
              ctx.beginPath();
              ctx.arc(node.x, node.y, 4, 0, 2 * Math.PI, false);
              ctx.fill();
              ctx.font = '8px sans-serif';
              const label = node.label || node.id;
              ctx.fillText(label, node.x + 6, node.y + 2);
            }}
            linkDirectionalArrowLength={4}
          />
        ) : (
          data && (
            <div className="absolute inset-0" aria-hidden>
              {/* Reserve space to avoid layout shift until measurements are available */}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default ReconGraph;

