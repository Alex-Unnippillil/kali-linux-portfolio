'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import AutopsyAppComponent from '../../components/apps/autopsy';
import KeywordTester from './components/KeywordTester';

const AutopsyPage: React.FC = () => {
  // Track which view is active so we can restore UI state when toggling
  const [view, setView] = useState<'autopsy' | 'keywords'>('autopsy');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabs = useMemo(
    () => [
      {
        id: 'autopsy' as const,
        label: 'Autopsy',
        description: 'Explore simulated forensic timelines and artifacts.',
        callout:
          'Autopsy mode lets you review forensic evidence, timelines, and case notes in a guided walkthrough.',
      },
      {
        id: 'keywords' as const,
        label: 'Keyword Tester',
        description: 'Check how indicators of compromise trigger the parser.',
        callout:
          'Keyword Tester mode helps you experiment with keyword parsing to understand how search rules flag findings.',
      },
    ],
    [],
  );

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

  const currentTab = useMemo(
    () => tabs.find((tab) => tab.id === view) ?? tabs[0],
    [tabs, view],
  );

  const focusTabAtIndex = (index: number) => {
    const nextTab = tabs[index];
    if (!nextTab) return;
    setView(nextTab.id);
    tabRefs.current[index]?.focus();
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    switch (event.key) {
      case 'ArrowRight': {
        event.preventDefault();
        focusTabAtIndex((index + 1) % tabs.length);
        break;
      }
      case 'ArrowLeft': {
        event.preventDefault();
        focusTabAtIndex((index - 1 + tabs.length) % tabs.length);
        break;
      }
      case 'Home': {
        event.preventDefault();
        focusTabAtIndex(0);
        break;
      }
      case 'End': {
        event.preventDefault();
        focusTabAtIndex(tabs.length - 1);
        break;
      }
      default:
        break;
    }
  };

  return (
    <div className="space-y-4">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Autopsy simulator modes"
      >
        {tabs.map((tab, index) => {
          const isSelected = view === tab.id;
          return (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isSelected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setView(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={`flex min-w-[10rem] flex-col rounded border px-3 py-2 text-left shadow-sm transition focus:outline-none focus:ring-2 focus:ring-ub-orange ${
                isSelected
                  ? 'border-ub-orange bg-ub-grey text-white'
                  : 'border-ub-grey-70 bg-ub-orange/20 text-white hover:bg-ub-orange/40'
              }`}
            >
              <span className="font-semibold">{tab.label}</span>
              <span className="text-xs text-ub-grey-10">{tab.description}</span>
            </button>
          );
        })}
      </div>
      <div
        id="mode-description"
        role="note"
        aria-live="polite"
        className="rounded-md border border-ub-grey-70 bg-ub-grey-90 p-3 text-sm text-white"
      >
        <p className="font-semibold">{currentTab.label} mode</p>
        <p>{currentTab.callout}</p>
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          aria-describedby="mode-description"
          hidden={view !== tab.id}
        >
          {view === 'autopsy' && tab.id === 'autopsy' && <AutopsyAppComponent />}
          {view === 'keywords' && tab.id === 'keywords' && <KeywordTester />}
        </div>
      ))}
    </div>
  );
};

export default AutopsyPage;
