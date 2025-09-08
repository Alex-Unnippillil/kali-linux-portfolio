"use client";

import { useMemo } from "react";
import Window from "../components/desktop/Window";
import WindowSwitcher, { WindowInfo } from "../src/wm/WindowSwitcher";

export default function WindowManagerTest() {
  const windows: WindowInfo[] = useMemo(
    () => [
      { id: "win1", title: "Window 1", icon: "/icon.png" },
      { id: "win2", title: "Window 2", icon: "/icon.png" },
    ],
    [],
  );

  const select = (id: string) => {
    document.getElementById(id)?.click();
  };

  return (
    <main className="h-screen bg-ub-cool-grey">
      <Window id="win1" title="Window 1" initialX={80} initialY={80}>
        <button id="dialog-btn" onClick={() => alert("dialog")}>
          Open Dialog
        </button>
      </Window>
      <Window id="win2" title="Window 2" initialX={320} initialY={120}>
        <p>Second window</p>
      </Window>
      <WindowSwitcher windows={windows} onSelect={select} />
    </main>
  );
}
