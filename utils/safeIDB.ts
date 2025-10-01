import { openDB, type DBSchema, type IDBPDatabase, type OpenDBCallbacks } from 'idb';
import { hasIndexedDB } from './isBrowser';

export function getDb<Schema extends DBSchema = DBSchema>(
  name: string,
  version = 1,
  options?: OpenDBCallbacks<Schema>,
): Promise<IDBPDatabase<Schema>> | null {
  if (!hasIndexedDB) return null;
  return openDB<Schema>(name, version, options);
}
