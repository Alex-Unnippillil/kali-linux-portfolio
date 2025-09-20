"use client";

import { useEffect, useRef, useState } from "react";

type Point = {
  x: number;
  y: number;
};

type SelectionRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type SelectionBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

function intersects(bounds: SelectionBounds, rect: DOMRect): boolean {
  return (
    rect.left <= bounds.right &&
    rect.right >= bounds.left &&
    rect.top <= bounds.bottom &&
    rect.bottom >= bounds.top
  );
}

export default function DesktopSelection() {
  const [rect, setRect] = useState<SelectionRect | null>(null);
  const startPoint = useRef<Point | null>(null);
  const isSelecting = useRef(false);
  const desktopRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const desktop = document.getElementById("desktop");
    if (!desktop) return;

    desktopRef.current = desktop;

    const resetIcons = () => {
      if (!desktopRef.current) return;
      const icons = desktopRef.current.querySelectorAll<HTMLElement>('[data-context="app"]');
      icons.forEach((icon) => {
        icon.removeAttribute("data-selected");
      });
    };

    const updateIconSelection = (bounds: SelectionBounds) => {
      if (!desktopRef.current) return;
      const icons = desktopRef.current.querySelectorAll<HTMLElement>('[data-context="app"]');
      icons.forEach((icon) => {
        const iconRect = icon.getBoundingClientRect();
        if (intersects(bounds, iconRect)) {
          icon.setAttribute("data-selected", "1");
        } else {
          icon.removeAttribute("data-selected");
        }
      });
    };

    const stopSelection = () => {
      if (!isSelecting.current) return;
      isSelecting.current = false;
      startPoint.current = null;
      setRect(null);
      resetIcons();
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    function handleMouseMove(event: MouseEvent) {
      if (!isSelecting.current || !desktopRef.current || !startPoint.current) {
        return;
      }

      const { x: startX, y: startY } = startPoint.current;
      const currentX = event.clientX;
      const currentY = event.clientY;

      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);

      const desktopBounds = desktopRef.current.getBoundingClientRect();

      setRect({
        left: left - desktopBounds.left,
        top: top - desktopBounds.top,
        width,
        height,
      });

      updateIconSelection({
        left,
        top,
        right: left + width,
        bottom: top + height,
      });
    }

    function handleMouseUp() {
      stopSelection();
    }

    function handleMouseDown(event: MouseEvent) {
      if (event.button !== 0) return;
      if (!(event.target instanceof Element)) return;
      if (event.target.closest("#window-area")) return;
      if (event.target.closest("nav[aria-label='Dock']")) return;
      if (event.target.closest("[role='toolbar']")) return;
      if (event.target.closest("[role='menu']")) return;

      isSelecting.current = true;
      startPoint.current = { x: event.clientX, y: event.clientY };
      resetIcons();

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      if (!event.target.closest('[data-context="app"]')) {
        event.preventDefault();
      }
    }

    desktop.addEventListener("mousedown", handleMouseDown);

    return () => {
      desktop.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute rounded-sm border border-blue-400 bg-blue-500 bg-opacity-20"
      style={{
        display: rect ? "block" : "none",
        left: rect ? `${rect.left}px` : undefined,
        top: rect ? `${rect.top}px` : undefined,
        width: rect ? `${rect.width}px` : undefined,
        height: rect ? `${rect.height}px` : undefined,
        zIndex: 30,
      }}
    />
  );
}
