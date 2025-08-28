import React from 'react';
import FeedStatusCard from './feed-status-card';

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
        <ul className="text-sm space-y-1">
          {tasks.map((t) => (
            <li key={t.name} className="flex justify-between">
              <span>{t.name}</span>
              <span>{t.status}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-400 mt-2">All task data is canned for demonstration purposes.</p>
      </div>
    </div>
  );
};

export default TaskOverview;
