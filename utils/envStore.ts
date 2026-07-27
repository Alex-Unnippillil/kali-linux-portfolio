"use client";

import { safeLocalStorage } from './safeStorage';

export type WorkspaceId = number;

export interface EnvEntry {
  key: string;
  value: string;
  readonly: boolean;
  reserved: boolean;
  warning?: string;
}

export interface EnvMutationResult {
  success: boolean;
  key?: string;
  error?: string;
  warning?: string;
}

export interface KeyValidationResult {
  valid: boolean;
  normalizedKey: string;
  message?: string;
  reserved?: boolean;
}

type EnvSubscriber = (entries: EnvEntry[], meta: { workspaceId: WorkspaceId }) => void;
type WorkspaceSubscriber = (workspaceId: WorkspaceId) => void;

type StoredEnvRecord = Record<string, string>;

type WorkspaceData = Map<string, string>;

type ReservedDefinition = {
  key: string;
  fallback: string;
  description: string;
};

const STORAGE_PREFIX = 'workspace-env:';
const KEY_PATTERN = /^[A-Z_][A-Z0-9_]*$/;
const MAX_KEY_LENGTH = 64;

const RESERVED_VARIABLES: ReservedDefinition[] = [
  {
    key: 'PATH',
    fallback: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
    description: 'System execution path (read-only)',
  },
  {
    key: 'HOME',
    fallback: '/home/kali',
    description: 'Home directory (read-only)',
  },
  {
    key: 'USER',
    fallback: 'kali',
    description: 'Logged in user (read-only)',
  },
  {
    key: 'SHELL',
    fallback: '/bin/bash',
    description: 'Default shell (read-only)',
  },
  {
    key: 'LANG',
    fallback: 'en_US.UTF-8',
    description: 'Locale configuration (read-only)',
  },
];

const reservedMap = new Map<string, { value: string; description: string }>();
RESERVED_VARIABLES.forEach(({ key, fallback, description }) => {
  const envValue = typeof process !== 'undefined' ? process.env?.[key] : undefined;
  reservedMap.set(key, { value: envValue ?? fallback, description });
});

const userEnvByWorkspace = new Map<WorkspaceId, WorkspaceData>();
const envSubscribers = new Map<WorkspaceId, Set<EnvSubscriber>>();
const workspaceSubscribers = new Set<WorkspaceSubscriber>();

let activeWorkspaceId: WorkspaceId = 0;

function getStorageKey(workspaceId: WorkspaceId): string {
  return `${STORAGE_PREFIX}${workspaceId}`;
}

function loadWorkspaceEnv(workspaceId: WorkspaceId): WorkspaceData {
  const existing = userEnvByWorkspace.get(workspaceId);
  if (existing) return existing;

  const map: WorkspaceData = new Map();
  if (safeLocalStorage) {
    try {
      const raw = safeLocalStorage.getItem(getStorageKey(workspaceId));
      if (raw) {
        const parsed = JSON.parse(raw) as StoredEnvRecord;
        if (parsed && typeof parsed === 'object') {
          Object.entries(parsed).forEach(([key, value]) => {
            if (typeof key === 'string' && typeof value === 'string') {
              const normalized = key.trim().toUpperCase();
              if (normalized && !reservedMap.has(normalized)) {
                map.set(normalized, value);
              }
            }
          });
        }
      }
    } catch {
      // ignore malformed storage
    }
  }

  userEnvByWorkspace.set(workspaceId, map);
  return map;
}

function persistWorkspaceEnv(workspaceId: WorkspaceId): void {
  if (!safeLocalStorage) return;
  const data = loadWorkspaceEnv(workspaceId);
  const serialized: StoredEnvRecord = {};
  data.forEach((value, key) => {
    serialized[key] = value;
  });
  try {
    safeLocalStorage.setItem(getStorageKey(workspaceId), JSON.stringify(serialized));
  } catch {
    // ignore storage failures (quota or disabled storage)
  }
}

function buildEntries(workspaceId: WorkspaceId): EnvEntry[] {
  const data = loadWorkspaceEnv(workspaceId);
  const entries: EnvEntry[] = [];

  reservedMap.forEach(({ value, description }, key) => {
    entries.push({
      key,
      value,
      readonly: true,
      reserved: true,
      warning: description,
    });
  });

  data.forEach((value, key) => {
    const reserved = reservedMap.has(key);
    entries.push({
      key,
      value,
      readonly: reserved,
      reserved,
      warning: reserved ? reservedMap.get(key)?.description : undefined,
    });
  });

  return entries.sort((a, b) => {
    if (a.reserved !== b.reserved) {
      return a.reserved ? -1 : 1;
    }
    return a.key.localeCompare(b.key);
  });
}

function notifyWorkspace(workspaceId: WorkspaceId): void {
  const subscribers = envSubscribers.get(workspaceId);
  if (!subscribers || subscribers.size === 0) return;
  const entries = buildEntries(workspaceId);
  subscribers.forEach((callback) => callback(entries, { workspaceId }));
}

function notifyWorkspaceChange(): void {
  workspaceSubscribers.forEach((callback) => callback(activeWorkspaceId));
}

function isReservedKey(key: string): boolean {
  return reservedMap.has(key.trim().toUpperCase());
}

