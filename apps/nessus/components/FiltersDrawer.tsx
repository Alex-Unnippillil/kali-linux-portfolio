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
  categories: string[];
  categoryFilters: Record<string, boolean>;
  toggleCategory: (category: string) => void;
}

export default function FiltersDrawer({
  open,
  onClose,
  severityFilters,
  toggleSeverity,
  tags,
  tagFilters,
  toggleTag,
  categories,
  categoryFilters,
  toggleCategory,
}: Props) {
  return (
    <div
      className={`fixed inset-0 bg-black/50 transition-opacity ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      onClick={onClose}
    >
      <div
        className={`absolute right-0 top-0 h-full w-64 bg-gray-900 p-4 overflow-y-auto transform transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg mb-4">Filters</h3>
        <div className="mb-6">
          <h4 className="font-semibold mb-2">Severity</h4>
          {severities.map((sev) => (
            <label key={sev} className="flex items-center gap-2 mb-1">
              <input
                type="checkbox"
                checked={severityFilters[sev]}
                onChange={() => toggleSeverity(sev)}
              />
              {sev}
            </label>
          ))}
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
        {categories.length > 0 && (
          <div className="mt-6">
            <h4 className="font-semibold mb-2">Categories</h4>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const active = categoryFilters[cat] ?? true;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    aria-pressed={active}
                    className={`px-2 py-1 rounded-full border text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      active
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-gray-800 border-gray-700'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
