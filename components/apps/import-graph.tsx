import React, { useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import {
  forceCenter,
  forceLink,
  forceManyBody,
  forceSimulation,
} from 'd3-force';

interface GraphNode {
  deps: string[];
  size: number;
  ssrUnsafe: boolean;
}

interface FileError {
  file: string;
  error: string;
}

const LARGE_THRESHOLD = 5000;

const ImportGraph: React.FC = () => {
  const [pasted, setPasted] = useState('');
  const [graph, setGraph] = useState<Record<string, GraphNode>>({});
  const [errors, setErrors] = useState<FileError[]>([]);
  const [cycles, setCycles] = useState<string[][]>([]);
  const [depth, setDepth] = useState(3);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [diff, setDiff] = useState<string[]>([]);
  const [root, setRoot] = useState('');
  const [search, setSearch] = useState('');
  const workerRef = useRef<Worker>();

  useEffect(() => {
    workerRef.current = new Worker(new URL('./import-graph.worker.ts', import.meta.url), {
      type: 'module',
    });
    const worker = workerRef.current;
    worker.onmessage = (e) => {
      const { type } = e.data;
      if (type === 'progress') {
        setGraph((g) => ({ ...g, ...e.data.partial }));
      } else if (type === 'done') {
        setGraph(e.data.graph);
        setErrors(e.data.errors);
        setCycles(e.data.cycles);
        const g: Record<string, GraphNode> = e.data.graph;
        setRoot(Object.keys(g)[0] || '');
        const cycleSet = new Set<string>(e.data.cycles.flat());
        const sugg: string[] = [];
        Object.entries(g).forEach(([path, node]) => {
          if (cycleSet.has(path))
            sugg.push(
              `${path} is part of a cycle; consider next/dynamic to break it`,
            );
          if (node.ssrUnsafe)
            sugg.push(
              `${path} uses browser globals; wrap with next/dynamic({ ssr: false })`,
            );
          else if (node.size > LARGE_THRESHOLD)
            sugg.push(
              `${path} is large (${node.size} bytes); consider next/dynamic`,
            );
        });
        setSuggestions(sugg);
        const previous: Record<string, GraphNode> = JSON.parse(
          localStorage.getItem('import-graph-last') || '{}',
        );
        const changes: string[] = [];
        for (const k of Object.keys(g)) {
          if (!previous[k]) changes.push(`Added ${k}`);
          else if (previous[k].size !== g[k].size)
            changes.push(`Modified ${k}`);
        }
        for (const k of Object.keys(previous)) {
          if (!g[k]) changes.push(`Removed ${k}`);
        }
        setDiff(changes);
        localStorage.setItem('import-graph-last', JSON.stringify(g));
      }
    };
    return () => worker.terminate();
  }, []);

  const parseFiles = (files: Record<string, string>) => {
    setGraph({});
    setErrors([]);
    setCycles([]);
    setSuggestions([]);
    setDiff([]);
    workerRef.current?.postMessage({ files });
  };

  const handlePaste = () => {
    if (pasted.trim()) parseFiles({ 'index.js': pasted });
  };

  const handleLocal = async () => {
    const res = await fetch('/api/madge');
    const data = await res.json();
    if (data.error) {
      setErrors([{ file: 'madge', error: data.error }]);
      return;
    }
    const g: Record<string, GraphNode> = {};
    Object.entries<Record<string, string[]>>(data.graph).forEach(([k, deps]) => {
      g[k] = { deps, size: data.sizes[k] || 0, ssrUnsafe: false };
    });
    setGraph(g);
    setCycles(data.circular || []);
    setRoot(Object.keys(g)[0] || '');
    const cycleSet = new Set<string>((data.circular || []).flat());
    const sugg: string[] = [];
    Object.entries(g).forEach(([path, node]) => {
      if (cycleSet.has(path)) sugg.push(`${path} is part of a cycle`);
      else if (node.size > LARGE_THRESHOLD)
        sugg.push(`${path} is large (${node.size} bytes); consider code splitting`);
    });
    (data.orphans || []).forEach((o: string) =>
      sugg.push(`${o} is unused and may be tree-shaken`),
    );
    setSuggestions(sugg);
    const previous: Record<string, GraphNode> = JSON.parse(
      localStorage.getItem('import-graph-last') || '{}',
    );
    const changes: string[] = [];
    for (const k of Object.keys(g)) {
      if (!previous[k]) changes.push(`Added ${k}`);
      else if (previous[k].size !== g[k].size) changes.push(`Modified ${k}`);
    }
    for (const k of Object.keys(previous)) {
      if (!g[k]) changes.push(`Removed ${k}`);
    }
    setDiff(changes);
    localStorage.setItem('import-graph-last', JSON.stringify(g));
  };

  const handleZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const zip = await JSZip.loadAsync(file);
    const files: Record<string, string> = {};
    const errs: FileError[] = [];
    await Promise.all(
      Object.keys(zip.files).map(async (name) => {
        const entry = zip.files[name];
        if (entry.dir) return;
        try {
          files[name] = await entry.async('string');
        } catch {
          errs.push({ file: name, error: 'unreadable file' });
        }
      }),
    );
    setErrors(errs);
    parseFiles(files);
  };

  const handleExport = async () => {
    const el = document.getElementById('import-graph-svg');
    if (!el) return;
    const { toPng } = await import('html-to-image');
    const dataUrl = await toPng(el as HTMLElement);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'import-graph.png';
    a.click();
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <textarea
        value={pasted}
        onChange={(e) => setPasted(e.target.value)}
        placeholder="Paste JS/TS module code here..."
        className="w-full h-32 text-black p-2"
      />
      <button onClick={handlePaste} className="bg-blue-600 px-2 py-1 rounded w-fit">
        Parse Pasted Code
      </button>
      <input type="file" accept=".zip" onChange={handleZip} />
      <button onClick={handleLocal} className="bg-green-600 px-2 py-1 rounded w-fit">
        Analyze Repo
      </button>
      <label className="flex items-center space-x-2">
        <span>Depth: {depth}</span>
        <input
          type="range"
          min={1}
          max={10}
          value={depth}
          onChange={(e) => setDepth(parseInt(e.target.value))}
        />
      </label>
      {Object.keys(graph).length > 0 && (
        <div className="flex flex-col space-y-2">
          <label className="flex items-center space-x-2">
            <span>Root:</span>
            <select
              value={root}
              onChange={(e) => setRoot(e.target.value)}
              className="text-black"
            >
              {Object.keys(graph).map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <input
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-black p-1"
          />
          <button onClick={handleExport} className="bg-purple-600 px-2 py-1 rounded w-fit">
            Export PNG
          </button>
        </div>
      )}
      <GraphView graph={graph} cycles={cycles} depth={depth} root={root} search={search} />
      {errors.length > 0 && (
        <div className="text-red-400 overflow-auto max-h-32">
          {errors.map((e) => (
            <div key={e.file}>
              {e.file}: {e.error}
            </div>
          ))}
        </div>
      )}
      {suggestions.length > 0 && (
        <div className="text-yellow-300 overflow-auto max-h-32">
          {suggestions.map((s, i) => (
            <div key={i}>{s}</div>
          ))}
        </div>
      )}
      {diff.length > 0 && (
        <div className="text-green-300 overflow-auto max-h-32">
          {diff.map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>
      )}
    </div>
  );
};

interface GraphViewProps {
  graph: Record<string, GraphNode>;
  cycles: string[][];
  depth: number;
  root: string;
  search: string;
}

const GraphView: React.FC<GraphViewProps> = ({ graph, cycles, depth, root, search }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [panning, setPanning] = useState<null | { x: number; y: number }>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});

    const nodes = useMemo(() => Object.keys(graph), [graph]);
    const visible = useMemo(
      () => (root ? filterByDepth(graph, root, depth) : new Set<string>()),
      [graph, root, depth],
    );
    const filteredNodes = useMemo(
      () => (root ? nodes.filter((n) => visible.has(n) && n.includes(search)) : []),
      [root, nodes, visible, search],
    );
    const edges = useMemo(
      () =>
        filteredNodes.flatMap((n) =>
          graph[n].deps
            .filter((d) => visible.has(d))
            .map((d) => [n, d] as [string, string]),
        ),
      [filteredNodes, graph, visible],
    );

  useEffect(() => {
    const nodeData = filteredNodes.map((id) => ({ id }));
    const linkData = edges.map(([source, target]) => ({ source, target }));
    const sim = forceSimulation(nodeData)
      .force('link', forceLink(linkData).id((d: any) => d.id))
      .force('charge', forceManyBody().strength(-300))
      .force('center', forceCenter(0, 0));
    sim.on('tick', () => {
      setPositions(
        Object.fromEntries(
          nodeData.map((n: any) => [n.id, { x: n.x || 0, y: n.y || 0 }]),
        ),
      );
    });
    return () => sim.stop();
  }, [filteredNodes, edges]);

  if (nodes.length === 0)
    return <div className="flex-1 border border-gray-700" />;
  const cycleNodes = new Set(cycles.flat());
  const cycleEdges = new Set<string>();
  cycles.forEach((c) => {
    for (let i = 0; i < c.length - 1; i++) cycleEdges.add(c[i] + '->' + c[i + 1]);
  });

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scale = e.deltaY < 0 ? view.scale * 1.1 : view.scale / 1.1;
    setView({ ...view, scale });
  };

  const handleDown = (e: React.MouseEvent) => {
    setPanning({ x: e.clientX, y: e.clientY });
  };

  const handleMove = (e: React.MouseEvent) => {
    if (!panning) return;
    setView((v) => ({ ...v, x: v.x + e.clientX - panning.x, y: v.y + e.clientY - panning.y }));
    setPanning({ x: e.clientX, y: e.clientY });
  };

  const handleUp = () => setPanning(null);

  return (
    <svg
      id="import-graph-svg"
      ref={svgRef}
      className="flex-1 border border-gray-700 bg-gray-800 cursor-move"
      onWheel={handleWheel}
      onMouseDown={handleDown}
      onMouseMove={handleMove}
      onMouseUp={handleUp}
      onMouseLeave={handleUp}
    >
      <g transform={`translate(${view.x},${view.y}) scale(${view.scale})`}>
        {edges.map(([a, b]) => {
          const key = a + '->' + b;
          const col = cycleEdges.has(key) ? '#f87171' : '#fff';
          const pa = positions[a];
          const pb = positions[b];
          if (!pa || !pb) return null;
          return (
            <line
              key={key}
              x1={pa.x}
              y1={pa.y}
              x2={pb.x}
              y2={pb.y}
              stroke={col}
            />
          );
        })}
        {filteredNodes.map((n) => {
          const pos = positions[n];
          if (!pos) return null;
          const large = graph[n].size > LARGE_THRESHOLD;
          const fill = cycleNodes.has(n)
            ? '#f87171'
            : graph[n].ssrUnsafe
            ? '#a855f7'
            : large
            ? '#f97316'
            : '#60a5fa';
          return (
            <g key={n}>
              <circle cx={pos.x} cy={pos.y} r={10} fill={fill} />
              <text
                x={pos.x}
                y={pos.y + 15}
                textAnchor="middle"
                className="text-xs fill-white"
              >
                {n}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
};

function filterByDepth(
  graph: Record<string, GraphNode>,
  root: string,
  depth: number,
): Set<string> {
  const visited = new Set<string>();
  const queue: [string, number][] = [[root, 0]];
  while (queue.length) {
    const [node, d] = queue.shift()!;
    if (d > depth || visited.has(node)) continue;
    visited.add(node);
    graph[node]?.deps.forEach((dep) => queue.push([dep, d + 1]));
  }
  return visited;
}

export default ImportGraph;
export const displayImportGraph = () => <ImportGraph />;
