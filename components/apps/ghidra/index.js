import React, { useCallback, useEffect, useRef, useState } from 'react';
import PseudoDisasmViewer from './PseudoDisasmViewer';
import FunctionTree from './FunctionTree';
import CallGraph from './CallGraph';
import ImportAnnotate from './ImportAnnotate';
import { Capstone, Const, loadCapstone } from 'capstone-wasm';

// Applies S1–S8 guidelines for responsive and accessible binary analysis UI
const DEFAULT_WASM = '/wasm/ghidra.wasm';

const paneBaseClasses =
  'group/pane relative flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/80 shadow-[0_18px_38px_rgba(2,6,23,0.45)] transition-colors duration-200';
const paneInteractiveClasses =
  `${paneBaseClasses} focus-within:border-orange-400/70 focus-within:ring-2 focus-within:ring-orange-300/60 focus-within:ring-offset-2 focus-within:ring-offset-slate-950 hover:border-orange-300/50`;
const sectionHeadingClasses =
  'text-xs font-semibold uppercase tracking-wide text-slate-300';

async function loadCapstoneModule() {
  if (typeof window === 'undefined') return null;
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
      className="h-full w-full rounded-lg bg-slate-950"
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
              stroke="#64748b"
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
              selected === b.id
                ? 'fill-orange-500/80 stroke-orange-200/80'
                : 'fill-slate-800/90 stroke-slate-600'
            } ${prefersReducedMotion ? '' : 'transition-colors duration-300'} shadow-[0_0_0_1px_rgba(148,163,184,0.3)]`}
          />
          <text
            x={b.x}
            y={b.y + 5}
            textAnchor="middle"
            className="fill-slate-100 text-xs font-medium"
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
        className="flex h-full w-full flex-col gap-4 bg-slate-950/90 p-4 text-slate-100"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <header
          className={`${paneBaseClasses} flex-wrap items-center gap-3 px-4 py-3`}
        >
          <button
            onClick={switchEngine}
            className="rounded-lg border border-orange-400/40 bg-orange-500/20 px-4 py-2 text-sm font-semibold text-orange-100 transition hover:bg-orange-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-200/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Use Ghidra
          </button>
          <div className="flex items-center gap-2">
            <label
              htmlFor="capstone-arch"
              className="text-xs font-semibold uppercase tracking-wide text-slate-300"
            >
              Architecture
            </label>
            <select
              id="capstone-arch"
              value={arch}
              onChange={(e) => setArch(e.target.value)}
              className="rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-orange-400/60 focus:outline-none focus:ring-2 focus:ring-orange-300/60 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              <option value="x86">x86</option>
              <option value="arm">ARM</option>
            </select>
          </div>
        </header>
        {instructions.length === 0 ? (
          <section
            className={`${paneInteractiveClasses} flex flex-1 items-center justify-center border-2 border-dashed border-slate-700/70 text-center`}
            aria-label="Capstone drop zone"
          >
            <p className="px-6 text-sm text-slate-300">
              Drop a binary file here to disassemble with Capstone.
            </p>
          </section>
        ) : (
          <section className={`${paneInteractiveClasses} flex-1`} aria-label="Capstone disassembly">
            <pre
              tabIndex={0}
              className="flex-1 overflow-auto whitespace-pre px-4 py-3 text-sm leading-relaxed"
            >
              {instructions
                .map(
                  (i) =>
                    `${i.address.toString(16).padStart(8, '0')}: ${Array.from(i.bytes)
                      .map((b) => b.toString(16).padStart(2, '0'))
                      .join(' ')}\t${i.mnemonic} ${i.opStr}`
                )
                .join('\n')}
            </pre>
          </section>
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
    <div className="flex h-full w-full flex-col gap-4 bg-slate-950/90 p-4 text-slate-100">
      <header
        className={`${paneBaseClasses} flex-row items-center justify-between gap-3 px-4 py-3`}
      >
        <button
          onClick={switchEngine}
          className="rounded-lg border border-orange-400/40 bg-orange-500/20 px-4 py-2 text-sm font-semibold text-orange-100 transition hover:bg-orange-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-200/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          Use Capstone
        </button>
      </header>
      <section className={`${paneBaseClasses} px-0`}>
        <div className="px-4 py-3">
          <ImportAnnotate />
        </div>
      </section>
      <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <section
          className={`${paneInteractiveClasses} min-h-0`}
          aria-label="Symbol tree and search"
        >
          <div className="border-b border-slate-800/70 bg-slate-950/70 px-4 py-3">
            <label
              htmlFor="ghidra-symbol-search"
              className={sectionHeadingClasses}
            >
              Symbols
            </label>
            <input
              id="ghidra-symbol-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search symbols"
              aria-label="Search symbols"
              className="mt-2 w-full rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:border-orange-400/60 focus:outline-none focus:ring-2 focus:ring-orange-300/60 focus:ring-offset-2 focus:ring-offset-slate-950"
            />
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 text-sm leading-relaxed">
            {query ? (
              <ul className="space-y-1">
                {filteredFunctions.map((f) => (
                  <li key={f.name}>
                    <button
                      onClick={() => setSelected(f.name)}
                      aria-pressed={selected === f.name}
                      className={`w-full rounded-md px-2 py-1 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                        selected === f.name
                          ? 'bg-orange-500/20 text-orange-100 shadow-[0_0_0_1px_rgba(251,191,36,0.45)]'
                          : 'text-slate-100 hover:bg-slate-800/70'
                      }`}
                    >
                      {f.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <FunctionTree
                functions={functions}
                onSelect={setSelected}
                selected={selected}
              />
            )}
          </div>
        </section>
        <section
          className={`${paneBaseClasses} min-h-0`}
          aria-label="Control flow graph"
        >
          <div className="border-b border-slate-800/70 bg-slate-950/70 px-4 py-3">
            <h2 className={sectionHeadingClasses}>Control flow</h2>
          </div>
          <div className="flex-1 px-4 py-3">
            <div className="h-full rounded-lg bg-slate-950/80 p-2 ring-1 ring-inset ring-slate-800/60">
              <ControlFlowGraph
                blocks={currentFunc.blocks}
                selected={null}
                onSelect={() => {}}
                prefersReducedMotion={prefersReducedMotion}
              />
            </div>
          </div>
        </section>
        <section className={`${paneInteractiveClasses} min-h-0`}>
          <div className="border-b border-slate-800/70 bg-slate-950/70 px-4 py-3">
            <h2 className={sectionHeadingClasses}>Decompiled code</h2>
          </div>
          <pre
            ref={decompileRef}
            aria-label="Decompiled code"
            tabIndex={0}
            className="flex-1 overflow-auto whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed"
          >
            {currentFunc.code.map((line, idx) => {
              const m = line.match(/call\s+(\w+)/);
              let codeElem;
              if (m && funcMap[m[1]]) {
                const target = m[1];
                codeElem = (
                  <div
                    onClick={() => setSelected(target)}
                    className="cursor-pointer rounded px-2 py-1 text-sky-200 transition hover:bg-slate-800/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/70"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelected(target);
                      }
                    }}
                  >
                    {line}
                  </div>
                );
              } else {
                codeElem = <div className="rounded px-2 py-1">{line}</div>;
              }
              const note = lineNotes[selected]?.[idx] || '';
              return (
                <div key={idx} className="flex items-start gap-2 py-1">
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
                    placeholder="Note"
                    aria-label={`Add note for line ${idx + 1}`}
                    className="w-28 rounded-md border border-slate-700/80 bg-slate-900/80 px-2 py-1 text-xs text-slate-100 placeholder:text-slate-500 focus:border-orange-400/60 focus:outline-none focus:ring-2 focus:ring-orange-300/60 focus:ring-offset-2 focus:ring-offset-slate-950"
                  />
                </div>
              );
            })}
            {(xrefs[selected] || []).length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <span className="font-semibold uppercase tracking-wide text-slate-400">
                  Xrefs
                </span>
                {xrefs[selected].map((xr) => (
                  <button
                    key={xr}
                    onClick={() => setSelected(xr)}
                    className="rounded-full border border-slate-700/80 px-3 py-1 text-xs font-medium text-sky-200 transition hover:border-orange-300/60 hover:text-orange-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  >
                    {xr}
                  </button>
                ))}
              </div>
            )}
          </pre>
        </section>
        <section className={`${paneInteractiveClasses} min-h-0`}>
          <div className="border-b border-slate-800/70 bg-slate-950/70 px-4 py-3">
            <h2 className={sectionHeadingClasses}>Hex view</h2>
          </div>
          <pre
            ref={hexRef}
            aria-label="Hexadecimal representation"
            tabIndex={0}
            className="flex-1 overflow-auto whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed text-slate-200"
          >
            {hexMap[selected] || ''}
          </pre>
        </section>
      </div>
      <PseudoDisasmViewer />
      <section className={`${paneBaseClasses} h-60`} aria-label="Call graph">
        <div className="border-b border-slate-800/70 bg-slate-950/70 px-4 py-3">
          <h2 className={sectionHeadingClasses}>Call graph</h2>
        </div>
        <div className="flex-1 px-4 py-3">
          <CallGraph
            func={currentFunc}
            callers={xrefs[selected] || []}
            onSelect={setSelected}
          />
        </div>
      </section>
      <section className={`${paneInteractiveClasses} px-0`} aria-label="Function notes">
        <div className="border-b border-slate-800/70 bg-slate-950/70 px-4 py-3">
          <h2 className={sectionHeadingClasses}>Notes</h2>
        </div>
          <div className="px-4 py-3">
            <label
              id="ghidra-function-notes-label"
              htmlFor="ghidra-function-notes"
              className="block text-sm text-slate-300"
            >
              Notes for {selected || 'function'}
            </label>
            <textarea
              id="ghidra-function-notes"
              value={funcNotes[selected] || ''}
              onChange={(e) =>
                setFuncNotes({ ...funcNotes, [selected]: e.target.value })
              }
              className="mt-2 w-full rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-orange-400/60 focus:outline-none focus:ring-2 focus:ring-orange-300/60 focus:ring-offset-2 focus:ring-offset-slate-950"
              rows={4}
              aria-labelledby="ghidra-function-notes-label"
            />
          </div>
        </section>
      <div className="grid gap-4 md:grid-cols-2">
        <section
          className={`${paneInteractiveClasses} min-h-[12rem]`}
          aria-label="String search"
        >
          <div className="border-b border-slate-800/70 bg-slate-950/70 px-4 py-3">
            <label
              htmlFor="ghidra-string-search"
              className={sectionHeadingClasses}
            >
              Strings
            </label>
            <input
              id="ghidra-string-search"
              type="text"
              value={stringQuery}
              onChange={(e) => setStringQuery(e.target.value)}
              placeholder="Search strings"
              aria-label="Search strings"
              className="mt-2 w-full rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:border-orange-400/60 focus:outline-none focus:ring-2 focus:ring-orange-300/60 focus:ring-offset-2 focus:ring-offset-slate-950"
            />
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 text-sm leading-relaxed">
            <ul className="space-y-1">
              {filteredStrings.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => setSelectedString(s.id)}
                    aria-pressed={selectedString === s.id}
                    className={`w-full rounded-md px-2 py-1 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                      selectedString === s.id
                        ? 'bg-orange-500/20 text-orange-100 shadow-[0_0_0_1px_rgba(251,191,36,0.45)]'
                        : 'text-slate-100 hover:bg-slate-800/70'
                    }`}
                  >
                    {s.value}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section className={`${paneInteractiveClasses} px-0`} aria-label="String notes">
          <div className="border-b border-slate-800/70 bg-slate-950/70 px-4 py-3">
            <h2 className={sectionHeadingClasses}>String notes</h2>
          </div>
          <div className="px-4 py-3">
            <label
              id="ghidra-string-notes-label"
              htmlFor="ghidra-string-notes"
              className="block text-sm text-slate-300"
            >
              Notes for {strings.find((s) => s.id === selectedString)?.value || 'string'}
            </label>
            <textarea
              id="ghidra-string-notes"
              value={stringNotes[selectedString] || ''}
              onChange={(e) =>
                setStringNotes({
                  ...stringNotes,
                  [selectedString]: e.target.value,
                })
              }
              className="mt-2 h-36 w-full rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-orange-400/60 focus:outline-none focus:ring-2 focus:ring-orange-300/60 focus:ring-offset-2 focus:ring-offset-slate-950"
              aria-labelledby="ghidra-string-notes-label"
            />
          </div>
        </section>
      </div>
      {/* S8: Hidden live region for assistive tech announcements */}
      <div aria-live="polite" role="status" className="sr-only">
        {liveMessage}
      </div>
    </div>
  );
}
