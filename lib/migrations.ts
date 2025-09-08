export const settings = { version: 2 };

// Map of new storage keys to their legacy counterparts.
const renamedKeys: Record<string, string> = {
  'panel:items': 'pinnedApps',
  'app:theme': 'theme',
};

/**
 * Migrates renamed localStorage keys to their new names.
 * Returns true when a migration was applied.
 */
export function migrate(key: string, storage?: Storage): boolean {
  const legacy = renamedKeys[key];
  if (!legacy || !storage) return false;
  try {
    const value = storage.getItem(legacy);
    if (value === null) return false;
    storage.setItem(key, value);
    storage.removeItem(legacy);
    return true;
  } catch {
    return false;
  }
}
