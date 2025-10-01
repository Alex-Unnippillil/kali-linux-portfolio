import type { ReactNode } from 'react';
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import useNotifications from './useNotifications';

export type TaskStatus =
  | 'queued'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'canceled';

export interface TaskOperations {
  pause?: () => Promise<void> | void;
  resume?: () => Promise<void> | void;
  cancel?: () => Promise<void> | void;
  rollback?: () => Promise<void> | void;
}

export interface TaskRegistration {
  id?: string;
  title: string;
  appId?: string;
  description?: string;
  progress?: number;
  etaMs?: number | null;
  metadata?: Record<string, unknown> | null;
  autoStart?: boolean;
  status?: 'queued' | 'running' | 'paused';
  operations?: TaskOperations;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  progress?: number;
  etaMs?: number | null;
  metadata?: Record<string, unknown> | null;
  status?: 'queued' | 'running' | 'paused';
}

export interface TaskSnapshot {
  id: string;
  title: string;
  appId: string;
  description?: string;
  status: TaskStatus;
  progress: number;
  etaMs: number | null;
  createdAt: number;
  startedAt?: number;
  updatedAt: number;
  metadata?: Record<string, unknown> | null;
  error?: string;
  operations?: TaskOperations;
  allowRollback: boolean;
}

interface TaskQueueState {
  order: string[];
  tasks: Record<string, TaskSnapshot>;
}

type TaskQueueAction =
  | { type: 'ADD'; task: TaskSnapshot }
  | { type: 'UPDATE'; id: string; patch: Partial<TaskSnapshot> }
  | { type: 'REMOVE'; id: string };

const clampProgress = (value: number) => {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
};

const normalizeEta = (value: number | null | undefined) => {
  if (value === null) return null;
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return value < 0 ? 0 : value;
};

const ensureMetadata = (value?: Record<string, unknown> | null) => {
  if (value === null) return null;
  if (!value) return undefined;
  return { ...value };
};

const reducer = (state: TaskQueueState, action: TaskQueueAction): TaskQueueState => {
  switch (action.type) {
    case 'ADD': {
      const order = [action.task.id, ...state.order.filter((id) => id !== action.task.id)];
      return {
        order,
        tasks: {
          ...state.tasks,
          [action.task.id]: action.task,
        },
      };
    }
    case 'UPDATE': {
      const existing = state.tasks[action.id];
      if (!existing) return state;
      const nextTask = { ...existing, ...action.patch };
      return {
        order: state.order,
        tasks: {
          ...state.tasks,
          [action.id]: nextTask,
        },
      };
    }
    case 'REMOVE': {
      if (!state.tasks[action.id]) return state;
      const { [action.id]: _removed, ...rest } = state.tasks;
      return {
        order: state.order.filter((id) => id !== action.id),
        tasks: rest,
      };
    }
    default:
      return state;
  }
};

const INITIAL_STATE: TaskQueueState = { order: [], tasks: {} };

const FINAL_STATUSES: TaskStatus[] = ['completed', 'failed', 'canceled'];

interface TaskQueueContextValue {
  tasks: TaskSnapshot[];
  activeTasks: TaskSnapshot[];
  runningTasks: TaskSnapshot[];
  summary: {
    total: number;
    active: number;
    running: number;
    completed: number;
    averageProgress: number;
    etaMs: number | null;
  };
  enqueueTask: (input: TaskRegistration) => string;
  updateTask: (id: string, update: TaskUpdate) => void;
  startTask: (id: string) => void;
  pauseTask: (id: string) => Promise<void>;
  resumeTask: (id: string) => Promise<void>;
  cancelTask: (id: string, reason?: string) => Promise<void>;
  completeTask: (id: string, options?: { message?: string }) => void;
  failTask: (id: string, error?: string) => void;
  removeTask: (id: string) => void;
  getTask: (id: string) => TaskSnapshot | undefined;
}

const TaskQueueContext = createContext<TaskQueueContextValue | null>(null);

