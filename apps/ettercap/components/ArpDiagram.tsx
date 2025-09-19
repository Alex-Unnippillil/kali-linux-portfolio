'use client';

import React, { useState } from 'react';
import Draggable, { type DraggableEvent, type DraggableData } from 'react-draggable';

interface NodeData {
  x: number;
  y: number;
  label: string;
}

const initialNodes: Record<string, NodeData> = {
  victim: { x: 40, y: 120, label: 'Victim' },
  attacker: { x: 150, y: 40, label: 'Attacker' },
  gateway: { x: 260, y: 120, label: 'Gateway' },
};

export default function ArpDiagram() {
  const [nodes, setNodes] = useState<Record<string, NodeData>>(initialNodes);

  const handleDrag = (key: string) => (_: DraggableEvent, data: DraggableData) => {
    setNodes((n) => ({ ...n, [key]: { ...n[key], x: data.x, y: data.y } }));
  };

  const getLine = (from: string, to: string) => {
    const a = nodes[from];
    const b = nodes[to];
    return `M${a.x + 20} ${a.y + 20} L${b.x + 20} ${b.y + 20}`;
  };

  return (
    <div className="relative w-[320px] h-[200px] bg-gray-800 rounded mt-4">
      <svg className="absolute inset-0 pointer-events-none" width={320} height={200}>
        <path d={getLine('victim', 'gateway')} stroke="#fbbf24" strokeWidth={2} />
        <path d={getLine('attacker', 'victim')} stroke="#f87171" strokeWidth={2} />
        <path d={getLine('attacker', 'gateway')} stroke="#f87171" strokeWidth={2} />
      </svg>
      {Object.entries(nodes).map(([key, node]) => (
        <Draggable
          key={key}
          grid={[6, 6]}
          bounds="parent"
          position={{ x: node.x, y: node.y }}
          onDrag={handleDrag(key)}
        >
          <div className="absolute w-10 h-10 rounded-full bg-gray-700 border border-white flex items-center justify-center text-[10px]">
            {node.label}
          </div>
        </Draggable>
      ))}
    </div>
  );
}

