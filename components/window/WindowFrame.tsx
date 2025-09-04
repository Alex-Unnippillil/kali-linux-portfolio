"use client";

import React, { useRef, useState } from "react";

interface WindowFrameProps {
  initialX?: number;
  initialY?: number;
  initialWidth?: number;
  initialHeight?: number;
  minWidth?: number;
  minHeight?: number;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const WindowFrame: React.FC<WindowFrameProps> = ({
  initialX = 100,
  initialY = 100,
  initialWidth = 400,
  initialHeight = 300,
  minWidth = 150,
  minHeight = 100,
  title,
  children,
  className = "",
}) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<Rect>({
    x: initialX,
    y: initialY,
    width: initialWidth,
    height: initialHeight,
  });

  const dragRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  const resizeRef = useRef({
    resizing: false,
    startX: 0,
    startY: 0,
    startW: 0,
    startH: 0,
    dir: "" as string | null,
    raf: 0,
    next: {} as Rect,
  });

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: rect.x,
      originY: rect.y,
    };
    document.addEventListener("mousemove", onDrag);
    document.addEventListener("mouseup", stopDrag);
  };

  const onDrag = (e: MouseEvent) => {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setRect((r) => ({ ...r, x: dragRef.current.originX + dx, y: dragRef.current.originY + dy }));
  };

  const stopDrag = () => {
    dragRef.current.dragging = false;
    document.removeEventListener("mousemove", onDrag);
    document.removeEventListener("mouseup", stopDrag);
  };

  const startResize = (dir: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    resizeRef.current.resizing = true;
    resizeRef.current.startX = e.clientX;
    resizeRef.current.startY = e.clientY;
    resizeRef.current.startW = rect.width;
    resizeRef.current.startH = rect.height;
    resizeRef.current.dir = dir;
    resizeRef.current.next = rect;
    document.addEventListener("mousemove", onResize);
    document.addEventListener("mouseup", stopResize);
  };

  const onResize = (e: MouseEvent) => {
    const data = resizeRef.current;
    if (!data.resizing || !data.dir) return;
    const dx = e.clientX - data.startX;
    const dy = e.clientY - data.startY;

    let newRect: Rect = { ...rect };

    if (data.dir.includes("right")) {
      newRect.width = Math.max(minWidth, data.startW + dx);
    }
    if (data.dir.includes("left")) {
      newRect.width = Math.max(minWidth, data.startW - dx);
      newRect.x = rect.x + dx;
    }
    if (data.dir.includes("bottom")) {
      newRect.height = Math.max(minHeight, data.startH + dy);
    }
    if (data.dir.includes("top")) {
      newRect.height = Math.max(minHeight, data.startH - dy);
      newRect.y = rect.y + dy;
    }

    data.next = newRect;
    if (!data.raf) {
      data.raf = requestAnimationFrame(() => {
        data.raf = 0;
        setRect(data.next);
      });
    }
  };

  const stopResize = () => {
    const data = resizeRef.current;
    data.resizing = false;
    document.removeEventListener("mousemove", onResize);
    document.removeEventListener("mouseup", stopResize);
    if (data.raf) {
      cancelAnimationFrame(data.raf);
      data.raf = 0;
      setRect(data.next);
    }
  };

  const handles = [
    { dir: "top", style: { top: -4, left: 0, right: 0, height: 8, cursor: "ns-resize" } },
    { dir: "bottom", style: { bottom: -4, left: 0, right: 0, height: 8, cursor: "ns-resize" } },
    { dir: "left", style: { left: -4, top: 0, bottom: 0, width: 8, cursor: "ew-resize" } },
    { dir: "right", style: { right: -4, top: 0, bottom: 0, width: 8, cursor: "ew-resize" } },
    { dir: "top-left", style: { left: -4, top: -4, width: 8, height: 8, cursor: "nwse-resize" } },
    { dir: "top-right", style: { right: -4, top: -4, width: 8, height: 8, cursor: "nesw-resize" } },
    { dir: "bottom-left", style: { left: -4, bottom: -4, width: 8, height: 8, cursor: "nesw-resize" } },
    { dir: "bottom-right", style: { right: -4, bottom: -4, width: 8, height: 8, cursor: "nwse-resize" } },
  ];

  return (
    <div
      ref={frameRef}
      className={className}
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
      }}
    >
      <div
        onMouseDown={startDrag}
        style={{ cursor: "move", userSelect: "none" }}
      >
        {title}
      </div>
      <div style={{ width: "100%", height: "100%" }}>{children}</div>
      {handles.map((h) => (
        <div
          key={h.dir}
          onMouseDown={startResize(h.dir)}
          style={{ position: "absolute", ...h.style }}
        />
      ))}
    </div>
  );
};

export default WindowFrame;

