import { useCallback, useEffect, useState } from 'react';
import {
  SchedulerLogRecord,
  getSchedulerLogs,
  subscribeSchedulerLogs,
} from '../modules/scheduler/logs';

export const useSchedulerLogs = (jobId?: string, limit?: number) => {
  const [logs, setLogs] = useState<SchedulerLogRecord[]>([]);

  const refresh = useCallback(async () => {
    const items = await getSchedulerLogs({ jobId, limit });
    setLogs(items);
  }, [jobId, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const unsubscribe = subscribeSchedulerLogs(refresh);
    return () => {
      unsubscribe();
    };
  }, [refresh]);

  return { logs, refresh };
};

