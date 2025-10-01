import React, { useEffect, useState } from 'react';
import { WindowMainScreen } from '../components/base/window';

const NessusDashboard: React.FC = () => {
  const [totals, setTotals] = useState({ jobs: 0, falsePositives: 0 });

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const mod = await import('../components/apps/nessus/index');
        if (!isMounted) return;
        const jobs = mod.loadJobDefinitions();
        const fps = mod.loadFalsePositives();
        setTotals({ jobs: jobs.length, falsePositives: fps.length });
      } catch (err) {
        console.error('Failed to load Nessus fixtures', err);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const max = Math.max(totals.jobs, totals.falsePositives, 1);

  return (
    <WindowMainScreen
      screen={() => (
        <div className="p-4 text-white">
          <h1 className="mb-4 text-2xl">Nessus Dashboard</h1>
          <div className="flex h-48 items-end space-x-4">
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
              <span className="pb-2 text-sm">False {totals.falsePositives}</span>
            </div>
          </div>
        </div>
      )}
    />
  );
};

export default NessusDashboard;
