'use client';

import React, { useEffect, useState } from 'react';
import AutopsyAppComponent from '../../components/apps/autopsy';
import events from './events.json';
import KeywordTester from './components/KeywordTester';
import type { Artifact } from './types';

interface AutopsyProps {
  initialArtifacts?: Artifact[];
}

const AutopsyApp: React.FC<AutopsyProps> = AutopsyAppComponent;

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
        <AutopsyApp initialArtifacts={events.artifacts as Artifact[]} />
      )}
      {view === 'keywords' && <KeywordTester />}
    </div>
  );
};

export default AutopsyPage;
