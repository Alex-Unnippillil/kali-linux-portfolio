import React from 'react';
import SummaryBundleCard from './SummaryBundleCard';
import { NotificationBundle } from './types';

interface SummaryBundleListProps {
  bundles: NotificationBundle[];
  expandedId: string | null;
  onToggle: (bundleId: string | null) => void;
  onDismiss: (bundleId: string) => void;
}

const SummaryBundleList: React.FC<SummaryBundleListProps> = ({
  bundles,
  expandedId,
  onToggle,
  onDismiss,
}) => (
  <div className="space-y-2">
    {bundles.map(bundle => (
      <SummaryBundleCard
        key={bundle.id}
        bundle={bundle}
        expanded={bundle.id === expandedId}
        onToggle={() =>
          onToggle(bundle.id === expandedId ? null : bundle.id)
        }
        onDismiss={() => onDismiss(bundle.id)}
      />
    ))}
  </div>
);

export default SummaryBundleList;
