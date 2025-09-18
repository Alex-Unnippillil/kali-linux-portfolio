import React, { useEffect, useMemo, useRef, useState } from 'react';

const BYTES_PER_ROW = 16;

const HexEditor = ({ hex, palette }) => {
  const [bytes, setBytes] = useState([]);
  const [patches, setPatches] = useState([]);
  const [selection, setSelection] = useState([null, null]);
  const [liveMessage, setLiveMessage] = useState('');
  const workerRef = useRef(null);
  const miniMapRef = useRef(null);
  const containerRef = useRef(null);
  const prefersReduced = useRef(false);
  const visibleRef = useRef(true);
  const colorsRef = useRef({
    surface: palette.surface,
    accent: palette.accent,
    text: palette.text,
    border: palette.border,
  });

  useEffect(() => {
    colorsRef.current = {
      surface: palette.surface,
      accent: palette.accent,
      text: palette.text,
      border: palette.border,
    };
  }, [palette.accent, palette.border, palette.surface, palette.text]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      prefersReduced.current = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof Worker === 'function') {
      workerRef.current = new Worker(
        new URL('./hexWorker.js', import.meta.url)
      );
      workerRef.current.onmessage = (e) => {
        const { type, bytes: b = [], patches: p = [] } = e.data || {};
        if (type === 'bytes') {
          setBytes(b);
          setPatches(p);
        } else if (type === 'export') {
          const blob = new Blob([JSON.stringify(p, null, 2)], {
            type: 'application/json',
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'patches.json';
          a.click();
          URL.revokeObjectURL(url);
        }
      };
      return () => workerRef.current?.terminate();
    }
    return undefined;
  }, []);

  useEffect(() => {
    const handleVis = () => {
      const isVisible = document.visibilityState === 'visible';
      visibleRef.current = isVisible;
      workerRef.current?.postMessage({ type: isVisible ? 'resume' : 'pause' });
    };
    document.addEventListener('visibilitychange', handleVis);
    return () => document.removeEventListener('visibilitychange', handleVis);
  }, []);

  useEffect(() => {
    if (workerRef.current && visibleRef.current)
      workerRef.current.postMessage({ type: 'hex', hex });
  }, [hex]);

  useEffect(() => {
    let raf;
    const draw = () => {
      const canvas = miniMapRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const len = bytes.length;
      ctx.fillStyle = colorsRef.current.surface;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (selection[0] !== null) {
        const start = Math.min(selection[0], selection[1]);
        const end = Math.max(selection[0], selection[1]);
        const startRatio = start / len;
        const endRatio = (end + 1) / len;
        ctx.fillStyle = colorsRef.current.accent;
        ctx.fillRect(
          startRatio * canvas.width,
          0,
          (endRatio - startRatio) * canvas.width,
          canvas.height
        );
      }
    };
    if (prefersReduced.current) draw();
    else if (visibleRef.current) raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [bytes, selection]);

  const handleMouseDown = (idx) => {
    setSelection([idx, idx]);
    setLiveMessage(`Selected byte ${idx}`);
  };

  const handleMouseEnter = (idx) => {
    if (selection[0] !== null) {
      setSelection([selection[0], idx]);
      const start = Math.min(selection[0], idx);
      const end = Math.max(selection[0], idx);
      setLiveMessage(`Selecting bytes ${start} to ${end}`);
    }
  };

  const handleMiniMapClick = (e) => {
    const canvas = miniMapRef.current;
    if (!canvas || !containerRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / canvas.width;
    const row = Math.floor((bytes.length * ratio) / BYTES_PER_ROW);
    containerRef.current.scrollTop = row * 24; // approximate row height
  };

  const rows = useMemo(() => {
    const out = [];
    for (let i = 0; i < bytes.length; i += BYTES_PER_ROW) {
      out.push(bytes.slice(i, i + BYTES_PER_ROW));
    }
    return out;
  }, [bytes]);

  const handleEdit = (idx, current) => {
    const value =
      typeof window !== 'undefined'
        ? window.prompt('Enter byte (two hex chars)', current)
        : null;
    if (value) {
      workerRef.current?.postMessage({
        type: 'patch',
        offset: idx,
        value,
      });
      setLiveMessage(`Patched byte ${idx}`);
    }
  };

  return (
    <div className="mb-6" aria-label="hex editor">
      <div className="flex gap-2">
        <div
          ref={containerRef}
          className="overflow-auto p-2 rounded max-h-64 flex-1"
          style={{
            backgroundColor: palette.surface,
            border: `1px solid ${palette.border}`,
          }}
        >
          <div className="text-xs font-mono">
            {rows.map((row, rowIdx) => (
              <div key={rowIdx} className="flex mb-1">
                {row.map((b, colIdx) => {
                  const idx = rowIdx * BYTES_PER_ROW + colIdx;
                  const selected =
                    selection[0] !== null &&
                    idx >= Math.min(selection[0], selection[1]) &&
                    idx <= Math.max(selection[0], selection[1]);
                  return (
                    <button
                      key={idx}
                      onMouseDown={() => handleMouseDown(idx)}
                      onMouseEnter={() => handleMouseEnter(idx)}
                      onDoubleClick={() => handleEdit(idx, b)}
                      className="w-6 h-6 flex items-center justify-center rounded focus:outline-none focus-visible:ring-2"
                      style={{
                        backgroundColor: selected
                          ? palette.accent
                          : palette.surface,
                        color: selected ? '#000' : palette.text,
                        '--tw-ring-color': palette.accent,
                        marginLeft: colIdx === 8 ? '0.5rem' : undefined,
                      }}
                    >
                      {b}
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
            backgroundColor: palette.surface,
            border: `1px solid ${palette.border}`,
          }}
          aria-label="hex mini map"
        />
      </div>
      <div className="mt-2">
        <button
          onClick={() => workerRef.current?.postMessage({ type: 'export' })}
          className="px-3 py-1 rounded"
          style={{
            backgroundColor: palette.surface,
            border: `1px solid ${palette.border}`,
          }}
        >
          Export Patches
        </button>
      </div>
      <div aria-live="polite" className="sr-only">
        {liveMessage}
      </div>
    </div>
  );
};

export default HexEditor;

