'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';

const PcapViewer = dynamic(() => import('./components/PcapViewer'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

const WiresharkPage: React.FC = () => {
  const [showLegend, setShowLegend] = useState(true);

  return (
    <div className="h-full w-full flex flex-col">
      <button
        onClick={() => setShowLegend((v) => !v)}
        className="ml-4 mt-2 mb-2 w-max px-2 py-1 text-xs bg-gray-700 text-white rounded"
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
