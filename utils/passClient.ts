import { safeLocalStorage } from './safeStorage';

export interface PassSecretItem {
  id: string;
  label: string;
  url?: string;
  tags?: string[];
  fields: Record<string, string>;
}

export interface PassAuditEntry {
  id: string;
  timestamp: number;
  itemId: string;
  itemLabel: string;
  targetAppId: string;
  targetField: string;
  targetLabel?: string;
  secretField: string;
}

export interface AutofillRequestOptions {
  targetAppId: string;
  targetField: string;
  targetLabel?: string;
  secretField: string;
  onFill: (value: string) => void;
  itemIdHint?: string;
}

export interface AutofillRequestDetails {
  id: string;
  targetAppId: string;
  targetField: string;
  targetLabel?: string;
  secretField: string;
  itemIdHint?: string;
  items: PassSecretItem[];
}

type AutofillListener = (request: AutofillRequestDetails) => void;
type AuditListener = (entries: PassAuditEntry[]) => void;

const AUDIT_STORAGE_KEY = 'passClient.audit-log';
const MAX_AUDIT_ENTRIES = 100;

const DEFAULT_ITEMS: PassSecretItem[] = [
  {
    id: 'example.com',
    label: 'Example.com',
    url: 'https://example.com/login',
    tags: ['demo', 'web'],
    fields: {
      username: 'demo@example.com',
      password: 'P@ssw0rd!',
      note: 'Sample credentials used in walkthroughs.',
    },
  },
  {
    id: 'intranet-admin',
    label: 'Intranet Admin',
    url: 'https://intranet.local/admin',
    tags: ['internal'],
    fields: {
      username: 'admin',
      password: 'N3tw0rk#2024',
      otp: '176395',
    },
  },
  {
    id: 'vpn',
    label: 'Corp VPN',
    tags: ['vpn', 'remote'],
    fields: {
      username: 'kali',
      password: 'vpn-kali-!@#',
      pin: '0486',
    },
  },
];

const auditListeners = new Set<AuditListener>();
const requestListeners = new Set<AutofillListener>();

interface PendingAutofillRequest {
  options: AutofillRequestOptions;
  resolve: (result: boolean) => void;
}

const pendingRequests = new Map<string, PendingAutofillRequest>();

let cachedAuditLog: PassAuditEntry[] | null = null;

const cloneItem = (item: PassSecretItem): PassSecretItem => ({
  ...item,
  fields: { ...item.fields },
});

const getVault = (): PassSecretItem[] => DEFAULT_ITEMS;

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
};

const readAuditFromStorage = (): PassAuditEntry[] => {
  if (!safeLocalStorage) return [];
  try {
    const raw = safeLocalStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PassAuditEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry && typeof entry === 'object')
      .map((entry) => ({
        id: entry.id || generateId(),
        timestamp: typeof entry.timestamp === 'number' ? entry.timestamp : Date.now(),
        itemId: entry.itemId,
        itemLabel: entry.itemLabel || entry.itemId,
        targetAppId: entry.targetAppId,
        targetField: entry.targetField,
        targetLabel: entry.targetLabel,
        secretField: entry.secretField,
      }));
  } catch {
    return [];
  }
};

const writeAuditToStorage = (log: PassAuditEntry[]) => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(log));
  } catch {
    /* ignore storage failures */
  }
};

const loadAuditLog = (): PassAuditEntry[] => {
  if (!cachedAuditLog) {
    cachedAuditLog = readAuditFromStorage();
  }
  return cachedAuditLog;
};

const notifyAuditListeners = () => {
  const snapshot = getAuditLog();
  auditListeners.forEach((listener) => listener(snapshot));
};

const notifyRequestListeners = (request: AutofillRequestDetails) => {
  requestListeners.forEach((listener) => listener({
    ...request,
    items: request.items.map(cloneItem),
  }));
};

export const listItems = (): PassSecretItem[] => getVault().map(cloneItem);

