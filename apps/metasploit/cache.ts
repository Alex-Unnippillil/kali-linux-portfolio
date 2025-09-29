import type { Module, ModuleCachePayload, ModuleSource } from './types';
import { getDb } from '../../utils/safeIDB';

const DB_NAME = 'metasploit-modules';
const STORE_NAME = 'module-metadata';
const CACHE_KEY = 'modules';

type OpenDbResult = Awaited<ReturnType<typeof getDb>>;

async function openModuleDb(): Promise<OpenDbResult> {
  const dbPromise = getDb(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });

  return dbPromise ?? null;
}

export function calculateRevision(modules: Module[]): string {
  let hash = 0;
  for (const entry of modules) {
    const data = `${entry.name}|${entry.type}|${entry.platform ?? ''}|${
      entry.severity ?? ''
    }|${(entry.tags ?? []).join(',')}|${entry.description}`;
    for (let i = 0; i < data.length; i += 1) {
      hash = (hash << 5) - hash + data.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
  }
  return `v${hash >>> 0}`;
}

export async function readModuleCache(): Promise<ModuleCachePayload | null> {
  const db = await openModuleDb();
  if (!db) return null;
  const payload = (await db.get(STORE_NAME, CACHE_KEY)) as ModuleCachePayload | undefined;
  return payload ?? null;
}

export async function writeModuleCache(payload: ModuleCachePayload): Promise<boolean> {
  const db = await openModuleDb();
  if (!db) return false;
  await db.put(STORE_NAME, payload, CACHE_KEY);
  return true;
}

export async function clearModuleCache(): Promise<void> {
  const db = await openModuleDb();
  if (!db) return;
  await db.delete(STORE_NAME, CACHE_KEY);
}

export async function ensureModuleCache(
  seedModules: Module[],
  revision: string,
): Promise<{ modules: Module[]; source: ModuleSource }> {
  try {
    const cached = await readModuleCache();
    if (cached && cached.revision === revision && cached.modules?.length) {
      return { modules: cached.modules, source: 'cache' };
    }

    await writeModuleCache({ revision, modules: seedModules });
    return { modules: seedModules, source: 'seed' };
  } catch (error) {
    return { modules: seedModules, source: 'seed' };
  }
}
