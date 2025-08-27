import React, { useState, useEffect, useRef } from 'react';
import { scheduleEnvelope, measureLatency } from '../../utils/audio';

export default function LatencyTest() {
  const [bpm, setBpm] = useState(120);
  const [latency, setLatency] = useState(0);
  const ctxRef = useRef(null);
  const lastBeatRef = useRef(0);
  const offsetRef = useRef(0);

  useEffect(() => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    ctxRef.current = ctx;

    const beat = 60 / bpm;
    const tick = () => {
      lastBeatRef.current = scheduleEnvelope(ctx, bpm, offsetRef.current);
    };

    tick();
    const id = setInterval(tick, beat * 1000);
    return () => {
      clearInterval(id);
      ctx.close();
    };
  }, [bpm]);

  const handleTap = () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const ms = measureLatency(ctx, lastBeatRef.current);
    setLatency(ms);
    // Adjust scheduling offset by measured latency in seconds
    offsetRef.current -= ms / 1000;
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      <div className="mb-4 flex items-center">
        <label htmlFor="bpm" className="mr-2">BPM:</label>
        <input
          id="bpm"
          type="number"
          className="text-black p-1"
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value) || 60)}
        />
      </div>
      <button onClick={handleTap} className="bg-ub-hot-red px-4 py-2 rounded">
        Tap
      </button>
      <div className="mt-4">Latency: {latency.toFixed(1)} ms</div>
    </div>
  );
}
