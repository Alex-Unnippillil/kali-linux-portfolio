'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type cytoscape from 'cytoscape';

interface CytoscapeComponentProps {
  elements: cytoscape.ElementDefinition[];
  stylesheet: cytoscape.Stylesheet[];
  layout: cytoscape.LayoutOptions;
  style: React.CSSProperties;
  cy: (cy: cytoscape.Core) => void;
}

const CytoscapeComponent = dynamic(
  async () => {
    const cytoscapeLib = (await import('cytoscape')).default;
    const coseBilkent = (await import('cytoscape-cose-bilkent')).default;
    cytoscapeLib.use(coseBilkent);
    return (await import('react-cytoscapejs')).default;
  },
  { ssr: false },
) as React.ComponentType<CytoscapeComponentProps>;

type NodeId = 'victim' | 'attacker' | 'gateway';

type NodePositions = Record<NodeId, { x: number; y: number }>;

const initialPositions: NodePositions = {
  victim: { x: 120, y: 240 },
  attacker: { x: 320, y: 120 },
  gateway: { x: 520, y: 240 },
};

const nodeDetails: Record<
  NodeId,
  { title: string; description: string; accent: string }
> = {
  victim: {
    title: 'Victim',
    description: 'Workstation with the legitimate gateway entry.',
    accent: 'bg-blue-500',
  },
  attacker: {
    title: 'Attacker',
    description: 'System sending forged ARP replies to both parties.',
    accent: 'bg-orange-500',
  },
  gateway: {
    title: 'Gateway',
    description: 'Router providing the default route to the network.',
    accent: 'bg-green-500',
  },
};

const stylesheet: cytoscape.Stylesheet[] = [
  {
    selector: 'node',
    style: {
      width: 80,
      height: 80,
      'border-width': 4,
      'border-color': '#111827',
      'background-color': '#1f2937',
      label: 'data(label)',
      color: '#f9fafb',
      'font-size': 16,
      'font-weight': 600,
      'text-valign': 'center',
      'text-outline-width': 2,
      'text-outline-color': '#1f2937',
      'text-margin-y': 0,
      'text-halign': 'center',
      shape: 'ellipse',
    },
  },
  {
    selector: 'node.role-victim',
    style: {
      'background-color': '#3b82f6',
    },
  },
  {
    selector: 'node.role-attacker',
    style: {
      'background-color': '#f97316',
    },
  },
  {
    selector: 'node.role-gateway',
    style: {
      'background-color': '#10b981',
    },
  },
  {
    selector: 'edge',
    style: {
      width: 4,
      'line-color': '#9ca3af',
      'target-arrow-color': '#9ca3af',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      label: 'data(label)',
      color: '#e5e7eb',
      'font-size': 12,
      'text-outline-width': 2,
      'text-outline-color': '#111827',
      'text-background-color': '#111827',
      'text-background-opacity': 0.65,
      'text-background-padding': 4,
    },
  },
  {
    selector: 'edge.legit',
    style: {
      'line-color': '#38bdf8',
      'target-arrow-color': '#38bdf8',
    },
  },
  {
    selector: 'edge.spoofed',
    style: {
      'line-color': '#f97316',
      'target-arrow-color': '#f97316',
      'line-style': 'dashed',
    },
  },
  {
    selector: 'edge.forwarded',
    style: {
      'line-color': '#34d399',
      'target-arrow-color': '#34d399',
    },
  },
];

const buildElements = (positions: NodePositions): cytoscape.ElementDefinition[] => [
  {
    data: { id: 'victim', label: 'Victim', role: 'Victim workstation' },
    position: positions.victim,
    classes: 'role-victim',
    grabbable: true,
  },
  {
    data: { id: 'attacker', label: 'Attacker', role: 'Attacker system' },
    position: positions.attacker,
    classes: 'role-attacker',
    grabbable: true,
  },
  {
    data: { id: 'gateway', label: 'Gateway', role: 'Gateway router' },
    position: positions.gateway,
    classes: 'role-gateway',
    grabbable: true,
  },
  {
    data: {
      id: 'legitimate-path',
      source: 'victim',
      target: 'gateway',
      label: 'Legitimate route',
      descriptor: 'Victim traffic heading directly to the gateway',
    },
    classes: 'legit',
  },
  {
    data: {
      id: 'spoofed-path',
      source: 'victim',
      target: 'attacker',
      label: 'Spoofed ARP entry',
      descriptor: 'Forged reply rerouting the victim to the attacker',
    },
    classes: 'spoofed',
  },
  {
    data: {
      id: 'forwarded-path',
      source: 'attacker',
      target: 'gateway',
      label: 'Forwarded traffic',
      descriptor: 'Attacker relaying packets toward the gateway',
    },
    classes: 'forwarded',
  },
];

