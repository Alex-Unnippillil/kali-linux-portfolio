"use client";

import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";

const SAVE_KEY = "input-lab:text";

const schema = z.object({
  text: z.string().min(1, "Text is required"),
});

export default function InputLab() {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [eventLog, setEventLog] = useState<
    { time: string; type: string; [key: string]: unknown }[]
  >([]);
  const [typeFilters, setTypeFilters] = useState<Record<string, boolean>>({});
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  const logEvent = (type: string, details: Record<string, unknown> = {}) => {
    setEventLog((prev) => [
      ...prev,
      { time: new Date().toISOString(), type, ...details },
    ]);
  };

  const handleCaret = (
    e: React.SyntheticEvent<HTMLInputElement, Event>,
    extra: Record<string, unknown> = {},
  ) => {
    const { selectionStart, selectionEnd } = e.currentTarget;
    logEvent("caret", { start: selectionStart, end: selectionEnd, ...extra });
  };

  const exportLog = () => {
    const blob = new Blob([JSON.stringify(eventLog, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "input-lab-log.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Load saved text on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(SAVE_KEY);
    if (saved) setText(saved);

    const handleKey = (e: KeyboardEvent) => {
      logEvent(e.type, { key: e.key, code: e.code });
    };
    const handleMouse = (e: MouseEvent) => {
      logEvent(e.type, { x: e.clientX, y: e.clientY, button: e.button });
    };
    window.addEventListener("keydown", handleKey);
    window.addEventListener("keyup", handleKey);
    window.addEventListener("mousedown", handleMouse);
    window.addEventListener("mouseup", handleMouse);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("keyup", handleKey);
      window.removeEventListener("mousedown", handleMouse);
      window.removeEventListener("mouseup", handleMouse);
    };
  }, []);

  // Validate and autosave
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handle = setTimeout(() => {
      const result = schema.safeParse({ text });
      if (!result.success) {
        const msg = result.error.issues[0].message;
        setError(msg);
        setStatus(`Error: ${msg}`);
        return;
      }
      setError("");
      window.localStorage.setItem(SAVE_KEY, text);
      setStatus("Saved");
    }, 500);
    return () => clearTimeout(handle);
  }, [text]);

  // ensure type filters include all event types
  useEffect(() => {
    setTypeFilters((prev) => {
      const updated = { ...prev };
      for (const ev of eventLog) {
        if (!(ev.type in updated)) updated[ev.type] = true;
      }
      return updated;
    });
  }, [eventLog]);

  const filteredEvents = useMemo(() => {
    const start = rangeStart ? new Date(rangeStart).getTime() : undefined;
    const end = rangeEnd ? new Date(rangeEnd).getTime() : undefined;
    return eventLog.filter((ev) => {
      const t = new Date(ev.time).getTime();
      if (typeFilters[ev.type] === false) return false;
      if (start && t < start) return false;
      if (end && t > end) return false;
      return true;
    });
  }, [eventLog, typeFilters, rangeStart, rangeEnd]);

  const typeList = Object.keys(typeFilters);
  const colors = [
    "#f87171",
    "#60a5fa",
    "#34d399",
    "#fbbf24",
    "#a78bfa",
    "#ec4899",
  ];
  const width = 600;
  const height = 80;
  const minTime = Math.min(
    ...filteredEvents.map((e) => new Date(e.time).getTime()),
  );
  const maxTime = Math.max(
    ...filteredEvents.map((e) => new Date(e.time).getTime()),
  );

  return (
    <div className="min-h-screen bg-gray-900 p-4 text-white">
      <h1 className="mb-4 text-2xl">Input Lab</h1>
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <div>
          <label
            htmlFor="input-lab-text"
            className="mb-1 block text-sm font-medium"
          >
            Text
          </label>
          <input
            id="input-lab-text"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onCompositionStart={(e) =>
              logEvent("compositionstart", { data: e.data })
            }
            onCompositionUpdate={(e) =>
              logEvent("compositionupdate", { data: e.data })
            }
            onCompositionEnd={(e) =>
              logEvent("compositionend", { data: e.data })
            }
            onSelect={handleCaret}
            onKeyUp={(e) => {
              if (
                [
                  "ArrowLeft",
                  "ArrowRight",
                  "ArrowUp",
                  "ArrowDown",
                  "Home",
                  "End",
                ].includes(e.key)
              ) {
                handleCaret(e);
              }
            }}
            onClick={handleCaret}
            className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
            aria-label="text"
          />
          {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
        </div>
      </form>
      <div
        role="status"
        aria-live="polite"
        className="mt-4 text-sm text-green-400"
      >
        {status}
      </div>
      {typeList.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap gap-4">
            {typeList.map((t) => (
              <label key={t} className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={typeFilters[t]}
                  onChange={() =>
                    setTypeFilters((prev) => ({ ...prev, [t]: !prev[t] }))
                  }
                  aria-label={t}
                />
                <span>{t}</span>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label>
              From{" "}
              <input
                type="datetime-local"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className="rounded bg-gray-800 p-1"
                aria-label="from"
              />
            </label>
            <label>
              To{" "}
              <input
                type="datetime-local"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="rounded bg-gray-800 p-1"
                aria-label="to"
              />
            </label>
          </div>
        </div>
      )}
      {filteredEvents.length > 0 && (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="mt-4 w-full bg-gray-800"
          height={height}
        >
          <line
            x1={0}
            x2={width}
            y1={height - 20}
            y2={height - 20}
            stroke="#4b5563"
            strokeWidth={2}
          />
          {filteredEvents.map((ev, i) => {
            const t = new Date(ev.time).getTime();
            const x = ((t - minTime) / Math.max(maxTime - minTime, 1)) * width;
            const color =
              colors[typeList.indexOf(ev.type) % colors.length] || "#fff";
            return (
              <circle key={i} cx={x} cy={height - 20} r={4} fill={color} />
            );
          })}
        </svg>
      )}
      {eventLog.length > 0 && (
        <pre className="mt-4 max-h-64 overflow-y-auto whitespace-pre-wrap rounded bg-gray-800 p-2 text-xs">
          {JSON.stringify(eventLog, null, 2)}
        </pre>
      )}
      <button
        type="button"
        onClick={exportLog}
        className="mt-4 rounded bg-blue-600 px-3 py-1 text-sm"
      >
        Export Log
      </button>
    </div>
  );
}
