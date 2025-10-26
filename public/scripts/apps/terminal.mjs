const MODULE_ID = 'terminal';

if (typeof globalThis !== 'undefined') {
  const registry = globalThis.__desktopModuleRegistry || {};
  registry[MODULE_ID] = {
    id: MODULE_ID,
    hint: 'Fetched early via modulepreload to warm the terminal bundle.',
    timestamp: Date.now(),
  };
  globalThis.__desktopModuleRegistry = registry;
}

export const appModuleId = MODULE_ID;

export default MODULE_ID;
