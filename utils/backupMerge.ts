import { safeLocalStorage } from './safeStorage';

export type BackupBuckets = Record<string, unknown>;

export type MergeDecision = 'local' | 'incoming';

export type MergeDecisionMap = Record<string, MergeDecision>;

export interface BucketDiff {
  bucket: string;
  type: 'object' | 'array' | 'primitive';
  added: string[];
  removed: string[];
  changed: string[];
  incomingOnly: boolean;
  localOnly: boolean;
  hasDifferences: boolean;
}

export interface MergeAuditEntry {
  id: string;
  bucket: string;
  decision: MergeDecision;
  changedKeys: string[];
  timestamp: number;
}

export interface MergeResult {
  merged: BackupBuckets;
  auditEntries: MergeAuditEntry[];
}

export const AUDIT_LOG_STORAGE_KEY = 'backup-merge-audit-log';

const BUCKET_ADDED_TOKEN = '[bucket added]';
const BUCKET_REMOVED_TOKEN = '[bucket removed]';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const cloneValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(cloneValue);
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    const keys = Object.keys(value).sort();
    for (const key of keys) {
      result[key] = cloneValue(value[key]);
    }
    return result;
  }
  return value;
};

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (isPlainObject(value)) {
    const entries = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
    return `{${entries.join(',')}}`;
  }
  if (value === undefined) return 'undefined';
  return JSON.stringify(value);
};

const compareValues = (a: unknown, b: unknown): boolean =>
  stableStringify(a) === stableStringify(b);

const createDiffForObjects = (
  bucket: string,
  localValue: Record<string, unknown>,
  incomingValue: Record<string, unknown>,
): BucketDiff => {
  const localKeys = new Set(Object.keys(localValue));
  const incomingKeys = new Set(Object.keys(incomingValue));
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];

  const allKeys = new Set([...localKeys, ...incomingKeys]);
  const sortedKeys = Array.from(allKeys).sort();

  for (const key of sortedKeys) {
    const hasLocal = localKeys.has(key);
    const hasIncoming = incomingKeys.has(key);
    if (!hasLocal && hasIncoming) {
      added.push(key);
    } else if (hasLocal && !hasIncoming) {
      removed.push(key);
    } else if (!compareValues(localValue[key], incomingValue[key])) {
      changed.push(key);
    }
  }

  const hasDifferences = added.length > 0 || removed.length > 0 || changed.length > 0;

  return {
    bucket,
    type: 'object',
    added,
    removed,
    changed,
    incomingOnly: false,
    localOnly: false,
    hasDifferences,
  };
};

const createDiffForArrays = (
  bucket: string,
  localValue: unknown[],
  incomingValue: unknown[],
): BucketDiff => {
  const maxLength = Math.max(localValue.length, incomingValue.length);
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];

  for (let index = 0; index < maxLength; index += 1) {
    const hasLocal = index < localValue.length;
    const hasIncoming = index < incomingValue.length;
    const label = `[${index}]`;
    if (!hasLocal && hasIncoming) {
      added.push(label);
    } else if (hasLocal && !hasIncoming) {
      removed.push(label);
    } else if (!compareValues(localValue[index], incomingValue[index])) {
      changed.push(label);
    }
  }

  const hasDifferences = added.length > 0 || removed.length > 0 || changed.length > 0;

  return {
    bucket,
    type: 'array',
    added,
    removed,
    changed,
    incomingOnly: false,
    localOnly: false,
    hasDifferences,
  };
};

const createDiffForPrimitive = (
  bucket: string,
  localValue: unknown,
  incomingValue: unknown,
): BucketDiff => ({
  bucket,
  type: 'primitive',
  added: [],
  removed: [],
  changed: compareValues(localValue, incomingValue) ? [] : ['value'],
  incomingOnly: false,
  localOnly: false,
  hasDifferences: !compareValues(localValue, incomingValue),
});

