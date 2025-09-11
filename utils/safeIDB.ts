import { openDB } from 'idb';
import { hasIndexedDB } from './isBrowser';

export function getDb(name: string, version = 1, upgrade?: Parameters<typeof openDB>[2]) {
  if (!hasIndexedDB) return null;
  return openDB(name, version, upgrade);
}
