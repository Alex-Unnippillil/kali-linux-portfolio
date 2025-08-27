const DB_NAME = 'todoist';
const STORE_NAME = 'tasks';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getTasks() {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function addTask(task) {
  const db = await openDB();
  return await new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(task);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

export async function updateTask(task) {
  const db = await openDB();
  return await new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(task);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function deleteTask(id) {
  const db = await openDB();
  return await new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function exportTasks() {
  const tasks = await getTasks();
  return JSON.stringify(tasks);
}

export async function importTasks(json) {
  const tasks = JSON.parse(json);
  const db = await openDB();
  return await new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    tasks.forEach((t) => {
      if (!t.id) delete t.id; // allow auto increment
      store.put(t);
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}
