// Storage helpers for extension-specific configuration with quota enforcement.

export type SettingPrimitive = string | number | boolean | null;

export type ExtensionSettingValue =
  | SettingPrimitive
  | SettingPrimitive[]
  | Record<string, SettingPrimitive | SettingPrimitive[]>;

export interface BooleanSettingDefinition {
  type: 'boolean';
  key: string;
  label: string;
  description?: string;
  defaultValue: boolean;
}

export interface NumberSettingDefinition {
  type: 'number';
  key: string;
  label: string;
  description?: string;
  defaultValue: number;
  min?: number;
  max?: number;
  step?: number;
}

export interface StringSettingDefinition {
  type: 'string';
  key: string;
  label: string;
  description?: string;
  defaultValue: string;
  multiline?: boolean;
  maxLength?: number;
}

export interface SelectSettingDefinition {
  type: 'select';
  key: string;
  label: string;
  description?: string;
  defaultValue: string;
  options: Array<{ label: string; value: string }>;
}

export type ExtensionSettingDefinition =
  | BooleanSettingDefinition
  | NumberSettingDefinition
  | StringSettingDefinition
  | SelectSettingDefinition;

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

class MemoryStorage implements StorageLike {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

const encoder: TextEncoder | null =
  typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

const DEFAULT_NAMESPACE = 'extensions';
const DEFAULT_QUOTA_BYTES = 4 * 1024; // 4KB per extension by default.

export type ExtensionStorageErrorCode =
  | 'quota_exceeded'
  | 'invalid_payload'
  | 'storage_unavailable';

export class ExtensionStorageError extends Error {
  constructor(
    public code: ExtensionStorageErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ExtensionStorageError';
  }
}

export interface ImportOptions {
  /**
   * When set to true, existing keys will be preserved and reported as conflicts.
   * Defaults to false which overwrites conflicts.
   */
  preserveExisting?: boolean;
  /**
   * Restrict imported keys to this allowlist. When omitted, every key is accepted.
   */
  allowedKeys?: string[];
  /**
   * Replace the current namespace entirely instead of merging when true.
   */
  replace?: boolean;
}

export interface ImportResult {
  applied: Record<string, unknown>;
  conflicts: string[];
}

export interface ExportPayload {
  extensionId: string;
  values: Record<string, unknown>;
  version: number;
}

export interface ExtensionStorageOptions {
  namespace?: string;
  quotaBytes?: number;
  storage?: StorageLike;
}

function byteSize(value: string): number {
  if (encoder) {
    return encoder.encode(value).length;
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.byteLength(value, 'utf8');
  }

  return value.length;
}

function resolveStorage(storage?: StorageLike): StorageLike {
  if (storage) {
    return storage;
  }

  if (typeof window !== 'undefined') {
    try {
      if (window.localStorage) {
        return window.localStorage;
      }
    } catch {
      // Fall through to memory storage when localStorage is inaccessible.
    }
  }

  return new MemoryStorage();
}

function isQuotaError(error: unknown): boolean {
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    return (
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    );
  }
  return false;
}

export class ExtensionStorage {
  private storage: StorageLike;
  private namespace: string;
  private quotaBytes: number;

  constructor(options: ExtensionStorageOptions = {}) {
    this.storage = resolveStorage(options.storage);
    this.namespace = options.namespace ?? DEFAULT_NAMESPACE;
    this.quotaBytes = options.quotaBytes ?? DEFAULT_QUOTA_BYTES;
  }

  private getKey(extensionId: string): string {
    return `${this.namespace}:${extensionId}`;
  }

