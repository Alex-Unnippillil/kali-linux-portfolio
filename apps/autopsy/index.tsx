'use client';

import React, { useEffect, useState } from 'react';
import AutopsyAppComponent from '../../components/apps/autopsy';
import events from './events.json';
import KeywordTester from './components/KeywordTester';
import type { Artifact } from './types';

const AutopsyApp = AutopsyAppComponent as React.ComponentType<{
  initialArtifacts: Artifact[];
  expandedNodes: string[];
  onExpandedNodesChange: (nodes: string[]) => void;
}>;

const AutopsyPage: React.FC = () => {
  // Track which view is active so we can restore UI state when toggling
  const [view, setView] = useState<'autopsy' | 'keywords'>('autopsy');
  // Store a list of expanded file tree nodes and sync with the URL hash
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);

  // Restore view and expanded nodes from the URL hash on first load
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const viewParam = params.get('view');
    const expandedParam = params.get('expanded');
    if (viewParam === 'keywords' || viewParam === 'autopsy') {
      setView(viewParam);
    }
    if (expandedParam) {
      setExpandedNodes(expandedParam.split(',').filter(Boolean));
    }
  }, []);

  // Persist current view/expanded nodes to the URL hash
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    params.set('view', view);
    if (expandedNodes.length > 0) {
      params.set('expanded', expandedNodes.join(','));
    } else {
      params.delete('expanded');
    }
    const newHash = params.toString();
    window.location.hash = newHash ? `#${newHash}` : '';
  }, [view, expandedNodes]);

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
        <AutopsyApp
          initialArtifacts={events.artifacts as Artifact[]}
          expandedNodes={expandedNodes}
          onExpandedNodesChange={setExpandedNodes}
        />
      )}
      {view === 'keywords' && <KeywordTester />}
    </div>
  );
};

export default AutopsyPage;
