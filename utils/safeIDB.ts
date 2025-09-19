import { openDB, type DBSchema, type IDBPDatabase, type OpenDBCallbacks } from 'idb';
import { hasIndexedDB } from './isBrowser';

export function getDb<Schema extends DBSchema = any>(
  name: string,
  version = 1,
  callbacks?: OpenDBCallbacks<Schema>,
): Promise<IDBPDatabase<Schema>> | null {
  if (!hasIndexedDB) return null;
  return openDB<Schema>(name, version, callbacks);
}

export interface ProfileMetadata {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  lastUsed: number;
}

interface ProfilesDB extends DBSchema {
  profiles: {
    key: string;
    value: ProfileMetadata;
  };
}

const PROFILE_DB_NAME = 'kali-desktop';
const PROFILE_STORE_NAME = 'profiles';
const PROFILE_DB_VERSION = 1;

let profileDbPromise: Promise<IDBPDatabase<ProfilesDB>> | null = null;
let profileDbInstance: IDBPDatabase<ProfilesDB> | null = null;

export function getProfilesDb() {
  if (!profileDbPromise) {
    profileDbPromise = getDb<ProfilesDB>(PROFILE_DB_NAME, PROFILE_DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(PROFILE_STORE_NAME)) {
          db.createObjectStore(PROFILE_STORE_NAME, {
            keyPath: 'id',
          });
        }
      },
    })?.then((db) => {
      profileDbInstance = db;
      return db;
    }) ?? null;
  }
  return profileDbPromise;
}

export async function listProfiles(): Promise<ProfileMetadata[]> {
  try {
    const dbp = getProfilesDb();
    if (!dbp) return [];
    const db = await dbp;
    const profiles = await db.transaction(PROFILE_STORE_NAME).store.getAll();
    return (profiles ?? []).sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

export async function getProfile(id: string): Promise<ProfileMetadata | undefined> {
  try {
    const dbp = getProfilesDb();
    if (!dbp) return undefined;
    const db = await dbp;
    return db.transaction(PROFILE_STORE_NAME).store.get(id) ?? undefined;
  } catch {
    return undefined;
  }
}

export async function saveProfile(profile: ProfileMetadata): Promise<void> {
  try {
    const dbp = getProfilesDb();
    if (!dbp) return;
    const db = await dbp;
    const tx = db.transaction(PROFILE_STORE_NAME, 'readwrite');
    await tx.store.put(profile);
    await tx.done;
  } catch {
    // ignore storage errors
  }
}

export async function deleteProfile(id: string): Promise<void> {
  try {
    const dbp = getProfilesDb();
    if (!dbp) return;
    const db = await dbp;
    const tx = db.transaction(PROFILE_STORE_NAME, 'readwrite');
    await tx.store.delete(id);
    await tx.done;
  } catch {
    // ignore storage errors
  }
}

export function __resetProfilesDbForTests() {
  if (profileDbInstance) {
    try {
      profileDbInstance.close();
    } catch {
      // ignore closing errors in tests
    }
    profileDbInstance = null;
  }
  profileDbPromise = null;
}
