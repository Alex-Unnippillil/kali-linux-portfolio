import React, { useEffect, useMemo, useRef, useState } from 'react';

const BYTES_PER_ROW = 16;

const HexEditor = ({ hex, theme }) => {
  const [bytes, setBytes] = useState([]);
  const [selection, setSelection] = useState([null, null]);
  const [liveMessage, setLiveMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('hex');
  const [searchResults, setSearchResults] = useState([]);
  const [currentResult, setCurrentResult] = useState(0);
  const [resultLen, setResultLen] = useState(0);
  const workerRef = useRef(null);
  const miniMapRef = useRef(null);
  const containerRef = useRef(null);
  const prefersReduced = useRef(false);
  const visibleRef = useRef(true);
  const colorsRef = useRef({
    surface: '#374151',
    accent: '#fbbf24',
    text: '#ffffff',
    border: '#4b5563',
  });

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
        '(prefers-reduced-motion: reduce)'
      ).matches;
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof Worker === 'function') {
      workerRef.current = new Worker(
        new URL('./hexWorker.js', import.meta.url)
      );
      workerRef.current.onmessage = (e) => setBytes(e.data);
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
      if (searchResults.length) {
        ctx.fillStyle = colorsRef.current.accent;
        searchResults.forEach((s) => {
          const ratio = s / len;
          ctx.fillRect(ratio * canvas.width, 0, 2, canvas.height);
        });
      }
    };
    if (prefersReduced.current) draw();
    else if (visibleRef.current) raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [bytes, selection, searchResults]);

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

  const scrollToIndex = (idx) => {
    if (!containerRef.current) return;
    const row = Math.floor(idx / BYTES_PER_ROW);
    containerRef.current.scrollTop = row * 24;
  };

  const runSearch = () => {
    if (!searchTerm) return;
    let pattern = [];
    if (searchType === 'hex') {
      const clean = searchTerm.replace(/[^0-9a-fA-F]/g, '');
      if (clean.length % 2 !== 0) return;
      pattern = clean.match(/.{2}/g) || [];
    } else {
      pattern = Array.from(searchTerm).map((c) =>
        c.charCodeAt(0).toString(16).padStart(2, '0')
      );
    }
    if (pattern.length === 0) return;
    const results = [];
    for (let i = 0; i <= bytes.length - pattern.length; i++) {
      let ok = true;
      for (let j = 0; j < pattern.length; j++) {
        if (bytes[i + j] !== pattern[j]) {
          ok = false;
          break;
        }
      }
      if (ok) results.push(i);
    }
    setSearchResults(results);
    setCurrentResult(0);
    setResultLen(pattern.length);
    if (results.length > 0) {
      const start = results[0];
      setSelection([start, start + pattern.length - 1]);
      scrollToIndex(start);
      setLiveMessage(`${results.length} matches`);
    } else {
      setLiveMessage('No matches');
    }
  };

  const gotoResult = (idx) => {
    const start = searchResults[idx];
    setCurrentResult(idx);
    setSelection([start, start + resultLen - 1]);
    scrollToIndex(start);
    setLiveMessage(`Match ${idx + 1} of ${searchResults.length}`);
  };

  const nextResult = () => {
    if (searchResults.length === 0) return;
    gotoResult((currentResult + 1) % searchResults.length);
  };

  const prevResult = () => {
    if (searchResults.length === 0) return;
    gotoResult((currentResult - 1 + searchResults.length) % searchResults.length);
  };

  const rows = useMemo(() => {
    const out = [];
    for (let i = 0; i < bytes.length; i += BYTES_PER_ROW) {
      out.push(bytes.slice(i, i + BYTES_PER_ROW));
    }
    return out;
  }, [bytes]);

  const matchSet = useMemo(() => {
    const set = new Set();
    searchResults.forEach((start) => {
      for (let i = 0; i < resultLen; i++) set.add(start + i);
    });
    return set;
  }, [searchResults, resultLen]);

  return (
    <div className="mb-6" aria-label="hex editor">
      <div className="flex flex-wrap gap-2 mb-2 items-center">
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="search"
          className="px-2 py-1 rounded"
          style={{
            backgroundColor: 'var(--r2-surface)',
            color: 'var(--r2-text)',
            border: '1px solid var(--r2-border)',
          }}
        />
        <select
          value={searchType}
          onChange={(e) => setSearchType(e.target.value)}
          className="px-2 py-1 rounded"
          style={{
            backgroundColor: 'var(--r2-surface)',
            color: 'var(--r2-text)',
            border: '1px solid var(--r2-border)',
          }}
        >
          <option value="hex">Hex</option>
          <option value="ascii">ASCII</option>
        </select>
        <button
          onClick={runSearch}
          className="px-2 py-1 rounded"
          style={{
            backgroundColor: 'var(--r2-surface)',
            border: '1px solid var(--r2-border)',
          }}
        >
          Search
        </button>
        {searchResults.length > 0 && (
          <>
            <button
              onClick={prevResult}
              className="px-2 py-1 rounded"
              style={{
                backgroundColor: 'var(--r2-surface)',
                border: '1px solid var(--r2-border)',
              }}
            >
              Prev
            </button>
            <span className="text-xs">
              {currentResult + 1}/{searchResults.length}
            </span>
            <button
              onClick={nextResult}
              className="px-2 py-1 rounded"
              style={{
                backgroundColor: 'var(--r2-surface)',
                border: '1px solid var(--r2-border)',
              }}
            >
              Next
            </button>
          </>
        )}
      </div>
      <div className="flex gap-2">
        <div
          ref={containerRef}
          className="overflow-auto p-2 rounded max-h-64 flex-1"
          style={{
            backgroundColor: 'var(--r2-surface)',
            border: '1px solid var(--r2-border)',
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
                  const isMatch = matchSet.has(idx);
                  return (
                    <button
                      key={idx}
                      onMouseDown={() => handleMouseDown(idx)}
                      onMouseEnter={() => handleMouseEnter(idx)}
                      className="w-6 h-6 flex items-center justify-center rounded focus:outline-none focus-visible:ring-2"
                      style={{
                        backgroundColor: selected
                          ? 'var(--r2-accent)'
                          : 'var(--r2-surface)',
                        color: selected ? '#000' : 'var(--r2-text)',
                        outline:
                          isMatch && !selected
                            ? `1px solid ${colorsRef.current.accent}`
                            : undefined,
                        '--tw-ring-color': 'var(--r2-accent)',
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
            backgroundColor: 'var(--r2-surface)',
            border: '1px solid var(--r2-border)',
          }}
          aria-label="hex mini map"
        />
      </div>
      <div aria-live="polite" className="sr-only">
        {liveMessage}
      </div>
    </div>
  );
};

export default HexEditor;

