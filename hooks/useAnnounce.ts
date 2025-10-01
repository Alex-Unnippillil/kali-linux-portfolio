import { useCallback, useContext, useMemo } from 'react';
import { AnnouncerContext, AnnouncerContextValue } from '../components/common/Announcer';

export type { LiveRegionChannel } from '../components/common/Announcer';

export interface ProgressAnnouncement {
  label: string;
  value: number;
  total?: number;
}

export interface TaskAnnouncement {
  taskName: string;
  status: 'started' | 'completed' | 'failed' | 'progress' | string;
  detail?: string;
  progress?: number;
  total?: number;
}

const clampPercent = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
};

const normaliseProgress = (value: number, total?: number) => {
  if (typeof total === 'number' && total > 0) {
    return clampPercent((value / total) * 100);
  }
  if (value <= 1) {
    return clampPercent(value * 100);
  }
  return clampPercent(value);
};

export interface UseAnnounceResult extends AnnouncerContextValue {
  announceToast: (message: string) => boolean;
  announceProgress: (announcement: ProgressAnnouncement) => boolean;
  announceTask: (announcement: TaskAnnouncement) => boolean;
}

export const useAnnounce = (): UseAnnounceResult => {
  const context = useContext(AnnouncerContext);
  if (!context) {
    throw new Error('useAnnounce must be used within an Announcer');
  }

  const { announcePolite, announceAssertive } = context;

  const announceToast = useCallback(
    (message: string) => announcePolite(message),
    [announcePolite],
  );

  const announceProgress = useCallback(
    ({ label, value, total }: ProgressAnnouncement) => {
      if (!label) return false;
      const percent = normaliseProgress(value, total);
      return announcePolite(`${label} ${percent}% complete`);
    },
    [announcePolite],
  );

  const announceTask = useCallback(
    ({ taskName, status, detail, progress, total }: TaskAnnouncement) => {
      if (!taskName || !status) return false;
      const normalizedStatus = status.toLowerCase();
      const parts: string[] = [taskName];
      if (normalizedStatus === 'completed' || normalizedStatus === 'complete') {
        parts.push('completed');
      } else if (normalizedStatus === 'failed' || normalizedStatus === 'error') {
        parts.push('failed');
      } else if (normalizedStatus === 'started' || normalizedStatus === 'start') {
        parts.push('started');
      } else if (normalizedStatus === 'progress') {
        parts.push('progress update');
      } else {
        parts.push(status);
      }

      if (typeof progress === 'number') {
        const percent = normaliseProgress(progress, total);
        parts.push(`${percent}%`);
      }

      if (detail) {
        parts.push(detail);
      }

      const message = parts.join(' ').replace(/\s+/g, ' ').trim();
      const announceFn =
        normalizedStatus === 'failed' || normalizedStatus === 'error'
          ? announceAssertive
          : announcePolite;
      return announceFn(message);
    },
    [announceAssertive, announcePolite],
  );

  return useMemo(
    () => ({
      ...context,
      announceToast,
      announceProgress,
      announceTask,
    }),
    [context, announceToast, announceProgress, announceTask],
  );
};

export default useAnnounce;
