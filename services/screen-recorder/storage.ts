const DB_NAME = 'screen-recorder';
const STORE_NAME = 'recordings';
const DB_VERSION = 1;

export interface StoredScreenRecording {
    id: string;
    name: string;
    createdAt: number;
    blob: Blob;
}

export interface StoredScreenRecordingSummary {
    id: string;
    name: string;
    createdAt: number;
}

function ensureIndexedDb(): IDBFactory {
    if (typeof indexedDB === 'undefined') {
        throw new Error('IndexedDB is not available in this environment.');
    }

    return indexedDB;
}

function openDatabase(): Promise<IDBDatabase> {
    const factory = ensureIndexedDb();

    return new Promise((resolve, reject) => {
        const request = factory.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error ?? new Error('Failed to open IndexedDB.'));
        };
    });
}

function generateId() {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }

    return `${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
}

async function runStoreOperation<T>(
    mode: IDBTransactionMode,
    handler: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
    const db = await openDatabase();

    try {
        return await new Promise<T>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, mode);
            const store = tx.objectStore(STORE_NAME);
            const request = handler(store);

            request.onsuccess = () => {
                resolve(request.result as T);
            };

            request.onerror = () => {
                reject(request.error ?? new Error('IndexedDB operation failed.'));
            };
        });
    } finally {
        db.close();
    }
}

export async function saveRecordingToIndexedDB(name: string, blob: Blob): Promise<StoredScreenRecording> {
    const record: StoredScreenRecording = {
        id: generateId(),
        name,
        createdAt: Date.now(),
        blob,
    };

    await runStoreOperation('readwrite', (store) => store.put(record));

    return record;
}

export async function listStoredRecordings(): Promise<StoredScreenRecordingSummary[]> {
    const records = await runStoreOperation('readonly', (store) => store.getAll());

    return (records as StoredScreenRecording[]).map(({ id, name, createdAt }) => ({ id, name, createdAt }));
}

export async function getStoredRecording(id: string): Promise<StoredScreenRecording | undefined> {
    const record = await runStoreOperation('readonly', (store) => store.get(id));

    return record as StoredScreenRecording | undefined;
}

export async function deleteStoredRecording(id: string): Promise<void> {
    await runStoreOperation('readwrite', (store) => store.delete(id));
}

