import React, { useEffect, useState } from 'react';
import { loadFalsePositives, loadJobDefinitions } from '../components/apps/nessus/index';
const NessusDashboard = () => {
    const [totals, setTotals] = useState({ jobs: 0, falsePositives: 0 });
    useEffect(() => {
        const jobs = loadJobDefinitions();
        const fps = loadFalsePositives();
        setTotals({ jobs: jobs.length, falsePositives: fps.length });
    }, []);
    const max = Math.max(totals.jobs, totals.falsePositives, 1);
    return (<div className="p-4 bg-gray-900 min-h-screen text-white">
      <h1 className="text-2xl mb-4">Nessus Dashboard</h1>
      <div className="flex items-end space-x-4 h-48">
        <div className="bg-blue-600 w-24 text-center flex flex-col justify-end" style={{ height: `${(totals.jobs / max) * 100}%` }}>
          <span className="pb-2 text-sm">Jobs {totals.jobs}</span>
        </div>
        <div className="bg-green-600 w-24 text-center flex flex-col justify-end" style={{ height: `${(totals.falsePositives / max) * 100}%` }}>
          <span className="pb-2 text-sm">False {totals.falsePositives}</span>
        </div>
      </div>
    </div>);
};
export default NessusDashboard;
