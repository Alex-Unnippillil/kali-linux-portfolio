import React, { useState, useRef, useMemo, useEffect } from 'react';
import { DndContext, useDraggable, DragEndEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { toPng } from 'html-to-image';

const NODE_W = 120;
const NODE_H = 40;
const BOUNDARY_W = 200;
const BOUNDARY_H = 150;
const METHODOLOGIES = {
  STRIDE: {
    categories: [
      'Spoofing',
      'Tampering',
      'Repudiation',
      'Information Disclosure',
      'Denial of Service',
      'Elevation of Privilege',
    ],
    mitigations: {
      Spoofing: 'Use strong authentication',
      Tampering: 'Validate input and integrity',
      Repudiation: 'Employ auditing and logging',
      'Information Disclosure': 'Encrypt and enforce access control',
      'Denial of Service': 'Rate limit and add redundancy',
      'Elevation of Privilege': 'Apply least privilege and patching',
    },
  },
  CIA: {
    categories: ['Confidentiality', 'Integrity', 'Availability'],
    mitigations: {
      Confidentiality: 'Encrypt data and limit access',
      Integrity: 'Use checksums and validation',
      Availability: 'Add redundancy and monitoring',
    },
  },
} as const;

type MethodologyKey = keyof typeof METHODOLOGIES;
interface DreadScores {
  damage: number;
  reproducibility: number;
  exploitability: number;
  affected: number;
  discoverability: number;
}

interface Boundary {
  id: string;
  x: number;
  y: number;
  label: string;
  width: number;
  height: number;
}

interface Node {
  id: string;
  x: number;
  y: number;
  label: string;
  categories: Record<string, boolean>;
  dread: DreadScores;
}

interface Edge {
  id: string;
  from: string;
  to: string;
}

const createCategories = (m: MethodologyKey) =>
  METHODOLOGIES[m].categories.reduce(
    (acc, k) => ({ ...acc, [k]: false }),
    {} as Record<string, boolean>,
  );

const createDread = (): DreadScores => ({
  damage: 0,
  reproducibility: 0,
  exploitability: 0,
  affected: 0,
  discoverability: 0,
});

const NodeItem = React.memo(
  ({ node, onSelect }: { node: Node; onSelect: () => void }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
      id: node.id,
    });

    const style = {
      width: NODE_W,
      height: NODE_H,
      transform: CSS.Translate.toString({
        x: node.x + (transform?.x ?? 0),
        y: node.y + (transform?.y ?? 0),
        scaleX: 1,
        scaleY: 1,
      }),
    } as React.CSSProperties;

    return (
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        onClick={onSelect}
        className="absolute z-10 px-2 py-1 bg-blue-600 rounded text-white cursor-move select-none flex items-center justify-center"
        style={style}
      >
        {node.label}
      </div>
    );
  },
);

const BoundaryItem = React.memo(({ boundary }: { boundary: Boundary }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: boundary.id,
  });
  const style = {
    width: boundary.width,
    height: boundary.height,
    transform: CSS.Translate.toString({
      x: boundary.x + (transform?.x ?? 0),
      y: boundary.y + (transform?.y ?? 0),
      scaleX: 1,
      scaleY: 1,
    }),
  } as React.CSSProperties;
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="absolute z-0 border-2 border-dashed border-red-500 text-red-500 cursor-move select-none flex items-start justify-start"
      style={style}
    >
      <span className="bg-red-500 text-white text-xs px-1">{boundary.label}</span>
    </div>
  );
});

