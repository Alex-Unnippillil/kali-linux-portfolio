"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

interface AppItem {
  id: string;
  title: string;
  icon: string;
}

const APPS: AppItem[] = [
  { id: "terminal", title: "Terminal", icon: "💻" },
  { id: "browser", title: "Browser", icon: "🌐" },
  { id: "files", title: "Files", icon: "📁" },
];

const EDGE_THRESHOLD = 8; // px from left edge to reveal dock

const Dock: React.FC = () => {
  const [running, setRunning] = useState<Record<string, boolean>>({});
  const [visible, setVisible] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);

  const toggle = (id: string) => {
    setRunning((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (e.clientX <= EDGE_THRESHOLD) {
      setVisible(true);
    } else if (
      dockRef.current &&
      !dockRef.current.matches(":hover") &&
      e.clientX > EDGE_THRESHOLD + 40
    ) {
      setVisible(false);
    }
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.metaKey && e.key.toLowerCase() === "b") {
      e.preventDefault();
      setVisible((v) => !v);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleMouseMove, handleKeyDown]);

  return (
    <nav
      ref={dockRef}
      aria-label="Dock"
      className={`fixed top-1/2 left-0 -translate-y-1/2 flex flex-col items-center space-y-2 transition-transform duration-300 ${
        visible ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {APPS.map((app) => {
        const isRunning = running[app.id];
        return (
          <button
            key={app.id}
            type="button"
            aria-label={app.title}
            onClick={() => toggle(app.id)}
            className="relative w-12 h-12 flex items-center justify-center rounded bg-black/20 text-xl text-white transition-colors hover:bg-white/20 active:bg-white/30"
          >
            <span>{app.icon}</span>
            {isRunning && (
              <span
                data-testid={`indicator-${app.id}`}
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-1 rounded-full bg-white"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
};

export default Dock;

