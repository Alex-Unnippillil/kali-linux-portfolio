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
    <div className="space-y-6">
      <div
        className="flex flex-wrap gap-3"
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
              className={`flex min-w-[12rem] flex-1 flex-col gap-1 rounded-md border px-4 py-3 text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] ${
                isSelected
                  ? 'border-[var(--kali-border)] bg-kali-surface/90 text-white shadow-[0_12px_30px_rgba(15,148,210,0.25)]'
                  : 'border-transparent bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              <span className="text-sm font-semibold uppercase tracking-wide">
                {tab.label}
              </span>
              <span className="text-sm leading-snug text-white/70">
                {tab.description}
              </span>
            </button>
          );
        })}
      </div>
      <div
        id="mode-description"
        role="note"
        aria-live="polite"
        className="space-y-1 rounded-lg border border-[var(--kali-border)] bg-kali-surface/80 p-4 text-sm text-white/80 shadow-inner backdrop-blur"
      >
        <p className="text-base font-semibold text-white">
          {currentTab.label} mode
        </p>
        <p className="leading-relaxed">{currentTab.callout}</p>
      </div>
      <div className="space-y-4">
        {tabs.map((tab) => {
          const isActive = view === tab.id;
          return (
            <div
              key={tab.id}
              role="tabpanel"
              id={`panel-${tab.id}`}
              aria-labelledby={`tab-${tab.id}`}
              aria-describedby="mode-description"
              hidden={!isActive}
              className={`min-h-[22rem] rounded-lg border border-[var(--kali-border)] bg-kali-surface/90 p-4 shadow-sm transition-all duration-200 ${
                isActive ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {view === 'autopsy' && tab.id === 'autopsy' && <AutopsyAppComponent />}
              {view === 'keywords' && tab.id === 'keywords' && <KeywordTester />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AutopsyPage;
