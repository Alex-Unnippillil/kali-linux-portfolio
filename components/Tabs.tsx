"use client";
import React, { useRef } from "react";
import useRovingTabIndex from "../hooks/useRovingTabIndex";

type Tab<T extends string> = {
  id: T;
  label: string;
};

interface TabsProps<T extends string> {
  tabs: readonly Tab<T>[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
  orientation?: "horizontal" | "vertical";
}

export default function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  className = "",
  orientation = "horizontal",
}: TabsProps<T>) {
  const ref = useRef<HTMLDivElement>(null);
  useRovingTabIndex(ref, true, orientation);

  return (
    <div
      ref={ref}
      role="tablist"
      aria-orientation={orientation}
      className={`flex ${className}`.trim()}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          tabIndex={active === t.id ? 0 : -1}
          onClick={() => onChange(t.id)}
          className={`px-4 py-2 focus:outline-none ${
            active === t.id ? "bg-ub-orange text-white" : "text-ubt-grey"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
