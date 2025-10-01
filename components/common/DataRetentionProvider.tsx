"use client";

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArtifactSnapshot,
  ArtifactType,
  RETENTION_OPTIONS,
  RetentionLog,
  RetentionSettings,
  appendRetentionLog,
  buildLogEntry,
  loadRetentionLog,
  loadRetentionSettings,
  purgeArtifactType,
  purgeArtifacts,
  restoreArtifacts,
  retentionArtifacts,
  saveRetentionSettings,
} from '../../utils/dataRetention';
import useTasksManager from '../../hooks/useTasksManager';

export interface LastRunSummary {
  timestamp: number;
  removedTotal: number;
  trigger: RetentionLog['trigger'];
  details: RetentionLog['details'];
}

interface UndoState {
  snapshot: ArtifactSnapshot;
  expiresAt: number;
  reason: RetentionLog['trigger'];
}

interface DataRetentionContextValue {
  settings: RetentionSettings;
  updateSetting: (type: ArtifactType, ttl: number) => void;
  purgeAll: (trigger?: RetentionLog['trigger']) => Promise<RetentionLog | null>;
  purgeType: (type: ArtifactType) => Promise<RetentionLog | null>;
  lastRun: LastRunSummary | null;
  undo: () => Promise<boolean>;
  undoExpiresAt: number | null;
  isPurging: boolean;
  logs: RetentionLog[];
  retentionOptions: typeof RETENTION_OPTIONS;
}

const UNDO_WINDOW_MS = 30_000;
const SCHEDULE_INTERVAL_MS = 5 * 60 * 1000;

export const DataRetentionContext = createContext<DataRetentionContextValue | null>(null);

const buildSnapshot = (results: ReturnType<typeof purgeArtifacts>) => {
  const snapshot: ArtifactSnapshot = {};
  results.forEach(result => {
    if (result.removed > 0) {
      snapshot[result.type] = result.removedItems;
    }
  });
  return snapshot;
};

const computeTotalRemoved = (results: ReturnType<typeof purgeArtifacts>) =>
  results.reduce((sum, result) => sum + result.removed, 0);

const updateTrashCompatibility = (ttl: number) => {
  if (typeof window === 'undefined') return;
  try {
    if (ttl <= 0) {
      window.localStorage.setItem('trash-purge-days', '0');
      return;
    }
    const days = Math.max(1, Math.round(ttl / (24 * 60 * 60 * 1000)));
    window.localStorage.setItem('trash-purge-days', String(days));
  } catch {
    // ignore storage write errors
  }
};

export const DataRetentionProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<RetentionSettings>(() => loadRetentionSettings());
  const [logs, setLogs] = useState<RetentionLog[]>(() => loadRetentionLog());
  const [lastRun, setLastRun] = useState<LastRunSummary | null>(null);
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [isPurging, setIsPurging] = useState(false);
  const scheduleRef = useRef<number | null>(null);
  const { logTask } = useTasksManager();

  const applySettings = useCallback((next: RetentionSettings) => {
    setSettings(next);
    saveRetentionSettings(next);
    updateTrashCompatibility(next.trash);
  }, []);

  useEffect(() => {
    updateTrashCompatibility(settings.trash);
  }, [settings.trash]);

  const updateSetting = useCallback(
    (type: ArtifactType, ttl: number) => {
      applySettings({ ...settings, [type]: ttl });
    },
    [applySettings, settings],
  );

  const recordLog = useCallback((entry: RetentionLog) => {
    const next = appendRetentionLog(entry);
    setLogs(next);
  }, []);

  const handleResults = useCallback(
    (trigger: RetentionLog['trigger'], results: ReturnType<typeof purgeArtifacts>) => {
      if (results.length === 0) {
        const logEntry = buildLogEntry(trigger, results);
        recordLog(logEntry);
        logTask({
          source: 'data-retention',
          message: logEntry.summary,
          status: 'info',
        });
        setLastRun({
          timestamp: logEntry.timestamp,
          removedTotal: 0,
          trigger,
          details: logEntry.details,
        });
        return logEntry;
      }

      const logEntry = buildLogEntry(trigger, results);
      recordLog(logEntry);
      logTask({
        source: 'data-retention',
        message: logEntry.summary,
        status: 'success',
        detail: logEntry.details
          .map(detail => `${retentionArtifacts[detail.type].label}: ${detail.removed}`)
          .join(', '),
      });
      setLastRun({
        timestamp: logEntry.timestamp,
        removedTotal: computeTotalRemoved(results),
        trigger,
        details: logEntry.details,
      });
      setUndoState({
        snapshot: buildSnapshot(results),
        expiresAt: Date.now() + UNDO_WINDOW_MS,
        reason: trigger,
      });
      return logEntry;
    },
    [logTask, recordLog],
  );

  const purge = useCallback(
    async (trigger: RetentionLog['trigger'], type?: ArtifactType) => {
      if (typeof window === 'undefined') return null;
      setIsPurging(true);
      try {
        const now = Date.now();
        const results = type
          ? (() => {
              const result = purgeArtifactType(type, settings, now);
              return result ? [result] : [];
            })()
          : purgeArtifacts(settings, now);
        const logEntry = handleResults(trigger, results);
        if (!results.length) {
          setUndoState(null);
        }
        return logEntry;
      } finally {
        setIsPurging(false);
      }
    },
    [handleResults, settings],
  );

  const purgeAll = useCallback(
    (trigger: RetentionLog['trigger'] = 'manual') => purge(trigger),
    [purge],
  );

  const purgeType = useCallback(
    (type: ArtifactType) => purge('manual', type),
    [purge],
  );

  const undo = useCallback(async () => {
    if (!undoState) return false;
    if (undoState.expiresAt < Date.now()) {
      setUndoState(null);
      return false;
    }
    restoreArtifacts(undoState.snapshot);
    logTask({
      source: 'data-retention',
      message: 'Undo applied: restored last purge snapshot',
      status: 'warning',
    });
    setUndoState(null);
    return true;
  }, [logTask, undoState]);

  useEffect(() => {
    if (!undoState) return;
    const remaining = undoState.expiresAt - Date.now();
    if (remaining <= 0) {
      setUndoState(null);
      return;
    }
    const timeout = window.setTimeout(() => setUndoState(null), remaining);
    return () => window.clearTimeout(timeout);
  }, [undoState]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    purge('startup');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (scheduleRef.current) {
      window.clearInterval(scheduleRef.current);
    }
    const interval = window.setInterval(() => {
      if (undoState) return;
      purge('scheduled');
    }, SCHEDULE_INTERVAL_MS);
    scheduleRef.current = interval;
    return () => {
      window.clearInterval(interval);
    };
  }, [purge, undoState]);

  useEffect(() => () => {
    if (scheduleRef.current) {
      window.clearInterval(scheduleRef.current);
    }
  }, []);

  const value = useMemo<DataRetentionContextValue>(() => ({
    settings,
    updateSetting,
    purgeAll,
    purgeType,
    lastRun,
    undo,
    undoExpiresAt: undoState?.expiresAt ?? null,
    isPurging,
    logs,
    retentionOptions: RETENTION_OPTIONS,
  }), [
    isPurging,
    lastRun,
    logs,
    purgeAll,
    purgeType,
    settings,
    undo,
    undoState?.expiresAt,
    updateSetting,
  ]);

  return (
    <DataRetentionContext.Provider value={value}>
      {children}
    </DataRetentionContext.Provider>
  );
};

export default DataRetentionProvider;
