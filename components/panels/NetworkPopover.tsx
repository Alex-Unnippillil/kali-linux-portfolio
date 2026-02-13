"use client";

import React, { useEffect, useRef, useState } from "react";

const NetworkPopover: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [networks, setNetworks] = useState<string[]>([]);
  const [highlight, setHighlight] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/data/network.json");
        const data = await res.json();
        if (active) setNetworks(data as string[]);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const items = listRef.current?.querySelectorAll<HTMLLIElement>("li");
    items?.[highlight]?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, networks.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    }
  };

  const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="px-2 py-1 bg-gray-700 text-white rounded"
      >
        Networks
      </button>
      {open && (
        <div className="absolute left-0 mt-1 z-50 bg-gray-800 text-white rounded shadow-lg p-2">
          <ul
            ref={listRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            className="focus:outline-none max-h-60 overflow-y-auto"
            role="listbox"
            aria-activedescendant={`network-${highlight}`}
          >
            {networks.map((name, idx) => (
              <li
                key={name}
                id={`network-${idx}`}
                className={`px-2 py-1 rounded cursor-pointer ${
                  idx === highlight ? "bg-gray-700" : ""
                }`}
                tabIndex={-1}
                onMouseEnter={() => setHighlight(idx)}
              >
                {name}
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={isStaticExport}
            className={`mt-2 px-2 py-1 rounded bg-blue-600 ${
              isStaticExport ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            Connect
          </button>
        </div>
      )}
    </div>
  );
};

export default NetworkPopover;

