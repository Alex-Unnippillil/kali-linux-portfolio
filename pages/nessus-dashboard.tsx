import React, { useEffect, useState } from 'react';
import { loadFalsePositives, loadJobDefinitions } from '../components/apps/nessus/storage';
import WindowMainScreen from '../components/base/WindowMainScreen.server';

const NessusDashboard: React.FC = () => {
  const [totals, setTotals] = useState({ jobs: 0, falsePositives: 0 });

  useEffect(() => {
    const jobs = loadJobDefinitions();
    const fps = loadFalsePositives();
    setTotals({ jobs: jobs.length, falsePositives: fps.length });
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
