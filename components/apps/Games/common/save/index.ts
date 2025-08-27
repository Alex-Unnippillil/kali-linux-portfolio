import { createStore, get, set, del, keys } from 'idb-keyval';

export interface SaveSlot {
  name: string;
  data: unknown;
}

const getStore = (gameId: string) => createStore(`game:${gameId}`, 'saves');

export async function saveSlot(gameId: string, slot: SaveSlot): Promise<void> {
  const store = getStore(gameId);
  await set(slot.name, slot.data, store);
}

export async function loadSlot<T = unknown>(gameId: string, name: string): Promise<T | undefined> {
  const store = getStore(gameId);
  return get<T>(name, store);
}

export async function deleteSlot(gameId: string, name: string): Promise<void> {
  const store = getStore(gameId);
  await del(name, store);
}

export async function listSlots(gameId: string): Promise<string[]> {
  const store = getStore(gameId);
  const allKeys = await keys(store);
  return allKeys as string[];
}

export async function exportSaves(gameId: string): Promise<SaveSlot[]> {
  const store = getStore(gameId);
  const allKeys = await keys(store);
  const saves: SaveSlot[] = [];
  for (const key of allKeys) {
    const data = await get(key, store);
    saves.push({ name: key as string, data });
  }
  return saves;
}

export async function importSaves(gameId: string, saves: SaveSlot[]): Promise<void> {
  const store = getStore(gameId);
  await Promise.all(saves.map((slot) => set(slot.name, slot.data, store)));
}

