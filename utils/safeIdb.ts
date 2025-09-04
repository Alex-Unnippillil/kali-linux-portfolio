"use client";

import type { IDBPDatabase, OpenDBCallbacks } from 'idb';
import { hasIDB } from './env';

export function makeIdb<DBTypes extends unknown>(
  name: string,
  version: number,
  options?: OpenDBCallbacks<DBTypes>
): Promise<IDBPDatabase<DBTypes>> | null {
  if (!hasIDB) return null;
  return import('idb').then(({ openDB }) => openDB<DBTypes>(name, version, options));
}
