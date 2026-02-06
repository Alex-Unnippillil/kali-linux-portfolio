"use client";

import { useEffect, useRef, useState } from "react";

function formatDate(date: Date) {
  return date
    .toLocaleString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(",", "");
}

function Calendar() {
  const [view, setView] = useState(() => new Date());

  const start = new Date(view.getFullYear(), view.getMonth(), 1);
  const firstDay = start.getDay();
  const daysInMonth = new Date(
    view.getFullYear(),
    view.getMonth() + 1,
    0
  ).getDate();

  const weeks: (number | null)[][] = [];
  let day = 1 - firstDay;
  while (day <= daysInMonth) {
    const week: (number | null)[] = [];
    for (let i = 0; i < 7; i += 1, day += 1) {
      if (day < 1 || day > daysInMonth) {
        week.push(null);
      } else {
        week.push(day);
      }
    }
    weeks.push(week);
  }

  const monthLabel = view.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="text-xs select-none">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() =>
            setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))
          }
        >
          &lt;
        </button>
        <span className="font-semibold">{monthLabel}</span>
        <button
          type="button"
          aria-label="Next month"
          onClick={() =>
            setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))
          }
        >
          &gt;
        </button>
      </div>
      <table className="border-collapse">
        <thead>
          <tr>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <th key={d} className="w-8 h-6 font-normal">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, i) => (
            <tr key={i}>
              {week.map((d, j) => (
                <td key={j} className="w-8 h-6 text-center">
                  {d || ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (open && ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        {formatDate(now)}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 p-2 bg-white dark:bg-gray-800 border rounded shadow">
          <Calendar />
        </div>
      )}
    </div>
  );
}

