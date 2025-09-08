"use client";

import React, { useEffect, useRef, useState } from "react";
import useNotifications from "@/hooks/useNotifications";

export default function Notifications() {
  const { log, clearNotifications, clearLog } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (open && ref.current) {
      ref.current.focus();
    }
  }, [open]);

  const handleClear = () => {
    clearNotifications();
    clearLog();
    setOpen(false);
  };

  const recent = log.slice(-5).reverse();

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Show notifications"
        className="relative px-2 py-1 text-white hover:bg-gray-700 rounded"
        onClick={() => setOpen(o => !o)}
      >
        🔔
        {log.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger text-xs rounded-full flex items-center justify-center" aria-label={"" + log.length}>
            {log.length}
          </span>
        )}
      </button>
      {open && (
        <div
          ref={ref}
          tabIndex={-1}
          role="dialog"
          aria-label="Notifications"
          onKeyDown={e => e.key === "Escape" && setOpen(false)}
          className="absolute right-0 mt-2 w-64 bg-gray-800 text-white rounded shadow-lg z-10 p-2"
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-sm">Notifications</h2>
            {log.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs underline"
                aria-label="Clear all notifications"
              >
                Clear All
              </button>
            )}
          </div>
          <ul role="list" className="max-h-60 overflow-auto">
            {recent.length === 0 && (
              <li className="text-sm text-gray-300">No notifications</li>
            )}
            {recent.map(n => (
              <li
                key={n.id}
                className="text-sm border-b border-gray-700 last:border-b-0 py-1"
              >
                {n.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

