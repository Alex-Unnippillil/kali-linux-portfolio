import React, { useEffect, useRef, useState } from 'react';
import PseudoDisasmViewer from './PseudoDisasmViewer';

// Applies S1–S8 guidelines for responsive and accessible binary analysis UI
const DEFAULT_WASM = '/wasm/ghidra.wasm';

const BLOCKS = [
  {
    id: 'start',
    label: 'Start',
    code: ['start:', '  mov eax, 1'],
    edges: ['check'],
    x: 40,
    y: 60,
  },
  {
    id: 'check',
    label: 'Check',
    code: ['cmp eax, 2', 'jne end'],
    edges: ['end'],
    x: 140,
    y: 60,
  },
  {
    id: 'end',
    label: 'End',
    code: ['ret'],
    edges: [],
    x: 240,
    y: 60,
  },
];

// S6: Interactive control flow graph with accessible labelling
function ControlFlowGraph({ blocks, selected, onSelect, prefersReducedMotion }) {
  return (
    <svg
      role="img"
      aria-label="Control flow graph"
      viewBox="0 0 300 120"
      className="w-full h-full bg-black"
    >
      {blocks.map((b) =>
        b.edges.map((e) => {
          const t = blocks.find((blk) => blk.id === e);
          return (
            <line
              key={`${b.id}-${t.id}`}
              x1={b.x + 40}
              y1={b.y}
              x2={t.x}
              y2={t.y}
              stroke="#9ca3af"
            />
          );
        })
      )}
      {blocks.map((b) => (
        <g key={b.id} onClick={() => onSelect(b.id)} className="cursor-pointer">
          <rect
            x={b.x - 30}
            y={b.y - 20}
            width={60}
            height={40}
            className={`${
              selected === b.id ? 'fill-yellow-600' : 'fill-gray-700'
            } stroke-gray-400 ${
              prefersReducedMotion ? '' : 'transition-colors duration-300'
            }`}
          />
          <text
            x={b.x}
            y={b.y + 5}
            textAnchor="middle"
            className="fill-white text-sm"
          >
            {b.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function GhidraApp() {
  const [useRemote, setUseRemote] = useState(false);
  const [selected, setSelected] = useState('start');
  const [hexMap, setHexMap] = useState({});
  const [liveMessage, setLiveMessage] = useState('');
  const decompileRef = useRef(null);
  const hexRef = useRef(null);
  const syncing = useRef(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const hexWorkerRef = useRef(null);

  // S1: Graceful remote fallback when WebAssembly is unavailable
  useEffect(() => {
    const wasmUrl = process.env.NEXT_PUBLIC_GHIDRA_WASM || DEFAULT_WASM;
    if (typeof WebAssembly === 'undefined') {
      setUseRemote(true);
      return;
    }
    WebAssembly.instantiateStreaming(fetch(wasmUrl), {})
      .catch(() => setUseRemote(true));
  }, []);

  // S2: Respect reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e) => setPrefersReducedMotion(e.matches);
    handler(mq);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // S3: Offload hex generation to worker only when needed
  useEffect(() => {
    hexWorkerRef.current = new Worker(new URL('./hexWorker.js', import.meta.url));
    hexWorkerRef.current.onmessage = (e) => {
      setHexMap((m) => ({ ...m, [e.data.id]: e.data.hex }));
    };
    return () => hexWorkerRef.current.terminate();
  }, []);

  useEffect(() => {
    if (!hexWorkerRef.current) return;
    const block = BLOCKS.find((b) => b.id === selected);
    if (block && !hexMap[block.id]) {
      hexWorkerRef.current.postMessage({
        id: block.id,
        code: block.code.join('\n'),
      });
    }
  }, [selected, hexMap]);

  // S4: Announce selected block changes via live region
  useEffect(() => {
    const block = BLOCKS.find((b) => b.id === selected);
    setLiveMessage(`Selected block ${block ? block.label : selected}`);
  }, [selected]);

  // S5: Synchronize scrolling between decompile and hex panes
  useEffect(() => {
    const d = decompileRef.current;
    const h = hexRef.current;
    const sync = (source, target) => {
      if (syncing.current) return;
      syncing.current = true;
      requestAnimationFrame(() => {
        target.scrollTop = source.scrollTop;
        syncing.current = false;
      });
    };
    const onD = () => sync(d, h);
    const onH = () => sync(h, d);
    d.addEventListener('scroll', onD);
    h.addEventListener('scroll', onH);
    return () => {
      d.removeEventListener('scroll', onD);
      h.removeEventListener('scroll', onH);
    };
  }, []);

  if (useRemote) {
    const remoteUrl = process.env.NEXT_PUBLIC_GHIDRA_URL || 'https://ghidra.app';
    return (
      <iframe
        src={remoteUrl}
        className="w-full h-full bg-ub-cool-grey"
        frameBorder="0"
        title="Ghidra"
      />
    );
  }

  const selectedBlock = BLOCKS.find((b) => b.id === selected);

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 text-gray-100">
      <div className="flex flex-1">
        <div className="w-1/3 border-r border-gray-700">
          <ControlFlowGraph
            blocks={BLOCKS}
            selected={selected}
            onSelect={setSelected}
            prefersReducedMotion={prefersReducedMotion}
          />
        </div>
        {/* S7: ARIA-labelled panes for decompiled and hex views */}
        <pre
          ref={decompileRef}
          aria-label="Decompiled code"
          className="w-1/3 overflow-auto p-2 whitespace-pre-wrap"
        >
          {selectedBlock.code.join('\n')}
        </pre>
        <pre
          ref={hexRef}
          aria-label="Hexadecimal representation"
          className="w-1/3 overflow-auto p-2 whitespace-pre-wrap"
        >
          {hexMap[selected] || ''}
        </pre>
      </div>
      <PseudoDisasmViewer />
      {/* S8: Hidden live region for assistive tech announcements */}
      <div aria-live="polite" role="status" className="sr-only">
        {liveMessage}
      </div>
    </div>
  );
}
