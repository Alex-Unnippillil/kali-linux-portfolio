"use client";

import React, { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "panel.stopwatch";

export default function Stopwatch() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const startRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load persisted state on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data: {
          elapsed: number;
          running: boolean;
          startTime: number;
        } = JSON.parse(stored);
        if (data.running && data.startTime) {
          startRef.current = data.startTime;
          setElapsed(Math.floor((Date.now() - data.startTime) / 1000));
          setRunning(true);
        } else {
          setElapsed(data.elapsed || 0);
        }
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Persist state whenever it changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const data = {
      elapsed,
      running,
      startTime: running ? startRef.current : 0,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [elapsed, running]);

  // Handle ticking
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [running]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const toggle = () => {
    if (running) {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      setRunning(false);
    } else {
      startRef.current = Date.now() - elapsed * 1000;
      setRunning(true);
    }
  };

  const reset = () => {
    setRunning(false);
    setElapsed(0);
    startRef.current = 0;
  };

  return (
    <div className="p-4 space-y-4">
      <div className="text-center text-2xl">{formatTime(elapsed)}</div>
      <div className="flex justify-center gap-2">
        <button
          onClick={toggle}
          className="bg-ub-cool-grey text-white px-2 py-1 rounded"
        >
          {running ? "Pause" : "Start"}
        </button>
        <button
          onClick={reset}
          className="bg-ub-cool-grey text-white px-2 py-1 rounded"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

