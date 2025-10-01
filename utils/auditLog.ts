import { isBrowser, hasIndexedDB } from './isBrowser';
import { getDb } from './safeIDB';

export const AUDIT_LOG_ENABLED_KEY = 'audit-log-enabled';

const AUDIT_FILE_NAME = 'audit-log.json';
const AUDIT_DB_NAME = 'kali-audit-log';
const AUDIT_STORE_NAME = 'audit';
const AUDIT_STORE_KEY = 'entries';
const AUDIT_LOG_VERSION = 1;

const textEncoder = new TextEncoder();

interface AuditLogFile {
  version: number;
  entries: AuditLogEntry[];
}

export interface AuditEventInput {
  actor: string;
  action: string;
  payload?: unknown;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  payload: unknown;
  payloadHash: string;
}

export interface AuditIntegrityIssue {
  index: number;
  reason: string;
  entry: AuditLogEntry | null;
}

export interface AuditIntegrityReport {
  valid: boolean;
  issues: AuditIntegrityIssue[];
}

export interface AuditImportResult {
  success: boolean;
  importedCount: number;
  report: AuditIntegrityReport;
  error?: string;
}

let cachedState: AuditLogFile | null = null;
let idbPromise: ReturnType<typeof getDb> | null = null;

const memoryState: AuditLogFile = { version: AUDIT_LOG_VERSION, entries: [] };

function openAuditDb() {
  if (!idbPromise) {
    idbPromise = getDb(AUDIT_DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(AUDIT_STORE_NAME)) {
          db.createObjectStore(AUDIT_STORE_NAME);
        }
      },
    });
  }
  return idbPromise;
}

