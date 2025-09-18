import React from 'react';
import FeedStatusCard from './feed-status-card';
import TaskRunChart from './task-run-chart';
import StatusBadge from '../../common/StatusBadge';

const TaskOverview = () => {
  const tasks = [
    { name: 'Internal Network Scan', status: 'Completed' },
    { name: 'External Perimeter', status: 'Running' },
    { name: 'Web App Audit', status: 'Queued' }
  ];

  return (
    <div className="mb-4">
      <FeedStatusCard />
      <div className="p-4 bg-gray-800 rounded">
        <h3 className="text-md font-bold mb-2">Demo Task Overview</h3>
        <h4 className="text-sm font-bold mb-1">Run History</h4>
        <TaskRunChart />
        <ul className="text-sm space-y-1 mt-2">
          {tasks.map((t) => (
            <li key={t.name} className="flex items-center justify-between gap-2">
              <span>{t.name}</span>
              <StatusBadge status={t.status} />
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-400 mt-2">
          All task data is canned for demonstration purposes.
        </p>
      </div>
    </div>
  );
};

export default TaskOverview;
