import { getDb } from '../../utils/safeIDB';

export interface SchedulerLogRecord {
  id?: number;
  jobId: string;
  jobName: string;
  scheduledTime: string;
  startedAt: string;
  finishedAt: string;
  exitCode: number;
  notes?: string;
}

const DB_NAME = 'scheduler-logs';
const STORE_NAME = 'runs';

let dbPromise: ReturnType<typeof getDb> | null = null;

const listeners = new Set<() => void>();

const memoryStore: SchedulerLogRecord[] = [];

function notifySubscribers() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore subscriber errors
    }
  });
}

function ensureDb() {
  if (!dbPromise) {
    dbPromise = getDb(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('jobId', 'jobId');
          store.createIndex('startedAt', 'startedAt');
        }
      },
    });
  }
  return dbPromise;
}

function sortLogs(logs: SchedulerLogRecord[]) {
  return logs.sort(
    (a, b) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );
}

export async function addSchedulerLog(
  record: Omit<SchedulerLogRecord, 'id'>,
): Promise<number | null> {
  const dbp = ensureDb();
  if (!dbp) {
    const nextId = (memoryStore[memoryStore.length - 1]?.id ?? 0) + 1;
    memoryStore.push({ ...record, id: nextId });
    notifySubscribers();
    return nextId;
  }
  const db = await dbp;
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const id = await tx.store.add(record);
  await tx.done;
  notifySubscribers();
  return id as number;
}

interface FetchOptions {
  jobId?: string;
  limit?: number;
}

export async function getSchedulerLogs(
  options: FetchOptions = {},
): Promise<SchedulerLogRecord[]> {
  const { jobId, limit } = options;
  const dbp = ensureDb();
  if (!dbp) {
    const filtered = jobId
      ? memoryStore.filter((log) => log.jobId === jobId)
      : [...memoryStore];
    const sorted = sortLogs(filtered);
    return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
  }
  const db = await dbp;
  const tx = db.transaction(STORE_NAME, 'readonly');
  let records = await tx.store.getAll();
  if (jobId) {
    records = records.filter((log) => log.jobId === jobId);
  }
  const sorted = sortLogs(records as SchedulerLogRecord[]);
  const sliced =
    typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
  return sliced;
}

export async function clearSchedulerLogs(jobId?: string) {
  const dbp = ensureDb();
  if (!dbp) {
    if (!jobId) {
      memoryStore.length = 0;
    } else {
      for (let i = memoryStore.length - 1; i >= 0; i -= 1) {
        if (memoryStore[i]?.jobId === jobId) {
          memoryStore.splice(i, 1);
        }
      }
    }
    notifySubscribers();
    return;
  }
  const db = await dbp;
  const tx = db.transaction(STORE_NAME, 'readwrite');
  if (!jobId) {
    await tx.store.clear();
  } else {
    const index = tx.store.index('jobId');
    let cursor = await index.openCursor(jobId);
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
  }
  await tx.done;
  notifySubscribers();
}

export const subscribeSchedulerLogs = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

