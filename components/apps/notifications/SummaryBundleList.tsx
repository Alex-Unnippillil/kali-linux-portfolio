import React from 'react';
import SummaryBundleCard from './SummaryBundleCard';
import { SummaryBundle } from './types';

interface SummaryBundleListProps {
  bundles: SummaryBundle[];
  onClear: (bundleId: string) => void;
}

const SummaryBundleList: React.FC<SummaryBundleListProps> = ({ bundles, onClear }) => {
  if (!bundles.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-40 flex max-h-[80vh] w-full max-w-sm flex-col gap-3 overflow-y-auto pr-2">
      {bundles.map(bundle => (
        <SummaryBundleCard key={bundle.id} bundle={bundle} onClear={onClear} />
      ))}
    </div>
  );
};

export default SummaryBundleList;
