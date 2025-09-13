"use client";

import React, { useEffect } from "react";

export interface WorkspaceInfo {
  id: number;
  name: string;
}

interface Props {
  workspaces: WorkspaceInfo[];
  active: number;
  onSelect?: (id: number) => void;
  onClose?: () => void;
}

export default function WorkspaceSwitcher({
  workspaces,
  active,
  onSelect,
  onClose,
}: Props) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 text-white"
      role="dialog"
    >
      <div
        className="grid gap-4 w-11/12 max-w-3xl"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}
      >
        {workspaces.map((ws) => (
          <button
            key={ws.id}
            onClick={() => onSelect?.(ws.id)}
            className={`p-4 rounded bg-ub-grey bg-opacity-60 hover:bg-ub-grey text-center focus:outline-none ${
              active === ws.id ? "ring-2 ring-ub-orange" : ""
            }`}
          >
            {ws.name}
          </button>
        ))}
      </div>
    </div>
  );
}

