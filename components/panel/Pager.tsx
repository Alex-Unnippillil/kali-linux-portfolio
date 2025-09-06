"use client";

import React, { useState } from "react";
import usePersistentState from "../../hooks/usePersistentState";

type Workspace = {
  id: number;
  name: string;
  windows: string[];
};

interface PagerProps {
  rows?: number;
  miniatureView?: boolean;
  initialWorkspaces?: Workspace[];
}

const PAGER_PREFIX = "xfce.pager.";

export default function Pager({
  rows: rowsProp,
  miniatureView: miniatureProp,
  initialWorkspaces,
}: PagerProps) {
  const [rows] = usePersistentState<number>(
    `${PAGER_PREFIX}rows`,
    rowsProp ?? 1,
    (v): v is number => typeof v === "number"
  );
  const [miniature] = usePersistentState<boolean>(
    `${PAGER_PREFIX}miniature`,
    miniatureProp ?? true,
    (v): v is boolean => typeof v === "boolean"
  );

  const [workspaces, setWorkspaces] = useState<Workspace[]>(
    () =>
      initialWorkspaces || [
        { id: 0, name: "Workspace 1", windows: ["win-1", "win-2"] },
        { id: 1, name: "Workspace 2", windows: ["win-3"] },
        { id: 2, name: "Workspace 3", windows: [] },
        { id: 3, name: "Workspace 4", windows: [] },
      ]
  );
  const [active, setActive] = useState(0);

  const columns = Math.ceil(workspaces.length / rows);

  const onDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    wsIndex: number,
    winId: string
  ) => {
    e.dataTransfer.setData(
      "text/plain",
      JSON.stringify({ wsIndex, winId })
    );
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>, target: number) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      setWorkspaces((prev) => {
        const copy = prev.map((ws) => ({ ...ws, windows: [...ws.windows] }));
        const srcWs = copy[data.wsIndex];
        const winIdx = srcWs.windows.indexOf(data.winId);
        if (winIdx === -1) return prev;
        const [moved] = srcWs.windows.splice(winIdx, 1);
        copy[target].windows.push(moved);
        return copy;
      });
    } catch {
      /* ignore malformed drops */
    }
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

  return (
    <div className="space-y-2">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {workspaces.map((ws, i) => (
          <div
            key={ws.id}
            data-testid={`workspace-${i}`}
            aria-label={`Workspace ${i + 1}`}
            aria-selected={active === i}
            onClick={() => setActive(i)}
            onDrop={(e) => onDrop(e, i)}
            onDragOver={onDragOver}
            className={`border p-1 rounded cursor-pointer ${
              active === i ? "border-blue-400" : "border-gray-600"
            }`}
          >
            {miniature ? (
              <div className="flex flex-wrap gap-1">
                {ws.windows.map((win) => (
                  <div
                    key={win}
                    data-testid="window-thumbnail"
                    draggable
                    onDragStart={(e) => onDragStart(e, i, win)}
                    className="w-4 h-4 bg-gray-500"
                  />
                ))}
              </div>
            ) : (
              <span>{ws.name}</span>
            )}
          </div>
        ))}
      </div>
      <a
        href="https://github.com/unnippillil/kali-linux-portfolio/issues/485"
        className="text-blue-400 hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        Open Workspace Settings
      </a>
    </div>
  );
}

