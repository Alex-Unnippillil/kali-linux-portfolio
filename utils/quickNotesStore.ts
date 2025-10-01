import type { IDBPDatabase } from 'idb';
import { getDb } from './safeIDB';

export interface QuickNoteRecord {
  id: string;
  route: string;
  content: string;
  updatedAt: number;
}

type QuickNotesSchema = {
  notes: QuickNoteRecord;
};

const DB_NAME = 'quick-notes';
const STORE_NAME = 'notes';

let dbPromise: Promise<IDBPDatabase<QuickNotesSchema> | null> | null = null;
const memoryStore = new Map<string, QuickNoteRecord>();

async function openNotesDb() {
  if (!dbPromise) {
    dbPromise = getDb(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('route', 'route', { unique: true });
          store.createIndex('updatedAt', 'updatedAt');
        }
      },
    }) as Promise<IDBPDatabase<QuickNotesSchema> | null>;
  }
  return dbPromise;
}

function cloneRecord(record: QuickNoteRecord | undefined | null) {
  if (!record) return null;
  return { ...record };
}

function cloneArray(records: QuickNoteRecord[]) {
  return records.map((record) => ({ ...record }));
}

export async function getNoteForRoute(route: string) {
  const db = await openNotesDb();
  if (!route) return null;
  if (db) {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const result = await store.get(route);
    await tx.done;
    return cloneRecord(result);
  }
  return cloneRecord(memoryStore.get(route));
}

export async function saveNoteForRoute(route: string, content: string) {
  const record: QuickNoteRecord = {
    id: route,
    route,
    content,
    updatedAt: Date.now(),
  };
  const db = await openNotesDb();
  if (db) {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await tx.store.put(record);
    await tx.done;
  } else {
    memoryStore.set(route, record);
  }
  return cloneRecord(record);
}

export async function listNotes() {
  const db = await openNotesDb();
  if (db) {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const notes = await store.getAll();
    await tx.done;
    return cloneArray(notes);
  }
  return cloneArray(Array.from(memoryStore.values()));
}

export async function searchQuickNotes(query: string) {
  const needle = query.trim().toLowerCase();
  const notes = await listNotes();
  const filtered = needle
    ? notes.filter((note) => {
        const routeMatch = note.route.toLowerCase().includes(needle);
        const contentMatch = note.content.toLowerCase().includes(needle);
        return routeMatch || contentMatch;
      })
    : notes;
  return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function exportNotesAsJson() {
  const notes = await listNotes();
  return JSON.stringify(
    notes.sort((a, b) => a.route.localeCompare(b.route)),
    null,
    2,
  );
}

export async function exportNotesAsMarkdown() {
  const notes = await listNotes();
  const sorted = notes.sort((a, b) => a.route.localeCompare(b.route));
  const sections = sorted.map((note) => {
    const heading = note.route || '/';
    const timestamp = new Date(note.updatedAt).toISOString();
    const body = note.content ? `\n${note.content}` : '\n_No content_';
    return `## ${heading}\n_Last updated: ${timestamp}_${body}`;
  });
  return ['# Quick Notes Export', ...sections].join('\n\n');
}

export async function clearQuickNotes() {
  const db = await openNotesDb();
  if (db) {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await tx.store.clear();
    await tx.done;
  }
  memoryStore.clear();
}

export type { QuickNoteRecord as QuickNote };
