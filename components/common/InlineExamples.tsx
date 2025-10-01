'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

export type InlineExampleValues = Record<string, unknown>;

export interface InlineExample {
  id: string;
  label: string;
  values: InlineExampleValues;
  description?: React.ReactNode;
  metadata?: React.ReactNode;
}

export interface InlineExampleSet {
  id: string;
  title: string;
  description?: React.ReactNode;
  examples: InlineExample[];
}

export interface InlineExamplesProps {
  sets: InlineExampleSet[];
  onApply: (example: InlineExample) => void;
  storageKeyPrefix?: string;
  defaultCollapsed?: boolean;
}

const isBrowser = typeof window !== 'undefined';

const InlineExamples: React.FC<InlineExamplesProps> = ({
  sets,
  onApply,
  storageKeyPrefix,
  defaultCollapsed = false,
}) => {
  const initialCollapsedState = useMemo(() => {
    return sets.reduce<Record<string, boolean>>((accumulator, set) => {
      const storageKey = storageKeyPrefix ? `${storageKeyPrefix}:${set.id}` : null;
      if (storageKey && isBrowser) {
        try {
          const persisted = window.localStorage.getItem(storageKey);
          if (persisted !== null) {
            accumulator[set.id] = persisted === '1';
            return accumulator;
          }
        } catch {
          /* ignore storage issues */
        }
      }
      accumulator[set.id] = defaultCollapsed;
      return accumulator;
    }, {});
  }, [sets, storageKeyPrefix, defaultCollapsed]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(initialCollapsedState);

  useEffect(() => {
    // When sets change, ensure we have an entry for each set id.
    setCollapsed((previous) => {
      const next = { ...previous };
      sets.forEach((set) => {
        if (!(set.id in next)) {
          next[set.id] = defaultCollapsed;
        }
      });
      return next;
    });
  }, [sets, defaultCollapsed]);

  const persistState = useCallback(
    (setId: string, value: boolean) => {
      if (!storageKeyPrefix || !isBrowser) return;
      try {
        window.localStorage.setItem(`${storageKeyPrefix}:${setId}`, value ? '1' : '0');
      } catch {
        /* ignore storage errors */
      }
    },
    [storageKeyPrefix],
  );

  const toggleSet = useCallback(
    (setId: string) => {
      setCollapsed((previous) => {
        const value = !(previous[setId] ?? defaultCollapsed);
        const next = { ...previous, [setId]: value };
        persistState(setId, value);
        return next;
      });
    },
    [defaultCollapsed, persistState],
  );

  if (!sets.length) {
    return null;
  }

  return (
    <div className="space-y-4 rounded-lg border border-white/10 bg-white/5 p-4 text-xs text-ubt-grey shadow-inner shadow-black/20 backdrop-blur">
      <h3 className="text-sm font-semibold text-white">Need inspiration?</h3>
      {sets.map((set) => (
        <section key={set.id} className="rounded-md border border-white/10 bg-black/30">
          <header className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
            <div>
              <h4 className="text-sm font-semibold text-white">{set.title}</h4>
              {set.description && (
                <p className="mt-1 text-[11px] text-ubt-grey/80">{set.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => toggleSet(set.id)}
              className="rounded border border-white/20 bg-white/5 px-3 py-1 text-[11px] font-medium text-ubt-grey transition hover:border-white/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-ubt-green/50"
              aria-expanded={!collapsed[set.id]}
              aria-controls={`inline-example-${set.id}`}
            >
              {collapsed[set.id] ? 'Show' : 'Hide'}
            </button>
          </header>
          {!collapsed[set.id] && (
            <div id={`inline-example-${set.id}`} className="divide-y divide-white/5">
              {set.examples.map((example) => (
                <article key={example.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <h5 className="text-sm font-semibold text-white">{example.label}</h5>
                    {example.description && (
                      <p className="text-[11px] leading-relaxed text-ubt-grey/90">
                        {example.description}
                      </p>
                    )}
                    {example.metadata && (
                      <div className="text-[11px] text-ubt-grey/70">{example.metadata}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onApply(example)}
                      className="rounded bg-ubt-green px-3 py-1 text-[11px] font-semibold text-black transition hover:bg-ubt-green/90 focus:outline-none focus:ring-2 focus:ring-ubt-green/60"
                    >
                      Apply
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
};

export default InlineExamples;
