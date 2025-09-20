const MODULE_ID = 'files';
const RELATED_APP_IDS = ['files', 'file-explorer'];

if (typeof globalThis !== 'undefined') {
  const registry = globalThis.__desktopModuleRegistry || {};
  RELATED_APP_IDS.forEach((id) => {
    registry[id] = {
      id,
      hint: 'Fetched early via modulepreload to warm the file explorer bundle.',
      timestamp: Date.now(),
    };
  });
  globalThis.__desktopModuleRegistry = registry;
}

export const appModuleId = MODULE_ID;
export const relatedAppIds = RELATED_APP_IDS;

export default MODULE_ID;
