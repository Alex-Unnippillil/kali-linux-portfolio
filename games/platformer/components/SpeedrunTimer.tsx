"use client";

import React, { useEffect, useRef, useState } from "react";

const FINAL_KEY = "platformer_speedrun_best_final";
const SPLIT_KEY = "platformer_speedrun_best_splits";

function formatTime(ms: number): string {
  const minutes = Math.floor(ms / 60000)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor((ms % 60000) / 1000)
    .toString()
    .padStart(2, "0");
  const millis = Math.floor(ms % 1000)
    .toString()
    .padStart(3, "0");
  return `${minutes}:${seconds}.${millis}`;
}

/**
 * Simple speedrun timer with split markers. Starts/stops manually and
 * persists best records in localStorage.
 */
export default function SpeedrunTimer() {
  const [running, setRunning] = useState(false);
  const [start, setStart] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [splits, setSplits] = useState<number[]>([]);
  const [bestFinal, setBestFinal] = useState<number | null>(null);
  const [bestSplits, setBestSplits] = useState<number[]>([]);
  const raf = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);


  // load best times
  useEffect(() => {
    try {
      const bf = localStorage.getItem(FINAL_KEY);
      if (bf) setBestFinal(parseFloat(bf));
      const bs = localStorage.getItem(SPLIT_KEY);
      if (bs) setBestSplits(JSON.parse(bs));
    } catch {
      /* ignore */
    }
  }, []);

  // run timer when active
  useEffect(() => {
    if (!running) {
      if (raf.current) cancelAnimationFrame(raf.current);
      return;
    }
    const tick = () => {
      if (start !== null) {
        setElapsed(performance.now() - start);
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [running, start]);

  const startTimer = () => {
    setStart(performance.now());
    setElapsed(0);
    setSplits([]);
    setRunning(true);
  };

  const split = () => {
    if (!running || start === null) return;
    const now = performance.now();
    setSplits((s) => [...s, now - start]);
  };

  const stop = () => {
    if (!running || start === null) return;
    const final = performance.now() - start;
    const newSplits = [...splits, final];
    setSplits(newSplits);
    setElapsed(final);
    setRunning(false);
    setStart(null);

    try {
      if (bestFinal === null || final < bestFinal) {
        localStorage.setItem(FINAL_KEY, final.toString());
        setBestFinal(final);
      }
      const updatedBest = [...bestSplits];
      newSplits.forEach((t, i) => {
        if (!updatedBest[i] || t < updatedBest[i]) {
          updatedBest[i] = t;
        }
      });
      localStorage.setItem(SPLIT_KEY, JSON.stringify(updatedBest));
      setBestSplits(updatedBest);
    } catch {
      /* ignore */
    }
  };

  const reset = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    setRunning(false);
    setStart(null);
    setElapsed(0);
    setSplits([]);
  };

  return (
    <div className="text-xs space-y-1">
      <div className="font-mono">{formatTime(elapsed)}</div>
      <div className="flex gap-1">
        <button onClick={running ? stop : startTimer} className="px-1 bg-gray-700 text-white">
          {running ? "Stop" : "Start"}
        </button>
        <button onClick={split} disabled={!running} className="px-1 bg-gray-700 text-white">
          Split
        </button>
        <button onClick={reset} className="px-1 bg-gray-700 text-white">
          Reset
        </button>
      </div>
      {splits.length > 0 && (
        <ul className="space-y-0.5">
          {splits.map((t, i) => (
            <li key={i} className="font-mono">
              #{i + 1}: {formatTime(t)}
              {bestSplits[i] != null && (
                <span> (best {formatTime(bestSplits[i])})</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {!running && splits.length > 0 && (
        <div className="font-mono">
          Final: {formatTime(splits[splits.length - 1])}
          {bestFinal != null && (
            <span>
              {" "}| Best: {formatTime(bestFinal)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