const createId = () => `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const isActiveStatus = (status: TaskStatus) => !FINAL_STATUSES.includes(status);

const errorToMessage = (error: unknown) => {
  if (!error) return 'Unexpected error';
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch (err) {
    return 'Unexpected error';
  }
};

type TaskQueueProviderProps = { children?: ReactNode };

export const TaskQueueProvider = ({ children }: TaskQueueProviderProps) => {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const { pushNotification } = useNotifications();
  const tasksRef = useRef(state.tasks);

  useEffect(() => {
    tasksRef.current = state.tasks;
  }, [state.tasks]);

  const enqueueTask = useCallback((input: TaskRegistration) => {
    const id = input.id ?? createId();
    const now = Date.now();
    const baseStatus: TaskStatus =
      (input.status && ['queued', 'running', 'paused'].includes(input.status)
        ? input.status
        : undefined) ?? (input.autoStart ? 'running' : 'queued');
    const progress = clampProgress(input.progress ?? 0);
    const etaMs = normalizeEta(input.etaMs);
    const metadata = ensureMetadata(input.metadata ?? undefined);

    const task: TaskSnapshot = {
      id,
      title: input.title,
      appId: input.appId ?? 'system',
      description: input.description,
      status: baseStatus,
      progress,
      etaMs,
      createdAt: now,
      startedAt: baseStatus === 'running' ? now : undefined,
      updatedAt: now,
      metadata,
      operations: input.operations,
      allowRollback: Boolean(input.operations?.rollback),
    };

    dispatch({ type: 'ADD', task });
    return id;
  }, []);

  const updateTask = useCallback((id: string, update: TaskUpdate) => {
    const existing = tasksRef.current[id];
    if (!existing) return;
    const now = Date.now();
    const progress =
      update.progress !== undefined ? clampProgress(update.progress) : existing.progress;
    const etaMs = update.etaMs !== undefined ? normalizeEta(update.etaMs) : existing.etaMs;
    const metadata =
      update.metadata !== undefined
        ? update.metadata === null
          ? null
          : { ...(existing.metadata ?? {}), ...update.metadata }
        : existing.metadata;
    const status = update.status ?? existing.status;

    dispatch({
      type: 'UPDATE',
      id,
      patch: {
        ...existing,
        title: update.title ?? existing.title,
        description: update.description ?? existing.description,
        progress,
        etaMs,
        metadata,
        status,
        updatedAt: now,
      },
    });
  }, []);

  const startTask = useCallback((id: string) => {
    const existing = tasksRef.current[id];
    if (!existing) return;
    const now = Date.now();
    dispatch({
      type: 'UPDATE',
      id,
      patch: {
        ...existing,
        status: 'running',
        startedAt: existing.startedAt ?? now,
        updatedAt: now,
      },
    });
  }, []);

  const pauseTask = useCallback(
    async (id: string) => {
      const task = tasksRef.current[id];
      if (!task) return;
      if (task.status !== 'running') return;
      if (!task.operations?.pause && !task.operations?.resume) return;

      try {
        await task.operations?.pause?.();
        const now = Date.now();
        dispatch({
          type: 'UPDATE',
          id,
          patch: {
            ...task,
            status: 'paused',
            updatedAt: now,
          },
        });
      } catch (error) {
        const message = errorToMessage(error);
        const now = Date.now();
        dispatch({
          type: 'UPDATE',
          id,
          patch: {
            ...task,
            status: 'failed',
            error: message,
            updatedAt: now,
          },
        });
        pushNotification({
          appId: task.appId,
          title: `${task.title} paused with errors`,
          body: message,
          priority: 'high',
        });
        throw error;
      }
    },
    [pushNotification],
  );

  const resumeTask = useCallback(
    async (id: string) => {
      const task = tasksRef.current[id];
      if (!task) return;
      if (task.status !== 'paused') return;
      if (!task.operations?.resume) {
        const now = Date.now();
        dispatch({
          type: 'UPDATE',
          id,
          patch: {
            ...task,
            status: 'running',
            updatedAt: now,
          },
        });
        return;
      }

      try {
        await task.operations.resume();
        const now = Date.now();
        dispatch({
          type: 'UPDATE',
          id,
          patch: {
            ...task,
            status: 'running',
            updatedAt: now,
          },
        });
      } catch (error) {
        const message = errorToMessage(error);
        const now = Date.now();
        dispatch({
          type: 'UPDATE',
          id,
          patch: {
            ...task,
            status: 'failed',
            error: message,
            updatedAt: now,
          },
        });
        pushNotification({
          appId: task.appId,
          title: `${task.title} resume failed`,
          body: message,
          priority: 'high',
        });
        throw error;
      }
    },
    [pushNotification],
  );

  const cancelTask = useCallback(
    async (id: string, reason?: string) => {
      const task = tasksRef.current[id];
      if (!task) return;
      if (!isActiveStatus(task.status)) return;
      if (!task.operations?.cancel && !task.operations?.rollback) {
        const now = Date.now();
        dispatch({
          type: 'UPDATE',
          id,
          patch: {
            ...task,
            status: 'canceled',
            etaMs: null,
            progress: 0,
            updatedAt: now,
          },
        });
        return;
      }

      try {
        await task.operations?.cancel?.();
        await task.operations?.rollback?.();
        const now = Date.now();
        dispatch({
          type: 'UPDATE',
          id,
          patch: {
            ...task,
            status: 'canceled',
            etaMs: null,
            progress: 0,
            updatedAt: now,
            error: reason,
          },
        });
      } catch (error) {
        const message = errorToMessage(error);
        const now = Date.now();
        dispatch({
          type: 'UPDATE',
          id,
          patch: {
            ...task,
            status: 'failed',
            error: message,
            updatedAt: now,
          },
        });
        pushNotification({
          appId: task.appId,
          title: `${task.title} cancel failed`,
          body: message,
          priority: 'high',
        });
        throw error;
      }
    },
    [pushNotification],
  );

  const completeTask = useCallback(
    (id: string, options?: { message?: string }) => {
      const task = tasksRef.current[id];
      if (!task) return;
      const now = Date.now();
      dispatch({
        type: 'UPDATE',
        id,
        patch: {
          ...task,
          status: 'completed',
          progress: 1,
          etaMs: 0,
          updatedAt: now,
          error: undefined,
        },
      });
      pushNotification({
        appId: task.appId,
        title: `${task.title} completed`,
        body: options?.message ?? task.description,
        priority: 'normal',
      });
    },
    [pushNotification],
  );

  const failTask = useCallback(
    (id: string, errorMessage?: string) => {
      const task = tasksRef.current[id];
      if (!task) return;
      const now = Date.now();
      const message = errorMessage ?? 'Task failed';
      dispatch({
        type: 'UPDATE',
        id,
        patch: {
          ...task,
          status: 'failed',
          etaMs: null,
          updatedAt: now,
          error: message,
        },
      });
      pushNotification({
        appId: task.appId,
        title: `${task.title} failed`,
        body: message,
        priority: 'high',
      });
    },
    [pushNotification],
  );

  const removeTask = useCallback((id: string) => {
    dispatch({ type: 'REMOVE', id });
  }, []);

  const getTask = useCallback((id: string) => tasksRef.current[id], []);

  const tasks = useMemo(
    () => state.order.map((taskId) => state.tasks[taskId]).filter(Boolean),
    [state.order, state.tasks],
  );

  const activeTasks = useMemo(
    () => tasks.filter((task) => isActiveStatus(task.status)),
    [tasks],
  );

  const runningTasks = useMemo(
    () => tasks.filter((task) => task.status === 'running'),
    [tasks],
  );

  const summary = useMemo(() => {
    const total = tasks.length;
    const active = activeTasks.length;
    const running = runningTasks.length;
    const completed = tasks.filter((task) => task.status === 'completed').length;
    const averageProgress =
      active === 0
        ? 1
        : activeTasks.reduce((sum, task) => sum + (Number.isFinite(task.progress) ? task.progress : 0), 0) /
          active;
    const etaCandidates = activeTasks
      .map((task) => (typeof task.etaMs === 'number' ? task.etaMs : null))
      .filter((eta): eta is number => eta !== null);
    const etaMs = etaCandidates.length > 0 ? Math.max(...etaCandidates) : null;

    return {
      total,
      active,
      running,
      completed,
      averageProgress,
      etaMs,
    };
  }, [tasks, activeTasks, runningTasks]);

  const value = useMemo(
    () => ({
      tasks,
      activeTasks,
      runningTasks,
      summary,
      enqueueTask,
      updateTask,
      startTask,
      pauseTask,
      resumeTask,
      cancelTask,
      completeTask,
      failTask,
      removeTask,
      getTask,
    }),
    [
      tasks,
      activeTasks,
      runningTasks,
      summary,
      enqueueTask,
      updateTask,
      startTask,
      pauseTask,
      resumeTask,
      cancelTask,
      completeTask,
      failTask,
      removeTask,
      getTask,
    ],
  );

  return createElement(TaskQueueContext.Provider, { value }, children ?? null);
};

export const useTaskQueue = () => {
  const ctx = useContext(TaskQueueContext);
  if (!ctx) {
    throw new Error('useTaskQueue must be used within TaskQueueProvider');
  }
  return ctx;
};

export default useTaskQueue;
