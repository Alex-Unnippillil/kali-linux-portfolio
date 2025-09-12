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
  return (
    <div role="tablist" className={`flex ${className}`.trim()} data-drag="true">
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
          data-drag="false"
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
