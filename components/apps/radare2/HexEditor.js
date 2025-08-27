import React, { useEffect, useRef, useState } from 'react';

const BYTES_PER_ROW = 16;

const HexEditor = ({ hex }) => {
  const [bytes, setBytes] = useState([]);
  const [selection, setSelection] = useState([null, null]);
  const [liveMessage, setLiveMessage] = useState('');
  const workerRef = useRef(null);
  const miniMapRef = useRef(null);
  const containerRef = useRef(null);
  const prefersReduced = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      prefersReduced.current = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
    }
  }, []);

  useEffect(() => {
    if (typeof Worker !== 'undefined') {
      workerRef.current = new Worker(
        new URL('./hexWorker.js', import.meta.url)
      );
      workerRef.current.onmessage = (e) => setBytes(e.data);
      return () => workerRef.current.terminate();
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (workerRef.current) workerRef.current.postMessage(hex);
  }, [hex]);

  useEffect(() => {
    let raf;
    const draw = () => {
      const canvas = miniMapRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const len = bytes.length;
      ctx.fillStyle = '#374151'; // gray-700
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (selection[0] !== null) {
        const start = Math.min(selection[0], selection[1]);
        const end = Math.max(selection[0], selection[1]);
        const startRatio = start / len;
        const endRatio = (end + 1) / len;
        ctx.fillStyle = '#fbbf24'; // amber-400
        ctx.fillRect(
          startRatio * canvas.width,
          0,
          (endRatio - startRatio) * canvas.width,
          canvas.height
        );
      }
    };
    if (prefersReduced.current) draw();
    else raf = requestAnimationFrame(draw);
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

  return (
    <div className="mb-6" aria-label="hex editor">
      <div className="flex gap-2">
        <div
          ref={containerRef}
          className="overflow-auto border border-gray-600 p-2 rounded max-h-64 flex-1"
        >
          <div
            className="text-xs font-mono text-white"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(16, minmax(0, 1fr))',
              gap: '0.25rem',
            }}
          >
            {bytes.map((b, i) => {
              const selected =
                selection[0] !== null &&
                i >= Math.min(selection[0], selection[1]) &&
                i <= Math.max(selection[0], selection[1]);
              return (
                <button
                  key={i}
                  onMouseDown={() => handleMouseDown(i)}
                  onMouseEnter={() => handleMouseEnter(i)}
                  className={`w-6 h-6 flex items-center justify-center rounded focus:outline-none focus:ring-2 focus:ring-yellow-300 ${
                    selected ? 'bg-yellow-300 text-black' : 'bg-gray-800'
                  }`}
                  style={{ minWidth: '1.5rem' }}
                >
                  {b}
                </button>
              );
            })}
          </div>
        </div>
        <canvas
          ref={miniMapRef}
          width={64}
          height={64}
          onClick={handleMiniMapClick}
          className="border border-gray-600 rounded cursor-pointer"
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

