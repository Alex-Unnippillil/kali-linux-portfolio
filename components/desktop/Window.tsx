"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

interface WindowProps {
  title: string;
  children?: React.ReactNode;
  initialX?: number;
  initialY?: number;
  initialWidth?: number;
  initialHeight?: number;
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

let zCounter = 1;

const Window: React.FC<WindowProps> = ({
  title,
  children,
  initialX = 80,
  initialY = 80,
  initialWidth = 400,
  initialHeight = 300,
  onClose,
  onMinimize,
  onMaximize,
}) => {
  const winRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const [size, setSize] = useState({ w: initialWidth, h: initialHeight });
  const [dragging, setDragging] = useState(false);
  const [resizeDir, setResizeDir] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [zIndex, setZIndex] = useState(++zCounter);
  const [focused, setFocused] = useState(false);

  const bringToFront = useCallback(() => {
    setZIndex(++zCounter);
    setFocused(true);
    document.dispatchEvent(new CustomEvent("desktop-window-focus", { detail: winRef.current }));
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const target = (e as CustomEvent).detail as HTMLDivElement;
      if (target !== winRef.current) setFocused(false);
    };
    document.addEventListener("desktop-window-focus", handler);
    return () => document.removeEventListener("desktop-window-focus", handler);
  }, []);

  const handleHeaderPointerDown = (e: React.PointerEvent) => {
    bringToFront();
    setDragging(true);
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  };

  const startResize = (dir: string) => (e: React.PointerEvent) => {
    bringToFront();
    setResizeDir(dir);
    e.stopPropagation();
    e.preventDefault();
  };

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (dragging) {
        setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
      } else if (resizeDir) {
        setSize((prev) => {
          let { w, h } = prev;
          let { x, y } = pos;
          if (resizeDir.includes("right")) w = e.clientX - x;
          if (resizeDir.includes("bottom")) h = e.clientY - y;
          if (resizeDir.includes("left")) {
            const newX = e.clientX;
            w += x - newX;
            x = newX;
          }
          if (resizeDir.includes("top")) {
            const newY = e.clientY;
            h += y - newY;
            y = newY;
          }
          setPos({ x, y });
          return { w, h };
        });
      }
    };

    const handleUp = () => {
      setDragging(false);
      setResizeDir(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragging, resizeDir, pos]);

  return (
    <div
      ref={winRef}
      onPointerDown={bringToFront}
      style={{
        top: pos.y,
        left: pos.x,
        width: size.w,
        height: size.h,
        zIndex,
      }}
      className={`absolute bg-white shadow-lg rounded-lg border border-gray-300 overflow-hidden ${focused ? "" : "opacity-90"}`}
    >
      <div
        className="h-8 bg-gray-200 flex items-center cursor-move rounded-t-lg select-none"
        onPointerDown={handleHeaderPointerDown}
      >
        <div className="flex space-x-2 px-2">
          <button
            aria-label="Close"
            onClick={onClose}
            className="w-3 h-3 bg-red-500 rounded-full"
          />
          <button
            aria-label="Minimize"
            onClick={onMinimize}
            className="w-3 h-3 bg-yellow-500 rounded-full"
          />
          <button
            aria-label="Maximize"
            onClick={onMaximize}
            className="w-3 h-3 bg-green-500 rounded-full"
          />
        </div>
        <span className="flex-1 text-center pr-6 text-sm">{title}</span>
      </div>
      <div className="w-full h-[calc(100%-2rem)]">{children}</div>

      {/* Resize handles */}
      <div className="absolute top-0 left-0 w-full h-2 -mt-1 cursor-n-resize" onPointerDown={startResize("top")} />
      <div className="absolute bottom-0 left-0 w-full h-2 -mb-1 cursor-s-resize" onPointerDown={startResize("bottom")} />
      <div className="absolute top-0 left-0 h-full w-2 -ml-1 cursor-w-resize" onPointerDown={startResize("left")} />
      <div className="absolute top-0 right-0 h-full w-2 -mr-1 cursor-e-resize" onPointerDown={startResize("right")} />
      <div className="absolute top-0 left-0 w-3 h-3 -mt-1 -ml-1 cursor-nw-resize" onPointerDown={startResize("top-left")} />
      <div className="absolute top-0 right-0 w-3 h-3 -mt-1 -mr-1 cursor-ne-resize" onPointerDown={startResize("top-right")} />
      <div className="absolute bottom-0 left-0 w-3 h-3 -mb-1 -ml-1 cursor-sw-resize" onPointerDown={startResize("bottom-left")} />
      <div className="absolute bottom-0 right-0 w-3 h-3 -mb-1 -mr-1 cursor-se-resize" onPointerDown={startResize("bottom-right")} />
    </div>
  );
};

export default Window;

