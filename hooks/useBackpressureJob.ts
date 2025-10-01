import { useEffect, useState } from 'react';
import {
  getBackpressureSnapshot,
  JobSnapshot,
  subscribeToBackpressure,
} from '../utils/backpressure';

export const useBackpressureJob = (jobId?: string | null): JobSnapshot | null => {
  const [job, setJob] = useState<JobSnapshot | null>(() => {
    if (!jobId) return null;
    return getBackpressureSnapshot().jobs.find((j) => j.id === jobId) ?? null;
  });

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      return () => {};
    }
    return subscribeToBackpressure((snapshot) => {
      const next = snapshot.jobs.find((j) => j.id === jobId) ?? null;
      setJob(next);
    });
  }, [jobId]);

  return job;
};

export default useBackpressureJob;
