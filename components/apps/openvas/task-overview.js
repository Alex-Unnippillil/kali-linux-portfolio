import React from 'react';
import FeedStatusCard from './feed-status-card';
import TaskRunChart from './task-run-chart';
import { AppPanel, AppToolbar, StatusChip } from '../shared';

const TaskOverview = () => {
  const tasks = [
    { name: 'Internal Network Scan', status: 'Completed' },
    { name: 'External Perimeter', status: 'Running' },
    { name: 'Web App Audit', status: 'Queued' }
  ];

  return (
    <div className="mb-4">
      <FeedStatusCard />
      <AppPanel className="border-white/10 bg-kali-surface-muted/80 p-4 text-white shadow-kali-panel backdrop-blur">
        <AppToolbar className="mb-2 rounded-lg border-white/10 bg-kali-surface-raised/60 px-3 py-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-kali-control">
            Demo Task Overview
          </h3>
        </AppToolbar>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-kali-muted">
          Run History
        </h4>
        <TaskRunChart />
        <ul className="mt-2 space-y-1 text-sm text-white/80">
          {tasks.map((t) => (
            <li key={t.name} className="flex items-center justify-between">
              <span>{t.name}</span>
              <StatusChip className="border-white/15 bg-kali-surface-raised/70 text-white/70">
                {t.status}
              </StatusChip>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-white/60">
          All task data is canned for demonstration purposes.
        </p>
      </AppPanel>
    </div>
  );
};

export default TaskOverview;
