import { safeLocalStorage } from './safeStorage';

export const FIRST_BOOT_CHECKLIST_STORAGE_KEY = 'first-boot-checklist-state';
export const CHECKLIST_TARGET_MINUTES = 10;

export type ChecklistTaskKey =
  | 'hostname'
  | 'userAccount'
  | 'ssh'
  | 'updates'
  | 'firewall';

export type ChecklistSelection = 'enabled' | 'disabled';

export interface ChecklistTaskState {
  completed: boolean;
  value?: string;
  selection?: ChecklistSelection;
  notes?: string;
  completedAt?: string;
}

export interface FirstBootChecklistState {
  startedAt: string;
  completedAt?: string;
  tasks: Record<ChecklistTaskKey, ChecklistTaskState>;
}

export interface ChecklistSummaryTask extends ChecklistTaskState {}

export interface ChecklistSummary {
  startedAt: string;
  completedAt: string;
  durationMs: number;
  durationMinutes: number;
  offline: boolean;
  tasks: Record<ChecklistTaskKey, ChecklistSummaryTask>;
}

export const CHECKLIST_TASK_ORDER: ChecklistTaskKey[] = [
  'hostname',
  'userAccount',
  'ssh',
  'updates',
  'firewall',
];

const DEFAULT_TASK_TEMPLATE: Record<ChecklistTaskKey, ChecklistTaskState> = {
  hostname: { completed: false, value: '' },
  userAccount: { completed: false, value: '', notes: '' },
  ssh: { completed: false, notes: '' },
  updates: { completed: false, value: '', notes: '' },
  firewall: { completed: false, notes: '' },
};

function cloneDefaultTasks(): Record<ChecklistTaskKey, ChecklistTaskState> {
  const tasks: Record<ChecklistTaskKey, ChecklistTaskState> = {
    hostname: { ...DEFAULT_TASK_TEMPLATE.hostname },
    userAccount: { ...DEFAULT_TASK_TEMPLATE.userAccount },
    ssh: { ...DEFAULT_TASK_TEMPLATE.ssh },
    updates: { ...DEFAULT_TASK_TEMPLATE.updates },
    firewall: { ...DEFAULT_TASK_TEMPLATE.firewall },
  };
  return tasks;
}

function normalizeSelection(value: unknown): ChecklistSelection | undefined {
  return value === 'enabled' || value === 'disabled' ? value : undefined;
}

function normalizeTask(
  key: ChecklistTaskKey,
  task: Partial<ChecklistTaskState> | undefined,
): ChecklistTaskState {
  const defaults = DEFAULT_TASK_TEMPLATE[key];
  const normalized: ChecklistTaskState = {
    ...defaults,
    ...task,
    completed: Boolean(task?.completed),
  };

  if (typeof normalized.value !== 'string') {
    delete normalized.value;
  }

  if (typeof normalized.notes !== 'string') {
    delete normalized.notes;
  }

  const selection = normalizeSelection(task?.selection);
  if (selection) {
    normalized.selection = selection;
  } else {
    delete normalized.selection;
  }

  if (!normalized.completed) {
    delete normalized.completedAt;
  }

  return normalized;
}

export function createInitialChecklistState(timestamp = Date.now()): FirstBootChecklistState {
  return {
    startedAt: new Date(timestamp).toISOString(),
    tasks: cloneDefaultTasks(),
  };
}

export function normalizeChecklistState(
  state?: Partial<FirstBootChecklistState>,
): FirstBootChecklistState {
  const base = createInitialChecklistState();
  const normalizedTasks: Record<ChecklistTaskKey, ChecklistTaskState> = cloneDefaultTasks();

  CHECKLIST_TASK_ORDER.forEach((key) => {
    normalizedTasks[key] = normalizeTask(key, state?.tasks?.[key]);
  });

  const normalized: FirstBootChecklistState = {
    startedAt: typeof state?.startedAt === 'string' ? state.startedAt : base.startedAt,
    completedAt: typeof state?.completedAt === 'string' ? state.completedAt : undefined,
    tasks: normalizedTasks,
  };

  if (!isFirstBootChecklistComplete(normalized)) {
    delete normalized.completedAt;
  }

  return normalized;
}

export function loadFirstBootChecklistState(): FirstBootChecklistState | undefined {
  if (!safeLocalStorage) return undefined;
  try {
    const raw = safeLocalStorage.getItem(FIRST_BOOT_CHECKLIST_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<FirstBootChecklistState>;
    return normalizeChecklistState(parsed);
  } catch {
    return undefined;
  }
}

export function saveFirstBootChecklistState(state: FirstBootChecklistState): void {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.setItem(
      FIRST_BOOT_CHECKLIST_STORAGE_KEY,
      JSON.stringify(state),
    );
  } catch {
    /* ignore storage errors */
  }
}

export function isFirstBootChecklistComplete(
  state: FirstBootChecklistState | undefined,
): boolean {
  if (!state) return false;
  return CHECKLIST_TASK_ORDER.every((key) => state.tasks[key]?.completed);
}

export function computeChecklistProgress(state: FirstBootChecklistState): number {
  const total = CHECKLIST_TASK_ORDER.length;
  const completed = CHECKLIST_TASK_ORDER.reduce(
    (count, key) => (state.tasks[key]?.completed ? count + 1 : count),
    0,
  );
  return Math.round((completed / total) * 100);
}

export function finalizeChecklistState(
  state: FirstBootChecklistState,
  timestamp = Date.now(),
): FirstBootChecklistState {
  const isComplete = isFirstBootChecklistComplete(state);
  if (isComplete && !state.completedAt) {
    return {
      ...state,
      completedAt: new Date(timestamp).toISOString(),
    };
  }

  if (!isComplete && state.completedAt) {
    const next = { ...state };
    delete next.completedAt;
    return next;
  }

  return state;
}

export function createChecklistSummary(
  state: FirstBootChecklistState,
  offline = false,
): ChecklistSummary | undefined {
  if (!state.completedAt) return undefined;

  const started = Date.parse(state.startedAt);
  const finished = Date.parse(state.completedAt);
  const durationMs = Number.isFinite(finished - started) ? finished - started : 0;
  const durationMinutes = Number.isFinite(durationMs)
    ? Number((durationMs / 60000).toFixed(2))
    : 0;

  const tasks: Record<ChecklistTaskKey, ChecklistSummaryTask> = {
    hostname: { ...state.tasks.hostname },
    userAccount: { ...state.tasks.userAccount },
    ssh: { ...state.tasks.ssh },
    updates: { ...state.tasks.updates },
    firewall: { ...state.tasks.firewall },
  };

  return {
    startedAt: state.startedAt,
    completedAt: state.completedAt,
    durationMs,
    durationMinutes,
    offline,
    tasks,
  };
}

