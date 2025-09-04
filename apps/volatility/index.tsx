'use client';

import React from 'react';
import VolatilityApp from '../../components/apps/volatility';
import TriageFilters from './components/TriageFilters';
import ColumnPreferences from './components/ColumnPreferences';

const VolatilityPage: React.FC = () => {
  return (
    <div className="space-y-4">
      <VolatilityApp />
      {/* Demonstration of triage filter component */}
      <TriageFilters />
      {/* Demonstration of column toggling and pinning */}
      <ColumnPreferences />
    </div>
  );
};

export default VolatilityPage;
