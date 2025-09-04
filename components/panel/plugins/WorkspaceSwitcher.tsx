"use client";
import React, { useState } from "react";

interface Workspace {
  id: number;
  name: string;
  windows: string[];
}

interface WorkspaceSwitcherProps {
  workspaceCount?: number;
}

export default function WorkspaceSwitcher({
  workspaceCount = 4,
}: WorkspaceSwitcherProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(
    Array.from({ length: workspaceCount }, (_, i) => ({
      id: i,
      name: `Workspace ${i + 1}`,
      windows: i === 0 ? ["Window 1", "Window 2"] : [],
    }))
  );
  const [active, setActive] = useState(0);

  const handleDragStart =
    (sourceWs: number, winIndex: number) =>
    (e: React.DragEvent<HTMLDivElement>) => {
      e.dataTransfer.setData(
        "text/plain",
        JSON.stringify({ sourceWs, winIndex })
      );
    };

  const handleDrop =
    (targetWs: number) => (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const data = e.dataTransfer.getData("text/plain");
      if (!data) return;
      const { sourceWs, winIndex } = JSON.parse(data);
      if (sourceWs === targetWs) return;
      setWorkspaces((prev) => {
        const updated = prev.map((ws) => ({
          ...ws,
          windows: [...ws.windows],
        }));
        const [win] = updated[sourceWs].windows.splice(winIndex, 1);
        if (win) {
          updated[targetWs].windows.push(win);
        }
        return updated;
      });
    };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className="flex gap-2">
      {workspaces.map((ws, idx) => (
        <div
          key={ws.id}
          className={`p-2 border rounded cursor-pointer ${
            idx === active ? "border-blue-500" : "border-gray-600"
          }`}
          onClick={() => setActive(idx)}
          onDrop={handleDrop(idx)}
          onDragOver={handleDragOver}
        >
          <div className="text-center text-xs mb-1">{ws.name}</div>
          <div className="w-24 h-16 bg-gray-800 relative overflow-hidden">
            {ws.windows.map((win, winIdx) => (
              <div
                key={winIdx}
                className="absolute w-8 h-6 bg-gray-500 text-[8px] flex items-center justify-center"
                style={{
                  top: (winIdx % 2) * 8,
                  left: (winIdx % 3) * 8,
                }}
                draggable
                onDragStart={handleDragStart(idx, winIdx)}
              >
                {win}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
