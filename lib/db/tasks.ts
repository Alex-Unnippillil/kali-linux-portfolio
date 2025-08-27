import { get, set, createStore } from 'idb-keyval';

const STORE_NAME = 'tasks';
const KEY = 'all';
const store = createStore('portfolio-tasks', STORE_NAME);

export async function loadTasks(): Promise<any | undefined> {
  try {
    return (await get(KEY, store)) as any | undefined;
  } catch {
    return undefined;
  }
}

export async function saveTasks(data: any): Promise<void> {
  try {
    await set(KEY, data, store);
  } catch {
    // ignore errors
  }
}
