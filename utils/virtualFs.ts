export interface VFSItem {
    name: string;
    icon: string;
    originalPath: string;
    deleted: boolean;
}

const STORAGE_KEY = 'virtual-fs';

function load(): VFSItem[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error(e);
        return [];
    }
}

function save(items: VFSItem[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function markDeleted(item: { name: string; icon: string; originalPath: string }) {
    const items = load();
    items.push({ ...item, deleted: true });
    save(items);
}

export function getDeletedFiles(): VFSItem[] {
    return load().filter((i) => i.deleted);
}

export function restoreFile(originalPath: string) {
    const items = load().filter((i) => !(i.deleted && i.originalPath === originalPath));
    save(items);
}

export function emptyTrash() {
    save([]);
}
