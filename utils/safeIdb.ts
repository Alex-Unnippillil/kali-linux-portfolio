import { openDB, type IDBPDatabase, type OpenDBCallbacks } from 'idb';
import { hasIDB } from './env';

export function makeIdb<DBTypes extends unknown>(
  name: string,
  version: number,
  options?: OpenDBCallbacks<DBTypes>
): Promise<IDBPDatabase<DBTypes>> | null {
  if (!hasIDB) return null;
  return openDB<DBTypes>(name, version, options);
}
