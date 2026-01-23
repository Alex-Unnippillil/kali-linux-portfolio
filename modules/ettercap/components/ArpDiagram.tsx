'use client';

import React, { useCallback, useMemo, useState } from 'react';
import type { DraggableData, DraggableEvent } from 'react-draggable';

import type { FlowEntry } from '../simulator';
import SafeDraggable from './SafeDraggable';

interface NodeData {
  x: number;
  y: number;
  label: string;
}

const defaultNodes: Record<string, NodeData> = {
  victim: { x: 40, y: 130, label: 'Victim' },
  attacker: { x: 150, y: 40, label: 'Attacker' },
  gateway: { x: 260, y: 130, label: 'Gateway' },
};

const toneColors: Record<FlowEntry['tone'], string> = {
  normal: 'var(--color-primary)',
  warning: 'var(--color-warning)',
  alert: 'var(--color-danger)',
};

const toneHighlight: Record<FlowEntry['tone'], string> = {
  normal: 'var(--color-primary)',
  warning: 'var(--color-warning)',
  alert: 'var(--color-danger)',
};

export default function ArpDiagram({
  flows,
  activeFlowId,
}: {
  flows: FlowEntry[];
  activeFlowId?: string;
}) {
  const [nodes, setNodes] = useState<Record<string, NodeData>>(defaultNodes);

  const handleDrag = useCallback(
    (key: string) => (_: DraggableEvent, data: DraggableData) => {
      setNodes((current) => ({ ...current, [key]: { ...current[key], x: data.x, y: data.y } }));
    },
    [],
  );

  const resetLayout = useCallback(() => setNodes(defaultNodes), []);

  const renderedFlows = useMemo(
    () =>
      flows.map((flow) => ({
        ...flow,
        isActive: flow.id === activeFlowId,
      })),
    [activeFlowId, flows],
  );

  const getLine = (from: string, to: string) => {
    const a = nodes[from.toLowerCase()];
    const b = nodes[to.toLowerCase()];
    if (!a || !b) return '';
    return `M${a.x + 20} ${a.y + 20} L${b.x + 20} ${b.y + 20}`;
  };

  return (
    <div className="rounded-lg border border-[color:color-mix(in_srgb,var(--color-primary)_35%,transparent)] bg-[color:var(--kali-panel)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[color:var(--kali-text)]">ARP flow diagram</h3>
          <p className="text-xs text-[color:color-mix(in_srgb,var(--color-primary)_65%,var(--kali-text))]">
            Drag nodes to explore paths. Flows update with the active scenario.
          </p>
        </div>
        <button
          type="button"
          className="rounded border border-[color:color-mix(in_srgb,var(--color-primary)_45%,transparent)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-primary)_80%,var(--kali-text))] transition hover:bg-[color:color-mix(in_srgb,var(--color-primary)_18%,var(--kali-panel))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)]"
          onClick={resetLayout}
        >
          Reset layout
        </button>
      </div>
      <div className="relative mt-3 h-[220px] w-full max-w-[360px]">
        <svg
          className="absolute inset-0 pointer-events-none"
          viewBox="0 0 320 220"
          width="100%"
          height="100%"
          aria-hidden="true"
        >
          <defs>
            {(['normal', 'warning', 'alert'] as const).map((tone) => (
              <marker
                key={tone}
                id={`arrow-${tone}`}
                markerWidth="10"
                markerHeight="7"
                refX="10"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill={toneColors[tone]} />
              </marker>
            ))}
          </defs>
          {renderedFlows.map((flow) => {
            const path = getLine(flow.from, flow.to);
            if (!path) return null;
            const toneColor = toneColors[flow.tone];
            return (
              <path
                key={flow.id}
                d={path}
                stroke={toneColor}
                strokeWidth={flow.isActive ? 3 : 2}
                markerEnd={`url(#arrow-${flow.tone})`}
                opacity={flow.isActive ? 1 : 0.6}
              />
            );
          })}
        </svg>
        {Object.entries(nodes).map(([key, node]) => (
          <SafeDraggable
            key={key}
            grid={[6, 6]}
            bounds="parent"
            position={{ x: node.x, y: node.y }}
            onDrag={handleDrag(key)}
          >
            <div className="absolute flex h-10 w-10 items-center justify-center rounded-full border border-[color:color-mix(in_srgb,var(--color-primary)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-bg)_70%,var(--kali-panel))] text-[10px] font-semibold text-[color:var(--kali-text)] shadow-[0_0_12px_color-mix(in_srgb,var(--color-primary)_20%,transparent)]">
              {node.label}
            </div>
          </SafeDraggable>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[11px]">
        {(['normal', 'warning', 'alert'] as const).map((tone) => (
          <span key={tone} className="inline-flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: toneHighlight[tone] }}
              aria-hidden
            />
            <span className="uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-primary)_75%,var(--kali-text))]">
              {tone}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
