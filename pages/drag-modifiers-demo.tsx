"use client";

import { useState, useEffect, useRef } from "react";

export default function DragModifiersDemo() {
  const [operation, setOperation] = useState("");
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const moveTooltip = (e: DragEvent) => {
      const t = tooltipRef.current;
      if (!t) return;
      t.style.left = `${e.clientX + 16}px`;
      t.style.top = `${e.clientY + 16}px`;
    };
    window.addEventListener("dragover", moveTooltip);
    return () => window.removeEventListener("dragover", moveTooltip);
  }, []);

  const onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    let op = "move";
    if (e.ctrlKey) op = "copy";
    else if (e.altKey) op = "link";
    else if (e.shiftKey) op = "move";
    setOperation(op);
    e.dataTransfer.setData("application/x-operation", op);
    e.dataTransfer.effectAllowed = op as any;
    requestAnimationFrame(() => {
      const t = tooltipRef.current;
      if (t) t.style.display = "block";
    });
  };

  const onDragEnd = () => {
    setOperation("");
    const t = tooltipRef.current;
    if (t) t.style.display = "none";
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const op = e.dataTransfer.getData("application/x-operation") || "move";
    alert(`${op} operation simulated`);
    onDragEnd();
  };

  const allowDrop = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 text-white bg-ub-cool-grey">
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className="w-24 h-24 bg-ub-orange flex items-center justify-center rounded cursor-move select-none"
      >
        Drag me
      </div>
      <div
        onDrop={onDrop}
        onDragOver={allowDrop}
        className="w-40 h-40 border-2 border-dashed border-white flex items-center justify-center rounded"
      >
        Drop zone
      </div>
      <div
        ref={tooltipRef}
        style={{ position: "fixed", pointerEvents: "none", display: "none" }}
        className="px-2 py-1 text-xs bg-black/80 rounded"
      >
        {operation.toUpperCase()}
      </div>
    </div>
  );
}

