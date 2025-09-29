import { openDB, type DBSchema } from 'idb';

const DB_NAME = 'contact-draft-queue';
const STORE_NAME = 'drafts';
const DB_VERSION = 1;

type DraftStatus = 'queued' | 'sending' | 'error';

export interface ContactDraftPayload {
  name: string;
  email: string;
  message: string;
  honeypot: string;
  csrfToken: string;
  recaptchaToken: string;
}

export interface ContactDraftRecord {
  id: string;
  payload: ContactDraftPayload;
  status: DraftStatus;
  createdAt: number;
  updatedAt: number;
  attempts: number;
  lastTriedAt?: number;
  lastError?: string;
}

interface ContactDraftDb extends DBSchema {
  drafts: {
    key: string;
    value: ContactDraftRecord;
  };
}

let dbPromise: Promise<import('idb').IDBPDatabase<ContactDraftDb>> | null = null;

function getDbPromise() {
  if (typeof window === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB<ContactDraftDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

async function getDb() {
  const promise = getDbPromise();
  if (!promise) return null;
  try {
    return await promise;
  } catch {
    return null;
  }
}

export async function listContactDrafts() {
  const db = await getDb();
  if (!db) return [] as ContactDraftRecord[];
  return db.getAll(STORE_NAME);
}

export async function getContactDraft(id: string) {
  const db = await getDb();
  if (!db) return null;
  return db.get(STORE_NAME, id);
}

export async function deleteContactDraft(id: string) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(STORE_NAME, id);
  return true;
}

export async function upsertContactDraft(record: ContactDraftRecord) {
  const db = await getDb();
  if (!db) return false;
  await db.put(STORE_NAME, record);
  return true;
}

export async function clearAllDrafts() {
  const db = await getDb();
  if (!db) return false;
  await db.clear(STORE_NAME);
  return true;
}

export type { DraftStatus };

