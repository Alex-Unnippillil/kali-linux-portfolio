import React, { useCallback, useEffect, useRef, useState } from 'react';
import PseudoDisasmViewer from './PseudoDisasmViewer';
import FunctionTree from './FunctionTree';
import CallGraph from './CallGraph';
import ImportAnnotate from './ImportAnnotate';
// Applies S1–S8 guidelines for responsive and accessible binary analysis UI
const DEFAULT_WASM = '/wasm/ghidra.wasm';

async function loadCapstoneModule() {
  if (typeof window === 'undefined') return null;
  const { Capstone, Const, loadCapstone } = await import('capstone-wasm');
  await loadCapstone();
  return { Capstone, Const };
}

// Disassembly data is now loaded from pre-generated JSON

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
  const [engine, setEngine] = useState('ghidra');
  const [functions, setFunctions] = useState([]);
  const [funcMap, setFuncMap] = useState({});
  const [selected, setSelected] = useState(null);
  const [hexMap, setHexMap] = useState({});
  const [xrefs, setXrefs] = useState({});
  const [liveMessage, setLiveMessage] = useState('');
  const decompileRef = useRef(null);
  const hexRef = useRef(null);
  const syncing = useRef(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const hexWorkerRef = useRef(null);
  const [query, setQuery] = useState('');
  const [funcNotes, setFuncNotes] = useState({});
  const [strings, setStrings] = useState([]);
  const [selectedString, setSelectedString] = useState(null);
  const [stringNotes, setStringNotes] = useState({});
  const [stringQuery, setStringQuery] = useState('');
  const [lineNotes, setLineNotes] = useState({});
  const capstoneRef = useRef(null);
  const [instructions, setInstructions] = useState([]);
  const [arch, setArch] = useState('x86');
  // S1: Detect GHIDRA web support and fall back to Capstone
  const ensureCapstone = useCallback(async () => {
    if (capstoneRef.current) return capstoneRef.current;
    const mod = await loadCapstoneModule();
    capstoneRef.current = mod;
    return mod;
  }, []);

  useEffect(() => {
    const wasmUrl = process.env.NEXT_PUBLIC_GHIDRA_WASM || DEFAULT_WASM;
    if (typeof WebAssembly === 'undefined') {
      setEngine('capstone');
      ensureCapstone();
      return;
    }
    WebAssembly.instantiateStreaming(fetch(wasmUrl), {}).catch(() => {
      setEngine('capstone');
      ensureCapstone();
    });
  }, [ensureCapstone]);

  const handleDrop = useCallback(
    async (e) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file) return;
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      const { Capstone, Const } = await ensureCapstone();
      const [archConst, modeConst] =
        arch === 'arm'
          ? [Const.ARCH_ARM, Const.MODE_ARM]
          : [Const.ARCH_X86, Const.MODE_32];
      const cs = new Capstone(archConst, modeConst);
      const start = performance.now();
      const insns = cs.disasm(bytes, { address: 0x1000 });
      cs.close();
      const end = performance.now();
      if (end - start <= 100) {
        setInstructions(insns);
      } else {
        setInstructions(insns);
      }
    },
    [arch, ensureCapstone]
  );

  const switchEngine = async () => {
    const next = engine === 'ghidra' ? 'capstone' : 'ghidra';
    setEngine(next);
    if (next === 'capstone') {
      await ensureCapstone();
    }
  };

  // Load pre-generated disassembly JSON
  useEffect(() => {
    fetch('/demo-data/ghidra/disassembly.json')
      .then((r) => r.json())
      .then((data) => {
        const map = {};
        const xr = {};
        data.functions.forEach((f) => {
          map[f.name] = f;
        });
        data.functions.forEach((f) => {
          (f.calls || []).forEach((c) => {
            if (!xr[c]) xr[c] = [];
            xr[c].push(f.name);
          });
        });
        setFunctions(data.functions);
        setFuncMap(map);
        setXrefs(xr);
        setSelected(data.functions[0]?.name || null);
      });
  }, []);

  useEffect(() => {
    fetch('/demo-data/ghidra/strings.json')
      .then((r) => r.json())
      .then((data) => {
        setStrings(data.strings || []);
        if (data.strings && data.strings[0]) {
          setSelectedString(data.strings[0].id);
        }
      })
      .catch(() => {});
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
    if (typeof window !== 'undefined' && typeof Worker === 'function') {
      hexWorkerRef.current = new Worker(new URL('./hexWorker.js', import.meta.url));
      hexWorkerRef.current.onmessage = (e) => {
        setHexMap((m) => ({ ...m, [e.data.id]: e.data.hex }));
      };
      return () => hexWorkerRef.current?.terminate();
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (!hexWorkerRef.current || !selected) return;
    const func = funcMap[selected];
    if (func && !hexMap[func.name]) {
      hexWorkerRef.current.postMessage({
        id: func.name,
        code: func.code.join('\n'),
      });
    }
  }, [selected, hexMap, funcMap]);

  // S4: Announce selected function changes via live region
  useEffect(() => {
    if (selected) {
      setLiveMessage(`Selected function ${selected}`);
    }
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

  if (engine === 'capstone') {
    return (
      <div
        className="w-full h-full flex flex-col bg-gray-900 text-gray-100"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="p-2 flex space-x-2">
          <button
            onClick={switchEngine}
            className="px-2 py-1 bg-gray-700 rounded"
          >
            Use Ghidra
          </button>
          <select
            value={arch}
            onChange={(e) => setArch(e.target.value)}
            className="text-black rounded"
          >
            <option value="x86">x86</option>
            <option value="arm">ARM</option>
          </select>
        </div>
        {instructions.length === 0 ? (
          <div className="flex-1 flex items-center justify-center m-2 border-2 border-dashed border-gray-600">
            Drop a binary file here
          </div>
        ) : (
          <pre className="flex-1 overflow-auto p-2 whitespace-pre">
            {instructions
              .map(
                (i) =>
                  `${i.address.toString(16).padStart(8, '0')}: ${Array.from(i.bytes)
                    .map((b) => b.toString(16).padStart(2, '0'))
                    .join(' ')}\t${i.mnemonic} ${i.opStr}`
              )
              .join('\n')}
          </pre>
        )}
      </div>
    );
  }

  const currentFunc = funcMap[selected] || { code: [], blocks: [], calls: [] };
  const filteredFunctions = functions.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase())
  );
  const filteredStrings = strings.filter((s) =>
    s.value.toLowerCase().includes(stringQuery.toLowerCase())
  );

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 text-gray-100">
      <div className="p-2">
        <button
          onClick={switchEngine}
          className="px-2 py-1 bg-gray-700 rounded"
        >
          Use Capstone
        </button>
      </div>
      <div className="p-2 border-t border-gray-700">
        <ImportAnnotate />
      </div>
      <div className="grid flex-1 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <div className="border-b md:border-b-0 md:border-r border-gray-700 overflow-auto min-h-0 last:border-b-0 md:last:border-r-0">
          <div className="p-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search symbols"
              className="w-full mb-2 p-1 rounded text-black"
            />
          </div>
          {query ? (
            <ul className="p-2 text-sm space-y-1">
              {filteredFunctions.map((f) => (
                <li key={f.name}>
                  <button
                    onClick={() => setSelected(f.name)}
                    className={`text-left w-full ${selected === f.name ? 'font-bold' : ''}`}
                  >
                    {f.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <FunctionTree functions={functions} onSelect={setSelected} selected={selected} />
          )}
        </div>
        <div className="border-b md:border-b-0 md:border-r border-gray-700 min-h-0 last:border-b-0 md:last:border-r-0">
          <ControlFlowGraph
            blocks={currentFunc.blocks}
            selected={null}
            onSelect={() => {}}
            prefersReducedMotion={prefersReducedMotion}
          />
        </div>
        {/* S7: ARIA-labelled panes for decompiled and hex views with cross-reference jumps */}
        <pre
          ref={decompileRef}
          aria-label="Decompiled code"
          className="overflow-auto p-2 whitespace-pre-wrap border-b md:border-b-0 md:border-r border-gray-700 min-h-0 last:border-b-0 md:last:border-r-0"
        >
          {currentFunc.code.map((line, idx) => {
            const m = line.match(/call\s+(\w+)/);
            let codeElem;
            if (m && funcMap[m[1]]) {
              const target = m[1];
              codeElem = (
                <div
                  onClick={() => setSelected(target)}
                  className="cursor-pointer text-blue-400 hover:underline"
                >
                  {line}
                </div>
              );
            } else {
              codeElem = <div>{line}</div>;
            }
            const note = lineNotes[selected]?.[idx] || '';
            return (
              <div key={idx} className="flex items-start">
                <div className="flex-1">{codeElem}</div>
                <input
                  value={note}
                  onChange={(e) =>
                    setLineNotes({
                      ...lineNotes,
                      [selected]: {
                        ...(lineNotes[selected] || {}),
                        [idx]: e.target.value,
                      },
                    })
                  }
                  placeholder="note"
                  className="ml-2 w-24 text-xs text-black rounded"
                />
              </div>
            );
          })}
          {(xrefs[selected] || []).length > 0 && (
            <div className="mt-2 text-xs">
              XREFS:
              {xrefs[selected].map((xr) => (
                <button
                  key={xr}
                  onClick={() => setSelected(xr)}
                  className="ml-2 underline text-blue-400"
                >
                  {xr}
                </button>
              ))}
            </div>
          )}
        </pre>
        <pre
          ref={hexRef}
          aria-label="Hexadecimal representation"
          className="overflow-auto p-2 whitespace-pre-wrap border-b md:border-b-0 border-gray-700 min-h-0 last:border-b-0 md:last:border-r-0"
        >
          {hexMap[selected] || ''}
        </pre>
      </div>
      <PseudoDisasmViewer />
      <div className="h-48 border-t border-gray-700">
        <CallGraph
          func={currentFunc}
          callers={xrefs[selected] || []}
          onSelect={setSelected}
        />
      </div>
      <div className="border-t border-gray-700 p-2">
        <label className="block text-sm mb-1">
          Notes for {selected || 'function'}
        </label>
        <textarea
          value={funcNotes[selected] || ''}
          onChange={(e) =>
            setFuncNotes({ ...funcNotes, [selected]: e.target.value })
          }
          className="w-full h-16 p-1 rounded text-black"
        />
      </div>
      <div className="grid border-t border-gray-700 grid-cols-1 md:grid-cols-2 md:h-40">
        <div className="overflow-auto p-2 border-b md:border-b-0 md:border-r border-gray-700 min-h-0">
          <input
            type="text"
            value={stringQuery}
            onChange={(e) => setStringQuery(e.target.value)}
            placeholder="Search strings"
            className="w-full mb-2 p-1 rounded text-black"
          />
          <ul className="text-sm space-y-1">
            {filteredStrings.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => setSelectedString(s.id)}
                  className={`text-left w-full ${
                    selectedString === s.id ? 'font-bold' : ''
                  }`}
                >
                  {s.value}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-2">
          <label className="block text-sm mb-1">
            Notes for {
              strings.find((s) => s.id === selectedString)?.value || 'string'
            }
          </label>
          <textarea
            value={stringNotes[selectedString] || ''}
            onChange={(e) =>
              setStringNotes({
                ...stringNotes,
                [selectedString]: e.target.value,
              })
            }
            className="w-full h-full p-1 rounded text-black"
          />
        </div>
      </div>
      {/* S8: Hidden live region for assistive tech announcements */}
      <div aria-live="polite" role="status" className="sr-only">
        {liveMessage}
      </div>
    </div>
  );
}
