import { createStore, del, entries, get, set, clear } from 'idb-keyval';

export interface StoredRecording {
    id: string;
    name: string;
    blob: Blob;
    createdAt: number;
    durationMs: number;
    size: number;
}

const store = createStore('screen-recorder', 'recordings');

const DEFAULT_NAME_PREFIX = 'Recording';

function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `rec-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function defaultName() {
    const now = new Date();
    return `${DEFAULT_NAME_PREFIX} ${now.toLocaleString()}`;
}

export async function saveRecording(blob: Blob, durationMs: number): Promise<StoredRecording> {
    const record: StoredRecording = {
        id: generateId(),
        name: defaultName(),
        blob,
        createdAt: Date.now(),
        durationMs,
        size: blob.size,
    };
    await set(record.id, record, store);
    return record;
}

export async function listRecordings(): Promise<StoredRecording[]> {
    const all = await entries<string, StoredRecording>(store);
    return all
        .map(([, value]) => value)
        .filter((value): value is StoredRecording => Boolean(value))
        .sort((a, b) => b.createdAt - a.createdAt);
}

export async function renameRecording(id: string, name: string): Promise<StoredRecording | null> {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const existing = await get<StoredRecording>(id, store);
    if (!existing) return null;
    const updated = { ...existing, name: trimmed };
    await set(id, updated, store);
    return updated;
}

export async function deleteRecording(id: string): Promise<void> {
    await del(id, store);
}

export async function clearRecordings(): Promise<void> {
    await clear(store);
}
