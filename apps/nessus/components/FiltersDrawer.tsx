'use client';

import React from 'react';
import { Severity, severities } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  severityFilters: Record<Severity, boolean>;
  toggleSeverity: (sev: Severity) => void;
  tags: string[];
  tagFilters: string[];
  toggleTag: (tag: string) => void;
}

export default function FiltersDrawer({
  open,
  onClose,
  severityFilters,
  toggleSeverity,
  tags,
  tagFilters,
  toggleTag,
}: Props) {
  return (
    <div
      className={`fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm transition-opacity ${open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
      onClick={onClose}
      role="presentation"
    >
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-xs flex-col overflow-y-auto border-l border-slate-800/70 bg-slate-950/95 p-6 text-slate-200 shadow-2xl shadow-black/40 transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`}
        onClick={(e) => e.stopPropagation()}
        aria-label="Nessus filters"
      >
        <div className="flex items-start justify-between">
          <h3 className="text-base font-semibold uppercase tracking-wide text-slate-300">
            Filters
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/70 text-slate-300 transition hover:border-slate-500 hover:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            aria-label="Close filters"
          >
            ×
          </button>
        </div>

        <div className="mt-6 space-y-6">
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Severity
            </h4>
            <ul className="mt-3 space-y-2 text-sm">
              {severities.map((sev) => {
                const inputId = `nessus-filter-${sev.toLowerCase()}`;
                return (
                  <li key={sev} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800/80 bg-slate-900/70 px-3 py-2">
                    <label htmlFor={inputId} className="font-medium text-slate-200">
                      {sev}
                    </label>
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={severityFilters[sev]}
                      onChange={() => toggleSeverity(sev)}
                      className="h-4 w-4 cursor-pointer rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500"
                      aria-label={`Toggle ${sev} severity`}
                    />
                  </li>
                );
              })}
            </ul>
          </section>

          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Tags
            </h4>
            {tags.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500">No tags detected in the feed.</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const active = tagFilters.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                        active
                          ? 'border-sky-400/80 bg-sky-500/20 text-sky-200 shadow-[0_0_12px_rgba(56,189,248,0.35)]'
                          : 'border-slate-700/70 bg-slate-900/70 text-slate-300 hover:border-slate-500 hover:text-slate-100'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
