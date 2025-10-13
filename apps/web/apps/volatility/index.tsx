'use client';

import React from 'react';
import VolatilityApp from '../../components/apps/volatility';
import ResponseGuidance from './components/ResponseGuidance';
import TriageFilters from './components/TriageFilters';

const VolatilityPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <VolatilityApp />
        <div className="space-y-4">
          {/* Demonstration of triage filter component */}
          <TriageFilters />
          <ResponseGuidance />
        </div>
      </div>
    </div>
  );
};

export default VolatilityPage;