  private read(extensionId: string): Record<string, unknown> {
    const raw = this.storage.getItem(this.getKey(extensionId));
    if (!raw) {
      return {};
    }

    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>;
      }
      return {};
    } catch {
      return {};
    }
  }

  private write(extensionId: string, values: Record<string, unknown>): void {
    const key = this.getKey(extensionId);
    const sanitized = values ?? {};
    const serialized = JSON.stringify(sanitized);
    const size = byteSize(serialized);

    if (this.quotaBytes > 0 && size > this.quotaBytes) {
      throw new ExtensionStorageError('quota_exceeded', `Extension "${extensionId}" exceeded its ${this.quotaBytes} byte quota.`, {
        size,
        quota: this.quotaBytes,
      });
    }

    try {
      if (Object.keys(sanitized).length === 0) {
        this.storage.removeItem(key);
      } else {
        this.storage.setItem(key, serialized);
      }
    } catch (error) {
      if (isQuotaError(error)) {
        throw new ExtensionStorageError(
          'quota_exceeded',
          `Extension "${extensionId}" exceeded its storage quota.`,
          { cause: error }
        );
      }

      throw new ExtensionStorageError('storage_unavailable', 'Unable to persist extension settings.', {
        cause: error,
      });
    }
  }

  public getAll(extensionId: string): Record<string, unknown> {
    return this.read(extensionId);
  }

  public get<T = unknown>(
    extensionId: string,
    key: string,
    fallback?: T
  ): T | undefined {
    const values = this.read(extensionId);
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      return values[key] as T;
    }
    return fallback;
  }

  public set<T = unknown>(
    extensionId: string,
    key: string,
    value: T
  ): Record<string, unknown> {
    const next = { ...this.read(extensionId), [key]: value };
    this.write(extensionId, next);
    return next;
  }

  public setMany(
    extensionId: string,
    values: Record<string, unknown>
  ): Record<string, unknown> {
    const next = { ...this.read(extensionId), ...values };
    this.write(extensionId, next);
    return next;
  }

  public reset(extensionId: string, keys?: string[]): Record<string, unknown> {
    if (!keys || keys.length === 0) {
      this.write(extensionId, {});
      return {};
    }

    const current = { ...this.read(extensionId) };
    keys.forEach((key) => {
      delete current[key];
    });
    this.write(extensionId, current);
    return current;
  }

  public clear(extensionId: string): void {
    this.storage.removeItem(this.getKey(extensionId));
  }

  public export(extensionId: string): ExportPayload {
    return {
      extensionId,
      values: this.read(extensionId),
      version: 1,
    };
  }

  public exportAsJson(extensionId: string): string {
    return JSON.stringify(this.export(extensionId));
  }

  public import(
    extensionId: string,
    payload: string | Record<string, unknown>,
    options: ImportOptions = {}
  ): ImportResult {
    const { preserveExisting = false, allowedKeys, replace = false } = options;

    const parsed: unknown =
      typeof payload === 'string' ? JSON.parse(payload) : payload;

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new ExtensionStorageError('invalid_payload', 'Extension import payload must be an object.');
    }

    if (
      'extensionId' in (parsed as Record<string, unknown>) &&
      typeof (parsed as Record<string, unknown>).extensionId === 'string' &&
      (parsed as Record<string, unknown>).extensionId !== extensionId
    ) {
      throw new ExtensionStorageError(
        'invalid_payload',
        `Import payload targets "${(parsed as Record<string, unknown>).extensionId}" which does not match "${extensionId}".`
      );
    }

    const dataSource =
      'values' in (parsed as Record<string, unknown>) &&
      (parsed as Record<string, unknown>).values &&
      typeof (parsed as Record<string, unknown>).values === 'object' &&
      !Array.isArray((parsed as Record<string, unknown>).values)
        ? ((parsed as Record<string, unknown>).values as Record<string, unknown>)
        : (parsed as Record<string, unknown>);

    const data = dataSource;
    let current = replace ? {} : { ...this.read(extensionId) };
    const conflicts: string[] = [];

    const keys = allowedKeys ? new Set(allowedKeys) : null;

    Object.entries(data).forEach(([key, value]) => {
      if (keys && !keys.has(key)) {
        return;
      }

      if (preserveExisting && Object.prototype.hasOwnProperty.call(current, key)) {
        conflicts.push(key);
        return;
      }

      current[key] = value;
    });

    this.write(extensionId, current);

    return {
      applied: current,
      conflicts,
    };
  }

  public getUsageBytes(extensionId: string): number {
    const serialized = JSON.stringify(this.read(extensionId));
    return byteSize(serialized);
  }

  public getQuotaBytes(): number {
    return this.quotaBytes;
  }
}

export const extensionStorage = new ExtensionStorage();

export function createDefaultsMap(
  settings: ExtensionSettingDefinition[]
): Record<string, unknown> {
  return settings.reduce<Record<string, unknown>>((acc, setting) => {
    acc[setting.key] = setting.defaultValue;
    return acc;
  }, {});
}
