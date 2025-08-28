import { get, set, createStore } from 'idb-keyval';
const STORE_NAME = 'tasks';
const KEY = 'all';
const store = createStore('portfolio-tasks', STORE_NAME);
export async function loadTasks() {
    try {
        return (await get(KEY, store));
    }
    catch {
        return undefined;
    }
}
export async function saveTasks(data) {
    try {
        await set(KEY, data, store);
    }
    catch {
        // ignore errors
    }
}