function hasOpfs() {
  return (
    isBrowser &&
    typeof navigator.storage !== 'undefined' &&
    typeof navigator.storage.getDirectory === 'function'
  );
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `audit-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function sanitizePayload(payload: unknown): unknown {
  if (payload === undefined) return null;
  try {
    return JSON.parse(JSON.stringify(payload));
  } catch {
    return { message: 'Non-serializable payload', value: String(payload) };
  }
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function digestString(value: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hash = await crypto.subtle.digest('SHA-256', textEncoder.encode(value));
    return toHex(hash);
  }
  try {
    const { createHash } = await import('crypto');
    return createHash('sha256').update(value).digest('hex');
  } catch {
    return value;
  }
}

async function hashPayload(payload: unknown): Promise<string> {
  return digestString(JSON.stringify(payload));
}

async function readFromOpfs(): Promise<AuditLogFile | null> {
  if (!hasOpfs()) return null;
  try {
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(AUDIT_FILE_NAME);
    const file = await handle.getFile();
    const parsed = JSON.parse(await file.text());
    if (parsed && typeof parsed === 'object') {
      return normalizeFile(parsed);
    }
  } catch {
    return null;
  }
  return null;
}

async function writeToOpfs(state: AuditLogFile): Promise<boolean> {
  if (!hasOpfs()) return false;
  try {
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(AUDIT_FILE_NAME, { create: true });
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(state));
    await writable.close();
    return true;
  } catch {
    return false;
  }
}

async function readFromIdb(): Promise<AuditLogFile | null> {
  if (!hasIndexedDB) return null;
  const dbp = openAuditDb();
  if (!dbp) return null;
  try {
    const db = await dbp;
    const stored = await db.get(AUDIT_STORE_NAME, AUDIT_STORE_KEY);
    if (!stored) return null;
    return normalizeFile(stored);
  } catch {
    return null;
  }
}

async function writeToIdb(state: AuditLogFile): Promise<boolean> {
  if (!hasIndexedDB) return false;
  const dbp = openAuditDb();
  if (!dbp) return false;
  try {
    const db = await dbp;
    await db.put(AUDIT_STORE_NAME, state, AUDIT_STORE_KEY);
    return true;
  } catch {
    return false;
  }
}

function normalizeFile(raw: any): AuditLogFile {
  if (!raw || typeof raw !== 'object') {
    return { version: AUDIT_LOG_VERSION, entries: [] };
  }
  const version =
    typeof raw.version === 'number' ? raw.version : AUDIT_LOG_VERSION;
  const entries = Array.isArray(raw.entries) ? raw.entries : [];
  return { version, entries };
}

async function loadState(): Promise<AuditLogFile> {
  if (cachedState) return cachedState;
  const fromOpfs = await readFromOpfs();
  if (fromOpfs) {
    cachedState = { ...fromOpfs, entries: [...fromOpfs.entries] };
    memoryState.entries = [...cachedState.entries];
    return cachedState;
  }
  const fromIdb = await readFromIdb();
  if (fromIdb) {
    cachedState = { ...fromIdb, entries: [...fromIdb.entries] };
    memoryState.entries = [...cachedState.entries];
    return cachedState;
  }
  cachedState = { ...memoryState, entries: [...memoryState.entries] };
  return cachedState;
}

async function persistState(state: AuditLogFile): Promise<void> {
  cachedState = { version: state.version, entries: [...state.entries] };
  memoryState.entries = [...state.entries];
  if (!(await writeToOpfs(state))) {
    await writeToIdb(state);
  } else {
    await writeToIdb(state);
  }
}

function isLoggingEnabled(): boolean {
  if (isBrowser) {
    try {
      return localStorage.getItem(AUDIT_LOG_ENABLED_KEY) === 'true';
    } catch {
      return false;
    }
  }
  return false;
}

function validateStringField(
  value: unknown,
  field: 'actor' | 'action',
  index: number,
  issues: AuditIntegrityIssue[],
): string {
  if (typeof value === 'string' && value.trim()) return value;
  issues.push({
    index,
    reason: `${field} missing`,
    entry: null,
  });
  return '';
}

function validateTimestamp(
  value: unknown,
  index: number,
  issues: AuditIntegrityIssue[],
): string {
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) {
    return value;
  }
  issues.push({ index, reason: 'invalid timestamp', entry: null });
  return new Date(0).toISOString();
}

async function inspectEntry(
  raw: any,
  index: number,
): Promise<{ entry: AuditLogEntry; issues: AuditIntegrityIssue[] }> {
  const issues: AuditIntegrityIssue[] = [];
  if (!raw || typeof raw !== 'object') {
    return {
      entry: {
        id: createId(),
        actor: '',
        action: '',
        timestamp: new Date(0).toISOString(),
        payload: null,
        payloadHash: '',
      },
      issues: [
        {
          index,
          reason: 'entry is not an object',
          entry: null,
        },
      ],
    };
  }
  const actor = validateStringField(raw.actor, 'actor', index, issues);
  const action = validateStringField(raw.action, 'action', index, issues);
  const timestamp = validateTimestamp(raw.timestamp, index, issues);
  const payload = sanitizePayload(raw.payload);
  const payloadHash = typeof raw.payloadHash === 'string' ? raw.payloadHash : '';
  if (!payloadHash) {
    issues.push({ index, reason: 'payload hash missing', entry: null });
  } else {
    const computed = await hashPayload(payload);
    if (computed !== payloadHash) {
      issues.push({ index, reason: 'payload hash mismatch', entry: null });
    }
  }
  const entry: AuditLogEntry = {
    id:
      typeof raw.id === 'string' && raw.id.trim()
        ? raw.id
        : createId(),
    actor,
    action,
    timestamp,
    payload,
    payloadHash,
  };
  return { entry, issues };
}

export async function appendAuditEvent(
  event: AuditEventInput,
): Promise<AuditLogEntry | null> {
  if (!isLoggingEnabled()) return null;
  const { actor, action } = event;
  if (!actor || !action) return null;
  const state = await loadState();
  const payload = sanitizePayload(event.payload);
  const payloadHash = await hashPayload(payload);
  const entry: AuditLogEntry = {
    id: createId(),
    actor,
    action,
    timestamp: new Date().toISOString(),
    payload,
    payloadHash,
  };
  state.entries.push(entry);
  await persistState(state);
  return entry;
}

export async function getAuditLog(): Promise<AuditLogEntry[]> {
  const state = await loadState();
  return [...state.entries];
}

export async function clearAuditLog(): Promise<void> {
  const empty: AuditLogFile = { version: AUDIT_LOG_VERSION, entries: [] };
  await persistState(empty);
  if (hasOpfs()) {
    try {
      const root = await navigator.storage.getDirectory();
      await root.removeEntry(AUDIT_FILE_NAME);
    } catch {
      // ignore
    }
  }
}

export async function verifyAuditLog(
  entries?: AuditLogEntry[],
): Promise<AuditIntegrityReport> {
  const data = entries ?? (await getAuditLog());
  const issues: AuditIntegrityIssue[] = [];
  await Promise.all(
    data.map(async (entry, index) => {
      const { issues: entryIssues } = await inspectEntry(entry, index);
      issues.push(
        ...entryIssues.map((issue) => ({
          ...issue,
          entry,
        })),
      );
    }),
  );
  return { valid: issues.length === 0, issues };
}

export async function exportAuditLog(): Promise<string> {
  const state = await loadState();
  const payload = {
    version: state.version,
    exportedAt: new Date().toISOString(),
    entries: state.entries,
  };
  const integrity = await digestString(JSON.stringify(payload.entries));
  return JSON.stringify({ ...payload, integrity }, null, 2);
}

export async function importAuditLog(
  raw: string | object,
): Promise<AuditImportResult> {
  let parsed: any;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (error) {
    return {
      success: false,
      importedCount: 0,
      error: 'Invalid JSON',
      report: { valid: false, issues: [] },
    };
  }
  if (!parsed || typeof parsed !== 'object') {
    return {
      success: false,
      importedCount: 0,
      error: 'Invalid export format',
      report: { valid: false, issues: [] },
    };
  }
  const { entries, integrity } = parsed;
  if (!Array.isArray(entries)) {
    return {
      success: false,
      importedCount: 0,
      error: 'Missing entries array',
      report: { valid: false, issues: [] },
    };
  }
  const expectedIntegrity = await digestString(JSON.stringify(entries));
  if (expectedIntegrity !== integrity) {
    return {
      success: false,
      importedCount: 0,
      error: 'Integrity check failed',
      report: { valid: false, issues: [] },
    };
  }
  const normalized: AuditLogEntry[] = [];
  const issues: AuditIntegrityIssue[] = [];
  for (let i = 0; i < entries.length; i += 1) {
    const { entry, issues: entryIssues } = await inspectEntry(entries[i], i);
    if (entryIssues.length > 0) {
      issues.push(
        ...entryIssues.map((issue) => ({
          ...issue,
          entry,
        })),
      );
    }
    normalized.push(entry);
  }
  const report: AuditIntegrityReport = {
    valid: issues.length === 0,
    issues,
  };
  if (!report.valid) {
    return {
      success: false,
      importedCount: 0,
      error: 'Log entries failed integrity validation',
      report,
    };
  }
  await persistState({ version: AUDIT_LOG_VERSION, entries: normalized });
  return { success: true, importedCount: normalized.length, report };
}

export function isAuditLoggingEnabled(): boolean {
  return isLoggingEnabled();
}

