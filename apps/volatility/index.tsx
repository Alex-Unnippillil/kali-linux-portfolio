'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import TriageFilters from './components/TriageFilters';

const VolatilityApp = dynamic(() => import('../../components/apps/volatility'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

const VolatilityPage: React.FC = () => {
  return (
    <div className="space-y-4">
      <VolatilityApp />
      {/* Demonstration of triage filter component */}
      <TriageFilters />
    </div>
  );
};

export default VolatilityPage;
