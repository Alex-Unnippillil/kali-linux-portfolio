'use client';

import React, { useEffect, useState } from 'react';
import AutopsyAppComponent from '../../components/apps/autopsy';
import KeywordTester from './components/KeywordTester';

const AutopsyPage: React.FC = () => {
  // Track which view is active so we can restore UI state when toggling
  const [view, setView] = useState<'autopsy' | 'keywords'>('autopsy');

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

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <button
          className={`px-2 py-1 rounded ${
            view === 'autopsy'
              ? 'bg-ub-grey text-white'
              : 'bg-ub-orange text-[var(--color-on-accent)]'
          }`}
          onClick={() => setView('autopsy')}
        >
          Autopsy
        </button>
        <button
          className={`px-2 py-1 rounded ${
            view === 'keywords'
              ? 'bg-ub-grey text-white'
              : 'bg-ub-orange text-[var(--color-on-accent)]'
          }`}
          onClick={() => setView('keywords')}
        >
          Keyword Tester
        </button>
      </div>
      {view === 'autopsy' && <AutopsyAppComponent />}
      {view === 'keywords' && <KeywordTester />}
    </div>
  );
};

export default AutopsyPage;
