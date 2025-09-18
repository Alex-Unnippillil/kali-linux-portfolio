'use client';
import React, { useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { toPng } from 'html-to-image';
import type cytoscape from 'cytoscape';

interface CytoscapeComponentProps {
  elements: cytoscape.ElementDefinition[];
  style: React.CSSProperties;
  cy: (cy: cytoscape.Core) => void;
}

const CytoscapeComponent = dynamic(
  async () => {
    const cytoscape = (await import('cytoscape')).default;
    const coseBilkent = (await import('cytoscape-cose-bilkent')).default;
    cytoscape.use(coseBilkent);
    return (await import('react-cytoscapejs')).default;
  },
  { ssr: false }
) as React.ComponentType<CytoscapeComponentProps>;

interface Packet {
  src: string;
  dest: string;
  data?: Uint8Array;
}

interface FlowGraphProps {
  packets: Packet[];
}

const FlowGraph: React.FC<FlowGraphProps> = ({ packets }) => {
  const cyRef = useRef<cytoscape.Core | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (cyRef.current) {
        try {
          cyRef.current.destroy();
        } catch {
          // ignore teardown errors
        }
        cyRef.current = null;
      }
    };
  }, []);

  const { elements, stats } = useMemo(() => {
    const nodes: Record<string, any> = {};
    const edges: Record<string, any> = {};
    let bytes = 0;
    packets.forEach((p) => {
      if (!nodes[p.src]) nodes[p.src] = { data: { id: p.src, label: p.src } };
      if (!nodes[p.dest]) nodes[p.dest] = { data: { id: p.dest, label: p.dest } };
      const key = `${p.src}_${p.dest}`;
      if (!edges[key])
        edges[key] = {
          data: { id: key, source: p.src, target: p.dest, count: 0 }
        };
      edges[key].data.count += 1;
      bytes += p.data?.length || 0;
    });
    const elements = [
      ...Object.values(nodes),
      ...Object.values(edges).map((e: any) => ({
        ...e,
        data: { ...e.data, label: String(e.data.count) }
      }))
    ];
    const stats = {
      packets: packets.length,
      hosts: Object.keys(nodes).length,
      conversations: Object.keys(edges).length,
      bytes
    };
    return { elements, stats };
  }, [packets]);

  useEffect(() => {
    if (cyRef.current) {
      cyRef.current.layout({ name: 'cose-bilkent' }).run();
    }
  }, [elements]);

  const exportPNG = () => {
    if (!containerRef.current) return;
    toPng(containerRef.current)
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = 'flow-graph.png';
        link.href = dataUrl;
        link.click();
      })
      .catch(() => {});
  };

  return (
    <div className="flex flex-col space-y-2">
      <div ref={containerRef} className="w-full h-64 bg-black">
        <CytoscapeComponent
          elements={elements as cytoscape.ElementDefinition[]}
          style={{ width: '100%', height: '100%' }}
          cy={(cy: cytoscape.Core) => {
            cyRef.current = cy;
          }}
        />
      </div>
      <div className="flex space-x-4 text-xs text-green-400">
        <span>Packets: {stats.packets}</span>
        <span>Hosts: {stats.hosts}</span>
        <span>Conversations: {stats.conversations}</span>
        <span>Bytes: {stats.bytes}</span>
        <button
          onClick={exportPNG}
          className="ml-auto px-2 py-1 bg-gray-700 rounded"
        >
          Export PNG
        </button>
      </div>
    </div>
  );
};

export default FlowGraph;

