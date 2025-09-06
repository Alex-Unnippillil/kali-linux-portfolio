"use client";

import React, { useEffect, useRef, useState } from "react";
import useNotifications from "../../hooks/useNotifications";

type Mode = "countdown" | "alarm";

const formatTime = (sec: number) => {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

export default function Timer() {
  const { pushNotification } = useNotifications();
  const [mode, setMode] = useState<Mode>("countdown");
  const [minutes, setMinutes] = useState("0");
  const [seconds, setSeconds] = useState("0");
  const [alarmTime, setAlarmTime] = useState("00:00");
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [showNotice, setShowNotice] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const endTimeRef = useRef(0);

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage({ action: "stop" });
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const start = () => {
    if (running) return;
    let totalSeconds = 0;
    if (mode === "countdown") {
      const m = parseInt(minutes, 10) || 0;
      const s = parseInt(seconds, 10) || 0;
      totalSeconds = m * 60 + s;
    } else {
      const [h, m] = alarmTime.split(":").map(Number);
      const now = new Date();
      const target = new Date();
      target.setHours(h, m, 0, 0);
      if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
      }
      totalSeconds = Math.ceil((target.getTime() - now.getTime()) / 1000);
    }
    if (totalSeconds <= 0) return;
    endTimeRef.current = Date.now() + totalSeconds * 1000;
    setRemaining(totalSeconds);
    setRunning(true);
    workerRef.current = new Worker(
      new URL("../../workers/timer.worker.ts", import.meta.url)
    );
    workerRef.current.onmessage = () => {
      const left = Math.max(
        0,
        Math.ceil((endTimeRef.current - Date.now()) / 1000)
      );
      setRemaining(left);
      if (left <= 0) {
        stop();
        ring();
        setShowNotice(true);
        pushNotification("Timer", "Timer finished");
      }
    };
    workerRef.current.postMessage({ action: "start", interval: 1000 });
  };

  const stop = () => {
    if (workerRef.current) {
      workerRef.current.postMessage({ action: "stop" });
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setRunning(false);
  };

  const reset = () => {
    stop();
    setRemaining(0);
    setShowNotice(false);
  };

  const ring = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        ctx.close();
      }, 500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex space-x-4">
        <label className="flex items-center space-x-1">
          <input
            type="radio"
            checked={mode === "countdown"}
            onChange={() => setMode("countdown")}
          />
          <span>Countdown</span>
        </label>
        <label className="flex items-center space-x-1">
          <input
            type="radio"
            checked={mode === "alarm"}
            onChange={() => setMode("alarm")}
          />
          <span>Alarm</span>
        </label>
      </div>
      {mode === "countdown" ? (
        <div className="flex space-x-2">
          <input
            type="number"
            min="0"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="w-16 p-1 text-black rounded"
            aria-label="Minutes"
          />
          <span>:</span>
          <input
            type="number"
            min="0"
            value={seconds}
            onChange={(e) => setSeconds(e.target.value)}
            className="w-16 p-1 text-black rounded"
            aria-label="Seconds"
          />
        </div>
      ) : (
        <input
          type="time"
          value={alarmTime}
          onChange={(e) => setAlarmTime(e.target.value)}
          className="p-1 text-black rounded"
          aria-label="Alarm time"
        />
      )}
      <div className="space-x-2">
        <button
          onClick={start}
          disabled={running}
          className="px-2 py-1 bg-green-600 rounded disabled:opacity-50"
        >
          Start
        </button>
        <button
          onClick={stop}
          disabled={!running}
          className="px-2 py-1 bg-yellow-600 rounded disabled:opacity-50"
        >
          Stop
        </button>
        <button onClick={reset} className="px-2 py-1 bg-red-600 rounded">
          Reset
        </button>
      </div>
      {(running || remaining > 0) && <div>Remaining: {formatTime(remaining)}</div>}
      {showNotice && (
        <div className="p-2 bg-ub-cool-grey text-white rounded">
          <p>Time's up!</p>
          <div className="mt-2 space-x-2">
            <button
              onClick={() => {
                reset();
                start();
              }}
              className="px-2 py-1 bg-green-600 rounded"
            >
              Reset
            </button>
            <button
              onClick={() => setShowNotice(false)}
              className="px-2 py-1 bg-red-600 rounded"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

