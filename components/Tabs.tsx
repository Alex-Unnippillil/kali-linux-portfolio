"use client";
import React from "react";

type Tab<T extends string> = {
  id: T;
  label: string;
};

interface TabsProps<T extends string> {
  tabs: readonly Tab<T>[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
}

export default function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  className = "",
}: TabsProps<T>) {
  const [focusedTab, setFocusedTab] = React.useState<T>(active);
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  React.useEffect(() => {
    setFocusedTab(active);
  }, [active]);

  const focusTabAtIndex = React.useCallback(
    (index: number) => {
      const nextTab = tabs[index];

      if (!nextTab) {
        return;
      }

      setFocusedTab(nextTab.id);
      tabRefs.current[index]?.focus();
    },
    [tabs]
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      const { key } = event;

      if (key === "ArrowRight" || key === "ArrowDown") {
        event.preventDefault();
        const nextIndex = (index + 1) % tabs.length;
        focusTabAtIndex(nextIndex);
        return;
      }

      if (key === "ArrowLeft" || key === "ArrowUp") {
        event.preventDefault();
        const nextIndex = (index - 1 + tabs.length) % tabs.length;
        focusTabAtIndex(nextIndex);
        return;
      }

      if (key === "Enter" || key === " ") {
        event.preventDefault();
        onChange(tabs[index].id);
      }
    },
    [focusTabAtIndex, onChange, tabs]
  );

  const currentFocusable = focusedTab ?? active;

  return (
    <div role="tablist" className={`flex ${className}`.trim()}>
      {tabs.map((t, index) => (
        <button
          key={t.id}
          ref={(el) => {
            tabRefs.current[index] = el;
          }}
          role="tab"
          aria-selected={active === t.id}
          tabIndex={currentFocusable === t.id ? 0 : -1}
          onClick={() => {
            setFocusedTab(t.id);
            onChange(t.id);
          }}
          onFocus={() => setFocusedTab(t.id)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          className={`px-4 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ub-orange ${
            active === t.id ? "bg-ub-orange text-white" : "text-ubt-grey"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
