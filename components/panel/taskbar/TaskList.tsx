"use client";

import React, { useCallback, useRef } from "react";

interface WindowInfo {
  id: string;
  title: string;
}

interface TaskListProps {
  windows: WindowInfo[];
  activeIndex: number;
  onActivate: (index: number) => void;
  onClose: (id: string) => void;
}

export default function TaskList({
  windows,
  activeIndex,
  onActivate,
  onClose,
}: TaskListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      if (windows.length === 0) return;
      const direction = event.deltaY > 0 ? 1 : -1;
      const nextIndex = (activeIndex + direction + windows.length) % windows.length;
      onActivate(nextIndex);
    },
    [activeIndex, onActivate, windows.length]
  );

  const handleMouseEnter = useCallback(() => {
    listRef.current?.addEventListener("wheel", handleWheel, { passive: false });
  }, [handleWheel]);

  const handleMouseLeave = useCallback(() => {
    listRef.current?.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const handleMouseUp = useCallback(
    (event: React.MouseEvent) => {
      if (event.button === 1 && windows[activeIndex]) {
        event.preventDefault();
        onClose(windows[activeIndex].id);
      }
    },
    [activeIndex, onClose, windows]
  );

  return (
    <div
      ref={listRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseUp={handleMouseUp}
      title="Scroll to cycle windows. Middle-click to close active window."
      aria-label="Task group: scroll to cycle windows; middle-click closes the active window."
    >
      {windows.map((win, index) => (
        <button
          key={win.id}
          type="button"
          aria-label={win.title + (index === activeIndex ? " (active)" : "")}
        >
          {win.title}
        </button>
      ))}
    </div>
  );
}

