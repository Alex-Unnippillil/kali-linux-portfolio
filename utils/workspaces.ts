'use client';

import { getDb } from './safeIDB';

type MaybeNumber = number | undefined | null;

export interface WorkspaceWindowLayout {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  order: number;
}

export interface WorkspaceRecord {
  id: string;
  name: string;
  windows: WorkspaceWindowLayout[];
  savedAt: number;
}

export type WorkspaceInputWindow = Partial<WorkspaceWindowLayout> & { id: string };

const DB_NAME = 'desktop-workspaces';
const DB_VERSION = 1;
const STORE_NAME = 'workspaces';

const DEFAULT_X = 60;
const DEFAULT_Y = 10;
const DEFAULT_WIDTH = 60;
const DEFAULT_HEIGHT = 85;
const MIN_WIDTH = 20;
const MAX_WIDTH = 100;
const MIN_HEIGHT = 20;
const MAX_HEIGHT = 100;

let dbPromise: ReturnType<typeof getDb> | null = null;

function openDb() {
  if (!dbPromise) {
    dbPromise = getDb(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function fallbackNumber(value: MaybeNumber, fallback: number, min?: number, max?: number) {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  if (typeof min === 'number' && typeof max === 'number') {
    return clamp(num, min, max);
  }
  return num;
}

function coerceName(name: string) {
  const trimmed = name?.trim?.() ?? '';
  if (!trimmed) return 'Workspace';
  return trimmed.slice(0, 80);
}

function createWorkspaceId(name: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
  return `${slug || 'workspace'}-${Date.now().toString(36)}-${Math.random()
    .toString(16)
    .slice(2, 8)}`;
}

export function normalizeWindows(windows: WorkspaceInputWindow[]): WorkspaceWindowLayout[] {
  const sanitized: WorkspaceWindowLayout[] = [];
  windows.forEach((windowInput, index) => {
    if (!windowInput || typeof windowInput.id !== 'string' || !windowInput.id.trim()) {
      return;
    }
    const id = windowInput.id.trim();
    const order = fallbackNumber(windowInput.order ?? index, index);
    const x = fallbackNumber(windowInput.x, DEFAULT_X);
    const y = fallbackNumber(windowInput.y, DEFAULT_Y);
    const width = fallbackNumber(windowInput.width, DEFAULT_WIDTH, MIN_WIDTH, MAX_WIDTH);
    const height = fallbackNumber(windowInput.height, DEFAULT_HEIGHT, MIN_HEIGHT, MAX_HEIGHT);
    sanitized.push({ id, x, y, width, height, order });
  });
  sanitized.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.id.localeCompare(b.id);
  });
  return sanitized;
}

export function serializeWorkspace(
  name: string,
  windows: WorkspaceInputWindow[],
  options: { id?: string; timestamp?: number } = {},
): WorkspaceRecord {
  const normalizedName = coerceName(name);
  const id = options.id || createWorkspaceId(normalizedName);
  const savedAt = isFiniteNumber(options.timestamp) ? (options.timestamp as number) : Date.now();
  const normalizedWindows = normalizeWindows(windows);
  return {
    id,
    name: normalizedName,
    windows: normalizedWindows,
    savedAt,
  };
}

export function deserializeWorkspace(input: unknown): WorkspaceRecord | null {
  if (!input || typeof input !== 'object') return null;
  const value = input as Partial<WorkspaceRecord> & { windows?: WorkspaceInputWindow[] };
  const name = typeof value.name === 'string' ? value.name : 'Workspace';
  const id = typeof value.id === 'string' && value.id ? value.id : createWorkspaceId(name);
  const savedAt = isFiniteNumber(value.savedAt) ? value.savedAt : Date.now();
  const windows = Array.isArray(value.windows) ? normalizeWindows(value.windows) : [];
  return {
    id,
    name: coerceName(name),
    savedAt,
    windows,
  };
}

export async function listWorkspaces(): Promise<WorkspaceRecord[]> {
  try {
    const dbp = openDb();
    if (!dbp) return [];
    const db = await dbp;
    const stored = await db.getAll(STORE_NAME);
    const parsed = stored
      .map((item) => deserializeWorkspace(item))
      .filter((item): item is WorkspaceRecord => Boolean(item));
    parsed.sort((a, b) => b.savedAt - a.savedAt);
    return parsed;
  } catch {
    return [];
  }
}

export async function saveWorkspace(record: WorkspaceRecord): Promise<void> {
  try {
    const dbp = openDb();
    if (!dbp) return;
    const db = await dbp;
    await db.put(STORE_NAME, record);
  } catch {
    // ignore storage failures so UI can continue working
  }
}

export async function deleteWorkspace(id: string): Promise<void> {
  try {
    const dbp = openDb();
    if (!dbp) return;
    const db = await dbp;
    await db.delete(STORE_NAME, id);
  } catch {
    // ignore
  }
}

export async function loadWorkspace(id: string): Promise<WorkspaceRecord | null> {
  try {
    const dbp = openDb();
    if (!dbp) return null;
    const db = await dbp;
    const value = await db.get(STORE_NAME, id);
    return deserializeWorkspace(value);
  } catch {
    return null;
  }
}

export interface WorkspaceLayoutMapValue {
  x: number;
  y: number;
  width: number;
  height: number;
  order: number;
}

export type WorkspaceLayoutMap = Record<string, WorkspaceLayoutMapValue>;

export function workspaceWindowsToLayoutMap(
  windows: WorkspaceWindowLayout[],
): WorkspaceLayoutMap {
  return windows.reduce<WorkspaceLayoutMap>((acc, windowLayout) => {
    acc[windowLayout.id] = {
      x: windowLayout.x,
      y: windowLayout.y,
      width: windowLayout.width,
      height: windowLayout.height,
      order: windowLayout.order,
    };
    return acc;
  }, {} as WorkspaceLayoutMap);
}

export function workspaceWindowOrder(windows: WorkspaceWindowLayout[]): string[] {
  return windows.map((windowLayout) => windowLayout.id);
}
