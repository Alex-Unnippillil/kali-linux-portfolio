'use client';

import React, { useEffect, useState } from 'react';
import AutopsyAppComponent from '../../components/apps/autopsy';
import KeywordTester from './components/KeywordTester';
import CaseWalkthrough from './components/CaseWalkthrough';

const AutopsyPage: React.FC = () => {
  // Track which view is active so we can restore UI state when toggling
  const [view, setView] = useState<'autopsy' | 'keywords' | 'walkthrough'>('autopsy');

  // Restore view from the URL hash on first load
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const viewParam = params.get('view');
    if (viewParam === 'keywords' || viewParam === 'autopsy' || viewParam === 'walkthrough') {
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
        <button
          className={`px-2 py-1 rounded ${
            view === 'walkthrough' ? 'bg-ub-grey text-white' : 'bg-ub-orange text-black'
          }`}
          onClick={() => setView('walkthrough')}
        >
          Case Walkthrough
        </button>
      </div>
      {view === 'autopsy' && <AutopsyAppComponent />}
      {view === 'keywords' && <KeywordTester />}
      {view === 'walkthrough' && <CaseWalkthrough />}
    </div>
  );
};

export default AutopsyPage;