export function validateKey(key: string): KeyValidationResult {
  const trimmed = key.trim();
  const normalizedKey = trimmed.toUpperCase();

  if (!trimmed) {
    return { valid: false, normalizedKey: '', message: 'Key is required.' };
  }

  if (trimmed.length > MAX_KEY_LENGTH) {
    return {
      valid: false,
      normalizedKey,
      message: `Keys must be ${MAX_KEY_LENGTH} characters or fewer.`,
    };
  }

  if (!KEY_PATTERN.test(normalizedKey)) {
    return {
      valid: false,
      normalizedKey,
      message: 'Use uppercase letters, numbers, and underscores. Keys cannot start with a number.',
    };
  }

  const reserved = isReservedKey(normalizedKey);
  return {
    valid: true,
    normalizedKey,
    reserved,
    message: reserved ? 'Reserved keys are read-only.' : undefined,
  };
}

export function getEntries(workspaceId: WorkspaceId): EnvEntry[] {
  return buildEntries(workspaceId);
}

export function getValue(workspaceId: WorkspaceId, key: string): string | undefined {
  const normalized = key.trim().toUpperCase();
  if (isReservedKey(normalized)) {
    return reservedMap.get(normalized)?.value;
  }
  return loadWorkspaceEnv(workspaceId).get(normalized);
}

export function setValue(
  workspaceId: WorkspaceId,
  key: string,
  value: string,
  options: { previousKey?: string } = {},
): EnvMutationResult {
  const validation = validateKey(key);
  if (!validation.valid) {
    return { success: false, error: validation.message };
  }

  if (validation.reserved) {
    return {
      success: false,
      error: 'Reserved variables cannot be modified.',
      warning: validation.message,
    };
  }

  const normalized = validation.normalizedKey;
  const data = loadWorkspaceEnv(workspaceId);
  const previousKey = options.previousKey?.trim().toUpperCase();

  if (previousKey && previousKey !== normalized) {
    if (isReservedKey(previousKey)) {
      return {
        success: false,
        error: 'Reserved variables cannot be modified.',
        warning: 'Reserved keys are immutable.',
      };
    }
    data.delete(previousKey);
  }

  data.set(normalized, value);
  persistWorkspaceEnv(workspaceId);
  notifyWorkspace(workspaceId);
  return { success: true, key: normalized };
}

export function deleteKey(workspaceId: WorkspaceId, key: string): EnvMutationResult {
  const normalized = key.trim().toUpperCase();
  if (isReservedKey(normalized)) {
    return {
      success: false,
      error: 'Reserved variables cannot be removed.',
      warning: 'Reserved keys are managed by the system.',
    };
  }

  const data = loadWorkspaceEnv(workspaceId);
  if (!data.has(normalized)) {
    return { success: false, error: 'Variable not found.' };
  }

  data.delete(normalized);
  persistWorkspaceEnv(workspaceId);
  notifyWorkspace(workspaceId);
  return { success: true, key: normalized };
}

export function subscribe(workspaceId: WorkspaceId, callback: EnvSubscriber): () => void {
  const subscribers = envSubscribers.get(workspaceId) ?? new Set<EnvSubscriber>();
  if (!envSubscribers.has(workspaceId)) {
    envSubscribers.set(workspaceId, subscribers);
  }
  subscribers.add(callback);
  callback(buildEntries(workspaceId), { workspaceId });

  return () => {
    subscribers.delete(callback);
    if (subscribers.size === 0) {
      envSubscribers.delete(workspaceId);
    }
  };
}

export function subscribeToWorkspace(callback: WorkspaceSubscriber): () => void {
  workspaceSubscribers.add(callback);
  callback(activeWorkspaceId);
  return () => {
    workspaceSubscribers.delete(callback);
  };
}

export function getActiveWorkspace(): WorkspaceId {
  return activeWorkspaceId;
}

export function setActiveWorkspace(workspaceId: WorkspaceId): void {
  if (typeof workspaceId !== 'number' || Number.isNaN(workspaceId)) return;
  if (workspaceId === activeWorkspaceId) return;
  activeWorkspaceId = workspaceId;
  notifyWorkspaceChange();
}

export function getReservedKeys(): string[] {
  return Array.from(reservedMap.keys());
}

export function getReservedMetadata(key: string): string | undefined {
  return reservedMap.get(key.trim().toUpperCase())?.description;
}

type GlobalWithListener = typeof globalThis & {
  addEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
};

const globalTarget: GlobalWithListener | undefined =
  typeof globalThis !== 'undefined' ? (globalThis as GlobalWithListener) : undefined;

if (globalTarget?.addEventListener) {
  globalTarget.addEventListener('workspace-state', (event: Event) => {
    const detail = (event as CustomEvent).detail as {
      activeWorkspace?: unknown;
    } | undefined;
    const next = typeof detail?.activeWorkspace === 'number' ? detail.activeWorkspace : undefined;
    if (typeof next === 'number') {
      setActiveWorkspace(next);
    }
  });
}

export function __resetEnvStoreForTests(): void {
  userEnvByWorkspace.clear();
  envSubscribers.clear();
  activeWorkspaceId = 0;
  if (safeLocalStorage) {
    try {
      const keys: string[] = [];
      for (let index = 0; index < safeLocalStorage.length; index += 1) {
        const key = safeLocalStorage.key(index);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          keys.push(key);
        }
      }
      keys.forEach((key) => safeLocalStorage.removeItem(key));
    } catch {
      // ignore storage cleanup failures
    }
  }
}

export function __setActiveWorkspaceForTests(workspaceId: WorkspaceId): void {
  setActiveWorkspace(workspaceId);
}