export const getItem = (itemId: string): PassSecretItem | undefined => {
  const found = getVault().find((item) => item.id === itemId);
  return found ? cloneItem(found) : undefined;
};

const findItem = (itemId: string): PassSecretItem | undefined =>
  getVault().find((item) => item.id === itemId);

export const getSecretField = (
  itemId: string,
  field: string,
): string | undefined => {
  const item = findItem(itemId);
  if (!item) return undefined;
  return item.fields[field];
};

export const getAuditLog = (): PassAuditEntry[] =>
  loadAuditLog().map((entry) => ({ ...entry }));

export const subscribeToAuditLog = (listener: AuditListener) => {
  auditListeners.add(listener);
  return () => {
    auditListeners.delete(listener);
  };
};

export const subscribeAutofillRequests = (listener: AutofillListener) => {
  requestListeners.add(listener);
  return () => {
    requestListeners.delete(listener);
  };
};

export const clearAuditLog = () => {
  cachedAuditLog = [];
  writeAuditToStorage(cachedAuditLog);
  notifyAuditListeners();
};

export const recordAuditEntry = (entry: {
  itemId: string;
  itemLabel?: string;
  targetAppId: string;
  targetField: string;
  targetLabel?: string;
  secretField: string;
  timestamp?: number;
}): PassAuditEntry => {
  const log = loadAuditLog();
  const record: PassAuditEntry = {
    id: generateId(),
    timestamp: entry.timestamp ?? Date.now(),
    itemId: entry.itemId,
    itemLabel: entry.itemLabel ?? entry.itemId,
    targetAppId: entry.targetAppId,
    targetField: entry.targetField,
    targetLabel: entry.targetLabel,
    secretField: entry.secretField,
  };
  log.unshift(record);
  if (log.length > MAX_AUDIT_ENTRIES) {
    log.length = MAX_AUDIT_ENTRIES;
  }
  writeAuditToStorage(log);
  notifyAuditListeners();
  return record;
};

export const requestAutofill = (
  options: AutofillRequestOptions,
): Promise<boolean> => {
  const requestId = generateId();
  return new Promise<boolean>((resolve) => {
    pendingRequests.set(requestId, { options, resolve });

    if (requestListeners.size === 0) {
      pendingRequests.delete(requestId);
      resolve(false);
      return;
    }

    const request: AutofillRequestDetails = {
      id: requestId,
      targetAppId: options.targetAppId,
      targetField: options.targetField,
      targetLabel: options.targetLabel,
      secretField: options.secretField,
      itemIdHint: options.itemIdHint,
      items: listItems(),
    };

    notifyRequestListeners(request);
  });
};

export const confirmAutofill = (requestId: string, itemId: string): boolean => {
  const pending = pendingRequests.get(requestId);
  if (!pending) return false;

  const value = getSecretField(itemId, pending.options.secretField);
  if (typeof value !== 'string') {
    pending.resolve(false);
    pendingRequests.delete(requestId);
    return false;
  }

  pending.options.onFill(value);
  const item = findItem(itemId);
  recordAuditEntry({
    itemId,
    itemLabel: item?.label ?? itemId,
    targetAppId: pending.options.targetAppId,
    targetField: pending.options.targetField,
    targetLabel: pending.options.targetLabel,
    secretField: pending.options.secretField,
  });

  pending.resolve(true);
  pendingRequests.delete(requestId);
  return true;
};

export const cancelAutofill = (requestId: string): boolean => {
  const pending = pendingRequests.get(requestId);
  if (!pending) return false;
  pending.resolve(false);
  pendingRequests.delete(requestId);
  return true;
};

export const __resetPassClient = () => {
  pendingRequests.forEach(({ resolve }) => resolve(false));
  pendingRequests.clear();
  cachedAuditLog = [];
  if (safeLocalStorage) {
    try {
      safeLocalStorage.removeItem(AUDIT_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  auditListeners.clear();
  requestListeners.clear();
};

