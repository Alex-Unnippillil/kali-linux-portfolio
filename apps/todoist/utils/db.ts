import { openDB, IDBPDatabase } from 'idb';

export interface Task {
  id: number;
  title: string;
  due?: string;
  priority: string;
  section?: string;
  recurring?: string;
  completed: boolean;
  group: string;
  updatedAt: number;
}

interface DBTask extends Task {
  dirty?: boolean;
}

const DB_NAME = 'todoist';
const STORE = 'tasks';
let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function loadTasks(): Promise<Record<string, Task[]>> {
  try {
    const db = await getDB();
    const all = await db.getAll(STORE);
    const groups: Record<string, Task[]> = { Today: [], Upcoming: [], Someday: [] };
    all.forEach((t: DBTask) => {
      if (!groups[t.group]) groups[t.group] = [];
      groups[t.group].push(t);
    });
    return groups;
  } catch {
    return { Today: [], Upcoming: [], Someday: [] };
  }
}

export async function saveGroupTask(group: string, task: DBTask) {
  const db = await getDB();
  await db.put(STORE, {
    ...task,
    group,
    updatedAt: task.updatedAt || Date.now(),
    dirty: true,
  });
}

export async function saveGroups(groups: Record<string, Task[]>) {
  const db = await getDB();
  const tx = db.transaction(STORE, 'readwrite');
  await tx.store.clear();
  Object.entries(groups).forEach(([group, arr]) => {
    arr.forEach((t) => {
      tx.store.put({ ...t, group, updatedAt: t.updatedAt || Date.now() });
    });
  });
  await tx.done;
}

export async function deleteTask(id: number) {
  const db = await getDB();
  await db.delete(STORE, id);
}

export async function syncWithServer(): Promise<{ groups: Record<string, Task[]>; conflicts: Task[] }> {
  const local = await loadTasks();
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { groups: local, conflicts: [] };
  }
  try {
    const res = await fetch('/api/tasks');
    if (!res.ok) throw new Error('failed');
    const server: Record<string, Task[]> = await res.json();
    const conflicts: Task[] = [];

    const localMap = new Map<number, Task>();
    Object.values(local).forEach((arr) => arr.forEach((t) => localMap.set(t.id, t)));

    Object.entries(server).forEach(([group, arr]) => {
      arr.forEach((t) => {
        const localTask = localMap.get(t.id);
        if (localTask && localTask.updatedAt !== t.updatedAt) {
          conflicts.push(t);
        }
      });
    });

    // overwrite local with server version
    await saveGroups(server);
    return { groups: server, conflicts };
  } catch {
    return { groups: local, conflicts: [] };
  }
}

export async function markSynced(taskIds: number[]) {
  const db = await getDB();
  const tx = db.transaction(STORE, 'readwrite');
  for (const id of taskIds) {
    const task = await tx.store.get(id);
    if (task) {
      task.dirty = false;
      tx.store.put(task);
    }
  }
  await tx.done;
}

export async function getDirtyTasks(): Promise<DBTask[]> {
  const db = await getDB();
  const all: DBTask[] = await db.getAll(STORE);
  return all.filter((t) => t.dirty);
}

