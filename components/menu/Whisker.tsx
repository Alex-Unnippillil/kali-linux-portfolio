"use client";

import { useEffect, useRef, useState } from "react";

interface Category {
  id: string;
  name: string;
}

interface AppEntry {
  id: string;
  name: string;
  category: string;
}

const categories: Category[] = [
  { id: "all", name: "All" },
  { id: "utilities", name: "Utilities" },
  { id: "network", name: "Network" },
];

const apps: AppEntry[] = [
  { id: "terminal", name: "Terminal", category: "utilities" },
  { id: "notes", name: "Notes", category: "utilities" },
  { id: "browser", name: "Browser", category: "network" },
];

export default function Whisker() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    const node = menuRef.current;
    const focusable = node?.querySelectorAll<HTMLElement>(
      'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable?.[0];
    const last = focusable?.[focusable.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== "Tab" || !focusable) return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    first?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const filteredApps = apps.filter(
    (a) =>
      (category === "all" || a.category === category) &&
      a.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="p-2"
      >
        Open Menu
      </button>
      {open && (
        <div
          ref={menuRef}
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 flex bg-black/50"
        >
          <div className="w-1/3 bg-white p-4 overflow-y-auto">
            <ul>
              {categories.map((c) => (
                <li key={c.id}>
                  <button
                    className={`block w-full text-left p-2 ${
                      category === c.id ? "bg-gray-200" : ""
                    }`}
                    onClick={() => setCategory(c.id)}
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1 bg-gray-100 p-4 overflow-y-auto relative">
            <div className="mb-4">
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search apps"
                aria-label="Search apps"
                className="w-full border p-2"
              />
            </div>
            <ul>
              {filteredApps.map((a) => (
                <li key={a.id} className="p-2">
                  {a.name}
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="absolute top-2 right-2 p-2"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}

