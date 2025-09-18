import React from 'react';

export interface SecurityBadgeSummary {
  label: string;
  count: number;
  variant: 'strong' | 'legacy' | 'open';
}

interface SecurityBadgeListProps {
  badges: SecurityBadgeSummary[];
}

const variantClass: Record<SecurityBadgeSummary['variant'], string> = {
  strong: 'bg-emerald-600/30 text-emerald-200 border-emerald-500/60',
  legacy: 'bg-amber-600/30 text-amber-200 border-amber-500/60',
  open: 'bg-rose-600/30 text-rose-200 border-rose-500/60',
};

const SecurityBadgeList: React.FC<SecurityBadgeListProps> = ({ badges }) => (
  <section aria-label="Security posture" className="space-y-2">
    <h2 className="text-lg font-semibold text-white">Security breakdown</h2>
    <ul className="flex flex-wrap gap-2" role="list">
      {badges.map((badge) => (
        <li key={badge.label}>
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${variantClass[badge.variant]}`}
            aria-label={`${badge.count} networks use ${badge.label}`}
          >
            <span aria-hidden="true">{badge.label}</span>
            <span className="rounded bg-black/40 px-1.5 py-0.5 text-[0.7rem] text-white" aria-hidden="true">
              {badge.count}
            </span>
          </span>
        </li>
      ))}
    </ul>
  </section>
);

export default SecurityBadgeList;
