import React, { useCallback, useEffect, useRef, useState } from 'react';
import PseudoDisasmViewer from './PseudoDisasmViewer';
import FunctionTree from './FunctionTree';
import CallGraph from './CallGraph';
import ImportAnnotate from './ImportAnnotate';
import { Capstone, Const, loadCapstone } from 'capstone-wasm';
import { logEvent } from '../../../utils/analytics';

// Applies S1–S8 guidelines for responsive and accessible binary analysis UI
const DEFAULT_WASM = '/wasm/ghidra.wasm';

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
  const warmupCacheRef = useRef({ instance: null, module: null, promise: null });
  const warmupTelemetryRef = useRef({ cold: false, warm: false });
  const [warmupStatus, setWarmupStatus] = useState('idle');
  const [warmupMetrics, setWarmupMetrics] = useState({ cold: null, warm: null });
  const [warmupError, setWarmupError] = useState('');
  const [warmupAnnouncement, setWarmupAnnouncement] = useState('');
  // S1: Detect GHIDRA web support and fall back to Capstone
  const ensureCapstone = useCallback(async () => {
    if (capstoneRef.current) return capstoneRef.current;
    const mod = await loadCapstoneModule();
    capstoneRef.current = mod;
    return mod;
  }, []);

  const ensureGhidraEngine = useCallback(async () => {
    if (typeof window === 'undefined') return null;
    if (typeof WebAssembly === 'undefined') {
      throw new Error('WebAssembly is not available in this browser');
    }
    if (warmupCacheRef.current.instance) {
      return warmupCacheRef.current.instance;
    }
    if (warmupCacheRef.current.promise) {
      return warmupCacheRef.current.promise;
    }
    const wasmUrl = process.env.NEXT_PUBLIC_GHIDRA_WASM || DEFAULT_WASM;
    const promise = (async () => {
      const fetchStart = performance.now();
      const response = await fetch(wasmUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch Ghidra WebAssembly (${response.status})`);
      }
      const fetchEnd = performance.now();
      const bufferStart = performance.now();
      const bytes = await response.arrayBuffer();
      const bufferEnd = performance.now();
      const instantiateStart = performance.now();
      const result = await WebAssembly.instantiate(bytes, {});
      const instantiateEnd = performance.now();
      const instance = result.instance || result;
      const module = result.module || null;
      warmupCacheRef.current.instance = instance;
      warmupCacheRef.current.module = module;
      const coldDuration = instantiateEnd - fetchStart;
      const downloadDuration = fetchEnd - fetchStart + (bufferEnd - bufferStart);
      const instantiateDuration = instantiateEnd - instantiateStart;
      setWarmupMetrics((prev) => ({
        cold: Math.max(0, Math.round(coldDuration)),
        warm: prev.warm,
      }));
      if (!warmupTelemetryRef.current.cold) {
        console.info('[ghidra] wasm warmup', {
          coldMs: coldDuration,
          downloadMs: downloadDuration,
          instantiateMs: instantiateDuration,
        });
        logEvent({
          category: 'wasm',
          action: 'warmup_cold',
          label: 'ghidra',
          value: Math.max(0, Math.round(coldDuration)),
        });
        warmupTelemetryRef.current.cold = true;
      }
      return instance;
    })();
    warmupCacheRef.current.promise = promise;
    try {
      const instance = await promise;
      warmupCacheRef.current.promise = null;
      return instance;
    } catch (err) {
      warmupCacheRef.current.promise = null;
      warmupCacheRef.current.instance = null;
      warmupCacheRef.current.module = null;
      warmupTelemetryRef.current.cold = false;
      throw err;
    }
  }, []);

  const finalizeWarmAccess = useCallback((instance) => {
    if (!instance) return null;
    const warmStart = performance.now();
    if (instance && typeof instance.exports === 'object') {
      Object.keys(instance.exports || {});
    }
    const warmDuration = performance.now() - warmStart;
    const warmRounded = Math.max(0, Math.round(warmDuration));
    setWarmupMetrics((prev) => ({
      cold: prev.cold,
      warm: warmRounded,
    }));
    if (!warmupTelemetryRef.current.warm) {
      console.info('[ghidra] wasm warm access', {
        warmMs: warmDuration,
      });
      logEvent({
        category: 'wasm',
        action: 'warmup_warm',
        label: 'ghidra',
        value: warmRounded,
      });
      warmupTelemetryRef.current.warm = true;
    }
    return warmRounded;
  }, []);

  const warmUpEngine = useCallback(async () => {
    if (warmupStatus === 'warming') return;
    setWarmupError('');
    setWarmupStatus('warming');
    setWarmupAnnouncement('Warming up the WebAssembly engine…');
    try {
      const instance = await ensureGhidraEngine();
      setWarmupStatus('ready');
      const warmMs = finalizeWarmAccess(instance);
      setWarmupAnnouncement(
        warmMs !== null
          ? `Warmup complete. Cached instance ready; warm call ${warmMs} ms.`
          : 'Warmup complete. Cached instance ready for analysis.',
      );
    } catch (err) {
      console.error('Failed to warm up Ghidra WebAssembly', err);
      const message =
        err && typeof err.message === 'string'
          ? err.message
          : 'Failed to warm up WebAssembly engine.';
      setWarmupError(message);
      setWarmupStatus('failed');
      setWarmupAnnouncement('Warmup failed. Capstone mode remains available.');
      setEngine('capstone');
      await ensureCapstone();
    }
  }, [ensureCapstone, ensureGhidraEngine, finalizeWarmAccess, warmupStatus]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof WebAssembly === 'undefined') {
      setEngine('capstone');
      setWarmupStatus('failed');
      setWarmupError('WebAssembly is not available in this browser.');
      setWarmupAnnouncement('WebAssembly unavailable; using the Capstone engine.');
      ensureCapstone();
    }
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

  const switchEngine = useCallback(async () => {
    const next = engine === 'ghidra' ? 'capstone' : 'ghidra';
    if (next === 'capstone') {
      setEngine(next);
      await ensureCapstone();
      return;
    }
    try {
      const instance = await ensureGhidraEngine();
      setEngine(next);
      setWarmupStatus('ready');
      setWarmupError('');
      const warmMs = finalizeWarmAccess(instance);
      setWarmupAnnouncement(
        warmMs !== null
          ? `Ghidra engine loaded. Warm call ${warmMs} ms.`
          : 'Ghidra engine loaded with cached instance.',
      );
    } catch (err) {
      console.error('Failed to enable Ghidra WebAssembly', err);
      setEngine('capstone');
      await ensureCapstone();
      const message =
        err && typeof err.message === 'string'
          ? err.message
          : 'Unable to load WebAssembly module.';
      setWarmupError(message);
      setWarmupStatus('failed');
      setWarmupAnnouncement('Ghidra WebAssembly unavailable; staying on Capstone.');
    }
  }, [engine, ensureCapstone, ensureGhidraEngine, finalizeWarmAccess]);

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

  const warmupHelpId = 'ghidra-warmup-help';
  const warmupButtonLabel =
    warmupStatus === 'warming'
      ? 'Warming…'
      : warmupStatus === 'ready'
      ? 'Engine warmed'
      : 'Warm up engine';

  if (engine === 'capstone') {
    return (
      <div
        className="w-full h-full flex flex-col bg-gray-900 text-gray-100"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="p-2 flex flex-wrap items-center gap-2">
          <button
            onClick={switchEngine}
            className="px-2 py-1 bg-gray-700 rounded"
          >
            Use Ghidra
          </button>
          <button
            onClick={warmUpEngine}
            disabled={warmupStatus === 'warming'}
            aria-describedby={warmupHelpId}
            className="px-2 py-1 bg-yellow-600 text-black rounded disabled:opacity-60"
          >
            {warmupButtonLabel}
          </button>
          <select
            value={arch}
            onChange={(e) => setArch(e.target.value)}
            className="text-black rounded"
          >
            <option value="x86">x86</option>
            <option value="arm">ARM</option>
          </select>
          {warmupMetrics.cold !== null && (
            <span className="text-xs text-gray-400">
              Cold: {warmupMetrics.cold} ms
            </span>
          )}
          {warmupMetrics.warm !== null && (
            <span className="text-xs text-gray-400">
              Warm: {warmupMetrics.warm} ms
            </span>
          )}
          {warmupStatus === 'warming' && (
            <span className="text-xs text-yellow-300">Preloading…</span>
          )}
          {warmupStatus === 'failed' && warmupError && (
            <span className="text-xs text-red-400">{warmupError}</span>
          )}
        </div>
        <p id={warmupHelpId} className="px-2 text-xs text-gray-400 md:text-sm">
          Warm up downloads the WebAssembly analyzer now so the first analysis call stays under 100 ms and keeps heavy modules responsive.
        </p>
        <div aria-live="polite" className="sr-only">
          {warmupAnnouncement}
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
      <div className="p-2 flex flex-wrap items-center gap-2">
        <button
          onClick={switchEngine}
          className="px-2 py-1 bg-gray-700 rounded"
        >
          Use Capstone
        </button>
        <button
          onClick={warmUpEngine}
          disabled={warmupStatus === 'warming'}
          aria-describedby={warmupHelpId}
          className="px-2 py-1 bg-yellow-600 text-black rounded disabled:opacity-60"
        >
          {warmupButtonLabel}
        </button>
        {warmupMetrics.cold !== null && (
          <span className="text-xs text-gray-400">
            Cold: {warmupMetrics.cold} ms
          </span>
        )}
        {warmupMetrics.warm !== null && (
          <span className="text-xs text-gray-400">
            Warm: {warmupMetrics.warm} ms
          </span>
        )}
        {warmupStatus === 'warming' && (
          <span className="text-xs text-yellow-300">Preloading…</span>
        )}
        {warmupStatus === 'failed' && warmupError && (
          <span className="text-xs text-red-400">{warmupError}</span>
        )}
      </div>
      <p id={warmupHelpId} className="px-2 text-xs text-gray-400 md:text-sm">
        Warm up downloads the WebAssembly analyzer now so the first analysis call stays under 100 ms and keeps heavy modules responsive.
      </p>
      <div aria-live="polite" className="sr-only">
        {warmupAnnouncement}
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
