import React, { useEffect, useRef, useState } from 'react';
import PseudoDisasmViewer from './PseudoDisasmViewer';

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

  useEffect(() => {
    const wasmUrl = process.env.NEXT_PUBLIC_GHIDRA_WASM || DEFAULT_WASM;
    if (typeof WebAssembly === 'undefined') {
      setUseRemote(true);
      return;
    }
    WebAssembly.instantiateStreaming(fetch(wasmUrl), {})
      .catch(() => setUseRemote(true));
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e) => setPrefersReducedMotion(e.matches);
    handler(mq);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const worker = new Worker(new URL('./hexWorker.js', import.meta.url));
    worker.onmessage = (e) => {
      setHexMap((m) => ({ ...m, [e.data.id]: e.data.hex }));
    };
    BLOCKS.forEach((b) =>
      worker.postMessage({ id: b.id, code: b.code.join('\n') })
    );
    return () => worker.terminate();
  }, []);

  useEffect(() => {
    const block = BLOCKS.find((b) => b.id === selected);
    setLiveMessage(`Selected block ${block ? block.label : selected}`);
  }, [selected]);

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
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; geolocation; gyroscope; picture-in-picture; microphone; camera"
        referrerPolicy="no-referrer"
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
      <div aria-live="polite" role="status" className="sr-only">
        {liveMessage}
      </div>
    </div>
  );
}
