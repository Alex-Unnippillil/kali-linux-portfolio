'use client';

import React, { useEffect, useRef, useState } from "react";

export default function PanelClock() {
  const [now, setNow] = useState(() => new Date());
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(() => new Date());
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dialogRef.current &&
        !dialogRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const formatTime = now.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const monthLabel = visible.toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
  const start = new Date(visible.getFullYear(), visible.getMonth(), 1);
  const end = new Date(visible.getFullYear(), visible.getMonth() + 1, 0);
  const days: (number | null)[] = [];
  for (let i = 0; i < start.getDay(); i++) days.push(null);
  for (let d = 1; d <= end.getDate(); d++) days.push(d);

  const prevMonth = () =>
    setVisible(
      new Date(visible.getFullYear(), visible.getMonth() - 1, 1)
    );
  const nextMonth = () =>
    setVisible(
      new Date(visible.getFullYear(), visible.getMonth() + 1, 1)
    );

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open ? "true" : "false"}
        aria-label="Open calendar"
        onClick={() => setOpen((v) => !v)}
        className="px-2 py-1"
      >
        {formatTime}
      </button>
      {open && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-label="Calendar"
          className="absolute right-0 mt-2 bg-ub-grey text-ubt-grey p-2 rounded shadow-lg z-50"
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Previous month"
              className="px-1"
            >
              ‹
            </button>
            <span>{monthLabel}</span>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Next month"
              className="px-1"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 text-center gap-1">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <span key={d} className="text-xs">
                {d}
              </span>
            ))}
            {days.map((d, i) => (
              <span key={i} className="text-sm">
                {d ?? ""}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

