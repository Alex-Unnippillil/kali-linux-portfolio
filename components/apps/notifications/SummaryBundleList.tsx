import React from 'react';
import SummaryBundleCard from './SummaryBundleCard';
import { SummaryBundle } from './types';

interface SummaryBundleListProps {
  bundles: SummaryBundle[];
  onDismiss: (id: string) => void;
}

const SummaryBundleList: React.FC<SummaryBundleListProps> = ({ bundles, onDismiss }) => {
  if (!bundles.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      {bundles.map((bundle) => (
        <SummaryBundleCard key={bundle.id} bundle={bundle} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

export default SummaryBundleList;