export const computeBucketDiffs = (
  localBuckets: BackupBuckets,
  incomingBuckets: BackupBuckets,
): BucketDiff[] => {
  const names = new Set([
    ...Object.keys(localBuckets || {}),
    ...Object.keys(incomingBuckets || {}),
  ]);
  const sortedNames = Array.from(names).sort();
  const diffs: BucketDiff[] = [];

  for (const bucket of sortedNames) {
    const localValue = localBuckets[bucket];
    const incomingValue = incomingBuckets[bucket];

    if (localValue === undefined && incomingValue === undefined) {
      continue;
    }

    if (localValue === undefined) {
      const diff: BucketDiff = {
        bucket,
        type: Array.isArray(incomingValue)
          ? 'array'
          : isPlainObject(incomingValue)
            ? 'object'
            : 'primitive',
        added: isPlainObject(incomingValue)
          ? Object.keys(incomingValue).sort()
          : Array.isArray(incomingValue)
            ? incomingValue.map((_, index) => `[${index}]`)
            : ['value'],
        removed: [],
        changed: [],
        incomingOnly: true,
        localOnly: false,
        hasDifferences: true,
      };
      diffs.push(diff);
      continue;
    }

    if (incomingValue === undefined) {
      const diff: BucketDiff = {
        bucket,
        type: Array.isArray(localValue)
          ? 'array'
          : isPlainObject(localValue)
            ? 'object'
            : 'primitive',
        added: [],
        removed: isPlainObject(localValue)
          ? Object.keys(localValue).sort()
          : Array.isArray(localValue)
            ? localValue.map((_, index) => `[${index}]`)
            : ['value'],
        changed: [],
        incomingOnly: false,
        localOnly: true,
        hasDifferences: true,
      };
      diffs.push(diff);
      continue;
    }

    if (Array.isArray(localValue) && Array.isArray(incomingValue)) {
      diffs.push(createDiffForArrays(bucket, localValue, incomingValue));
    } else if (isPlainObject(localValue) && isPlainObject(incomingValue)) {
      diffs.push(createDiffForObjects(bucket, localValue, incomingValue));
    } else {
      diffs.push(createDiffForPrimitive(bucket, localValue, incomingValue));
    }
  }

  return diffs;
};

export const mergeSnapshots = (
  localBuckets: BackupBuckets,
  incomingBuckets: BackupBuckets,
  decisions: MergeDecisionMap,
): MergeResult => {
  const names = new Set([
    ...Object.keys(localBuckets || {}),
    ...Object.keys(incomingBuckets || {}),
  ]);
  const sortedNames = Array.from(names).sort();
  const merged: BackupBuckets = {};
  const auditEntries: MergeAuditEntry[] = [];
  const diffs = computeBucketDiffs(localBuckets, incomingBuckets);
  const diffMap = new Map<string, BucketDiff>(diffs.map((diff) => [diff.bucket, diff]));
  const baseTime = Date.now();
  let counter = 0;

  for (const bucket of sortedNames) {
    const decision = decisions[bucket]
      ?? (incomingBuckets[bucket] !== undefined ? 'incoming' : 'local');
    const source = decision === 'incoming'
      ? incomingBuckets[bucket]
      : localBuckets[bucket];

    if (source !== undefined) {
      merged[bucket] = cloneValue(source);
    }

    const diff = diffMap.get(bucket);
    if (diff && diff.hasDifferences) {
      const changedSet = new Set<string>();
      diff.added.forEach((key) => changedSet.add(key));
      diff.removed.forEach((key) => changedSet.add(key));
      diff.changed.forEach((key) => changedSet.add(key));
      if (diff.incomingOnly) changedSet.add(BUCKET_ADDED_TOKEN);
      if (diff.localOnly) changedSet.add(BUCKET_REMOVED_TOKEN);
      const changedKeys = Array.from(changedSet).sort();
      if (changedKeys.length > 0) {
        const timestamp = baseTime + counter;
        auditEntries.push({
          id: `${timestamp}-${bucket}-${decision}`,
          bucket,
          decision,
          changedKeys,
          timestamp,
        });
        counter += 1;
      }
    }
  }

  return { merged, auditEntries };
};

const validateAuditEntry = (value: unknown): value is MergeAuditEntry => {
  if (!value || typeof value !== 'object') return false;
  const entry = value as MergeAuditEntry;
  return (
    typeof entry.id === 'string'
    && typeof entry.bucket === 'string'
    && (entry.decision === 'local' || entry.decision === 'incoming')
    && Array.isArray(entry.changedKeys)
    && typeof entry.timestamp === 'number'
  );
};

export const loadAuditLog = (): MergeAuditEntry[] => {
  if (!safeLocalStorage) return [];
  try {
    const raw = safeLocalStorage.getItem(AUDIT_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(validateAuditEntry)
      .map((entry) => ({
        ...entry,
        changedKeys: [...entry.changedKeys].sort(),
      }))
      .sort((a, b) => (a.timestamp === b.timestamp
        ? a.id.localeCompare(b.id)
        : a.timestamp - b.timestamp));
  } catch {
    return [];
  }
};

const persistAuditLog = (entries: MergeAuditEntry[]): void => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore persistence errors
  }
};

export const appendAuditEntries = (
  entries: MergeAuditEntry[],
): MergeAuditEntry[] => {
  if (entries.length === 0) {
    return loadAuditLog();
  }
  const current = loadAuditLog();
  const combined = [...current, ...entries].sort((a, b) => (
    a.timestamp === b.timestamp
      ? a.id.localeCompare(b.id)
      : a.timestamp - b.timestamp
  ));
  persistAuditLog(combined);
  return combined;
};

export const clearAuditLog = (): void => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.removeItem(AUDIT_LOG_STORAGE_KEY);
  } catch {
    // ignore removal errors
  }
};

