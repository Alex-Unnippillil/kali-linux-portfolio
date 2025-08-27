export interface TrashItem<T = any> {
  id: string;
  type: string;
  payload: T;
  deletedAt: number;
}

const items: TrashItem[] = [];

export function add({ id, type, payload, deletedAt = Date.now() }: { id: string; type: string; payload: any; deletedAt?: number }) {
  items.push({ id, type, payload, deletedAt });
}

export function restore(id: string) {
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  const [item] = items.splice(idx, 1);
  return item.payload;
}

export function empty(confirm = false) {
  if (!confirm) return false;
  items.length = 0;
  return true;
}

export function search(term: string) {
  const t = term.toLowerCase();
  return items.filter((i) => {
    const name =
      typeof i.payload === 'object' && i.payload !== null && 'name' in i.payload
        ? String((i.payload as any).name).toLowerCase()
        : '';
    return name.includes(t) || i.type.toLowerCase().includes(t);
  });
}

export function size() {
  return items.length;
}

export function list() {
  return [...items];
}

export function purge(now: number = Date.now()) {
  const threshold = now - 30 * 24 * 60 * 60 * 1000;
  const remaining = items.filter((i) => i.deletedAt >= threshold);
  items.length = 0;
  items.push(...remaining);
}

let scheduler: any = null;

export function startScheduler(intervalMs = 24 * 60 * 60 * 1000) {
  stopScheduler();
  scheduler = setInterval(() => purge(), intervalMs);
}

export function stopScheduler() {
  if (scheduler !== null) {
    clearInterval(scheduler);
    scheduler = null;
  }
}

startScheduler();

export default {
  add,
  restore,
  empty,
  search,
  size,
  list,
  purge,
  startScheduler,
  stopScheduler,
};
