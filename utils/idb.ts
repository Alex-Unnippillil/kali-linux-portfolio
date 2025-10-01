"use client";

import {
  encodeCacheValue,
  decodeCacheValue,
  type CachePayload,
} from './cacheCompression';
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
    const raw = (await db.get(
      STORE_SEEDS,
      `${game}-${date}`,
    )) as CachePayload<string>;
    const decoded = await decodeCacheValue<string>(raw);
    return decoded ?? (typeof raw === 'string' ? raw : undefined);
  } catch {
    return undefined;
  }
}

export async function setSeed(game: string, date: string, seed: string): Promise<void> {
  try {
    const dbp = openDB();
    if (!dbp) return;
    const db = await dbp;
    await db.put(
      STORE_SEEDS,
      await encodeCacheValue(seed),
      `${game}-${date}`,
    );
  } catch {
    // ignore
  }
}

export async function saveReplay(game: string, id: string, data: any): Promise<void> {
  try {
    const dbp = openDB();
    if (!dbp) return;
    const db = await dbp;
    await db.put(
      STORE_REPLAYS,
      await encodeCacheValue(data),
      `${game}-${id}`,
    );
  } catch {
    // ignore
  }
}

export async function getReplay<T = any>(game: string, id: string): Promise<T | undefined> {
  try {
    const dbp = openDB();
    if (!dbp) return undefined;
    const db = await dbp;
    const raw = (await db.get(
      STORE_REPLAYS,
      `${game}-${id}`,
    )) as CachePayload<T>;
    const decoded = await decodeCacheValue<T>(raw);
    return decoded ?? (raw as T | undefined);
  } catch {
    return undefined;
  }
}