const ThreatModeler: React.FC = () => {
  const [method, setMethod] = useState<MethodologyKey>('STRIDE');
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [boundaries, setBoundaries] = useState<Boundary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [addingEdge, setAddingEdge] = useState(false);
  const [edgeStart, setEdgeStart] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const currentMethod = METHODOLOGIES[method];

  useEffect(() => {
    setNodes((ns) => ns.map((n) => ({ ...n, categories: createCategories(method) })));
  }, [method]);

  const addNode = () => {
    const id = `n${Date.now()}`;
    setNodes((n) => [
      ...n,
      {
        id,
        x: 20,
        y: 20,
        label: `Node ${n.length + 1}`,
        categories: createCategories(method),
        dread: createDread(),
      },
    ]);
  };

  const addBoundary = () => {
    const id = `b${Date.now()}`;
    setBoundaries((b) => [
      ...b,
      {
        id,
        x: 40,
        y: 40,
        label: `Boundary ${b.length + 1}`,
        width: BOUNDARY_W,
        height: BOUNDARY_H,
      },
    ]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const id = String(active.id);
    if (id.startsWith('n')) {
      setNodes((ns) =>
        ns.map((n) =>
          n.id === id ? { ...n, x: n.x + delta.x, y: n.y + delta.y } : n,
        ),
      );
    } else if (id.startsWith('b')) {
      setBoundaries((bs) =>
        bs.map((b) =>
          b.id === id ? { ...b, x: b.x + delta.x, y: b.y + delta.y } : b,
        ),
      );
    }
  };

  const selectNode = (id: string) => {
    if (addingEdge) {
      if (!edgeStart) {
        setEdgeStart(id);
      } else if (edgeStart !== id) {
        setEdges((e) => [
          ...e,
          { id: `e${Date.now()}`, from: edgeStart, to: id },
        ]);
        setAddingEdge(false);
        setEdgeStart(null);
      }
    } else {
      setSelected(id);
    }
  };

  const exportPng = async () => {
    if (canvasRef.current) {
      const dataUrl = await toPng(canvasRef.current);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'diagram.png';
      link.click();
    }
  };

  const exportJson = () => {
    const data = {
      methodology: method,
      nodes,
      edges,
      threats: enumerateThreats(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'diagram.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const enumerateThreats = () => {
    const ths: {
      node: string;
      category: string;
      risk: number;
      mitigation: string;
      residual: number;
    }[] = [];
    nodes.forEach((n) => {
      const values = Object.values(n.dread);
      const risk = values.reduce((a, b) => a + b, 0) / values.length;
      Object.entries(n.categories).forEach(([cat, enabled]) => {
        if (enabled) {
          const mitigation = currentMethod.mitigations[cat] || '';
          const residual = Math.max(risk - 2, 0);
          ths.push({ node: n.label, category: cat, risk, mitigation, residual });
        }
      });
    });
    return ths;
  };

  const exportMarkdown = () => {
    const threats = enumerateThreats();
    let md = `# Threat Model (${method})\n\n`;
    md += '| Node | Threat | Risk | Mitigation | Residual Risk |\n';
    md += '| ---- | ------ | ---- | ---------- | ------------- |\n';
    threats.forEach((t) => {
      md += `| ${t.node} | ${t.category} | ${t.risk.toFixed(1)} | ${t.mitigation} | ${t.residual.toFixed(1)} |\n`;
    });
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'threats.md';
    link.click();
    URL.revokeObjectURL(url);
  };

  const errors = useMemo(() => {
    const msgs: string[] = [];
    nodes.forEach((n) => {
      const connected = edges.some((e) => e.from === n.id || e.to === n.id);
      if (!connected) msgs.push(`${n.label} has no connections`);
    });
    return msgs;
  }, [nodes, edges]);

  const selectedNode = nodes.find((n) => n.id === selected);

  const risk = useMemo(() => {
    if (!selectedNode) return 0;
    const values = Object.values(selectedNode.dread);
    return values.reduce((a, b) => a + b, 0) / values.length;
  }, [selectedNode]);

  const toggleCategory = (k: string) => {
    if (!selectedNode) return;
    setNodes((ns) =>
      ns.map((n) =>
        n.id === selectedNode.id
          ? { ...n, categories: { ...n.categories, [k]: !n.categories[k] } }
          : n,
      ),
    );
  };

  const updateDread = (k: keyof DreadScores, v: number) => {
    if (!selectedNode) return;
    setNodes((ns) =>
      ns.map((n) =>
        n.id === selectedNode.id
          ? { ...n, dread: { ...n.dread, [k]: v } }
          : n,
      ),
    );
  };

  const edgeElements = useMemo(
    () =>
      edges.map((e) => {
        const from = nodes.find((n) => n.id === e.from);
        const to = nodes.find((n) => n.id === e.to);
        if (!from || !to) return null;
        return (
          <line
            key={e.id}
            x1={from.x + NODE_W / 2}
            y1={from.y + NODE_H / 2}
            x2={to.x + NODE_W / 2}
            y2={to.y + NODE_H / 2}
            stroke="white"
          />
        );
      }),
    [edges, nodes],
  );

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white p-2 space-y-2">
        {errors.length > 0 && (
          <div className="bg-red-700 p-2 rounded text-sm">
            {errors.map((err) => (
              <div key={err}>{err}</div>
            ))}
          </div>
        )}
        <div className="flex space-x-2">
          <select
            className="bg-gray-700 px-2 rounded"
            value={method}
            onChange={(e) => setMethod(e.target.value as MethodologyKey)}
          >
            {Object.keys(METHODOLOGIES).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <button className="bg-gray-700 px-2 rounded" onClick={addNode}>
            Add Node
          </button>
          <button className="bg-gray-700 px-2 rounded" onClick={addBoundary}>
            Add Boundary
          </button>
          <button
            className="bg-gray-700 px-2 rounded"
            onClick={() => {
              setAddingEdge((a) => !a);
              setEdgeStart(null);
            }}
          >
            {addingEdge ? 'Cancel Edge' : 'Add Edge'}
          </button>
          <button className="bg-gray-700 px-2 rounded" onClick={exportPng}>
            Export PNG
          </button>
          <button className="bg-gray-700 px-2 rounded" onClick={exportJson}>
            Export JSON
          </button>
          <button className="bg-gray-700 px-2 rounded" onClick={exportMarkdown}>
            Export Markdown
          </button>
        </div>
        <div ref={canvasRef} className="flex-1 relative bg-gray-800 rounded">
          {boundaries.map((b) => (
            <BoundaryItem key={b.id} boundary={b} />
          ))}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {edgeElements}
          </svg>
          {nodes.map((n) => (
            <NodeItem key={n.id} node={n} onSelect={() => selectNode(n.id)} />
          ))}
        </div>
        {selectedNode && (
          <div className="bg-gray-700 p-2 rounded text-sm space-y-2">
            <div className="font-bold">
              {selectedNode.label} Risk {risk.toFixed(1)}
            </div>
            <div className="flex flex-wrap gap-2">
              {currentMethod.categories.map((cat) => (
                <label key={cat} className="flex items-center space-x-1">
                  <input
                    type="checkbox"
                    checked={selectedNode.categories[cat]}
                    onChange={() => toggleCategory(cat)}
                  />
                  <span>{cat}</span>
                </label>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(selectedNode.dread).map(([k, v]) => (
                <label key={k} className="flex flex-col text-xs">
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={v}
                    onChange={(e) =>
                      updateDread(k as keyof DreadScores, Number(e.target.value))
                    }
                    className="text-black"
                  />
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </DndContext>
  );
};

export default ThreatModeler;

