const DB_NAME = 'todoist';
const STORE_NAME = 'tasks';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllTasks() {
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
  await new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(task);
    tx.oncomplete = resolve;
    tx.onerror = resolve;
  });
}

export async function updateTask(task) {
  return addTask(task);
}

export async function toggleTask(id) {
  const db = await openDB();
  await new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => {
      const task = req.result;
      if (task) {
        task.completed = !task.completed;
        store.put(task);
      }
    };
    tx.oncomplete = resolve;
    tx.onerror = resolve;
  });
}

export async function deleteTask(id) {
  const db = await openDB();
  await new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = resolve;
  });
}

export async function clearTasks() {
  const db = await openDB();
  await new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = resolve;
    tx.onerror = resolve;
  });
}

export async function exportTasks() {
  const tasks = await getAllTasks();
  return JSON.stringify(tasks);
}

export async function importTasks(json) {
  const tasks = JSON.parse(json);
  const db = await openDB();
  await new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    tasks.forEach((task) => store.put(task));
    tx.oncomplete = resolve;
    tx.onerror = resolve;
  });
}
