export interface TrashItem {
  id: string;
  type: string;
  payload: any;
}

type Listener = (items: TrashItem[]) => void;

let items: TrashItem[] = [];
const listeners: Listener[] = [];

const notify = () => {
  listeners.forEach((l) => l([...items]));
};

export const trash = {
  add(item: TrashItem): void {
    items.push(item);
    notify();
  },
  restore(id: string): TrashItem | null {
    const index = items.findIndex((i) => i.id === id);
    if (index !== -1) {
      const [item] = items.splice(index, 1);
      notify();
      return item;
    }
    return null;
  },
  empty(): void {
    if (items.length === 0) return;
    items = [];
    notify();
  },
  list(): TrashItem[] {
    return [...items];
  },
  size(): number {
    return items.length;
  },
  subscribe(listener: Listener): () => void {
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  },
};

export default trash;
