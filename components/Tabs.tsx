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
  /** Prefix applied to the generated tab ids so multiple tablists can coexist */
  idPrefix?: string;
  /**
   * Optional helper for wiring aria-controls to a tabpanel id. Receives the
   * logical tab id and the generated DOM id for the tab button.
   */
  getPanelId?: (id: T, tabDomId: string) => string;
}

export default function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  className = "",
  idPrefix,
  getPanelId,
}: TabsProps<T>) {
  const autoPrefix = React.useId();
  const resolvedPrefix = idPrefix ?? `tab-${autoPrefix}`;
  return (
    <div role="tablist" className={`flex ${className}`.trim()}>
      {tabs.map((t) => {
        const tabDomId = `${resolvedPrefix}-${t.id}`;
        const panelId = getPanelId ? getPanelId(t.id, tabDomId) : undefined;
        return (
          <button
            key={t.id}
            id={tabDomId}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            aria-controls={panelId}
            tabIndex={active === t.id ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={`px-4 py-2 ${
              active === t.id ? "bg-ub-orange text-white" : "text-ubt-grey"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
