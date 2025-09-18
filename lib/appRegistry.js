const DEFAULT_HEAVY_APPS = new Set([
  'terminal',
  'metasploit',
  'wireshark',
  'ghidra',
  'autopsy',
  'radare2',
  'volatility',
  'hashcat',
  'msf-post',
  'kismet',
]);

const registry = new Map();

export const registerApp = ({ id, title, importer, heavy }) => {
  if (!id || typeof importer !== 'function') {
    return;
  }

  const existing = registry.get(id) || {};
  const entry = {
    id,
    title: title ?? existing.title,
    importer,
    heavy: heavy ?? existing.heavy ?? DEFAULT_HEAVY_APPS.has(id),
  };

  registry.set(id, entry);
  return entry;
};

export const getAppRegistryEntry = (id) => (id ? registry.get(id) : undefined);

export const getHeavyAppEntries = () =>
  Array.from(registry.values()).filter((entry) => entry.heavy);

export const isHeavyApp = (id) => {
  if (!id) return false;
  const entry = registry.get(id);
  if (entry) return !!entry.heavy;
  return DEFAULT_HEAVY_APPS.has(id);
};

export const getRegisteredApps = () => Array.from(registry.values());

export const clearRegistry = () => {
  registry.clear();
};

export const getDefaultHeavyAppIds = () => Array.from(DEFAULT_HEAVY_APPS);
