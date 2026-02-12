import React, { useCallback, useEffect, useRef, useState } from 'react';
import PseudoDisasmViewer from './PseudoDisasmViewer';
import FunctionTree from './FunctionTree';
import CallGraph from './CallGraph';
import ImportAnnotate from './ImportAnnotate';
import SymbolTable from './SymbolTable';
import { Capstone, Const, loadCapstone } from 'capstone-wasm';
import usePersistedState from '../../../hooks/usePersistedState';

// Applies S1–S8 guidelines for responsive and accessible binary analysis UI
const DEFAULT_WASM = '/wasm/ghidra.wasm';

async function loadCapstoneModule() {
  if (typeof window === 'undefined') return null;
  await loadCapstone();
  return { Capstone, Const };
}

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
          if (!t) return null;
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
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [hexMap, setHexMap] = useState({});
  const [xrefs, setXrefs] = useState({});
  const [project, setProject] = useState(null);
  const [symbols, setSymbols] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [strings, setStrings] = useState([]);
  const [selectedString, setSelectedString] = useState(null);
  const [query, setQuery] = useState('');
  const [stringQuery, setStringQuery] = useState('');
  const [pseudocodeSnippet, setPseudocodeSnippet] = useState(null);
  const [liveMessage, setLiveMessage] = useState('');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [instructions, setInstructions] = useState([]);
  const [arch, setArch] = useState('x86');
  const [labMode] = usePersistedState('simulator:labMode', false);
  const decompileRef = useRef(null);
  const hexRef = useRef(null);
  const syncing = useRef(false);
  const hexWorkerRef = useRef(null);
  const capstoneRef = useRef(null);

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
      if (!labMode) return;
      const file = e.dataTransfer.files[0];
      if (!file) return;
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      const { Capstone: CapstoneCtor, Const: ConstVals } = await ensureCapstone();
      const [archConst, modeConst] =
        arch === 'arm'
          ? [ConstVals.ARCH_ARM, ConstVals.MODE_ARM]
          : [ConstVals.ARCH_X86, ConstVals.MODE_32];
      const cs = new CapstoneCtor(archConst, modeConst);
      const insns = cs.disasm(bytes, { address: 0x1000 });
      cs.close();
      setInstructions(insns);
    },
    [arch, ensureCapstone, labMode]
  );

  const switchEngine = async () => {
    const next = engine === 'ghidra' ? 'capstone' : 'ghidra';
    setEngine(next);
    if (next === 'capstone') {
      await ensureCapstone();
    }
  };

  useEffect(() => {
    fetch('/demo-data/ghidra/project.json')
      .then((r) => r.json())
      .then((data) => {
        const map = {};
        const xr = {};
        (data.functions || []).forEach((f) => {
          map[f.name] = f;
        });
        (data.functions || []).forEach((f) => {
          (f.calls || []).forEach((c) => {
            if (!xr[c]) xr[c] = [];
            xr[c].push(f.name);
          });
        });
        setFunctions(data.functions || []);
        setFuncMap(map);
        setXrefs(xr);
        const preferred = data.project?.entry;
        const initial = preferred && map[preferred] ? preferred : data.functions?.[0]?.name || null;
        setSelected(initial);
        setSelectedBlock(map[initial]?.blocks?.[0]?.id || null);
        setProject(data.project || null);
        setSymbols(data.symbols || []);
        setSelectedSymbol(data.symbols?.[0]?.name || null);
        setStrings(data.strings || []);
        setSelectedString(data.strings?.[0]?.id || null);
        setPseudocodeSnippet(data.pseudocode || null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) return;
    const func = funcMap[selected];
    if (func?.blocks?.length) {
      setSelectedBlock(func.blocks[0].id);
    } else {
      setSelectedBlock(null);
    }
  }, [selected, funcMap]);

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
        code: (func.code || []).join('\n'),
        bytes: func.bytes || null,
        address: func.address || null,
      });
    }
  }, [selected, hexMap, funcMap]);

  // S4: Announce selected function changes via live region
  useEffect(() => {
    if (selected) {
      const display = funcMap[selected]?.displayName || selected;
      setLiveMessage(`Selected function ${display}`);
    }
  }, [selected, funcMap]);

  // S5: Synchronize scrolling between decompile and hex panes
  useEffect(() => {
    const d = decompileRef.current;
    const h = hexRef.current;
    if (!d || !h) return undefined;
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

  const currentFunc = funcMap[selected] || { code: [], blocks: [], calls: [] };
  const filteredFunctions = functions.filter((f) => {
    const text = `${f.displayName || f.name}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });
  const filteredStrings = strings.filter((s) => {
    const hay = `${s.value} ${s.description || ''}`.toLowerCase();
    return hay.includes(stringQuery.toLowerCase());
  });
  const currentString = strings.find((s) => s.id === selectedString) || null;
  const currentSymbol = symbols.find((s) => s.name === selectedSymbol) || null;
  const currentBlock = currentFunc.blocks?.find((b) => b.id === selectedBlock) || null;
  const callers = xrefs[selected] || [];
  const functionNames = functions.map((f) => f.name);

  if (engine === 'capstone') {
    return (
      <div
        className="w-full h-full flex flex-col bg-gray-900 text-gray-100"
        onDragOver={(e) => {
          if (labMode) e.preventDefault();
        }}
        onDrop={handleDrop}
      >
        <div className="p-2 flex flex-col md:flex-row md:items-center md:space-x-2 gap-2">
          <div className="flex items-center gap-2">
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
          {!labMode && (
            <div className="text-yellow-300 text-xs">
              Lab mode is off. Enable it to analyze your own binaries.
            </div>
          )}
        </div>
        {instructions.length === 0 ? (
          <div className="flex-1 flex items-center justify-center m-2 border-2 border-dashed border-gray-600 text-center p-4">
            {labMode
              ? 'Drop a binary file here to disassemble with Capstone.'
              : 'Demo mode active. Enable lab mode to drop a binary for Capstone disassembly.'}
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

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 text-gray-100">
      {project && (
        <div className="border-b border-gray-700 p-2 text-xs md:text-sm">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
            <div>
              <h2 className="text-base md:text-lg font-semibold">{project.name}</h2>
              <p className="text-gray-300 max-w-3xl">{project.summary}</p>
            </div>
            <dl className="text-gray-400 space-y-1">
              <div>
                <dt className="font-semibold text-gray-200">Binary</dt>
                <dd>{project.binary}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-200">Architecture</dt>
                <dd>{project.architecture}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-200">Entry</dt>
                <dd>{project.entry}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}
      <div className="border-b border-yellow-700 bg-yellow-900 text-yellow-100 text-xs md:text-sm p-2 space-y-1" role="status">
        <p>{project?.labMessage || 'For lab use only – simulator data is read-only by default.'}</p>
        {!labMode && (
          <p>
            Lab mode is disabled. Navigation stays read-only and uploads are
            locked until you opt into lab mode from the simulator settings.
          </p>
        )}
      </div>
      <div className="p-2">
        <button
          onClick={switchEngine}
          className="px-2 py-1 bg-gray-700 rounded"
        >
          Use Capstone
        </button>
      </div>
      <div className="p-2 border-t border-gray-700">
        <ImportAnnotate labModeEnabled={labMode} />
      </div>
      <div className="grid flex-1 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <div className="border-b md:border-b-0 md:border-r border-gray-700 overflow-auto min-h-0 last:border-b-0 md:last:border-r-0">
          <div className="p-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search symbols"
              aria-label="Search functions"
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
                    {f.displayName || f.name}
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
            blocks={currentFunc.blocks || []}
            selected={selectedBlock}
            onSelect={setSelectedBlock}
            prefersReducedMotion={prefersReducedMotion}
          />
        </div>
        <pre
          ref={decompileRef}
          aria-label="Decompiled code"
          className="overflow-auto p-2 whitespace-pre-wrap border-b md:border-b-0 md:border-r border-gray-700 min-h-0 last:border-b-0 md:last:border-r-0"
        >
          {currentFunc.code.map((line, idx) => {
            const annotation = currentFunc.annotations?.[String(idx + 1)];
            const target = functionNames.find((name) =>
              line.includes(`${name}(`)
            );
            return (
              <div key={idx} className="mb-1">
                <div className="flex flex-col gap-1">
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 w-8 text-right">
                      {(idx + 1).toString().padStart(2, '0')}
                    </span>
                    {target ? (
                      <button
                        type="button"
                        onClick={() => setSelected(target)}
                        className="flex-1 text-left text-blue-400 hover:underline"
                      >
                        {line}
                      </button>
                    ) : (
                      <span className="flex-1">{line}</span>
                    )}
                  </div>
                  {annotation && (
                    <span className="ml-10 text-[0.65rem] text-yellow-300">
                      {annotation}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {callers.length > 0 && (
            <div className="mt-2 text-xs">
              Called by:
              {callers.map((xr) => (
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
          className="overflow-auto p-2 whitespace-pre border-b md:border-b-0 border-gray-700 min-h-0 last:border-b-0 md:last:border-r-0"
        >
          {hexMap[selected] || ''}
        </pre>
      </div>
      <PseudoDisasmViewer snippet={pseudocodeSnippet} />
      <div className="grid border-t border-gray-700 grid-cols-1 lg:grid-cols-2 lg:h-64">
        <div className="border-b lg:border-b-0 lg:border-r border-gray-700 min-h-0">
          <CallGraph func={currentFunc} callers={callers} onSelect={setSelected} />
        </div>
        <div className="p-2 min-h-0">
          <SymbolTable
            symbols={symbols}
            selectedSymbol={selectedSymbol}
            onSelectSymbol={setSelectedSymbol}
            onNavigateFunction={setSelected}
          />
        </div>
      </div>
      <div className="border-t border-gray-700 p-2 grid gap-4 md:grid-cols-2 text-xs md:text-sm">
        <div>
          <h3 className="font-semibold text-gray-100 mb-2">Function metadata</h3>
          <dl className="space-y-1 text-gray-300">
            <div>
              <dt className="font-semibold text-gray-200">Prototype</dt>
              <dd>{currentFunc.prototype || '—'}</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-200">Address</dt>
              <dd>{currentFunc.address || '—'}</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-200">Size</dt>
              <dd>{currentFunc.size ? `${currentFunc.size} bytes` : '—'}</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-200">Outgoing calls</dt>
              <dd>{(currentFunc.calls || []).join(', ') || 'None'}</dd>
            </div>
          </dl>
          {currentBlock && (
            <div className="mt-3">
              <h4 className="font-semibold text-gray-100">Selected block: {currentBlock.label}</h4>
              <pre className="mt-1 bg-gray-800 p-2 text-xs whitespace-pre-wrap border border-gray-700">
                {currentBlock.code.join('\n')}
              </pre>
            </div>
          )}
        </div>
        <div>
          <h3 className="font-semibold text-gray-100 mb-2">Symbol detail</h3>
          {currentSymbol ? (
            <dl className="space-y-1 text-gray-300">
              <div>
                <dt className="font-semibold text-gray-200">Name</dt>
                <dd>{currentSymbol.name}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-200">Type</dt>
                <dd>{currentSymbol.type}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-200">Address</dt>
                <dd>{currentSymbol.address}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-200">Section</dt>
                <dd>{currentSymbol.section || '—'}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-200">Size</dt>
                <dd>{currentSymbol.size ? `${currentSymbol.size} bytes` : '—'}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-200">Description</dt>
                <dd>{currentSymbol.description || '—'}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-gray-300">Select a symbol to see details.</p>
          )}
        </div>
      </div>
      <div className="grid border-t border-gray-700 grid-cols-1 md:grid-cols-2 md:h-52">
        <div className="overflow-auto p-2 border-b md:border-b-0 md:border-r border-gray-700 min-h-0">
          <input
            type="text"
            value={stringQuery}
            onChange={(e) => setStringQuery(e.target.value)}
            placeholder="Search strings"
            aria-label="Search strings"
            className="w-full mb-2 p-1 rounded text-black"
          />
          <ul className="text-sm space-y-1">
            {filteredStrings.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => setSelectedString(s.id)}
                  className={`text-left w-full ${selectedString === s.id ? 'font-bold' : ''}`}
                >
                  {s.value}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-2 text-xs md:text-sm">
          <h3 className="font-semibold text-gray-100 mb-1">String detail</h3>
          {currentString ? (
            <div className="space-y-1 text-gray-300">
              <div>
                <span className="font-semibold text-gray-200">Value:</span> {currentString.value}
              </div>
              <div>
                <span className="font-semibold text-gray-200">Address:</span> {currentString.address}
              </div>
              <div>
                <span className="font-semibold text-gray-200">Description:</span> {currentString.description || '—'}
              </div>
              <div>
                <span className="font-semibold text-gray-200">References:</span>{' '}
                {(currentString.references || []).length === 0 ? (
                  'None'
                ) : (
                  (currentString.references || []).map((ref) => (
                    <button
                      key={ref}
                      onClick={() => setSelected(ref)}
                      className="ml-2 underline text-blue-400"
                    >
                      {ref}
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-300">Select a string to view metadata.</p>
          )}
        </div>
      </div>
      <div aria-live="polite" role="status" className="sr-only">
        {liveMessage}
      </div>
    </div>
  );
}
