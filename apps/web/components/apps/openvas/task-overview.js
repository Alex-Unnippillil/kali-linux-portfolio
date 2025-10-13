import React from 'react';
import FeedStatusCard from './feed-status-card';
import TaskRunChart from './task-run-chart';

const TaskOverview = () => {
  const tasks = [
    { name: 'Internal Network Scan', status: 'Completed' },
    { name: 'External Perimeter', status: 'Running' },
    { name: 'Web App Audit', status: 'Queued' }
  ];

  return (
    <div className="mb-4">
      <FeedStatusCard />
      <div className="rounded-xl border border-white/10 bg-kali-surface-muted/80 p-4 text-white shadow-kali-panel backdrop-blur">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-kali-control">
          Demo Task Overview
        </h3>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-kali-muted">
          Run History
        </h4>
        <TaskRunChart />
        <ul className="mt-2 space-y-1 text-sm text-white/80">
          {tasks.map((t) => (
            <li key={t.name} className="flex items-center justify-between">
              <span>{t.name}</span>
              <span className="rounded-full bg-kali-surface-raised/70 px-2 py-0.5 text-xs font-medium text-white/70">
                {t.status}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-white/60">
          All task data is canned for demonstration purposes.
        </p>
      </div>
    </div>
  );
};

export default TaskOverview;
