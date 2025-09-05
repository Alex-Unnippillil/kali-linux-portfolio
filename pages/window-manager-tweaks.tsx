"use client";

import { useEffect, useState } from "react";
import Draggable from "react-draggable";

export default function WindowManagerTweaks() {
  const [grabKey, setGrabKey] = useState<"Alt" | "Super">("Alt");
  const [held, setHeld] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("grab-key");
    if (stored === "Alt" || stored === "Super") {
      setGrabKey(stored);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("grab-key", grabKey);
  }, [grabKey]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (
        (grabKey === "Alt" && e.altKey) ||
        (grabKey === "Super" && e.metaKey)
      ) {
        setHeld(true);
      }
    };
    const up = () => setHeld(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [grabKey]);

  return (
    <main className="min-h-screen bg-ub-cool-grey text-white p-4 space-y-4">
      <h1 className="text-2xl font-bold">Window Manager Tweaks</h1>
      <label className="flex items-center gap-2">
        <span className="text-ubt-grey">Modifier key:</span>
        <select
          value={grabKey}
          onChange={(e) => setGrabKey(e.target.value as "Alt" | "Super")}
          className="bg-ub-cool-grey border border-ubt-grey rounded text-white"
        >
          <option value="Alt">Alt</option>
          <option value="Super">Super</option>
        </select>
      </label>
      <p className="text-sm">
        Hold <strong>{grabKey}</strong> and drag to move windows.
      </p>
      <div className="relative h-64 border border-ubt-grey rounded overflow-hidden">
        <Draggable disabled={!held}>
          <div className="w-32 h-20 bg-ub-grey flex items-center justify-center cursor-move select-none">
            Demo
          </div>
        </Draggable>
        {!held && (
          <div className="absolute inset-0 flex items-center justify-center text-ubt-grey pointer-events-none">
            Hold {grabKey} to move
          </div>
        )}
      </div>
    </main>
  );
}

