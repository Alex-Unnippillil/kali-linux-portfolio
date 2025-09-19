'use client';

import React from 'react';
import VolatilityApp from '@/components/apps/volatility';
import TriageFilters from './components/TriageFilters';

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
