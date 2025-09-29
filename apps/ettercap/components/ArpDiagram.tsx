'use client';

import React, { useCallback, useState } from 'react';
import type { DraggableEvent, DraggableData } from 'react-draggable';

import SafeDraggable from './SafeDraggable';

interface NodeData {
  x: number;
  y: number;
  label: string;
}

const GRID_SIZE = 6;
const DIAGRAM_WIDTH = 320;
const DIAGRAM_HEIGHT = 200;
const NODE_DIAMETER = 40;

const createInitialLayout = (): Record<string, NodeData> => ({
  victim: { x: 42, y: 120, label: 'Victim' },
  attacker: { x: 150, y: 42, label: 'Attacker' },
  gateway: { x: 258, y: 120, label: 'Gateway' },
});

const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), max);

const clampPosition = (x: number, y: number) => {
  const maxX = DIAGRAM_WIDTH - NODE_DIAMETER;
  const maxY = DIAGRAM_HEIGHT - NODE_DIAMETER;
  return {
    x: clamp(x, maxX),
    y: clamp(y, maxY),
  };
};

const snapToGrid = (value: number, max: number) => {
  const alignedMax = max - (max % GRID_SIZE);
  const snapped = Math.round(value / GRID_SIZE) * GRID_SIZE;
  return clamp(snapped, alignedMax);
};

const snapPosition = (x: number, y: number) => {
  const maxX = DIAGRAM_WIDTH - NODE_DIAMETER;
  const maxY = DIAGRAM_HEIGHT - NODE_DIAMETER;
  return {
    x: snapToGrid(x, maxX),
    y: snapToGrid(y, maxY),
  };
};

export default function ArpDiagram() {
  const [nodes, setNodes] = useState<Record<string, NodeData>>(createInitialLayout);

  const handleDrag = useCallback(
    (key: string) => (_: DraggableEvent, data: DraggableData) => {
      const clamped = clampPosition(data.x, data.y);
      setNodes((prev) => ({ ...prev, [key]: { ...prev[key], ...clamped } }));
    },
    []
  );

  const handleStop = useCallback(
    (key: string) => (_: DraggableEvent, data: DraggableData) => {
      const clamped = clampPosition(data.x, data.y);
      const snapped = snapPosition(clamped.x, clamped.y);
      setNodes((prev) => ({ ...prev, [key]: { ...prev[key], ...snapped } }));
    },
    []
  );

  const resetLayout = () => setNodes(createInitialLayout());

  const getLine = (from: string, to: string) => {
    const a = nodes[from];
    const b = nodes[to];
    return `M${a.x + NODE_DIAMETER / 2} ${a.y + NODE_DIAMETER / 2} L${b.x + NODE_DIAMETER / 2} ${b.y + NODE_DIAMETER / 2}`;
  };

  return (
    <div className="flex flex-col items-start">
      <div className="relative w-[320px] h-[200px] bg-gray-800 rounded mt-4">
        <svg className="absolute inset-0 pointer-events-none" width={DIAGRAM_WIDTH} height={DIAGRAM_HEIGHT}>
          <path d={getLine('victim', 'gateway')} stroke="#fbbf24" strokeWidth={2} />
          <path d={getLine('attacker', 'victim')} stroke="#f87171" strokeWidth={2} />
          <path d={getLine('attacker', 'gateway')} stroke="#f87171" strokeWidth={2} />
        </svg>
        {Object.entries(nodes).map(([key, node]) => (
          <SafeDraggable
            key={key}
            grid={[GRID_SIZE, GRID_SIZE]}
            bounds="parent"
            position={{ x: node.x, y: node.y }}
            onDrag={handleDrag(key)}
            onStop={handleStop(key)}
            data-node={key}
          >
            <div className="absolute w-10 h-10 rounded-full bg-gray-700 border border-white flex items-center justify-center text-[10px]">
              {node.label}
            </div>
          </SafeDraggable>
        ))}
      </div>
      <button
        type="button"
        onClick={resetLayout}
        className="mt-3 px-3 py-1 text-xs font-medium rounded border border-gray-600 bg-gray-700 text-white transition hover:bg-gray-600"
      >
        Reset layout
      </button>
    </div>
  );
}
