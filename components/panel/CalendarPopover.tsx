"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type CalendarPopoverProps = {
  onClose: () => void;
};

type DateKey = string;

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toKey(date: Date): DateKey {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + amount);
  return next;
}

function addMonths(date: Date, amount: number) {
  const next = new Date(date);
  next.setMonth(date.getMonth() + amount);
  return next;
}

export default function CalendarPopover({ onClose }: CalendarPopoverProps) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [viewDate, setViewDate] = useState(() => startOfDay(new Date()));
  const [focusedDate, setFocusedDate] = useState(() => startOfDay(new Date()));
  const dayRefs = useRef<Record<DateKey, HTMLButtonElement | null>>({});

  useEffect(() => {
    const key = toKey(focusedDate);
    const node = dayRefs.current[key];
    if (node) {
      node.focus();
    }
  }, [focusedDate, viewDate]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const grid = useMemo(() => {
    const firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const firstDayOfGrid = addDays(firstOfMonth, -firstOfMonth.getDay());
    return Array.from({ length: 42 }, (_, index) => addDays(firstDayOfGrid, index));
  }, [viewDate]);

  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat(undefined, {
      month: "long",
      year: "numeric",
    }).format(viewDate);
  }, [viewDate]);

  const handleNavigate = (amount: number) => {
    const next = addMonths(viewDate, amount);
    setViewDate(startOfDay(next));
    setFocusedDate(startOfDay(addMonths(focusedDate, amount)));
  };

  const focusDate = (next: Date) => {
    setFocusedDate(startOfDay(next));
    setViewDate((current) => {
      if (next.getMonth() !== current.getMonth() || next.getFullYear() !== current.getFullYear()) {
        return startOfDay(new Date(next.getFullYear(), next.getMonth(), 1));
      }
      return current;
    });
  };

  const handleDayKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, date: Date) => {
    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        focusDate(addDays(date, -7));
        break;
      case "ArrowDown":
        event.preventDefault();
        focusDate(addDays(date, 7));
        break;
      case "ArrowLeft":
        event.preventDefault();
        focusDate(addDays(date, -1));
        break;
      case "ArrowRight":
        event.preventDefault();
        focusDate(addDays(date, 1));
        break;
      case "Home":
        event.preventDefault();
        focusDate(addDays(date, -date.getDay()));
        break;
      case "End":
        event.preventDefault();
        focusDate(addDays(date, 6 - date.getDay()));
        break;
      case "PageUp":
        event.preventDefault();
        focusDate(addMonths(date, event.shiftKey ? -12 : -1));
        break;
      case "PageDown":
        event.preventDefault();
        focusDate(addMonths(date, event.shiftKey ? 12 : 1));
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        onClose();
        break;
      case "Escape":
        event.preventDefault();
        onClose();
        break;
      default:
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Calendar"
      className="rounded bg-ub-cool-grey/95 p-4 text-white shadow-xl"
    >
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => handleNavigate(-1)}
          className="rounded px-2 py-1 text-sm hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Previous month"
        >
          ‹
        </button>
        <div className="text-sm font-semibold" aria-live="polite">
          {monthLabel}
        </div>
        <button
          type="button"
          onClick={() => handleNavigate(1)}
          className="rounded px-2 py-1 text-sm hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Next month"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-ubt-grey">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1 text-sm">
        {grid.map((date) => {
          const key = toKey(date);
          const isToday = date.getTime() === today.getTime();
          const isCurrentMonth =
            date.getMonth() === viewDate.getMonth() &&
            date.getFullYear() === viewDate.getFullYear();
          const isFocused = toKey(focusedDate) === key;

          return (
            <button
              key={key}
              ref={(element) => {
                dayRefs.current[key] = element;
              }}
              type="button"
              onClick={() => {
                focusDate(date);
                onClose();
              }}
              onKeyDown={(event) => handleDayKeyDown(event, date)}
              className={`rounded px-2 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                isFocused ? "bg-ubt-blue text-white" : "bg-transparent"
              } ${isToday ? "border border-ubt-blue" : "border border-transparent"} ${
                isCurrentMonth ? "text-white" : "text-ubt-grey"
              }`}
              aria-pressed={isFocused}
              aria-label={new Intl.DateTimeFormat(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              }).format(date)}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => {
          focusDate(today);
          setViewDate(today);
        }}
        className="mt-3 w-full rounded bg-white/10 px-2 py-1 text-sm hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        Today
      </button>
    </div>
  );
}
