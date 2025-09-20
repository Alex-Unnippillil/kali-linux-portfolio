'use client';

import React, { useEffect, useMemo, useState } from 'react';
import AutopsyAppComponent from '../../components/apps/autopsy';
import KeywordTester from './components/KeywordTester';
import TimelineCanvas from './components/TimelineCanvas';
import caseData from './data/case.json';
import type { CaseData } from './types';

const timelineData = caseData as CaseData;
const ALL_CATEGORY_IDS = timelineData.timeline.categories.map(
  (category) => category.id
);

const AutopsyPage: React.FC = () => {
  // Track which view is active so we can restore UI state when toggling
  const [view, setView] = useState<'autopsy' | 'keywords'>('autopsy');
  const [activeCategories, setActiveCategories] = useState<string[]>(() => [
    ...ALL_CATEGORY_IDS,
  ]);

  // Restore view from the URL hash on first load
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const viewParam = params.get('view');
    if (viewParam === 'keywords' || viewParam === 'autopsy') {
      setView(viewParam);
    }
  }, []);

  // Persist current view to the URL hash
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    params.set('view', view);
    const newHash = params.toString();
    window.location.hash = newHash ? `#${newHash}` : '';
  }, [view]);

  const selectedCount = activeCategories.length;
  const allSelected = selectedCount === ALL_CATEGORY_IDS.length;
  const categorySummary = useMemo(() => {
    if (allSelected) return 'All categories visible';
    if (selectedCount === 0) return 'No categories selected';
    return `${selectedCount} of ${ALL_CATEGORY_IDS.length} categories visible`;
  }, [allSelected, selectedCount]);

  const toggleCategory = (categoryId: string) => {
    setActiveCategories((current) => {
      if (current.includes(categoryId)) {
        return current.filter((id) => id !== categoryId);
      }
      return [...current, categoryId];
    });
  };

  const resetCategories = () => {
    setActiveCategories([...ALL_CATEGORY_IDS]);
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <button
          className={`px-2 py-1 rounded ${
            view === 'autopsy' ? 'bg-ub-grey text-white' : 'bg-ub-orange text-black'
          }`}
          onClick={() => setView('autopsy')}
        >
          Autopsy
        </button>
        <button
          className={`px-2 py-1 rounded ${
            view === 'keywords' ? 'bg-ub-grey text-white' : 'bg-ub-orange text-black'
          }`}
          onClick={() => setView('keywords')}
        >
          Keyword Tester
        </button>
      </div>
      {view === 'autopsy' && (
        <>
          <section className="space-y-4 rounded bg-ub-cool-grey/40 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-ubt-muted">
                  Case timeline
                </h2>
                <p className="text-xs text-ubt-muted">{categorySummary}</p>
              </div>
              <div className="flex items-center gap-3 text-[10px] uppercase tracking-wide text-ub-orange">
                <span>Shortcuts: + / - / 0</span>
                {!allSelected && (
                  <button
                    type="button"
                    onClick={resetCategories}
                    className="hover:underline"
                  >
                    Reset filters
                  </button>
                )}
              </div>
            </div>
            <div
              className="flex flex-wrap gap-3"
              role="group"
              aria-label="Filter timeline categories"
            >
              {timelineData.timeline.categories.map((category) => {
                const checked = activeCategories.includes(category.id);
                return (
                  <label
                    key={category.id}
                    className={`flex items-center space-x-2 rounded border px-2 py-1 text-xs transition ${
                      checked
                        ? 'border-ub-orange bg-ub-grey text-white'
                        : 'border-ub-cool-grey text-ubt-muted'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="accent-ub-orange"
                      checked={checked}
                      onChange={() => toggleCategory(category.id)}
                    />
                    <span>{category.label}</span>
                  </label>
                );
              })}
            </div>
            <TimelineCanvas
              events={timelineData.timeline.events}
              categories={timelineData.timeline.categories}
              activeCategoryIds={activeCategories}
            />
          </section>
          <AutopsyAppComponent />
        </>
      )}
      {view === 'keywords' && <KeywordTester />}
    </div>
  );
};

export default AutopsyPage;
