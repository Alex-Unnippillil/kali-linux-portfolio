import { createStore, get, set } from 'idb-keyval';

const STORE_NAME = 'app-flags';
const STORE_KEY = 'flags';
const STATE_KEY = 'state';

const store = createStore(STORE_NAME, STORE_KEY);

const hasIndexedDB = typeof indexedDB !== 'undefined';

export type FlagRecord = Record<string, boolean>;

export async function readFlags<T extends FlagRecord>(defaults: T): Promise<T> {
  if (!hasIndexedDB) {
    return { ...defaults };
  }

  const stored = (await get(STATE_KEY, store)) as Partial<T> | undefined;
  return { ...defaults, ...(stored || {}) };
}

export async function writeFlags<T extends FlagRecord>(flags: T): Promise<T> {
  if (!hasIndexedDB) {
    return { ...flags };
  }

  await set(STATE_KEY, flags, store);
  return flags;
}

export async function mergeFlags<T extends FlagRecord>(
  defaults: T,
  patch: Partial<T>,
): Promise<T> {
  const current = await readFlags(defaults);
  const next = { ...current, ...patch } as T;
  await writeFlags(next);
  return next;
}

export async function resetFlags<T extends FlagRecord>(defaults: T): Promise<T> {
  await writeFlags(defaults);
  return { ...defaults };
}
