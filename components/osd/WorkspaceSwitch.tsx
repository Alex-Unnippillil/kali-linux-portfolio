"use client";

import { useEffect, useRef, useState } from "react";
import useWorkspaceNames from "../../hooks/useWorkspaceNames";
import useDoNotDisturb from "../../hooks/useDoNotDisturb";
import { nextWorkspace, prevWorkspace } from "../../utils/workspaceManager";

export default function WorkspaceSwitch() {
  const { names } = useWorkspaceNames();
  const { dnd } = useDoNotDisturb();
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState(" ");
  const timeoutRef = useRef<number>();

  useEffect(() => {
    const show = (index: number) => {
      if (dnd) return;
      const name = names[index] ?? `Workspace ${index + 1}`;
      setLabel(`Workspace ${index + 1} — ${name}`);
      setVisible(true);
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setVisible(false), 1500);
    };
    const handler = (e: Event) => {
      const idx = (e as CustomEvent<number>).detail ?? 0;
      show(idx);
    };
    window.addEventListener("workspace-changed", handler as EventListener);
    return () => {
      window.removeEventListener("workspace-changed", handler as EventListener);
      window.clearTimeout(timeoutRef.current);
    };
  }, [names, dnd]);

  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        nextWorkspace(names.length);
      } else if (e.ctrlKey && e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        prevWorkspace(names.length);
      }
    };
    window.addEventListener("keydown", keyHandler);
    return () => window.removeEventListener("keydown", keyHandler);
  }, [names.length]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="px-4 py-2 rounded bg-black bg-opacity-75 text-white">
        {label}
      </div>
    </div>
  );
}
