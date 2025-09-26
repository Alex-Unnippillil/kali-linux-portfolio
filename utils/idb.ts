"use client";

import { getDb } from './safeIDB';

const DB_NAME = 'kali-games';
const VERSION = 1;
const STORE_SEEDS = 'seeds';
const STORE_REPLAYS = 'replays';

let dbPromise: ReturnType<typeof getDb> | null = null;
function openDB() {
  if (!dbPromise) {
    dbPromise = getDb(DB_NAME, VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_SEEDS)) {
          db.createObjectStore(STORE_SEEDS);
        }
        if (!db.objectStoreNames.contains(STORE_REPLAYS)) {
          db.createObjectStore(STORE_REPLAYS);
        }
      },
    });
  }
  return dbPromise;
}

export async function getSeed(game: string, date: string): Promise<string | undefined> {
  try {
    const dbp = openDB();
    if (!dbp) return undefined;
    const db = await dbp;
    return db.get<string>(STORE_SEEDS, `${game}-${date}`);
  } catch {
    return undefined;
  }
}

export async function setSeed(game: string, date: string, seed: string): Promise<void> {
  try {
    const dbp = openDB();
    if (!dbp) return;
    const db = await dbp;
    await db.put<string>(STORE_SEEDS, seed, `${game}-${date}`);
  } catch {
    // ignore
  }
}

export async function saveReplay(game: string, id: string, data: any): Promise<void> {
  try {
    const dbp = openDB();
    if (!dbp) return;
    const db = await dbp;
    await db.put(STORE_REPLAYS, data, `${game}-${id}`);
  } catch {
    // ignore
  }
}

export async function getReplay<T = any>(game: string, id: string): Promise<T | undefined> {
  try {
    const dbp = openDB();
    if (!dbp) return undefined;
    const db = await dbp;
    return db.get<T>(STORE_REPLAYS, `${game}-${id}`);
  } catch {
    return undefined;
  }
}

