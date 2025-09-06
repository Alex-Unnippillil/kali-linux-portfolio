'use client';

import { useEffect, useState } from 'react';
import { TransferManager, TransferJob } from './TransferManager';

interface TransfersDialogProps {
  manager: TransferManager;
}

export default function TransfersDialog({ manager }: TransfersDialogProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    return manager.subscribe(() => setTick((t) => t + 1));
  }, [manager]);

  const jobs = manager.getJobs();

  return (
    <div className="p-2 text-sm text-white bg-ub-warm-grey bg-opacity-40">
      <div className="mb-2" data-testid="summary">
        {manager.getSummary()}
      </div>
      <ul>
        {jobs.map((job) => (
          <li key={job.id} className="mb-1 flex gap-2 items-center">
            <span className="flex-1">Job {job.id} - {job.status}</span>
            {job.status === 'copying' && (
              <button onClick={() => manager.pause(job)}>Pause</button>
            )}
            {job.status === 'paused' && (
              <button onClick={() => manager.resume(job)}>Resume</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

