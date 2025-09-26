export interface IDBPObjectStore<Value = unknown> {
  add(value: Value): Promise<IDBValidKey>;
  put(value: Value, key?: IDBValidKey): Promise<IDBValidKey>;
  get(key: IDBValidKey): Promise<Value | undefined>;
  getAll(): Promise<Value[]>;
  clear(): Promise<void>;
}

export interface IDBPTransaction<Value = unknown> {
  readonly store: IDBPObjectStore<Value>;
  readonly done: Promise<void>;
  objectStore(name: string): IDBPObjectStore<Value>;
}

export interface IDBPDatabase<Schema = unknown> {
  readonly name: string;
  readonly version: number;
  readonly objectStoreNames: DOMStringList;
  close(): void;
  createObjectStore(name: string, options?: IDBObjectStoreParameters): IDBObjectStore;
  transaction<Value = Schema>(storeNames: string | string[], mode?: IDBTransactionMode): IDBPTransaction<Value>;
  get<Value = Schema>(storeName: string, key: IDBValidKey): Promise<Value | undefined>;
  getAll<Value = Schema>(storeName: string): Promise<Value[]>;
  put<Value = Schema>(storeName: string, value: Value, key?: IDBValidKey): Promise<IDBValidKey>;
  clear(storeName: string): Promise<void>;
}

export interface OpenDBCallbacks<Schema = unknown> {
  upgrade?: (
    db: IDBPDatabase<Schema>,
    oldVersion: number,
    newVersion: number | null,
    transaction: IDBPTransaction<Schema>
  ) => void;
  blocked?: () => void;
  blocking?: () => void;
  terminated?: () => void;
}

export function openDB<Schema = unknown>(
  name: string,
  version?: number,
  callbacks?: OpenDBCallbacks<Schema>
): Promise<IDBPDatabase<Schema>>;
