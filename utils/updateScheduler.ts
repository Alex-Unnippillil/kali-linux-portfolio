import { getDb } from './safeIDB';

const DB_NAME = 'update-scheduler';
const DB_VERSION = 1;
const STORE_KEY = 'state';
const STORE_NAME = 'scheduler';

export const SCHEDULER_EVENT = 'update-scheduler-change';

const MINUTES_IN_DAY = 24 * 60;

export type RestartStatus = 'scheduled' | 'deferred' | 'completed' | 'cancelled';

export interface QuietHoursPreference {
  enabled: boolean;
  startMinutes: number;
  endMinutes: number;
}

export interface RestartWindow {
  id: string;
  label: string;
  days: number[];
  startMinutes: number;
  endMinutes: number;
  notes?: string;
}

export interface ScheduledRestart {
  id: string;
  label: string;
  scheduledTime: string;
  status: RestartStatus;
  windowId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deferredFrom?: string;
}

export interface SchedulerState {
  quietHours: QuietHoursPreference;
  preferredWindows: RestartWindow[];
  restarts: ScheduledRestart[];
}

export type RestartDraft = Omit<
  ScheduledRestart,
  'status' | 'createdAt' | 'updatedAt' | 'deferredFrom'
> & {
  status?: RestartStatus;
};

export interface RescheduleOptions {
  windowId?: string;
  note?: string;
  label?: string;
}

declare global {
  interface WindowEventMap {
    'update-scheduler-change': CustomEvent<SchedulerState>;
  }
}

let dbPromise: ReturnType<typeof getDb> | null = null;
let cachedState: SchedulerState | null = null;

