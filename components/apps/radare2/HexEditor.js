import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  applyPatches,
  exportPatches,
  stagePatch,
  validatePatchImport,
} from './patchUtils';
import { formatAddress, parseAddress } from './addressUtils';
import { loadPatches, savePatches } from './utils';

const BYTES_PER_ROW = 16;

const patchesEqual = (a, b) => {
  if (a.length !== b.length) return false;
  return a.every(
    (patch, idx) =>
      patch.offset === b[idx].offset &&
      patch.value === b[idx].value &&
      patch.original === b[idx].original,
  );
};

const HexEditor = ({
  hex,
  theme,
  file,
  baseAddress,
  onPatchesChange,
  onSelectAddress,
}) => {
  const [bytes, setBytes] = useState([]);
  const [patches, setPatches] = useState([]);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [activeIndex, setActiveIndex] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [importText, setImportText] = useState('');
  const [importErrors, setImportErrors] = useState([]);
  const [liveMessage, setLiveMessage] = useState('');
  const workerRef = useRef(null);
  const containerRef = useRef(null);
  const miniMapRef = useRef(null);
  const prefersReduced = useRef(false);
  const visibleRef = useRef(true);
  const colorsRef = useRef({
    surface: '#374151',
    accent: '#fbbf24',
    text: '#ffffff',
    border: '#4b5563',
  });
  const baseOffset = parseAddress(baseAddress) || 0;
  const canUseWorker =
    typeof window !== 'undefined' &&
    typeof Worker === 'function' &&
    process.env.NODE_ENV !== 'test';

  const baseBytes = useMemo(() => {
    const cleaned = (hex || '').replace(/[^0-9a-fA-F]/g, '');
    return cleaned.match(/.{1,2}/g) || [];
  }, [hex]);

  const patchMap = useMemo(() => {
    const map = new Map();
    patches.forEach((patch) => {
      map.set(patch.offset, patch);
    });
    return map;
  }, [patches]);

  const patchedBytes = useMemo(() => {
    if (canUseWorker) return bytes;
    return applyPatches(baseBytes, patches);
  }, [baseBytes, bytes, canUseWorker, patches]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const style = getComputedStyle(document.documentElement);
    colorsRef.current = {
      surface: style.getPropertyValue('--r2-surface').trim() || '#374151',
      accent: style.getPropertyValue('--r2-accent').trim() || '#fbbf24',
      text: style.getPropertyValue('--r2-text').trim() || '#ffffff',
      border: style.getPropertyValue('--r2-border').trim() || '#4b5563',
    };
  }, [theme]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      prefersReduced.current = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
    }
  }, []);

  useEffect(() => {
    if (!canUseWorker) return undefined;
    workerRef.current = new Worker(new URL('./hexWorker.js', import.meta.url));
    workerRef.current.onmessage = (e) => {
      const {
        type,
        bytes: b = [],
        patches: p = [],
        canUndo: undoState,
        canRedo: redoState,
      } = e.data || {};
      if (type === 'bytes') {
        setBytes(b);
        setPatches(p);
        setCanUndo(Boolean(undoState));
        setCanRedo(Boolean(redoState));
      } else if (type === 'export') {
        const blob = new Blob([JSON.stringify(p, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${file || 'patches'}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    };
    return () => workerRef.current?.terminate();
  }, [canUseWorker, file]);

  useEffect(() => {
    if (!canUseWorker) return undefined;
    const handleVis = () => {
      if (typeof document === 'undefined') return;
      const isVisible = document.visibilityState === 'visible';
      visibleRef.current = isVisible;
      workerRef.current?.postMessage({ type: isVisible ? 'resume' : 'pause' });
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVis);
      return () => document.removeEventListener('visibilitychange', handleVis);
    }
    return undefined;
  }, [canUseWorker]);

  useEffect(() => {
    if (canUseWorker && workerRef.current && visibleRef.current) {
      workerRef.current.postMessage({ type: 'hex', hex });
    }
    if (!canUseWorker) {
      setBytes(baseBytes);
    }
  }, [baseBytes, canUseWorker, hex]);

  useEffect(() => {
    if (!file) return;
    const stored = loadPatches(file);
    setPatches(stored);
    setHistory([]);
    setFuture([]);
    setCanUndo(false);
    setCanRedo(false);
    if (canUseWorker && workerRef.current) {
      workerRef.current.postMessage({ type: 'load', patches: stored });
    }
  }, [canUseWorker, file]);

  useEffect(() => {
    if (!canUseWorker) {
      const sanitized = patches.reduce(
        (acc, patch) => stagePatch(baseBytes, acc, patch.offset, patch.value),
        [],
      );
      if (!patchesEqual(sanitized, patches)) {
        setPatches(sanitized);
      }
    }
  }, [baseBytes, canUseWorker, patches]);

  useEffect(() => {
    if (file) savePatches(file, patches);
    onPatchesChange?.(patches);
  }, [file, onPatchesChange, patches]);

  useEffect(() => {
    setCanUndo(history.length > 0);
    setCanRedo(future.length > 0);
  }, [future.length, history.length]);

  useEffect(() => {
    let raf;
    const draw = () => {
      const canvas = miniMapRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const len = patchedBytes.length || 1;
      ctx.fillStyle = colorsRef.current.surface;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (activeIndex !== null) {
        const ratio = activeIndex / len;
        ctx.fillStyle = colorsRef.current.accent;
        ctx.fillRect(ratio * canvas.width, 0, 4, canvas.height);
      }
    };
    if (prefersReduced.current) draw();
    else if (visibleRef.current) raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [activeIndex, patchedBytes.length]);

  const rows = useMemo(() => {
    const out = [];
    for (let i = 0; i < patchedBytes.length; i += BYTES_PER_ROW) {
      out.push(patchedBytes.slice(i, i + BYTES_PER_ROW));
    }
    return out;
  }, [patchedBytes]);

  const handleSelect = useCallback(
    (idx) => {
      setActiveIndex(idx);
      setIsEditing(false);
      setEditValue('');
      const addr = formatAddress(baseOffset + idx);
      if (addr) {
        onSelectAddress?.(addr);
      }
      setLiveMessage(`Selected byte ${idx}`);
    },
    [baseOffset, onSelectAddress],
  );

  const handlePatch = useCallback(
    (offset, value) => {
      if (canUseWorker && workerRef.current) {
        workerRef.current.postMessage({
          type: 'patch',
          offset,
          value,
        });
        return;
      }
      const next = stagePatch(baseBytes, patches, offset, value);
      if (!patchesEqual(next, patches)) {
        setHistory((prev) => [...prev, patches]);
        setFuture([]);
        setPatches(next);
      }
    },
    [baseBytes, canUseWorker, patches],
  );

  const handleRevert = (offset) => {
    if (canUseWorker && workerRef.current) {
      workerRef.current.postMessage({ type: 'revert', offset });
      return;
    }
    const next = patches.filter((patch) => patch.offset !== offset);
    if (!patchesEqual(next, patches)) {
      setHistory((prev) => [...prev, patches]);
      setFuture([]);
      setPatches(next);
    }
  };

  const handleClear = () => {
    if (canUseWorker && workerRef.current) {
      workerRef.current.postMessage({ type: 'clear' });
      return;
    }
    if (patches.length > 0) {
      setHistory((prev) => [...prev, patches]);
      setFuture([]);
      setPatches([]);
    }
  };

  const handleUndo = () => {
    if (canUseWorker && workerRef.current) {
      workerRef.current.postMessage({ type: 'undo' });
      return;
    }
    const prev = history[history.length - 1];
    if (prev) {
      setHistory((items) => items.slice(0, -1));
      setFuture((items) => [patches, ...items]);
      setPatches(prev);
    }
  };

  const handleRedo = () => {
    if (canUseWorker && workerRef.current) {
      workerRef.current.postMessage({ type: 'redo' });
      return;
    }
    const next = future[0];
    if (next) {
      setFuture((items) => items.slice(1));
      setHistory((items) => [...items, patches]);
      setPatches(next);
    }
  };

  const handleImport = () => {
    setImportErrors([]);
    let parsed;
    try {
      parsed = JSON.parse(importText);
    } catch (error) {
      setImportErrors(['Import is not valid JSON.']);
      return;
    }
    const { patches: imported, errors } = validatePatchImport(
      parsed,
      baseBytes.length,
    );
    if (errors.length) {
      setImportErrors(errors);
      return;
    }
    if (canUseWorker && workerRef.current) {
      workerRef.current.postMessage({ type: 'import', patches: imported });
    } else {
      setHistory((prev) => [...prev, patches]);
      setFuture([]);
      setPatches(imported);
    }
    setImportText('');
    setLiveMessage(`Imported ${imported.length} patches`);
  };

  const handleExport = () => {
    if (canUseWorker && workerRef.current) {
      workerRef.current.postMessage({ type: 'export' });
      return;
    }
    if (typeof window === 'undefined') return;
    const blob = new Blob([JSON.stringify(exportPatches(patches), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file || 'patches'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleKeyDown = (event) => {
    const key = event.key.toLowerCase();
    const meta = event.metaKey || event.ctrlKey;
    if (meta && key === 'z') {
      event.preventDefault();
      if (event.shiftKey) handleRedo();
      else handleUndo();
      return;
    }
    if (meta && key === 'y') {
      event.preventDefault();
      handleRedo();
      return;
    }

    if (activeIndex === null) return;
    if (isEditing) return;

    const rowOffset = BYTES_PER_ROW;
    let nextIndex = activeIndex;
    if (key === 'arrowright') nextIndex += 1;
    if (key === 'arrowleft') nextIndex -= 1;
    if (key === 'arrowdown') nextIndex += rowOffset;
    if (key === 'arrowup') nextIndex -= rowOffset;
    if (key === 'enter') {
      event.preventDefault();
      setIsEditing(true);
      setEditValue(patchedBytes[activeIndex] || '');
      return;
    }
    if (nextIndex !== activeIndex) {
      event.preventDefault();
      if (nextIndex >= 0 && nextIndex < patchedBytes.length) {
        handleSelect(nextIndex);
        const row = Math.floor(nextIndex / BYTES_PER_ROW);
        if (containerRef.current) {
          containerRef.current.scrollTop = row * 24;
        }
      }
    }
  };

  const handleEditKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsEditing(false);
      setEditValue('');
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (activeIndex === null) return;
      const trimmed = editValue.trim().slice(0, 2);
      if (/^[0-9a-f]{2}$/i.test(trimmed)) {
        handlePatch(activeIndex, trimmed);
        setLiveMessage(`Patched byte ${activeIndex}`);
      }
      setIsEditing(false);
      setEditValue('');
    }
  };

  const handleMiniMapClick = (e) => {
    const canvas = miniMapRef.current;
    if (!canvas || !containerRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / canvas.width;
    const row = Math.floor((patchedBytes.length * ratio) / BYTES_PER_ROW);
    containerRef.current.scrollTop = row * 24;
  };

  return (
    <div className="mb-6" aria-label="hex editor">
      <div className="flex gap-2">
        <div
          ref={containerRef}
          className="overflow-auto p-2 rounded max-h-64 flex-1"
          style={{
            backgroundColor: 'var(--r2-surface)',
            border: '1px solid var(--r2-border)',
          }}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          aria-label="Hex bytes"
        >
          <div className="text-xs font-mono">
            {rows.map((row, rowIdx) => (
              <div key={rowIdx} className="flex mb-1">
                <span className="w-14 text-right pr-2 text-[11px] opacity-70">
                  {formatAddress(baseOffset + rowIdx * BYTES_PER_ROW)}
                </span>
                {row.map((b, colIdx) => {
                  const idx = rowIdx * BYTES_PER_ROW + colIdx;
                  const isActive = idx === activeIndex;
                  const patch = patchMap.get(idx);
                  const isPatched = Boolean(patch);
                  const displayValue = b || '00';
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelect(idx)}
                      onDoubleClick={() => {
                        setActiveIndex(idx);
                        setIsEditing(true);
                        setEditValue(displayValue);
                      }}
                      className="w-7 h-6 flex items-center justify-center rounded focus:outline-none focus-visible:ring-2"
                      style={{
                        backgroundColor: isActive
                          ? 'var(--r2-accent)'
                          : isPatched
                          ? 'color-mix(in srgb, var(--r2-accent) 30%, transparent)'
                          : 'var(--r2-surface)',
                        color: isActive ? '#000' : 'var(--r2-text)',
                        '--tw-ring-color': 'var(--r2-accent)',
                        marginLeft: colIdx === 8 ? '0.5rem' : undefined,
                      }}
                      aria-label={`Byte ${idx} value ${displayValue}`}
                    >
                      {isActive && isEditing ? (
                        <input
                          value={editValue}
                          onChange={(e) =>
                            setEditValue(
                              e.target.value.replace(/[^0-9a-fA-F]/g, ''),
                            )
                          }
                          onKeyDown={handleEditKeyDown}
                          className="w-6 bg-transparent text-center outline-none"
                          maxLength={2}
                          autoFocus
                        />
                      ) : (
                        displayValue
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <canvas
          ref={miniMapRef}
          width={64}
          height={64}
          onClick={handleMiniMapClick}
          className="rounded cursor-pointer"
          style={{
            backgroundColor: 'var(--r2-surface)',
            border: '1px solid var(--r2-border)',
          }}
          aria-label="hex mini map"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <button
          type="button"
          onClick={handleUndo}
          disabled={!canUndo}
          className="px-3 py-1 rounded disabled:opacity-50"
          style={{
            backgroundColor: 'var(--r2-surface)',
            border: '1px solid var(--r2-border)',
          }}
        >
          Undo (Ctrl/Cmd+Z)
        </button>
        <button
          type="button"
          onClick={handleRedo}
          disabled={!canRedo}
          className="px-3 py-1 rounded disabled:opacity-50"
          style={{
            backgroundColor: 'var(--r2-surface)',
            border: '1px solid var(--r2-border)',
          }}
        >
          Redo (Ctrl/Cmd+Shift+Z)
        </button>
        <button
          type="button"
          onClick={handleExport}
          className="px-3 py-1 rounded"
          style={{
            backgroundColor: 'var(--r2-surface)',
            border: '1px solid var(--r2-border)',
          }}
        >
          Export Patches
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="px-3 py-1 rounded"
          style={{
            backgroundColor: 'var(--r2-surface)',
            border: '1px solid var(--r2-border)',
          }}
        >
          Clear All
        </button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide">
            Patch Ledger
          </h3>
          {patches.length === 0 ? (
            <p className="text-sm opacity-70">No patches staged.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {patches.map((patch) => (
                <li
                  key={patch.offset}
                  className="flex items-center justify-between gap-3 rounded px-2 py-1"
                  style={{
                    backgroundColor: 'var(--r2-surface)',
                    border: '1px solid var(--r2-border)',
                  }}
                >
                  <div className="font-mono text-xs">
                    <div>{formatAddress(baseOffset + patch.offset)}</div>
                    <div>
                      {patch.original || baseBytes[patch.offset]} →{' '}
                      {patch.value}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevert(patch.offset)}
                    className="text-xs underline"
                  >
                    Revert
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide">
            Import Patches
          </h3>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={4}
            placeholder='[{"offset":4,"value":"90"}]'
            className="w-full rounded p-2 text-sm"
            style={{
              backgroundColor: 'var(--r2-surface)',
              border: '1px solid var(--r2-border)',
              color: 'var(--r2-text)',
            }}
          />
          <button
            type="button"
            onClick={handleImport}
            className="px-3 py-1 rounded"
            style={{
              backgroundColor: 'var(--r2-surface)',
              border: '1px solid var(--r2-border)',
            }}
          >
            Import JSON
          </button>
          {importErrors.length > 0 && (
            <ul className="text-xs text-red-300 space-y-1">
              {importErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div aria-live="polite" className="sr-only">
        {liveMessage}
      </div>
    </div>
  );
};

export default HexEditor;
