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
      className={`global-drawer-backdrop fixed inset-0 bg-black/50 transition-opacity ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      onClick={onClose}
    >
      <div
        className={`global-drawer-panel absolute right-0 top-0 h-full w-64 bg-gray-900 p-4 overflow-y-auto transform transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg mb-4">Filters</h3>
        <div className="mb-6">
          <h4 className="font-semibold mb-2">Severity</h4>
            {severities.map((sev) => {
              const inputId = `nessus-filter-${sev.toLowerCase()}`;
              return (
                <div key={sev} className="flex items-center gap-2 mb-1">
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={severityFilters[sev]}
                    onChange={() => toggleSeverity(sev)}
                    aria-label={`Toggle ${sev} severity`}
                  />
                  <label htmlFor={inputId}>{sev}</label>
                </div>
              );
            })}
        </div>
        <div>
          <h4 className="font-semibold mb-2">Tags</h4>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`px-2 py-1 rounded-full border text-sm ${tagFilters.includes(tag) ? 'bg-blue-600 border-blue-600' : 'bg-gray-800 border-gray-700'}`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
