import {
  openDB,
  type DBSchema,
  type IDBPDatabase,
  type IDBPTransaction,
  type IDBTransactionMode,
  type StoreKey,
  type StoreNames,
  type StoreValue,
} from 'idb';
import { hasIndexedDB } from '@/utils/isBrowser';

export interface MigrationContext<Schema extends DBSchema> {
  oldVersion: number;
  newVersion: number;
  transaction: IDBPTransaction<Schema, StoreNames<Schema>[], 'versionchange'>;
}

export interface Migration<Schema extends DBSchema> {
  version: number;
  migrate:
    | ((db: IDBPDatabase<Schema>, context: MigrationContext<Schema>) => void)
    | ((db: IDBPDatabase<Schema>, context: MigrationContext<Schema>) => Promise<void>);
}

export interface CreateDatabaseOptions<Schema extends DBSchema> {
  name: string;
  migrations: Migration<Schema>[];
  version?: number;
}

export class TypedDatabase<Schema extends DBSchema> {
  private dbPromise: Promise<IDBPDatabase<Schema>> | null | undefined;

  constructor(
    private readonly opener: () => Promise<IDBPDatabase<Schema>> | null,
    private readonly supported: boolean,
  ) {
    this.dbPromise = supported ? undefined : null;
  }

  isSupported(): boolean {
    return this.supported;
  }

  private async getDatabase(): Promise<IDBPDatabase<Schema> | null> {
    if (!this.supported) return null;
    if (this.dbPromise === undefined) {
      const opened = this.opener();
      if (!opened) {
        this.dbPromise = null;
        return null;
      }
      this.dbPromise = opened;
    }
    if (this.dbPromise === null) return null;
    try {
      return await this.dbPromise;
    } catch {
      this.dbPromise = undefined;
      return null;
    }
  }

  async close(): Promise<void> {
    if (!this.supported) return;
    if (!this.dbPromise) {
      this.dbPromise = undefined;
      return;
    }
    try {
      const db = await this.dbPromise;
      db?.close();
    } catch {
      // ignore close errors
    } finally {
      this.dbPromise = undefined;
    }
  }

  async get<Store extends StoreNames<Schema>>(
    store: Store,
    key: StoreKey<Schema, Store>,
  ): Promise<StoreValue<Schema, Store> | undefined> {
    const db = await this.getDatabase();
    if (!db) return undefined;
    try {
      return await db.get(store, key);
    } catch {
      return undefined;
    }
  }

  async put<Store extends StoreNames<Schema>>(
    store: Store,
    value: StoreValue<Schema, Store>,
    key?: StoreKey<Schema, Store>,
  ): Promise<void> {
    const db = await this.getDatabase();
    if (!db) return;
    try {
      if (key !== undefined) {
        await db.put(store, value, key);
      } else {
        await db.put(store, value);
      }
    } catch {
      // ignore write errors
    }
  }

  async delete<Store extends StoreNames<Schema>>(
    store: Store,
    key: StoreKey<Schema, Store>,
  ): Promise<void> {
    const db = await this.getDatabase();
    if (!db) return;
    try {
      await db.delete(store, key);
    } catch {
      // ignore delete errors
    }
  }

  async clear<Store extends StoreNames<Schema>>(store: Store): Promise<void> {
    const db = await this.getDatabase();
    if (!db) return;
    try {
      await db.clear(store);
    } catch {
      // ignore clear errors
    }
  }

  async getAll<Store extends StoreNames<Schema>>(
    store: Store,
  ): Promise<StoreValue<Schema, Store>[]> {
    const db = await this.getDatabase();
    if (!db) return [];
    try {
      return await db.getAll(store);
    } catch {
      return [];
    }
  }

  async transaction<Mode extends IDBTransactionMode, Result>(
    storeNames: StoreNames<Schema>[] | StoreNames<Schema>,
    mode: Mode,
    callback: (
      tx: IDBPTransaction<Schema, StoreNames<Schema>[], Mode>,
    ) => Promise<Result> | Result,
  ): Promise<Result | undefined> {
    const db = await this.getDatabase();
    if (!db) return undefined;
    const namesArray = Array.isArray(storeNames) ? storeNames : [storeNames];
    const tx = db.transaction(namesArray, mode);
    try {
      const result = await callback(tx as IDBPTransaction<Schema, StoreNames<Schema>[], Mode>);
      await tx.done;
      return result;
    } catch (error) {
      try {
        tx.abort();
      } catch {
        // ignore abort errors
      }
      throw error;
    }
  }

  async getDbInstance(): Promise<IDBPDatabase<Schema> | null> {
    return this.getDatabase();
  }
}

export function createDatabase<Schema extends DBSchema>({
  name,
  migrations,
  version,
}: CreateDatabaseOptions<Schema>): TypedDatabase<Schema> {
  const sortedMigrations = [...migrations].sort((a, b) => a.version - b.version);
  const latestVersion = sortedMigrations.at(-1)?.version ?? 1;
  const targetVersion = version ?? latestVersion;
  const applicableMigrations = sortedMigrations.filter((migration) => migration.version <= targetVersion);
  const supported = hasIndexedDB;

  const opener = () => {
    if (!supported) return null;
    return openDB<Schema>(name, targetVersion, {
      upgrade: async (db, oldVersion, newVersion, transaction) => {
        for (const migration of applicableMigrations) {
          if (migration.version > oldVersion && migration.version <= (newVersion ?? targetVersion)) {
            await migration.migrate(db, {
              oldVersion,
              newVersion: newVersion ?? targetVersion,
              transaction: transaction as IDBPTransaction<Schema, StoreNames<Schema>[], 'versionchange'>,
            });
          }
        }
      },
    });
  };

  return new TypedDatabase<Schema>(opener, supported);
}
