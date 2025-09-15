"use client";

import { useEffect, useRef, useState } from "react";
import copyToClipboard from "../utils/clipboard";

interface StepTab {
  id: string;
  label: string;
  code: string;
}

interface StepsTabsProps {
  tabs: readonly StepTab[];
  storageKey?: string;
}

export default function StepsTabs({
  tabs,
  storageKey = "steps-tabs:last",
}: StepsTabsProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [active, setActive] = useState<string>(tabs[0]?.id || "");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && tabs.some((t) => t.id === saved)) {
        setActive(saved);
      }
    } catch {
      // ignore storage errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, active);
    } catch {
      // ignore storage errors
    }
  }, [active, storageKey]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const index = tabs.findIndex((t) => t.id === active);
    let next = index;
    if (e.key === "ArrowRight") {
      next = (index + 1) % tabs.length;
    } else if (e.key === "ArrowLeft") {
      next = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === "Home") {
      next = 0;
    } else if (e.key === "End") {
      next = tabs.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    const id = tabs[next].id;
    setActive(id);
    tabRefs.current[next]?.focus();
  };

  const copy = (text: string) => {
    copyToClipboard(text);
  };

  if (tabs.length === 0) return null;

  return (
    <div>
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="flex gap-2 mb-2"
        onKeyDown={onKeyDown}
      >
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => (tabRefs.current[i] = el)}
            id={`steps-tab-${t.id}`}
            role="tab"
            aria-selected={active === t.id}
            tabIndex={active === t.id ? 0 : -1}
            onClick={() => setActive(t.id)}
            className={`px-4 py-2 focus:outline-none ${
              active === t.id
                ? "bg-ub-orange text-white"
                : "bg-gray-200 text-ubt-grey"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          aria-labelledby={`steps-tab-${t.id}`}
          hidden={active !== t.id}
        >
          <div className="relative">
            <button
              className="absolute right-0 top-0 m-2 px-2 py-1 text-xs bg-ubt-grey text-white"
              onClick={() => copy(t.code)}
              aria-label="copy"
            >
              Copy
            </button>
            <pre className="overflow-x-auto mt-8 bg-black text-green-200 p-4 text-sm">
              <code>{t.code}</code>
            </pre>
          </div>
        </div>
      ))}
    </div>
  );
}

