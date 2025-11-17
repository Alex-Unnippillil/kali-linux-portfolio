import React from 'react';
import { WindowMainScreen } from '../../base/window';

export interface NessusDashboardShellProps {
  totals: {
    jobs: number;
    falsePositives: number;
  };
  generatedAt: string;
}

export const NessusDashboardShell: React.FC<NessusDashboardShellProps> = ({
  totals,
  generatedAt,
}) => {
  const max = Math.max(totals.jobs, totals.falsePositives, 1);
  return (
    <WindowMainScreen
      screen={() => (
        <div className="p-4 text-white" data-hydrated="false">
          <h1 className="mb-1 text-2xl">Nessus Dashboard</h1>
          <p className="mb-4 text-xs text-slate-300">
            Static snapshot generated {new Date(generatedAt).toLocaleString()}
          </p>
          <div className="flex h-48 items-end space-x-4" aria-hidden="true">
            <div
              className="flex w-24 flex-col justify-end bg-blue-900 text-center"
              style={{ height: `${(totals.jobs / max) * 100}%` }}
            >
              <span className="pb-2 text-sm">Jobs {totals.jobs}</span>
            </div>
            <div
              className="flex w-24 flex-col justify-end bg-green-900 text-center"
              style={{ height: `${(totals.falsePositives / max) * 100}%` }}
            >
              <span className="pb-2 text-sm">False {totals.falsePositives}</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Live data hydrates in the background to restore interactive trends.
          </p>
        </div>
      )}
    />
  );
};

export default NessusDashboardShell;
