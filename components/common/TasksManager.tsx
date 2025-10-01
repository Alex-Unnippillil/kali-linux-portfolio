"use client";

import React, { createContext, useCallback, useMemo } from 'react';
import usePersistentState from '../../hooks/usePersistentState';

export type TaskStatus = 'info' | 'success' | 'warning' | 'error';

export interface TaskActivity {
  id: string;
  source: string;
  message: string;
  status: TaskStatus;
  timestamp: number;
  detail?: string;
}

interface TasksManagerContextValue {
  tasks: TaskActivity[];
  logTask: (
    input: Omit<TaskActivity, 'id' | 'timestamp'> & { id?: string; timestamp?: number },
  ) => string;
  clearTasks: () => void;
}

const TASK_LOG_KEY = 'tasks-manager-log';
const TASK_LIMIT = 50;

const isTaskActivityArray = (value: unknown): value is TaskActivity[] =>
  Array.isArray(value) &&
  value.every(
    item =>
      item &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.source === 'string' &&
      typeof item.message === 'string' &&
      typeof item.status === 'string' &&
      typeof item.timestamp === 'number',
  );

export const TasksManagerContext = createContext<TasksManagerContextValue | null>(null);

export const TasksManagerProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = usePersistentState<TaskActivity[]>(
    TASK_LOG_KEY,
    () => [],
    isTaskActivityArray,
  );

  const logTask = useCallback<
    TasksManagerContextValue['logTask']
  >((input) => {
    const entry: TaskActivity = {
      id: input.id ?? `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: input.timestamp ?? Date.now(),
      source: input.source,
      message: input.message,
      status: input.status,
      detail: input.detail,
    };
    setTasks(prev => {
      const next = [entry, ...prev];
      return next.slice(0, TASK_LIMIT);
    });
    return entry.id;
  }, [setTasks]);

  const clearTasks = useCallback(() => {
    setTasks([]);
  }, [setTasks]);

  const value = useMemo<TasksManagerContextValue>(() => ({
    tasks,
    logTask,
    clearTasks,
  }), [tasks, logTask, clearTasks]);

  return (
    <TasksManagerContext.Provider value={value}>
      {children}
    </TasksManagerContext.Provider>
  );
};

export default TasksManagerProvider;
