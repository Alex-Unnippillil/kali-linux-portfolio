"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

const TASKBAR_PREFIX = "xfce.taskbar.";

interface AppInfo {
  id: string;
  title: string;
  icon: string;
}

interface TaskListProps {
  apps: AppInfo[];
  closed_windows: Record<string, boolean>;
  minimized_windows: Record<string, boolean>;
  focused_windows: Record<string, boolean>;
  openApp: (id: string) => void;
  minimize: (id: string) => void;
}

export default function TaskList({
  apps,
  closed_windows,
  minimized_windows,
  focused_windows,
  openApp,
  minimize,
}: TaskListProps) {
  const [docklike, setDocklike] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(`${TASKBAR_PREFIX}docklike`) === "true";
  });

  const [pinned, setPinned] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(`${TASKBAR_PREFIX}pinned`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      setDocklike(localStorage.getItem(`${TASKBAR_PREFIX}docklike`) === "true");
      try {
        const stored = localStorage.getItem(`${TASKBAR_PREFIX}pinned`);
        setPinned(stored ? JSON.parse(stored) : []);
      } catch {
        setPinned([]);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(`${TASKBAR_PREFIX}pinned`, JSON.stringify(pinned));
  }, [pinned]);

  const running = apps.filter((app) => closed_windows[app.id] === false);
  const runningIds = new Set(running.map((a) => a.id));

  let display: AppInfo[] = running;
  if (docklike) {
    const pinnedApps = pinned
      .map((id) => apps.find((a) => a.id === id))
      .filter((a): a is AppInfo => !!a);
    const extras = running.filter((a) => !pinned.includes(a.id));
    display = [...pinnedApps, ...extras];
  }

  const [menuApp, setMenuApp] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  const handleContext = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setMenuApp(id);
    setMenuPos({ x: e.clientX, y: e.clientY });
  };

  const togglePin = (id: string) => {
    setPinned((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
    setMenuApp(null);
  };

  const handleClick = (app: AppInfo) => {
    const id = app.id;
    if (closed_windows[id] === false) {
      if (minimized_windows[id]) {
        openApp(id);
      } else if (focused_windows[id]) {
        minimize(id);
      } else {
        openApp(id);
      }
    } else {
      // no window, launch app
      openApp(id);
    }
  };

  return (
    <>
      {display.map((app) => (
        <button
          key={app.id}
          type="button"
          aria-label={app.title}
          data-app-id={app.id}
          onClick={() => handleClick(app)}
          onContextMenu={(e) => handleContext(e, app.id)}
          className=
            (focused_windows[app.id] && !minimized_windows[app.id]
              ? " bg-white bg-opacity-20 "
              : " ") +
            "relative flex items-center mx-1 px-2 py-1 rounded hover:bg-white hover:bg-opacity-10"
        >
          <Image
            width={24}
            height={24}
            className="w-5 h-5"
            src={app.icon.replace('./', '/')}
            alt=""
            sizes="24px"
          />
          <span className="ml-1 text-sm text-white whitespace-nowrap">
            {app.title}
          </span>
          {closed_windows[app.id] === false &&
            !focused_windows[app.id] &&
            !minimized_windows[app.id] && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-0.5 bg-white rounded" />
            )}
        </button>
      ))}
      {menuApp && menuPos && (
        <div
          className="cursor-default w-40 context-menu-bg border border-gray-900 rounded text-white py-2 absolute z-50 text-sm"
          style={{ top: menuPos.y, left: menuPos.x }}
          role="menu"
        >
          <button
            type="button"
            className="w-full text-left cursor-default py-0.5 hover:bg-gray-700"
            onClick={() => togglePin(menuApp)}
          >
            <span className="ml-5">
              {pinned.includes(menuApp) ? "Unpin" : "Pin"}
            </span>
          </button>
        </div>
      )}
    </>
  );
}