const distanceLabel = (edge: cytoscape.EdgeSingular): string => {
  const source = edge.source();
  const target = edge.target();
  const dx = target.position('x') - source.position('x');
  const dy = target.position('y') - source.position('y');
  const distance = Math.sqrt(dx * dx + dy * dy);
  const rounded = Math.round(distance);
  const descriptor: string = edge.data('descriptor');
  if (!Number.isFinite(distance)) {
    return descriptor;
  }
  return `${descriptor} • ${rounded.toString()}px`;
};

const Topology: React.FC = () => {
  const cyRef = useRef<cytoscape.Core | null>(null);
  const initializedRef = useRef(false);
  const [positions, setPositions] = useState<NodePositions>(initialPositions);
  const [connections, setConnections] = useState<string[]>([]);
  const [liveMessage, setLiveMessage] = useState('');

  const elements = useMemo(
    () => buildElements(positions),
    [positions],
  );

  const applyAnnotations = useCallback(
    (cy: cytoscape.Core, commitState: boolean) => {
      cy.edges().forEach((edge) => {
        edge.data('label', distanceLabel(edge));
      });

      if (!commitState) return;

      setPositions((prev) => {
        const next = { ...prev } as NodePositions;
        cy.nodes().forEach((node) => {
          const id = node.id() as NodeId;
          next[id] = { x: node.position('x'), y: node.position('y') };
        });
        return next;
      });

      const updatedConnections: string[] = [];
      cy.edges().forEach((edge) => {
        const descriptor: string = edge.data('descriptor');
        const sourceLabel: string = edge.source().data('label');
        const targetLabel: string = edge.target().data('label');
        const label: string = edge.data('label');
        updatedConnections.push(
          `${descriptor}: ${sourceLabel} to ${targetLabel} (${label.split('•')[1]?.trim() ?? 'dynamic'})`,
        );
      });
      setConnections(updatedConnections);
      setLiveMessage(updatedConnections.join('. '));
    },
    [],
  );

  const registerCy = useCallback(
    (cy: cytoscape.Core) => {
      if (initializedRef.current && cyRef.current === cy) {
        return;
      }
      cyRef.current = cy;
      initializedRef.current = true;
      cy.autolock(false);
      cy.autoungrabify(false);
      cy.nodes().forEach((node) => {
        node.grabify();
      });

      cy.on('drag', 'node', () => {
        applyAnnotations(cy, false);
      });

      cy.on('dragfree', 'node', () => {
        applyAnnotations(cy, true);
      });

      applyAnnotations(cy, true);
    },
    [applyAnnotations],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-700 bg-gray-900 p-4 text-gray-100">
        <h2 id="arp-topology-heading" className="text-lg font-semibold">
          Interactive ARP Spoof Topology
        </h2>
        <p className="mt-1 text-sm text-gray-300">
          Drag nodes to explore how spoofed routes change path lengths. Labels
          update live while semantic descriptions remain available for screen
          readers.
        </p>
        <div
          role="group"
          aria-labelledby="arp-topology-heading"
          className="mt-3"
        >
          <div className="h-96 w-full overflow-hidden rounded-md border border-gray-700 bg-black">
            <CytoscapeComponent
              elements={elements}
              stylesheet={stylesheet}
              layout={{ name: 'preset' }}
              style={{ width: '100%', height: '100%' }}
              cy={registerCy}
            />
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Tip: Hold and drag a node to reposition it. Connections instantly
            recalculate to reflect the relative path length between devices.
          </p>
        </div>
      </div>
      <div className="rounded-lg border border-gray-700 bg-gray-900 p-4 text-gray-100">
        <h3 className="text-base font-semibold">Roles in the scenario</h3>
        <dl className="mt-2 grid gap-3 text-sm md:grid-cols-3">
          {(Object.keys(nodeDetails) as NodeId[]).map((key) => (
            <div
              key={key}
              className="rounded-md border border-gray-700 p-3"
              role="group"
              aria-label={`${nodeDetails[key].title} role`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-3 w-3 rounded-full ${nodeDetails[key].accent}`}
                  aria-hidden="true"
                />
                <dt className="font-semibold">{nodeDetails[key].title}</dt>
              </div>
              <dd className="mt-1 text-gray-300">{nodeDetails[key].description}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="rounded-lg border border-gray-700 bg-gray-900 p-4 text-gray-100">
        <h3 className="text-base font-semibold">Current paths</h3>
        <ul className="mt-2 space-y-2 text-sm" role="list">
          {connections.map((connection) => (
            <li key={connection} className="rounded border border-gray-700 p-2">
              {connection}
            </li>
          ))}
        </ul>
        <div className="sr-only" role="status" aria-live="polite">
          {liveMessage}
        </div>
      </div>
    </div>
  );
};

export default Topology;
