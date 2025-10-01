'use client';

import React, { useEffect, useState } from 'react';
import { WindowMainScreen } from '../../base/window';
import {
  loadFalsePositives,
  loadJobDefinitions,
} from '../../apps/nessus/index';

export interface NessusDashboardHydratedProps {
  initialTotals: {
    jobs: number;
    falsePositives: number;
  };
  generatedAt?: string;
}

export const NessusDashboardHydrated: React.FC<NessusDashboardHydratedProps> = ({
  initialTotals,
  generatedAt,
}) => {
  const [totals, setTotals] = useState(initialTotals);

  useEffect(() => {
    const jobs = loadJobDefinitions();
    const fps = loadFalsePositives();
    if (jobs.length !== totals.jobs || fps.length !== totals.falsePositives) {
      setTotals({ jobs: jobs.length, falsePositives: fps.length });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const max = Math.max(totals.jobs, totals.falsePositives, 1);

  return (
    <WindowMainScreen
      screen={() => (
        <div className="p-4 text-white" data-hydrated="true">
          <h1 className="mb-1 text-2xl">Nessus Dashboard</h1>
          {generatedAt ? (
            <p className="mb-4 text-xs text-slate-300">
              Snapshot generated {new Date(generatedAt).toLocaleString()}
            </p>
          ) : null}
          <div className="flex h-48 items-end space-x-4" aria-live="polite">
            <div
              className="flex w-24 flex-col justify-end bg-blue-600 text-center"
              style={{ height: `${(totals.jobs / max) * 100}%` }}
            >
              <span className="pb-2 text-sm">Jobs {totals.jobs}</span>
            </div>
            <div
              className="flex w-24 flex-col justify-end bg-green-600 text-center"
              style={{ height: `${(totals.falsePositives / max) * 100}%` }}
            >
              <span className="pb-2 text-sm">
                False {totals.falsePositives}
              </span>
            </div>
          </div>
        </div>
      )}
    />
  );
};

export default NessusDashboardHydrated;