function openDb() {
  if (!dbPromise) {
    dbPromise = getDb(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function clampMinutes(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const rounded = Math.round(value);
  return ((rounded % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
}

function toNumber(value: unknown, fallback: number): number {
  const num = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeQuietHours(value: unknown): QuietHoursPreference {
  if (!value || typeof value !== 'object') {
    return {
      enabled: false,
      startMinutes: 22 * 60,
      endMinutes: 6 * 60,
    };
  }
  const record = value as Partial<QuietHoursPreference> & Record<string, unknown>;
  return {
    enabled: Boolean(record.enabled),
    startMinutes: clampMinutes(toNumber(record.startMinutes, 22 * 60)),
    endMinutes: clampMinutes(toNumber(record.endMinutes, 6 * 60)),
  };
}

function normalizeWindow(value: unknown): RestartWindow | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Partial<RestartWindow> & Record<string, unknown>;
  if (typeof record.id !== 'string' || record.id.length === 0) return null;
  const days = Array.isArray(record.days)
    ? Array.from(
        new Set(
          record.days
            .map((day) => Number(day))
            .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
        ),
      ).sort((a, b) => a - b)
    : [];
  return {
    id: record.id,
    label: typeof record.label === 'string' && record.label.length > 0 ? record.label : record.id,
    startMinutes: clampMinutes(toNumber(record.startMinutes, 2 * 60)),
    endMinutes: clampMinutes(toNumber(record.endMinutes, 4 * 60)),
    days,
    notes: typeof record.notes === 'string' && record.notes.length > 0 ? record.notes : undefined,
  };
}

const ALLOWED_STATUSES: RestartStatus[] = ['scheduled', 'deferred', 'completed', 'cancelled'];

function normalizeStoredRestart(value: unknown): ScheduledRestart | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Partial<ScheduledRestart> & Record<string, unknown>;
  if (
    typeof record.id !== 'string' ||
    record.id.length === 0 ||
    typeof record.label !== 'string' ||
    record.label.length === 0 ||
    typeof record.scheduledTime !== 'string'
  ) {
    return null;
  }
  const status = ALLOWED_STATUSES.includes(record.status as RestartStatus)
    ? (record.status as RestartStatus)
    : 'scheduled';
  const createdAt = typeof record.createdAt === 'string' ? record.createdAt : record.scheduledTime;
  const updatedAt = typeof record.updatedAt === 'string' ? record.updatedAt : createdAt;
  const deferredFrom = typeof record.deferredFrom === 'string' ? record.deferredFrom : undefined;
  const windowId = typeof record.windowId === 'string' ? record.windowId : undefined;
  const notes = typeof record.notes === 'string' ? record.notes : undefined;
  return {
    id: record.id,
    label: record.label,
    scheduledTime: record.scheduledTime,
    status,
    windowId,
    notes,
    createdAt,
    updatedAt,
    deferredFrom,
  };
}

function sortWindows(windows: RestartWindow[]): RestartWindow[] {
  return windows
    .slice()
    .sort((a, b) => a.label.localeCompare(b.label) || a.startMinutes - b.startMinutes);
}

function sortRestarts(restarts: ScheduledRestart[]): ScheduledRestart[] {
  return restarts
    .slice()
    .sort(
      (a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime(),
    );
}

function createDefaultState(): SchedulerState {
  return {
    quietHours: {
      enabled: false,
      startMinutes: 22 * 60,
      endMinutes: 6 * 60,
    },
    preferredWindows: [],
    restarts: [],
  };
}

function normalizeState(raw?: Partial<SchedulerState>): SchedulerState {
  const base = createDefaultState();
  if (!raw) {
    return base;
  }
  if (raw.quietHours) {
    base.quietHours = normalizeQuietHours(raw.quietHours);
  }
  if (Array.isArray(raw.preferredWindows)) {
    base.preferredWindows = sortWindows(
      raw.preferredWindows
        .map((entry) => normalizeWindow(entry))
        .filter((entry): entry is RestartWindow => entry !== null),
    );
  }
  if (Array.isArray(raw.restarts)) {
    base.restarts = sortRestarts(
      raw.restarts
        .map((entry) => normalizeStoredRestart(entry))
        .filter((entry): entry is ScheduledRestart => entry !== null),
    );
  }
  return base;
}

async function readState(): Promise<SchedulerState> {
  if (cachedState) {
    return clone(cachedState);
  }
  const dbp = openDb();
  if (!dbp) {
    const state = createDefaultState();
    cachedState = clone(state);
    return clone(state);
  }
  try {
    const db = await dbp;
    const stored = (await db.get(STORE_NAME, STORE_KEY)) as SchedulerState | undefined;
    const normalized = normalizeState(stored ?? undefined);
    cachedState = clone(normalized);
    return clone(normalized);
  } catch {
    const state = createDefaultState();
    cachedState = clone(state);
    return clone(state);
  }
}

async function persistState(state: SchedulerState): Promise<void> {
  cachedState = clone(state);
  const dbp = openDb();
  if (dbp) {
    try {
      const db = await dbp;
      await db.put(STORE_NAME, cachedState, STORE_KEY);
    } catch {
      // ignore storage errors
    }
  }
  if (typeof window !== 'undefined') {
    const detail = clone(cachedState);
    window.dispatchEvent(new CustomEvent(SCHEDULER_EVENT, { detail }));
  }
}

function normalizeRestartDraft(
  draft: RestartDraft,
  previous?: ScheduledRestart,
): ScheduledRestart {
  const now = new Date().toISOString();
  const status = draft.status ?? previous?.status ?? 'scheduled';
  let deferredFrom = previous?.deferredFrom;
  if (status === 'deferred') {
    const previousTime = previous?.scheduledTime;
    if (previousTime && previousTime !== draft.scheduledTime) {
      deferredFrom = previous?.deferredFrom ?? previousTime;
    }
  }
  return {
    id: draft.id,
    label: draft.label,
    scheduledTime: draft.scheduledTime,
    status,
    windowId: draft.windowId ?? previous?.windowId,
    notes: draft.notes ?? previous?.notes,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    deferredFrom,
  };
}

export async function getSchedulerState(): Promise<SchedulerState> {
  const state = await readState();
  return clone(state);
}

export async function getQuietHours(): Promise<QuietHoursPreference> {
  const state = await readState();
  return clone(state.quietHours);
}

export async function setQuietHours(
  preference: QuietHoursPreference,
): Promise<QuietHoursPreference> {
  const state = await readState();
  state.quietHours = normalizeQuietHours(preference);
  await persistState(state);
  return clone(state.quietHours);
}

export async function getPreferredWindows(): Promise<RestartWindow[]> {
  const state = await readState();
  return clone(state.preferredWindows);
}

export async function addPreferredWindow(window: RestartWindow): Promise<RestartWindow[]> {
  const state = await readState();
  const normalized = normalizeWindow(window);
  if (!normalized) {
    return clone(state.preferredWindows);
  }
  const existingIndex = state.preferredWindows.findIndex((entry) => entry.id === normalized.id);
  if (existingIndex >= 0) {
    state.preferredWindows.splice(existingIndex, 1, normalized);
  } else {
    state.preferredWindows.push(normalized);
  }
  state.preferredWindows = sortWindows(state.preferredWindows);
  await persistState(state);
  return clone(state.preferredWindows);
}

export async function updatePreferredWindow(
  window: RestartWindow,
): Promise<RestartWindow[]> {
  return addPreferredWindow(window);
}

export async function removePreferredWindow(id: string): Promise<RestartWindow[]> {
  const state = await readState();
  state.preferredWindows = state.preferredWindows.filter((entry) => entry.id !== id);
  await persistState(state);
  return clone(state.preferredWindows);
}

export async function getScheduledRestarts(): Promise<ScheduledRestart[]> {
  const state = await readState();
  return clone(sortRestarts(state.restarts));
}

export async function scheduleRestart(
  draft: RestartDraft,
): Promise<ScheduledRestart[]> {
  const state = await readState();
  const index = state.restarts.findIndex((entry) => entry.id === draft.id);
  const previous = index >= 0 ? state.restarts[index] : undefined;
  const normalized = normalizeRestartDraft(draft, previous);
  if (index >= 0) {
    state.restarts.splice(index, 1, normalized);
  } else {
    state.restarts.push(normalized);
  }
  state.restarts = sortRestarts(state.restarts);
  await persistState(state);
  return clone(state.restarts);
}

export async function rescheduleRestart(
  id: string,
  scheduledTime: string,
  options: RescheduleOptions = {},
): Promise<ScheduledRestart[]> {
  const state = await readState();
  const index = state.restarts.findIndex((entry) => entry.id === id);
  if (index === -1) {
    return clone(sortRestarts(state.restarts));
  }
  const previous = state.restarts[index];
  const draft: RestartDraft = {
    id,
    label: options.label ?? previous.label,
    scheduledTime,
    status: 'deferred',
    windowId: options.windowId ?? previous.windowId,
    notes: options.note ?? previous.notes,
  };
  const normalized = normalizeRestartDraft(draft, {
    ...previous,
    deferredFrom: previous.deferredFrom ?? previous.scheduledTime,
  });
  normalized.deferredFrom = previous.deferredFrom ?? previous.scheduledTime;
  state.restarts.splice(index, 1, normalized);
  state.restarts = sortRestarts(state.restarts);
  await persistState(state);
  return clone(state.restarts);
}

export async function updateRestartStatus(
  id: string,
  status: RestartStatus,
): Promise<ScheduledRestart[]> {
  const state = await readState();
  const index = state.restarts.findIndex((entry) => entry.id === id);
  if (index === -1) {
    return clone(sortRestarts(state.restarts));
  }
  state.restarts[index] = {
    ...state.restarts[index],
    status,
    updatedAt: new Date().toISOString(),
  };
  await persistState(state);
  return clone(sortRestarts(state.restarts));
}

export async function removeScheduledRestart(id: string): Promise<ScheduledRestart[]> {
  const state = await readState();
  state.restarts = state.restarts.filter((entry) => entry.id !== id);
  await persistState(state);
  return clone(state.restarts);
}

export async function getUpcomingRestart(): Promise<ScheduledRestart | null> {
  const restarts = await getScheduledRestarts();
  const now = Date.now();
  return (
    restarts.find((entry) => {
      if (entry.status === 'cancelled') return false;
      return new Date(entry.scheduledTime).getTime() >= now;
    }) ?? null
  );
}

export async function getPendingDeferredRestart(): Promise<ScheduledRestart | null> {
  const restarts = await getScheduledRestarts();
  const now = Date.now();
  return (
    restarts.find(
      (entry) =>
        entry.status === 'deferred' && new Date(entry.scheduledTime).getTime() >= now,
    ) ?? null
  );
}
