'use client';

import React, { useState } from 'react';
import PcapViewer from './components/PcapViewer';

const WiresharkPage: React.FC = () => {
  const [showLegend, setShowLegend] = useState(true);

  return (
    <div className="h-full w-full flex flex-col">
      <button
        onClick={() => setShowLegend((v) => !v)}
        className="ml-4 mt-2 mb-2 w-max rounded border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        aria-pressed={showLegend}
        aria-label="Toggle protocol color legend"
      >
        {showLegend ? 'Hide' : 'Show'} Legend
      </button>
      <PcapViewer showLegend={showLegend} />
    </div>
  );
};

export default WiresharkPage;
